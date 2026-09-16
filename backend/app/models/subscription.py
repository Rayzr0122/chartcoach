"""
Subscription, Billing, Entitlements and Gems Domain Models for ChartCoach.
Complies with Sections 10, 11, 12, 13, 14, 15, 26, 27 of Phase 1 Specification.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId


class SubscriptionPlan:
    """Represents a commercial subscription plan configuration."""

    def __init__(
        self,
        slug: str,
        name: str,
        positioning: str,
        description: str,
        price: int,
        price_yearly: Optional[int] = None,
        yearly_discount_percent: int = 20,
        currency: str = "INR",
        billing_interval: str = "monthly",
        razorpay_plan_id: Optional[str] = None,
        razorpay_plan_id_yearly: Optional[str] = None,
        included_courses: Optional[List[str]] = None,
        included_tools: Optional[List[str]] = None,
        simulator_access: str = "none",  # none, full
        community_tier: str = "limited",  # limited, standard, full, priority
        ai_coach_access: bool = True,
        monthly_gems: int = 0,
        is_active: bool = True,
        is_popular: bool = False,
        display_order: int = 0,
        _id: Any = None,
    ):
        self._id = _id
        self.slug = slug.lower()
        self.name = name
        self.positioning = positioning
        self.description = description
        self.price = price
        self.price_yearly = price_yearly if price_yearly is not None else int(price * 12 * (1 - yearly_discount_percent / 100))
        self.yearly_discount_percent = yearly_discount_percent
        self.currency = currency.upper()
        self.billing_interval = billing_interval
        self.razorpay_plan_id = razorpay_plan_id or f"plan_{slug}_monthly"
        self.razorpay_plan_id_yearly = razorpay_plan_id_yearly or f"plan_{slug}_yearly"
        self.included_courses = included_courses or []
        self.included_tools = included_tools or []
        self.simulator_access = simulator_access
        self.community_tier = community_tier
        self.ai_coach_access = ai_coach_access
        self.monthly_gems = monthly_gems
        self.is_active = is_active
        self.is_popular = is_popular
        self.display_order = display_order

    @classmethod
    def from_doc(cls, doc: Optional[Dict[str, Any]]) -> Optional["SubscriptionPlan"]:
        if not doc:
            return None
        return cls(
            _id=doc.get("_id"),
            slug=doc.get("slug", ""),
            name=doc.get("name", ""),
            positioning=doc.get("positioning", ""),
            description=doc.get("description", ""),
            price=doc.get("price", 0),
            price_yearly=doc.get("price_yearly"),
            yearly_discount_percent=doc.get("yearly_discount_percent", 20),
            currency=doc.get("currency", "INR"),
            billing_interval=doc.get("billing_interval", "monthly"),
            razorpay_plan_id=doc.get("razorpay_plan_id"),
            razorpay_plan_id_yearly=doc.get("razorpay_plan_id_yearly"),
            included_courses=doc.get("included_courses", []),
            included_tools=doc.get("included_tools", []),
            simulator_access=doc.get("simulator_access", "none"),
            community_tier=doc.get("community_tier", "limited"),
            ai_coach_access=doc.get("ai_coach_access", True),
            monthly_gems=doc.get("monthly_gems", 0),
            is_active=doc.get("is_active", True),
            is_popular=doc.get("is_popular", False),
            display_order=doc.get("display_order", 0),
        )

    def to_doc(self) -> Dict[str, Any]:
        doc = {
            "slug": self.slug,
            "name": self.name,
            "positioning": self.positioning,
            "description": self.description,
            "price": self.price,
            "price_yearly": self.price_yearly,
            "yearly_discount_percent": self.yearly_discount_percent,
            "currency": self.currency,
            "billing_interval": self.billing_interval,
            "razorpay_plan_id": self.razorpay_plan_id,
            "razorpay_plan_id_yearly": self.razorpay_plan_id_yearly,
            "included_courses": self.included_courses,
            "included_tools": self.included_tools,
            "simulator_access": self.simulator_access,
            "community_tier": self.community_tier,
            "ai_coach_access": self.ai_coach_access,
            "monthly_gems": self.monthly_gems,
            "is_active": self.is_active,
            "is_popular": self.is_popular,
            "display_order": self.display_order,
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc


class Subscription:
    """Represents a user's active or past membership."""

    def __init__(
        self,
        user_id: ObjectId | str,
        public_user_id: str,
        plan_id: str,
        status: str = "active",  # trialing, active, past_due, cancelled, expired, paused
        billing_interval: str = "monthly",  # monthly, yearly
        razorpay_subscription_id: Optional[str] = None,
        razorpay_customer_id: Optional[str] = None,
        current_period_start: Optional[datetime] = None,
        current_period_end: Optional[datetime] = None,
        auto_renew: bool = True,
        cancelled_at: Optional[datetime] = None,
        downgrade_to_plan: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        _id: Any = None,
    ):
        self._id = _id
        self.user_id = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
        self.public_user_id = public_user_id
        self.plan_id = plan_id.lower()
        self.status = status
        self.billing_interval = billing_interval
        self.razorpay_subscription_id = razorpay_subscription_id
        self.razorpay_customer_id = razorpay_customer_id
        now = datetime.now(timezone.utc)
        self.current_period_start = current_period_start or now
        self.current_period_end = current_period_end
        self.auto_renew = auto_renew
        self.cancelled_at = cancelled_at
        self.downgrade_to_plan = downgrade_to_plan
        self.created_at = created_at or now
        self.updated_at = updated_at or now

    @classmethod
    def from_doc(cls, doc: Optional[Dict[str, Any]]) -> Optional["Subscription"]:
        if not doc:
            return None
        return cls(
            _id=doc.get("_id"),
            user_id=doc.get("user_id"),
            public_user_id=doc.get("public_user_id", ""),
            plan_id=doc.get("plan_id", "free"),
            status=doc.get("status", "active"),
            billing_interval=doc.get("billing_interval", "monthly"),
            razorpay_subscription_id=doc.get("razorpay_subscription_id"),
            razorpay_customer_id=doc.get("razorpay_customer_id"),
            current_period_start=doc.get("current_period_start"),
            current_period_end=doc.get("current_period_end"),
            auto_renew=doc.get("auto_renew", True),
            cancelled_at=doc.get("cancelled_at"),
            downgrade_to_plan=doc.get("downgrade_to_plan"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at"),
        )

    def to_doc(self) -> Dict[str, Any]:
        doc = {
            "user_id": self.user_id,
            "public_user_id": self.public_user_id,
            "plan_id": self.plan_id,
            "status": self.status,
            "billing_interval": self.billing_interval,
            "razorpay_subscription_id": self.razorpay_subscription_id,
            "razorpay_customer_id": self.razorpay_customer_id,
            "current_period_start": self.current_period_start,
            "current_period_end": self.current_period_end,
            "auto_renew": self.auto_renew,
            "cancelled_at": self.cancelled_at,
            "downgrade_to_plan": self.downgrade_to_plan,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc


class Payment:
    """Internal financial audit log for all payment events."""

    def __init__(
        self,
        user_id: ObjectId | str,
        subscription_id: Optional[ObjectId | str] = None,
        razorpay_payment_id: Optional[str] = None,
        razorpay_subscription_id: Optional[str] = None,
        razorpay_invoice_id: Optional[str] = None,
        amount: int = 0,
        currency: str = "INR",
        status: str = "captured",  # created, authorized, captured, failed, refunded
        failure_reason: Optional[str] = None,
        created_at: Optional[datetime] = None,
        _id: Any = None,
    ):
        self._id = _id
        self.user_id = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
        self.subscription_id = subscription_id
        self.razorpay_payment_id = razorpay_payment_id
        self.razorpay_subscription_id = razorpay_subscription_id
        self.razorpay_invoice_id = razorpay_invoice_id
        self.amount = amount
        self.currency = currency
        self.status = status
        self.failure_reason = failure_reason
        self.created_at = created_at or datetime.now(timezone.utc)

    @classmethod
    def from_doc(cls, doc: Optional[Dict[str, Any]]) -> Optional["Payment"]:
        if not doc:
            return None
        return cls(
            _id=doc.get("_id"),
            user_id=doc.get("user_id"),
            subscription_id=doc.get("subscription_id"),
            razorpay_payment_id=doc.get("razorpay_payment_id"),
            razorpay_subscription_id=doc.get("razorpay_subscription_id"),
            razorpay_invoice_id=doc.get("razorpay_invoice_id"),
            amount=doc.get("amount", 0),
            currency=doc.get("currency", "INR"),
            status=doc.get("status", "captured"),
            failure_reason=doc.get("failure_reason"),
            created_at=doc.get("created_at"),
        )

    def to_doc(self) -> Dict[str, Any]:
        doc = {
            "user_id": self.user_id,
            "subscription_id": self.subscription_id,
            "razorpay_payment_id": self.razorpay_payment_id,
            "razorpay_subscription_id": self.razorpay_subscription_id,
            "razorpay_invoice_id": self.razorpay_invoice_id,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status,
            "failure_reason": self.failure_reason,
            "created_at": self.created_at,
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc


class GemWallet:
    """Represents a user's spendable Gems balance."""

    def __init__(
        self,
        user_id: ObjectId | str,
        public_user_id: str,
        balance: int = 0,
        lifetime_credited: int = 0,
        lifetime_debited: int = 0,
        current_period_allocated: int = 0,
        updated_at: Optional[datetime] = None,
        _id: Any = None,
    ):
        self._id = _id
        self.user_id = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
        self.public_user_id = public_user_id
        self.balance = max(0, balance)
        self.lifetime_credited = lifetime_credited
        self.lifetime_debited = lifetime_debited
        self.current_period_allocated = current_period_allocated
        self.updated_at = updated_at or datetime.now(timezone.utc)

    @classmethod
    def from_doc(cls, doc: Optional[Dict[str, Any]]) -> Optional["GemWallet"]:
        if not doc:
            return None
        return cls(
            _id=doc.get("_id"),
            user_id=doc.get("user_id"),
            public_user_id=doc.get("public_user_id", ""),
            balance=doc.get("balance", 0),
            lifetime_credited=doc.get("lifetime_credited", 0),
            lifetime_debited=doc.get("lifetime_debited", 0),
            current_period_allocated=doc.get("current_period_allocated", 0),
            updated_at=doc.get("updated_at"),
        )

    def to_doc(self) -> Dict[str, Any]:
        doc = {
            "user_id": self.user_id,
            "public_user_id": self.public_user_id,
            "balance": self.balance,
            "lifetime_credited": self.lifetime_credited,
            "lifetime_debited": self.lifetime_debited,
            "current_period_allocated": self.current_period_allocated,
            "updated_at": self.updated_at,
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc


class GemTransaction:
    """Immutable ledger entry for any Gem balance change."""

    def __init__(
        self,
        user_id: ObjectId | str,
        transaction_type: str,  # credit, debit, refund, bonus, adjustment
        amount: int,
        source: str,  # subscription, ai_coach, promotion, admin, system
        description: str,
        balance_after: int,
        reference_id: Optional[str] = None,
        billing_period_start: Optional[datetime] = None,
        created_at: Optional[datetime] = None,
        _id: Any = None,
    ):
        self._id = _id
        self.user_id = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
        self.transaction_type = transaction_type
        self.amount = amount
        self.source = source
        self.description = description
        self.balance_after = balance_after
        self.reference_id = reference_id
        self.billing_period_start = billing_period_start
        self.created_at = created_at or datetime.now(timezone.utc)

    @classmethod
    def from_doc(cls, doc: Optional[Dict[str, Any]]) -> Optional["GemTransaction"]:
        if not doc:
            return None
        return cls(
            _id=doc.get("_id"),
            user_id=doc.get("user_id"),
            transaction_type=doc.get("transaction_type", "credit"),
            amount=doc.get("amount", 0),
            source=doc.get("source", "system"),
            description=doc.get("description", ""),
            balance_after=doc.get("balance_after", 0),
            reference_id=doc.get("reference_id"),
            billing_period_start=doc.get("billing_period_start"),
            created_at=doc.get("created_at"),
        )

    def to_doc(self) -> Dict[str, Any]:
        doc = {
            "user_id": self.user_id,
            "transaction_type": self.transaction_type,
            "amount": self.amount,
            "source": self.source,
            "description": self.description,
            "balance_after": self.balance_after,
            "reference_id": self.reference_id,
            "billing_period_start": self.billing_period_start,
            "created_at": self.created_at,
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc


class UsageRecord:
    """Usage tracking for features and tools."""

    def __init__(
        self,
        user_id: ObjectId | str,
        capability: str,
        metadata: Optional[Dict[str, Any]] = None,
        recorded_at: Optional[datetime] = None,
        _id: Any = None,
    ):
        self._id = _id
        self.user_id = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
        self.capability = capability
        self.metadata = metadata or {}
        self.recorded_at = recorded_at or datetime.now(timezone.utc)

    def to_doc(self) -> Dict[str, Any]:
        doc = {
            "user_id": self.user_id,
            "capability": self.capability,
            "metadata": self.metadata,
            "recorded_at": self.recorded_at,
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc


class CheckoutSession:
    """Internal checkout entity tracking the full commercial purchase journey (Section 20)."""

    def __init__(
        self,
        user_id: ObjectId | str,
        plan_slug: str,
        billing_interval: str = "monthly",  # monthly, yearly
        amount: int = 0,
        currency: str = "INR",
        discount_amount: int = 0,
        coupon_code: Optional[str] = None,
        status: str = "created",  # created, checkout_opened, payment_pending, verified, activated, failed, cancelled, expired
        subscription_id: Optional[str] = None,
        payment_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        _id: Any = None,
    ):
        self._id = _id
        self.user_id = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
        self.plan_slug = plan_slug.lower()
        self.billing_interval = billing_interval
        self.amount = amount
        self.currency = currency.upper()
        self.discount_amount = discount_amount
        self.coupon_code = coupon_code.upper() if coupon_code else None
        self.status = status
        self.subscription_id = subscription_id
        self.payment_id = payment_id
        self.metadata = metadata or {}
        now = datetime.now(timezone.utc)
        self.created_at = created_at or now
        self.updated_at = updated_at or now

    @classmethod
    def from_doc(cls, doc: Optional[Dict[str, Any]]) -> Optional["CheckoutSession"]:
        if not doc:
            return None
        return cls(
            _id=doc.get("_id"),
            user_id=doc.get("user_id"),
            plan_slug=doc.get("plan_slug", ""),
            billing_interval=doc.get("billing_interval", "monthly"),
            amount=doc.get("amount", 0),
            currency=doc.get("currency", "INR"),
            discount_amount=doc.get("discount_amount", 0),
            coupon_code=doc.get("coupon_code"),
            status=doc.get("status", "created"),
            subscription_id=doc.get("subscription_id"),
            payment_id=doc.get("payment_id"),
            metadata=doc.get("metadata", {}),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at"),
        )

    def to_doc(self) -> Dict[str, Any]:
        doc = {
            "user_id": self.user_id,
            "plan_slug": self.plan_slug,
            "billing_interval": self.billing_interval,
            "amount": self.amount,
            "currency": self.currency,
            "discount_amount": self.discount_amount,
            "coupon_code": self.coupon_code,
            "status": self.status,
            "subscription_id": self.subscription_id,
            "payment_id": self.payment_id,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc


class Coupon:
    """Promotional coupon discount model (Section 38, 39)."""

    def __init__(
        self,
        code: str,
        discount_type: str = "percentage",  # percentage, fixed
        discount_value: int = 0,
        applicable_plans: Optional[List[str]] = None,
        applicable_intervals: Optional[List[str]] = None,
        is_active: bool = True,
        max_redemptions: int = 1000,
        redemption_count: int = 0,
        valid_until: Optional[datetime] = None,
        created_at: Optional[datetime] = None,
        _id: Any = None,
    ):
        self._id = _id
        self.code = code.upper().strip()
        self.discount_type = discount_type
        self.discount_value = discount_value
        self.applicable_plans = applicable_plans or ["all"]
        self.applicable_intervals = applicable_intervals or ["monthly", "yearly"]
        self.is_active = is_active
        self.max_redemptions = max_redemptions
        self.redemption_count = redemption_count
        self.valid_until = valid_until
        self.created_at = created_at or datetime.now(timezone.utc)

    @classmethod
    def from_doc(cls, doc: Optional[Dict[str, Any]]) -> Optional["Coupon"]:
        if not doc:
            return None
        return cls(
            _id=doc.get("_id"),
            code=doc.get("code", ""),
            discount_type=doc.get("discount_type", "percentage"),
            discount_value=doc.get("discount_value", 0),
            applicable_plans=doc.get("applicable_plans", ["all"]),
            applicable_intervals=doc.get("applicable_intervals", ["monthly", "yearly"]),
            is_active=doc.get("is_active", True),
            max_redemptions=doc.get("max_redemptions", 1000),
            redemption_count=doc.get("redemption_count", 0),
            valid_until=doc.get("valid_until"),
            created_at=doc.get("created_at"),
        )

    def to_doc(self) -> Dict[str, Any]:
        doc = {
            "code": self.code,
            "discount_type": self.discount_type,
            "discount_value": self.discount_value,
            "applicable_plans": self.applicable_plans,
            "applicable_intervals": self.applicable_intervals,
            "is_active": self.is_active,
            "max_redemptions": self.max_redemptions,
            "redemption_count": self.redemption_count,
            "valid_until": self.valid_until,
            "created_at": self.created_at,
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc


class CoursePurchase:
    """Standalone course purchase model granting lifetime ownership (Section 36, 37)."""

    def __init__(
        self,
        user_id: ObjectId | str,
        public_user_id: str,
        course_id: str,
        price_paid: int,
        currency: str = "INR",
        payment_id: Optional[str] = None,
        ownership: str = "lifetime",
        purchased_at: Optional[datetime] = None,
        _id: Any = None,
    ):
        self._id = _id
        self.user_id = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
        self.public_user_id = public_user_id
        self.course_id = course_id
        self.price_paid = price_paid
        self.currency = currency.upper()
        self.payment_id = payment_id
        self.ownership = ownership
        self.purchased_at = purchased_at or datetime.now(timezone.utc)

    @classmethod
    def from_doc(cls, doc: Optional[Dict[str, Any]]) -> Optional["CoursePurchase"]:
        if not doc:
            return None
        return cls(
            _id=doc.get("_id"),
            user_id=doc.get("user_id"),
            public_user_id=doc.get("public_user_id", ""),
            course_id=doc.get("course_id", ""),
            price_paid=doc.get("price_paid", 0),
            currency=doc.get("currency", "INR"),
            payment_id=doc.get("payment_id"),
            ownership=doc.get("ownership", "lifetime"),
            purchased_at=doc.get("purchased_at"),
        )

    def to_doc(self) -> Dict[str, Any]:
        doc = {
            "user_id": self.user_id,
            "public_user_id": self.public_user_id,
            "course_id": self.course_id,
            "price_paid": self.price_paid,
            "currency": self.currency,
            "payment_id": self.payment_id,
            "ownership": self.ownership,
            "purchased_at": self.purchased_at,
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc


class GemPackage:
    """Configurable top-up gem packages (Section 31-35)."""

    def __init__(
        self,
        package_id: str,
        name: str,
        gems: int,
        price: int,
        currency: str = "INR",
        is_popular: bool = False,
        is_active: bool = True,
        display_order: int = 0,
        _id: Any = None,
    ):
        self._id = _id
        self.package_id = package_id
        self.name = name
        self.gems = gems
        self.price = price
        self.currency = currency.upper()
        self.is_popular = is_popular
        self.is_active = is_active
        self.display_order = display_order

    @classmethod
    def from_doc(cls, doc: Optional[Dict[str, Any]]) -> Optional["GemPackage"]:
        if not doc:
            return None
        return cls(
            _id=doc.get("_id"),
            package_id=doc.get("package_id", ""),
            name=doc.get("name", ""),
            gems=doc.get("gems", 0),
            price=doc.get("price", 0),
            currency=doc.get("currency", "INR"),
            is_popular=doc.get("is_popular", False),
            is_active=doc.get("is_active", True),
            display_order=doc.get("display_order", 0),
        )

    def to_doc(self) -> Dict[str, Any]:
        doc = {
            "package_id": self.package_id,
            "name": self.name,
            "gems": self.gems,
            "price": self.price,
            "currency": self.currency,
            "is_popular": self.is_popular,
            "is_active": self.is_active,
            "display_order": self.display_order,
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc


class AuditLog:
    """Immutable audit trail for financial, subscription and admin actions (Section 59)."""

    def __init__(
        self,
        user_id: Optional[ObjectId | str],
        action: str,
        actor: str = "system",  # user, admin, system, razorpay_webhook
        entity_type: str = "subscription",  # subscription, payment, gems, coupon, course
        entity_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
        _id: Any = None,
    ):
        self._id = _id
        self.user_id = ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
        self.action = action
        self.actor = actor
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.details = details or {}
        self.timestamp = timestamp or datetime.now(timezone.utc)

    def to_doc(self) -> Dict[str, Any]:
        doc = {
            "user_id": self.user_id,
            "action": self.action,
            "actor": self.actor,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "details": self.details,
            "timestamp": self.timestamp,
        }
        if self._id is not None:
            doc["_id"] = self._id
        return doc
