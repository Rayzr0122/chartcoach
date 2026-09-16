"""
Centralized Entitlement Resolution Service for ChartCoach.
Complies with Sections 11, 16, 17 of the Senior Engineering Specification.
Capability-based authorization: Is this user entitled to this capability?
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pymongo.database import Database

from app.models.user import User
from app.models.subscription import Subscription
from app.core.plans import (
    PlanTier,
    PLAN_DEFINITIONS,
    get_plan_definition,
    get_minimum_plan_for_capability,
)


class EntitlementService:
    def __init__(self, db: Database):
        self.db = db

    def get_active_subscription(self, user: User) -> Optional[Subscription]:
        """
        Resolves the user's current trusted subscription from MongoDB.
        Validates whether the subscription is active and within valid period.
        """
        if not user or not user._id:
            return None

        # Look up active or cancelled (grace period active until current_period_end) subscriptions
        doc = self.db.subscriptions.find_one(
            {
                "user_id": user._id,
                "status": {"$in": ["active", "cancelled"]},
            },
            sort=[("created_at", -1)],
        )

        if not doc:
            # Check backward-compatible user document field
            user_plan = getattr(user, "subscription_plan", "free")
            user_status = getattr(user, "subscription_status", "active")
            if user_plan and user_plan != "free" and user_status == "active":
                return Subscription(
                    user_id=user._id,
                    public_user_id=user.public_user_id,
                    plan_id=user_plan,
                    status="active",
                )
            return None

        subscription = Subscription.from_doc(doc)
        if not subscription:
            return None

        # Verify whether current period has ended
        now = datetime.now(timezone.utc)
        if subscription.current_period_end:
            period_end = subscription.current_period_end
            if period_end.tzinfo is None:
                period_end = period_end.replace(tzinfo=timezone.utc)

            if now > period_end:
                # Subscription expired
                if subscription.status != "expired":
                    self.db.subscriptions.update_one(
                        {"_id": subscription._id},
                        {"$set": {"status": "expired", "updated_at": now}},
                    )
                    self.db.users.update_one(
                        {"_id": user._id},
                        {"$set": {"subscription_plan": "free", "subscription_status": "expired"}},
                    )
                return None

        return subscription

    def get_user_plan_slug(self, user: Optional[User]) -> str:
        """Returns the active plan slug (or 'free')."""
        if not user:
            return PlanTier.FREE
        sub = self.get_active_subscription(user)
        if sub and sub.plan_id in PLAN_DEFINITIONS:
            return sub.plan_id
        return PlanTier.FREE

    def is_entitled(self, user: Optional[User], capability: str) -> bool:
        """
        Central authorization check: asks 'Is this user entitled to this capability?'
        No hardcoded 'if user.plan == pro' scattered in endpoints.
        """
        if not user:
            return False

        plan_slug = self.get_user_plan_slug(user)
        plan_def = get_plan_definition(plan_slug)

        # 1. Course capability check (Subscription OR Standalone Lifetime Purchase)
        if capability.startswith("course:"):
            course_id = capability.split("course:", 1)[1]
            if course_id in plan_def.get("includedCourses", []):
                return True
            # Check standalone lifetime course purchases (Section 36, 37)
            purchased = self.db.coursePurchases.find_one(
                {"user_id": user._id, "course_id": course_id}
            )
            return bool(purchased)

        # 2. Tool capability check
        if capability.startswith("tool:"):
            tool_id = capability.split("tool:", 1)[1]
            return tool_id in plan_def.get("includedTools", [])

        # 3. Simulator capability check
        if capability == "simulator":
            return plan_def.get("simulatorAccess") == "full"

        # 4. AI Coach capability check
        if capability == "ai-coach":
            return bool(plan_def.get("aiCoachAccess", False))

        # 5. Community capability check
        if capability.startswith("community:"):
            req_tier = capability.split("community:", 1)[1]
            user_tier = plan_def.get("communityTier", "limited")
            tier_weights = {"limited": 1, "standard": 2, "full": 3, "priority": 4}
            return tier_weights.get(user_tier, 0) >= tier_weights.get(req_tier, 0)

        return False

    def get_required_plan(self, capability: str) -> Dict[str, Any]:
        """Returns the minimum required plan definition for a capability."""
        plan_slug = get_minimum_plan_for_capability(capability)
        plan_def = get_plan_definition(plan_slug)
        return {
            "requiredPlan": plan_slug,
            "requiredPlanName": plan_def.get("name", "Pro"),
            "price": plan_def.get("price", 3),
        }

    def get_user_entitlements(self, user: Optional[User]) -> Dict[str, Any]:
        """Returns the complete entitlement summary for a user."""
        if not user:
            free_def = get_plan_definition(PlanTier.FREE)
            return {
                "plan": PlanTier.FREE,
                "planName": free_def["name"],
                "status": "none",
                "billingInterval": "monthly",
                "renewalDate": None,
                "autoRenew": False,
                "unlockedCourses": [],
                "standaloneCourses": [],
                "unlockedTools": free_def.get("includedTools", []),
                "hasSimulator": False,
                "hasAiCoach": False,
                "communityTier": "limited",
                "monthlyGems": 0,
            }

        sub = self.get_active_subscription(user)
        plan_slug = sub.plan_id if sub else PlanTier.FREE
        plan_def = get_plan_definition(plan_slug)

        # Standalone lifetime purchases (Section 36, 37)
        purchases = list(self.db.coursePurchases.find({"user_id": user._id}))
        standalone_course_ids = [p.get("course_id") for p in purchases if p.get("course_id")]

        # Merged unlocked courses: subscription inclusions + standalone purchases
        unlocked_set = set(plan_def.get("includedCourses", [])) | set(standalone_course_ids)

        renewal_iso = None
        if sub and sub.current_period_end:
            renewal_iso = sub.current_period_end.isoformat()

        return {
            "plan": plan_slug,
            "planName": plan_def["name"],
            "status": sub.status if sub else "free",
            "billingInterval": getattr(sub, "billing_interval", "monthly") if sub else "monthly",
            "renewalDate": renewal_iso,
            "autoRenew": sub.auto_renew if sub else False,
            "unlockedCourses": list(unlocked_set),
            "standaloneCourses": standalone_course_ids,
            "unlockedTools": plan_def.get("includedTools", []),
            "hasSimulator": plan_def.get("simulatorAccess") == "full",
            "hasAiCoach": bool(plan_def.get("aiCoachAccess", False)),
            "communityTier": plan_def.get("communityTier", "limited"),
            "monthlyGems": plan_def.get("monthlyGems", 0),
        }
