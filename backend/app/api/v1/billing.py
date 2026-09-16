"""
Billing & Subscription Management Version 1 API Routes for ChartCoach.
Complies with Sections 10, 18, 19, 20, 21, 22, 23, 37, 38 of Phase 1 Specification.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from pydantic import BaseModel, Field
from pymongo.database import Database

from datetime import datetime, timezone

from app.api.deps import get_current_user
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.services.billing_service import BillingService

router = APIRouter(prefix="/api/v1/billing", tags=["billing-v1"])


class SubscriptionCheckoutIn(BaseModel):
    plan: str = Field(..., description="Plan slug: basic, trader, pro, elite")
    interval: str = Field("monthly", description="monthly or yearly")
    coupon_code: Optional[str] = Field(None, description="Optional promo/coupon code")


class PaymentVerifyIn(BaseModel):
    plan: str
    interval: str = "monthly"
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str
    coupon_code: Optional[str] = None
    session_id: Optional[str] = None


class CouponValidateIn(BaseModel):
    code: str
    plan: str
    interval: str = "monthly"


class CourseCheckoutIn(BaseModel):
    course_id: str


class CourseVerifyIn(BaseModel):
    course_id: str
    payment_id: Optional[str] = None
    signature: Optional[str] = None


@router.get("/plans")
def list_plans(db: Database = Depends(get_db)):
    """Returns active commercial subscription plans with pricing and feature matrix."""
    service = BillingService(db)
    return service.get_plans()


@router.get("/membership")
def get_membership(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Returns full current membership status: plan, renewal date, gems balance,
    unlocked courses, unlocked tools, and payment receipts.
    """
    service = BillingService(db)
    return service.get_membership(current_user)


@router.post("/checkout/subscription")
def create_subscription_checkout(
    data: SubscriptionCheckoutIn,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Initiates a Razorpay recurring subscription checkout session (Section 5, 20).
    """
    service = BillingService(db)
    try:
        return service.create_subscription_checkout(
            user=current_user,
            plan_slug=data.plan,
            interval=data.interval,
            coupon_code=data.coupon_code,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/verify")
def verify_subscription_payment(
    data: PaymentVerifyIn,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Cryptographically verifies payment signature, activates subscription,
    allocates monthly Gems, and logs audit trail.
    """
    service = BillingService(db)
    try:
        return service.verify_payment(
            user=current_user,
            razorpay_payment_id=data.razorpay_payment_id,
            razorpay_subscription_id=data.razorpay_subscription_id,
            razorpay_signature=data.razorpay_signature,
            plan_slug=data.plan,
            interval=data.interval,
            coupon_code=data.coupon_code,
            session_id=data.session_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/subscription/cancel")
def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Cancels auto-renewal. Access remains active until the end of the current paid billing period.
    """
    service = BillingService(db)
    res = service.cancel_subscription(current_user)
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("message"))
    return res


@router.post("/subscription/resume")
def resume_subscription(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Restores auto-renewal for a cancelled subscription while within the active period (Section 29).
    """
    service = BillingService(db)
    res = service.resume_subscription(current_user)
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("message"))
    return res


@router.post("/coupons/validate")
def validate_coupon(
    data: CouponValidateIn,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Validates a promotional coupon and returns discount calculations (Section 38, 39).
    """
    service = BillingService(db)
    return service.validate_coupon(data.code, data.plan, data.interval)


@router.post("/courses/checkout")
def checkout_standalone_course(
    data: CourseCheckoutIn,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Prepares checkout for standalone course purchase (Section 36, 37).
    """
    from app.core.plans import COURSE_STANDALONE_PRICES
    course_info = COURSE_STANDALONE_PRICES.get(data.course_id)
    if not course_info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found for standalone purchase")

    price = course_info["price"]
    amount_paise = price * 100
    is_mock = settings.is_razorpay_mock or not settings.razorpay_key_id or settings.razorpay_key_id.startswith("mock_")
    key_id = settings.razorpay_key_id or "rzp_test_mock_key"
    order_id = None

    if not is_mock and settings.razorpay_key_id and settings.razorpay_key_secret:
        try:
            import razorpay
            client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))
            order_data = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"rcpt_c_{data.course_id[:8]}_{int(datetime.now(timezone.utc).timestamp())}",
                "notes": {
                    "course_id": data.course_id,
                    "user_id": str(current_user._id),
                    "type": "standalone_course",
                },
            }
            order = client.order.create(data=order_data)
            order_id = order.get("id")
        except Exception as e:
            print(f"[Razorpay Course Order Create Warning]: {e}")
            is_mock = True

    return {
        "courseId": data.course_id,
        "courseTitle": course_info["title"],
        "price": price,
        "amount": amount_paise,
        "currency": "INR",
        "keyId": key_id,
        "orderId": order_id,
        "isMock": is_mock,
    }


@router.post("/courses/verify")
def verify_standalone_course(
    data: CourseVerifyIn,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Verifies standalone course purchase and grants lifetime ownership (Section 36, 37).
    """
    service = BillingService(db)
    try:
        return service.purchase_course_standalone(
            user=current_user,
            course_id=data.course_id,
            payment_id=data.payment_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/admin/analytics")
def get_admin_analytics(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Returns high-level commercial and revenue metrics (Section 43, 62, 63).
    """
    service = BillingService(db)
    return service.get_admin_analytics()


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(default=None),
    db: Database = Depends(get_db),
):
    """
    Idempotent webhook endpoint for Razorpay recurring subscription events.
    Verifies HMAC SHA256 signature and synchronizes subscription state.
    """
    body_bytes = await request.body()
    service = BillingService(db)
    try:
        return service.process_webhook(body_bytes, x_razorpay_signature)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
