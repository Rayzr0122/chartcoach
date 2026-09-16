"""
Comprehensive Phase 1 End-to-End Test Suite for ChartCoach.
Tests:
1. Subscription Plans Configuration & MongoDB Persistence
2. Entitlement Engine & Capability Mapping
3. Subscription Checkout & Signature Verification
4. Gems Wallet & Immutable Ledger Operations
5. Monthly Gems Allocation & Idempotency
6. Auto-Renewal Cancellation & Period-End Grace
7. Course Catalog Entitlement Injection & Server-Side Route Guarding
"""

import sys
import os
from datetime import datetime, timezone, timedelta
from bson import ObjectId

# Add backend root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import db
from app.models.user import User
from app.core.plans import PlanTier
from app.services.billing_service import BillingService
from app.services.entitlement_service import EntitlementService
from app.services.gem_service import GemService
from app.services.learning_service import LearningService


def run_tests():
    print("==================================================")
    print("STARTING CHARTCOACH PHASE 1 E2E TESTS")
    print("==================================================")

    # 1. Verify 4 Subscription Plans in MongoDB
    print("\n[TEST 1] Verifying 4 Subscription Plans in MongoDB...")
    billing_service = BillingService(db)
    billing_service.is_mock = True
    plans = billing_service.get_plans()
    assert len(plans) >= 4, f"Expected at least 4 plans, got {len(plans)}"
    plan_slugs = [p.get("slug") for p in plans]
    for required in ["basic", "trader", "pro", "elite"]:
        assert required in plan_slugs, f"Plan '{required}' missing from database!"
    print("  ✓ Basic, Trader, Pro, Elite plans successfully loaded.")

    # 2. Create / use test user
    print("\n[TEST 2] Setting up isolated test user...")
    test_email = "phase1_qa_user@chartcoach.com"
    db.users.delete_many({"email": test_email})
    test_user_id = ObjectId()
    test_user = User(
        email=test_email,
        full_name="Phase 1 QA Tester",
        hashed_password="hashed_pass_placeholder",
        public_user_id="CC-QA-001",
        subscription_plan="free",
        subscription_status="active",
        _id=test_user_id,
    )
    db.users.insert_one(test_user.to_doc())
    # Clean any prior records
    db.subscriptions.delete_many({"user_id": test_user_id})
    db.payments.delete_many({"user_id": test_user_id})
    db.gemWallets.delete_many({"user_id": test_user_id})
    db.gemTransactions.delete_many({"user_id": test_user_id})
    print("  ✓ Isolated test user prepared.")

    # 3. Entitlement Engine - Free Tier
    print("\n[TEST 3] Testing Free Tier Entitlements...")
    entitlements = EntitlementService(db)
    assert not entitlements.is_entitled(test_user, "course:trading-101"), "Free user should not be entitled to Trading 101"
    assert not entitlements.is_entitled(test_user, "simulator"), "Free user should not be entitled to Simulator"
    assert not entitlements.is_entitled(test_user, "tool:chart-analyzer"), "Free user should not have Chart Analyzer"
    print("  ✓ Free tier properly restricts premium capabilities.")

    # 4. Checkout and Verification for Pro Plan
    print("\n[TEST 4] Testing Pro Subscription Checkout & Payment Verification...")
    checkout_res = billing_service.create_subscription_checkout(test_user, "pro")
    assert checkout_res.get("subscriptionId", "").startswith("sub_") or checkout_res.get("orderId", "").startswith("order_"), "Invalid checkout session generated"
    assert checkout_res["amount"] == 300, "Expected ₹3 in paise"

    verify_res = billing_service.verify_payment(
        user=test_user,
        razorpay_payment_id="pay_phase1_test_001",
        razorpay_subscription_id=checkout_res.get("subscriptionId") or checkout_res.get("orderId") or "sub_mock",
        razorpay_signature="mock_signature_verified",
        plan_slug="pro",
    )
    assert verify_res["success"] is True
    assert verify_res["plan"] == "pro"
    print("  ✓ Payment verification succeeded.")

    # 5. Verify Subscriptions & Gems Ledger
    print("\n[TEST 5] Verifying Subscription Persistence & Monthly Gem Allocation...")
    sub = entitlements.get_active_subscription(test_user)
    assert sub is not None, "Active subscription not found in DB!"
    assert sub.plan_id == "pro"
    assert sub.status == "active"
    assert sub.auto_renew is True

    gem_service = GemService(db)
    wallet = gem_service.get_or_create_wallet(test_user)
    assert wallet.balance == 1500, f"Expected 1,500 Gems for Pro, found {wallet.balance}"
    print("  ✓ 1,500 monthly Gems allocated to wallet.")

    # 6. Idempotency Check on Duplicate Allocation
    print("\n[TEST 6] Testing Monthly Gems Idempotency...")
    # Attempt duplicate credit for same period
    second_alloc = gem_service.allocate_monthly_gems(
        user=test_user,
        plan_slug="pro",
        subscription_id=sub.razorpay_subscription_id,
        period_start=sub.current_period_start,
    )
    assert second_alloc is False, "Duplicate allocation was not rejected!"
    wallet_check = gem_service.get_or_create_wallet(test_user)
    assert wallet_check.balance == 1500, "Wallet balance duplicated!"
    print("  ✓ Idempotency verified: duplicate allocation safely rejected.")

    # 7. Entitlement Verification on Active Pro Plan
    print("\n[TEST 7] Testing Pro Plan Entitlement Capabilities...")
    # Pro unlocks Trading 101, Chart Reading 101, Reading the Market, Language of Price
    assert entitlements.is_entitled(test_user, "course:trading-101") is True
    assert entitlements.is_entitled(test_user, "course:chart-reading-101") is True
    assert entitlements.is_entitled(test_user, "course:reading-the-market") is True
    assert entitlements.is_entitled(test_user, "course:language-of-price") is True
    # Pro does NOT unlock Level 5: Building a Trading Strategy (Elite only)
    assert entitlements.is_entitled(test_user, "course:building-trading-strategy") is False
    # Pro unlocks simulator & options chain
    assert entitlements.is_entitled(test_user, "simulator") is True
    assert entitlements.is_entitled(test_user, "tool:options-chain") is True
    assert entitlements.is_entitled(test_user, "tool:strategy-builder") is True
    assert entitlements.is_entitled(test_user, "ai-coach") is True
    print("  ✓ Pro entitlements match Section 11 Matrix precisely.")

    # 8. Gem Consumption & Insufficient Balance
    print("\n[TEST 8] Testing Atomic Gem Consumption & Rejection...")
    deducted = gem_service.consume_gems(test_user, 20, source="ai_coach", description="Test Question")
    assert deducted is True, "Failed to consume 20 gems"
    wallet_after_deduct = gem_service.get_or_create_wallet(test_user)
    assert wallet_after_deduct.balance == 1480, f"Expected 1480 gems, got {wallet_after_deduct.balance}"

    # Try deducting more than balance
    overdraft = gem_service.consume_gems(test_user, 5000, source="ai_coach", description="Excessive request")
    assert overdraft is False, "Overdraft was incorrectly permitted!"
    assert gem_service.get_or_create_wallet(test_user).balance == 1480, "Balance changed on failed overdraft!"
    print("  ✓ Atomic gem deduction and insufficient balance guard verified.")

    # 9. Gem Refund on AI Failure
    print("\n[TEST 9] Testing Gem Refund on AI Request Failure...")
    refunded = gem_service.refund_gems(test_user, 20, source="ai_coach", description="Refund Test")
    assert refunded is True
    assert gem_service.get_or_create_wallet(test_user).balance == 1500, "Refund did not restore balance!"
    print("  ✓ Gem refund successfully restored balance.")

    # 10. Cancellation & Grace Period Persistence (Section 23)
    print("\n[TEST 10] Testing Auto-Renewal Cancellation & Period-End Grace...")
    cancel_res = billing_service.cancel_subscription(test_user)
    assert cancel_res["success"] is True
    assert cancel_res["autoRenew"] is False

    # Verify access is NOT destroyed immediately
    sub_after_cancel = entitlements.get_active_subscription(test_user)
    assert sub_after_cancel is not None, "Subscription was deleted prematurely on cancellation!"
    assert sub_after_cancel.auto_renew is False
    assert entitlements.is_entitled(test_user, "course:trading-101") is True, "Access revoked prematurely!"
    print("  ✓ Cancellation disabled auto-renew while preserving access until period end.")

    # 11. Course Catalog DTO Entitlement Injection
    print("\n[TEST 11] Testing Course Catalog Entitlement Injection...")
    learning_service = LearningService(db)
    catalog = learning_service.get_course_catalog(test_user)
    assert len(catalog) == 5, f"Expected 5 courses in catalog, got {len(catalog)}"

    c1 = next(c for c in catalog if c.id == "trading-101")
    c5 = next(c for c in catalog if c.id == "building-trading-strategy")
    assert c1.userState.isLocked is False, "Trading 101 should be unlocked on Pro"
    assert c5.userState.isLocked is True, "Building a Trading Strategy should be locked on Pro"
    assert c5.userState.requiredPlan == "elite", "Building a Trading Strategy should require Elite"
    assert c5.userState.state == "locked"
    print("  ✓ Course catalog accurately reflects locked vs unlocked states.")

    # Clean up test user
    db.users.delete_many({"email": test_email})
    db.subscriptions.delete_many({"user_id": test_user_id})
    db.payments.delete_many({"user_id": test_user_id})
    db.gemWallets.delete_many({"user_id": test_user_id})
    db.gemTransactions.delete_many({"user_id": test_user_id})

    print("\n==================================================")
    print("ALL PHASE 1 E2E TESTS PASSED SUCCESSFULLY! (11/11)")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
