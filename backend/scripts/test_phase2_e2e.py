"""
Phase 2 End-to-End Automated Test Suite.
Validates the complete commercial, billing, and subscription infrastructure:
1. Coupon Validation (WELCOME20, PROMO500, invalid codes)
2. Subscription Checkout Session (Monthly & Yearly with 20% discount)
3. Simulated Payment Verification & Subscription Activation
4. Gem Allocation on Plan Activation
5. In-Place Subscription Upgrade with Immediate Gem Delta Allocation
6. Auto-Renewal Cancellation (grace period preserved)
7. Auto-Renewal Resumption (restore active auto-renewal)
8. Standalone Lifetime Course Purchase & Entitlement
9. In-App Gems Top-Up Economy (Pack Checkout, Verification & Balance Ledger)
10. Admin Analytics Endpoint (MRR, ARR, Subscriber Breakdown)
"""

import sys
import requests

BASE_URL = "http://127.0.0.1:8001"

def run_phase2_e2e_tests():
    print("==================================================================")
    print("    ChartCoach Phase 2 Commercial Engine E2E Verification Suite   ")
    print("==================================================================")

    # 1. Clean up test user in DB if exists
    from app.database import get_db
    db = get_db()
    test_email = "phase2_tester@chartcoach.com"
    user_doc = db.users.find_one({"email": test_email})
    if user_doc:
        uid = user_doc["_id"]
        db.subscriptions.delete_many({"user_id": uid})
        db.payments.delete_many({"user_id": uid})
        db.checkoutSessions.delete_many({"userId": uid})
        db.coursePurchases.delete_many({"userId": uid})
        db.gemWallets.delete_many({"user_id": uid})
        db.gemTransactions.delete_many({"user_id": uid})
        db.auditLogs.delete_many({"userId": uid})
        db.users.delete_one({"_id": uid})
        print(f"Cleaned up previous test run data for {test_email}")
    db.gemTransactions.delete_many({"reference_id": {"$regex": "^(alloc_sub_test_|gempay_pay_test_)"}})

    session = requests.Session()

    # Step 1: Register and login test user
    print("\n[Test 1] User Registration & Initial Baseline...")
    res = session.post(f"{BASE_URL}/auth/register", json={
        "email": test_email,
        "full_name": "Phase Two Tester",
        "password": "SecurePassword123!"
    })
    assert res.status_code in (200, 201), f"Registration failed: {res.text}"
    user_data = res.json()
    assert user_data.get("subscription_plan") == "free", "Initial plan must be 'free'"
    print("✓ User registered with baseline free plan.")

    res = session.post(f"{BASE_URL}/auth/login", data={
        "username": test_email,
        "password": "SecurePassword123!"
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    print("✓ User authenticated successfully via cookie session.")

    # Step 2: Test Coupon Validation
    print("\n[Test 2] Coupon Engine Validation...")
    res = session.post(f"{BASE_URL}/api/v1/billing/coupons/validate", json={
        "code": "WELCOME20",
        "plan": "pro",
        "interval": "monthly"
    })
    assert res.status_code == 200, f"Coupon validation failed: {res.text}"
    coupon_res = res.json()
    assert coupon_res["valid"] is True
    assert coupon_res["discountAmount"] == int(coupon_res["basePrice"] * 0.20)
    assert coupon_res["finalPrice"] == coupon_res["basePrice"] - coupon_res["discountAmount"]
    print(f"✓ Validated WELCOME20: original ₹{coupon_res['basePrice']} -> discount ₹{coupon_res['discountAmount']} -> final ₹{coupon_res['finalPrice']}")

    # Invalid coupon test
    res = session.post(f"{BASE_URL}/api/v1/billing/coupons/validate", json={
        "code": "INVALID_CODE_XYZ",
        "plan": "pro",
        "interval": "monthly"
    })
    assert res.status_code in (200, 400)
    if res.status_code == 200:
        assert res.json().get("valid") is False
    print("✓ Invalid coupon code properly rejected.")

    # Step 3: Test Subscription Checkout Creation (Yearly & Monthly)
    print("\n[Test 3] Checkout Session Generation...")
    # Yearly with coupon
    res = session.post(f"{BASE_URL}/api/v1/billing/checkout/subscription", json={
        "plan": "trader",
        "interval": "yearly",
        "coupon_code": "WELCOME20"
    })
    assert res.status_code == 200, f"Yearly checkout failed: {res.text}"
    yearly_sess = res.json()
    assert yearly_sess["interval"] == "yearly"
    assert yearly_sess["finalPrice"] <= 20  # 20 minus discount
    print(f"✓ Created yearly checkout session {yearly_sess['sessionId']} with 20% discount: ₹{yearly_sess['finalPrice']}")

    # Monthly for Trader plan without coupon
    res = session.post(f"{BASE_URL}/api/v1/billing/checkout/subscription", json={
        "plan": "trader",
        "interval": "monthly"
    })
    assert res.status_code == 200, f"Monthly checkout failed: {res.text}"
    monthly_sess = res.json()
    assert monthly_sess["finalPrice"] == 2
    session_id = monthly_sess["sessionId"]
    print(f"✓ Created monthly checkout session {session_id} for ₹2.")

    # Step 4: Test Payment Verification & Subscription Activation
    print("\n[Test 4] Payment Verification & Plan Activation (Trader Tier)...")
    res = session.post(f"{BASE_URL}/api/v1/billing/verify", json={
        "plan": "trader",
        "interval": "monthly",
        "razorpay_payment_id": "pay_test_trader_001",
        "razorpay_subscription_id": "sub_test_trader_001",
        "razorpay_signature": "sig_verified_mock_pass",
        "session_id": session_id
    })
    assert res.status_code == 200, f"Verification failed: {res.text}"
    verify_data = res.json()
    assert verify_data["plan"] == "trader"
    assert verify_data["status"] == "active"
    print("✓ Trader subscription activated.")

    # Check Membership & Gems balance (Trader plan gets 500 monthly gems)
    res = session.get(f"{BASE_URL}/api/v1/billing/membership")
    assert res.status_code == 200
    membership = res.json()
    assert membership["plan"] == "trader"
    assert membership["gems"]["balance"] >= 500
    initial_balance = membership["gems"]["balance"]
    print(f"✓ Initial gems credited: {initial_balance} Gems.")

    # Step 5: Test Subscription Upgrade with Immediate Gem Delta Allocation
    print("\n[Test 5] Subscription Upgrade (Trader -> Pro) & Gem Difference Credit...")
    # Pro gives 1500 gems, Trader gives 500 gems. Upgrade delta is +1000 gems!
    upgrade_checkout_res = session.post(f"{BASE_URL}/api/v1/billing/checkout/subscription", json={
        "plan": "pro",
        "interval": "monthly"
    })
    assert upgrade_checkout_res.status_code == 200
    upgrade_sess = upgrade_checkout_res.json()
    assert upgrade_sess.get("isUpgrade") is True
    print("✓ Upgrade intent successfully flagged by server.")

    res = session.post(f"{BASE_URL}/api/v1/billing/verify", json={
        "plan": "pro",
        "interval": "monthly",
        "razorpay_payment_id": "pay_test_upgrade_pro_002",
        "razorpay_subscription_id": "sub_test_upgrade_pro_002",
        "razorpay_signature": "sig_verified_mock_pass",
        "session_id": upgrade_sess["sessionId"]
    })
    assert res.status_code == 200, f"Upgrade failed: {res.status_code} {res.text}"
    upgrade_verify = res.json()
    assert upgrade_verify["plan"] == "pro"

    # Verify gems balance after upgrade (+1000 gems delta)
    res = session.get(f"{BASE_URL}/api/v1/billing/membership")
    membership_pro = res.json()
    assert membership_pro["plan"] == "pro"
    expected_balance = initial_balance + 1000
    assert membership_pro["gems"]["balance"] == expected_balance, f"Expected {expected_balance}, got {membership_pro['gems']['balance']}"
    print(f"✓ Upgrade gem delta correctly credited! New balance: {membership_pro['gems']['balance']} Gems (+1000 delta).")

    # Step 6: Test Auto-Renewal Cancellation
    print("\n[Test 6] Subscription Auto-Renewal Cancellation...")
    res = session.post(f"{BASE_URL}/api/v1/billing/subscription/cancel")
    assert res.status_code == 200
    cancel_res = res.json()
    assert cancel_res["status"] == "cancelled"

    res = session.get(f"{BASE_URL}/api/v1/billing/membership")
    mem_cancel = res.json()
    assert mem_cancel["status"] == "cancelled"
    assert mem_cancel["autoRenew"] is False
    assert mem_cancel["plan"] == "pro"  # Access maintained during grace period
    print(f"✓ Subscription auto-renewal cancelled. Status: 'cancelled', plan access preserved until cycle end.")

    # Step 7: Test Auto-Renewal Resumption
    print("\n[Test 7] Subscription Auto-Renewal Resumption...")
    res = session.post(f"{BASE_URL}/api/v1/billing/subscription/resume")
    assert res.status_code == 200
    resume_res = res.json()
    assert resume_res["status"] == "active"

    res = session.get(f"{BASE_URL}/api/v1/billing/membership")
    mem_resumed = res.json()
    assert mem_resumed["status"] == "active"
    assert mem_resumed["autoRenew"] is True
    print("✓ Auto-renewal successfully resumed without re-entering checkout.")

    # Step 8: Test Standalone Course Purchase
    print("\n[Test 8] Standalone Lifetime Course Purchase...")
    # 'building-trading-strategy' is an Elite tier course (not included in Pro)
    course_id = "building-trading-strategy"
    res = session.post(f"{BASE_URL}/api/v1/billing/courses/checkout", json={
        "course_id": course_id
    })
    assert res.status_code == 200, f"Course checkout failed: {res.text}"
    course_checkout = res.json()
    assert course_checkout["price"] == 5
    print(f"✓ Standalone course checkout initiated for ₹{course_checkout['price']}.")

    res = session.post(f"{BASE_URL}/api/v1/billing/courses/verify", json={
        "course_id": course_id,
        "payment_id": "pay_test_standalone_course_003"
    })
    assert res.status_code == 200, f"Course purchase verification failed: {res.text}"
    purchase_info = res.json()
    assert purchase_info["status"] == "active"
    assert purchase_info["isLifetime"] is True
    print("✓ Course standalone purchase verified with permanent lifetime ownership.")

    # Verify course entitlement now grants access to building-trading-strategy
    res = session.get(f"{BASE_URL}/api/v1/billing/membership")
    mem_course = res.json()
    assert course_id in mem_course.get("standaloneCourses", [])
    print(f"✓ Membership entitlements include standalone purchased course '{course_id}'.")

    # Step 9: Test In-App Gems Top-Up Economy
    print("\n[Test 9] In-App Gems Top-Up Economy...")
    res = session.get(f"{BASE_URL}/api/v1/gems/packages")
    assert res.status_code == 200
    packages = res.json()
    assert len(packages) >= 3
    print(f"✓ Loaded {len(packages)} gem top-up packages: {[p['package_id'] for p in packages]}")

    pre_topup_balance = mem_course["gems"]["balance"]
    # Checkout gems_1500 pack (₹499)
    res = session.post(f"{BASE_URL}/api/v1/gems/checkout", json={
        "package_id": "gems_1500"
    })
    assert res.status_code == 200
    gem_sess = res.json()
    assert gem_sess["gems"] == 1500
    assert gem_sess["price"] == 499

    # Verify payment for gems
    res = session.post(f"{BASE_URL}/api/v1/gems/verify", json={
        "package_id": "gems_1500",
        "payment_id": "pay_test_gems_topup_004"
    })
    assert res.status_code == 200
    topup_res = res.json()
    assert (topup_res.get("gemsAdded") or topup_res.get("gemsCredited")) == 1500
    balance_val = topup_res.get("newBalance") or topup_res.get("balance")
    assert balance_val == pre_topup_balance + 1500
    print(f"✓ Successfully credited 1,500 gems! Balance: {pre_topup_balance} -> {balance_val}")

    # Step 10: Test Admin Commercial Analytics
    print("\n[Test 10] Admin Commercial Analytics Endpoint...")
    res = session.get(f"{BASE_URL}/api/v1/billing/admin/analytics")
    assert res.status_code == 200, f"Admin analytics failed: {res.text}"
    analytics = res.json()
    assert "mrr" in analytics
    assert "arr" in analytics
    assert "activeSubscribers" in analytics
    assert "subscribersByPlan" in analytics
    assert analytics["activeSubscribers"] >= 1
    assert analytics["mrr"] > 0
    print(f"✓ Admin Analytics verified: MRR = ₹{analytics['mrr']:,}, ARR = ₹{analytics['arr']:,}, Active Subs = {analytics['activeSubscribers']}")

    print("\n==================================================================")
    print("  🎉 ALL 10 PHASE 2 COMMERCIAL TESTS PASSED WITH 100% INTEGRITY!  ")
    print("==================================================================")

if __name__ == "__main__":
    try:
        run_phase2_e2e_tests()
    except Exception as e:
        print(f"\n❌ TEST RUN ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
