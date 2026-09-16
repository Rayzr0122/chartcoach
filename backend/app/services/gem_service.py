"""
Gems Wallet and Immutable Ledger Service for ChartCoach.
Complies with Sections 26, 27, 28, 29 of the Senior Engineering Specification.
Handles atomic balance changes, monthly subscription allocations, deductions, and refunds.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pymongo import ReturnDocument
from pymongo.database import Database

from app.models.user import User
from app.models.subscription import GemWallet, GemTransaction
from app.core.plans import get_plan_definition, PlanTier


class GemService:
    def __init__(self, db: Database):
        self.db = db

    def get_or_create_wallet(self, user: User) -> GemWallet:
        """Retrieves user's GemWallet, creating one if not exists."""
        doc = self.db.gemWallets.find_one({"user_id": user._id})
        if doc:
            wallet = GemWallet.from_doc(doc)
            if wallet:
                return wallet

        now = datetime.now(timezone.utc)
        new_wallet = GemWallet(
            user_id=user._id,
            public_user_id=user.public_user_id,
            balance=0,
            lifetime_credited=0,
            lifetime_debited=0,
            current_period_allocated=0,
            updated_at=now,
        )
        self.db.gemWallets.update_one(
            {"user_id": user._id},
            {"$setOnInsert": new_wallet.to_doc()},
            upsert=True,
        )
        doc = self.db.gemWallets.find_one({"user_id": user._id})
        return GemWallet.from_doc(doc) or new_wallet

    def allocate_monthly_gems(
        self,
        user: User,
        plan_slug: str,
        subscription_id: str,
        period_start: datetime,
    ) -> bool:
        """
        Idempotently allocates monthly Gems upon subscription activation or renewal.
        Section 27 & 28: Subscription Gems do not duplicate on repeated webhooks.
        """
        plan_def = get_plan_definition(plan_slug)
        monthly_gems = plan_def.get("monthlyGems", 0)
        if monthly_gems <= 0:
            return False

        # 1. Idempotency check: verify whether this period was already credited
        period_str = period_start.strftime("%Y-%m") if isinstance(period_start, datetime) else str(period_start)[:7]
        idempotency_key = f"alloc_{subscription_id}_{period_str}"

        existing = self.db.gemTransactions.find_one({"reference_id": idempotency_key})
        if existing:
            return False  # Already allocated for this billing cycle

        now = datetime.now(timezone.utc)
        self.get_or_create_wallet(user)

        # 2. Update wallet balance to new monthly allocation
        updated_doc = self.db.gemWallets.find_one_and_update(
            {"user_id": user._id},
            {
                "$set": {
                    "balance": monthly_gems,
                    "current_period_allocated": monthly_gems,
                    "updated_at": now,
                },
                "$inc": {"lifetime_credited": monthly_gems},
            },
            return_document=ReturnDocument.AFTER,
        )
        new_balance = updated_doc.get("balance", monthly_gems) if updated_doc else monthly_gems

        # 3. Create immutable ledger record
        tx = GemTransaction(
            user_id=user._id,
            transaction_type="credit",
            amount=monthly_gems,
            source="subscription",
            description=f"Monthly {plan_def['name']} Plan Allocation ({monthly_gems} Gems)",
            balance_after=new_balance,
            reference_id=idempotency_key,
            billing_period_start=period_start,
            created_at=now,
        )
        self.db.gemTransactions.insert_one(tx.to_doc())
        return True

    def consume_gems(
        self,
        user: User,
        amount: int,
        source: str = "ai_coach",
        description: str = "AI Coach Consultation",
        reference_id: Optional[str] = None,
    ) -> bool:
        """
        Atomically checks balance and deducts Gems.
        Guarantees non-negative balance and ledger integrity.
        """
        if amount <= 0:
            return True

        now = datetime.now(timezone.utc)
        self.get_or_create_wallet(user)

        # Atomic deduction with balance guard
        updated_doc = self.db.gemWallets.find_one_and_update(
            {"user_id": user._id, "balance": {"$gte": amount}},
            {
                "$inc": {
                    "balance": -amount,
                    "lifetime_debited": amount,
                },
                "$set": {"updated_at": now},
            },
            return_document=ReturnDocument.AFTER,
        )

        if not updated_doc:
            return False  # Insufficient Gems

        new_balance = updated_doc.get("balance", 0)

        # Record debit in ledger
        tx = GemTransaction(
            user_id=user._id,
            transaction_type="debit",
            amount=amount,
            source=source,
            description=description,
            balance_after=new_balance,
            reference_id=reference_id,
            created_at=now,
        )
        self.db.gemTransactions.insert_one(tx.to_doc())
        return True

    def refund_gems(
        self,
        user: User,
        amount: int,
        source: str = "ai_coach",
        description: str = "Refund for Failed AI Request",
        reference_id: Optional[str] = None,
    ) -> bool:
        """Restores consumed Gems if an AI request fails execution."""
        if amount <= 0:
            return True

        now = datetime.now(timezone.utc)
        self.get_or_create_wallet(user)

        updated_doc = self.db.gemWallets.find_one_and_update(
            {"user_id": user._id},
            {
                "$inc": {
                    "balance": amount,
                    "lifetime_debited": -amount,
                },
                "$set": {"updated_at": now},
            },
            return_document=ReturnDocument.AFTER,
        )

        new_balance = updated_doc.get("balance", amount) if updated_doc else amount

        tx = GemTransaction(
            user_id=user._id,
            transaction_type="refund",
            amount=amount,
            source=source,
            description=description,
            balance_after=new_balance,
            reference_id=reference_id,
            created_at=now,
        )
        self.db.gemTransactions.insert_one(tx.to_doc())
        return True

    def get_wallet_summary(self, user: User, limit: int = 15) -> Dict[str, Any]:
        """Returns spendable balance, allocation metrics, and recent ledger history."""
        wallet = self.get_or_create_wallet(user)
        cursor = (
            self.db.gemTransactions.find({"user_id": user._id})
            .sort("created_at", -1)
            .limit(limit)
        )

        history: List[Dict[str, Any]] = []
        for doc in cursor:
            created = doc.get("created_at")
            created_iso = created.isoformat() if isinstance(created, datetime) else str(created or "")
            history.append(
                {
                    "id": str(doc.get("_id", "")),
                    "type": doc.get("transaction_type", "credit"),
                    "amount": doc.get("amount", 0),
                    "source": doc.get("source", "system"),
                    "description": doc.get("description", ""),
                    "balanceAfter": doc.get("balance_after", 0),
                    "createdAt": created_iso,
                }
            )

        return {
            "balance": wallet.balance,
            "lifetimeCredited": wallet.lifetime_credited,
            "lifetimeDebited": wallet.lifetime_debited,
            "currentPeriodAllocated": wallet.current_period_allocated,
            "history": history,
        }

    def list_packages(self) -> List[Dict[str, Any]]:
        """Returns available gem top-up packages."""
        packages = list(self.db.gemPackages.find({"is_active": True}).sort("display_order", 1))
        if packages:
            for p in packages:
                p.pop("_id", None)
            return packages
        from app.core.plans import GEM_PACKAGES
        return GEM_PACKAGES

    def purchase_gems(
        self,
        user: User,
        package_id: str,
        payment_id: str,
    ) -> Dict[str, Any]:
        """
        Credits purchased gems to the user's wallet with category 'purchased' (Section 31-35).
        """
        packages = self.list_packages()
        pkg = next((p for p in packages if p.get("package_id") == package_id), None)
        if not pkg:
            raise ValueError(f"Invalid gem package ID: {package_id}")

        gems_to_add = pkg.get("gems", 0)
        now = datetime.now(timezone.utc)

        # Idempotency check on payment_id
        ref_id = f"gempay_{payment_id}"
        existing = self.db.gemTransactions.find_one({"reference_id": ref_id})
        if existing:
            wallet = self.get_or_create_wallet(user)
            return {
                "success": True,
                "gemsAdded": gems_to_add,
                "balance": wallet.balance,
                "package": pkg["name"],
            }

        wallet = self.get_or_create_wallet(user)
        updated_doc = self.db.gemWallets.find_one_and_update(
            {"user_id": user._id},
            {
                "$inc": {"balance": gems_to_add, "lifetime_credited": gems_to_add},
                "$set": {"updated_at": now},
            },
            return_document=ReturnDocument.AFTER,
        )

        new_balance = updated_doc.get("balance", wallet.balance + gems_to_add) if updated_doc else wallet.balance + gems_to_add

        tx = GemTransaction(
            user_id=user._id,
            transaction_type="credit",
            amount=gems_to_add,
            source="purchased",
            description=f"Purchased {pkg['name']} ({gems_to_add:,} Gems)",
            balance_after=new_balance,
            reference_id=ref_id,
            created_at=now,
        )
        self.db.gemTransactions.insert_one(tx.to_doc())

        return {
            "success": True,
            "gemsAdded": gems_to_add,
            "balance": new_balance,
            "package": pkg["name"],
        }

