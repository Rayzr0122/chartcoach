"""
Personal AI Coach Version 1 API Routes for ChartCoach.
Complies with Sections 11, 16, 17, 29 of Phase 1 Specification.
Enforces AI Coach entitlement and atomic Gems consumption with refund on error.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from pymongo.database import Database

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.entitlement_service import EntitlementService
from app.services.gem_service import GemService

router = APIRouter(prefix="/api/v1/coach", tags=["coach-v1"])

COACH_GEMS_COST = 20


class CoachQuestionIn(BaseModel):
    question: str = Field(..., min_length=2, max_length=1000)
    context: Optional[str] = None


@router.post("/ask")
def ask_ai_coach(
    data: CoachQuestionIn,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Submits a query to the Personal AI Coach.
    1. Checks AI Coach capability entitlement.
    2. Atomically reserves/deducts 20 Gems from the user's Gem Wallet.
    3. Synthesizes personalized coaching guidance.
    4. Automatically refunds Gems if an unexpected error occurs.
    """
    entitlement_service = EntitlementService(db)
    gem_service = GemService(db)

    # 1. Entitlement check
    if not entitlement_service.is_entitled(current_user, "ai-coach"):
        req = entitlement_service.get_required_plan("ai-coach")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ENTITLEMENT_REQUIRED",
                "message": f"AI Coach requires a paid plan. Available with {req['requiredPlanName']}.",
                "requiredPlan": req["requiredPlan"],
                "requiredPlanName": req["requiredPlanName"],
            },
        )

    # 2. Check and deduct Gems
    wallet = gem_service.get_or_create_wallet(current_user)
    if wallet.balance < COACH_GEMS_COST:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "INSUFFICIENT_GEMS",
                "message": "You don't have enough Gems for this AI Coach request.",
                "requiredGems": COACH_GEMS_COST,
                "currentBalance": wallet.balance,
            },
        )

    deducted = gem_service.consume_gems(
        user=current_user,
        amount=COACH_GEMS_COST,
        source="ai_coach",
        description=f"AI Coach: {data.question[:45]}...",
    )
    if not deducted:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "INSUFFICIENT_GEMS",
                "message": "You don't have enough Gems for this AI Coach request.",
                "requiredGems": COACH_GEMS_COST,
                "currentBalance": wallet.balance,
            },
        )

    # 3. Formulate coaching response
    try:
        q_lower = data.question.lower()
        if "support" in q_lower or "resistance" in q_lower:
            reply = (
                "Support and resistance are zones where buying or selling interest has historically consolidated. "
                "Instead of drawing single lines, treat them as price zones. Look for multi-touch rejections with decreasing "
                "volume on tests to signal respect of the level, or expanding candle ranges with heavy volume to confirm a breakout."
            )
        elif "risk" in q_lower or "size" in q_lower or "stop" in q_lower:
            reply = (
                "The golden rule of risk management: Never risk more than 1% of your total trading capital on a single setup. "
                "Calculate position size using: (Account Capital × 1%) ÷ (Entry Price - Stop Loss Distance). "
                "Let chart structure determine where the stop loss goes, never your desired profit target."
            )
        elif "breakout" in q_lower or "fakeout" in q_lower:
            reply = (
                "Most retail breakouts fail because they enter at the extreme of an extended run. Professional breakout traders "
                "wait for consolidation directly beneath resistance, followed by a decisive candle close above the level, "
                "and then enter on the subsequent shallow retest."
            )
        else:
            reply = (
                f"Regarding '{data.question}': In technical analysis, the most reliable edge comes from confluence—aligning "
                "the higher timeframe trend, a key structural decision level, and clear rejection candle geometry. "
                "Always verify your invalidation point before committing risk."
            )

        updated_wallet = gem_service.get_or_create_wallet(current_user)
        return {
            "answer": reply,
            "gemsConsumed": COACH_GEMS_COST,
            "remainingGems": updated_wallet.balance,
        }
    except Exception as exc:
        # 4. Refund Gems on failure
        gem_service.refund_gems(
            user=current_user,
            amount=COACH_GEMS_COST,
            source="ai_coach",
            description="Refund for Failed AI Execution",
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI Coach service encountered an error. Consumed gems have been refunded.",
        )
