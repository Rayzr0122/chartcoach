"""
Seed Subscription Plans for ChartCoach Phase 1.
Complies with Sections 10, 11, 13 of the Senior Engineering Specification.
Inserts or updates the 4 commercial plans: Basic, Trader, Pro, Elite in MongoDB.
"""

import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import db

PLANS_DATA = [
    {
        "slug": "basic",
        "name": "Basic",
        "positioning": "Getting started",
        "description": "Learn the fundamentals of stock charts and market basics at your own pace.",
        "price": 1,
        "price_yearly": 10,
        "yearly_discount_percent": 20,
        "currency": "INR",
        "billing_interval": "monthly",
        "razorpay_plan_id": "plan_basic_monthly",
        "razorpay_plan_id_yearly": "plan_basic_yearly",
        "included_courses": ["trading-101"],
        "included_tools": ["screener", "economic-calendar"],
        "simulator_access": "none",
        "community_tier": "limited",
        "ai_coach_access": True,
        "monthly_gems": 200,
        "is_active": True,
        "is_popular": False,
        "display_order": 1,
    },
    {
        "slug": "trader",
        "name": "Trader",
        "positioning": "Learn & practice",
        "description": "Practice reading price charts risk-free with our realistic market simulator.",
        "price": 2,
        "price_yearly": 20,
        "yearly_discount_percent": 20,
        "currency": "INR",
        "billing_interval": "monthly",
        "razorpay_plan_id": "plan_trader_monthly",
        "razorpay_plan_id_yearly": "plan_trader_yearly",
        "included_courses": ["trading-101", "chart-reading-101"],
        "included_tools": ["screener", "chart-analyzer", "economic-calendar", "paper-trading"],
        "simulator_access": "full",
        "community_tier": "standard",
        "ai_coach_access": True,
        "monthly_gems": 500,
        "is_active": True,
        "is_popular": False,
        "display_order": 2,
    },
    {
        "slug": "pro",
        "name": "Pro",
        "positioning": "Most popular",
        "description": "Our most complete plan. Master technical analysis, build trading strategies, and get guided AI coaching.",
        "price": 3,
        "price_yearly": 30,
        "yearly_discount_percent": 20,
        "currency": "INR",
        "billing_interval": "monthly",
        "razorpay_plan_id": "plan_pro_monthly",
        "razorpay_plan_id_yearly": "plan_pro_yearly",
        "included_courses": [
            "trading-101",
            "chart-reading-101",
            "reading-the-market",
            "language-of-price",
        ],
        "included_tools": [
            "screener",
            "chart-analyzer",
            "options-chain",
            "strategy-builder",
            "paper-trading",
            "economic-calendar",
        ],
        "simulator_access": "full",
        "community_tier": "full",
        "ai_coach_access": True,
        "monthly_gems": 1500,
        "is_active": True,
        "is_popular": True,
        "display_order": 3,
    },
    {
        "slug": "elite",
        "name": "Elite",
        "positioning": "All-inclusive",
        "description": "Complete access to all courses, every tool, maximum monthly AI coaching gems, and priority support.",
        "price": 5,
        "price_yearly": 50,
        "yearly_discount_percent": 20,
        "currency": "INR",
        "billing_interval": "monthly",
        "razorpay_plan_id": "plan_elite_monthly",
        "razorpay_plan_id_yearly": "plan_elite_yearly",
        "included_courses": [
            "trading-101",
            "chart-reading-101",
            "reading-the-market",
            "language-of-price",
            "building-trading-strategy",
        ],
        "included_tools": [
            "screener",
            "chart-analyzer",
            "options-chain",
            "strategy-builder",
            "paper-trading",
            "economic-calendar",
        ],
        "simulator_access": "full",
        "community_tier": "priority",
        "ai_coach_access": True,
        "monthly_gems": 4000,
        "is_active": True,
        "is_popular": False,
        "display_order": 4,
    },
]

COUPONS_DATA = [
    {
        "code": "WELCOME20",
        "discount_type": "percentage",
        "discount_value": 20,
        "applicable_plans": ["all"],
        "applicable_intervals": ["monthly", "yearly"],
        "is_active": True,
        "max_redemptions": 1000,
        "redemption_count": 0,
    },
    {
        "code": "PROMO500",
        "discount_type": "fixed",
        "discount_value": 500,
        "applicable_plans": ["pro", "elite"],
        "applicable_intervals": ["monthly", "yearly"],
        "is_active": True,
        "max_redemptions": 500,
        "redemption_count": 0,
    },
    {
        "code": "CHARTCOACH100",
        "discount_type": "fixed",
        "discount_value": 100,
        "applicable_plans": ["all"],
        "applicable_intervals": ["monthly", "yearly"],
        "is_active": True,
        "max_redemptions": 5000,
        "redemption_count": 0,
    },
]

GEM_PACKAGES_DATA = [
    {"package_id": "gems_500", "name": "Starter Pack", "gems": 500, "price": 199, "currency": "INR", "is_popular": False, "is_active": True, "display_order": 1},
    {"package_id": "gems_1500", "name": "Trader Pack", "gems": 1500, "price": 499, "currency": "INR", "is_popular": True, "is_active": True, "display_order": 2},
    {"package_id": "gems_5000", "name": "Institutional Pack", "gems": 5000, "price": 1299, "currency": "INR", "is_popular": False, "is_active": True, "display_order": 3},
]


def seed_subscription_plans():
    print("Seeding Subscription Plans into MongoDB 'subscriptionPlans'...")
    for plan in PLANS_DATA:
        res = db.subscriptionPlans.update_one(
            {"slug": plan["slug"]},
            {"$set": plan},
            upsert=True,
        )
        status = "Upserted" if res.upserted_id else "Updated"
        print(f"  [{status}] Plan '{plan['name']}' (₹{plan['price']}/mo, ₹{plan['price_yearly']}/yr, {plan['monthly_gems']} Gems)")

    print("\nSeeding Promotional Coupons into MongoDB 'coupons'...")
    for coupon in COUPONS_DATA:
        res = db.coupons.update_one(
            {"code": coupon["code"]},
            {"$set": coupon},
            upsert=True,
        )
        status = "Upserted" if res.upserted_id else "Updated"
        val_str = f"{coupon['discount_value']}%" if coupon["discount_type"] == "percentage" else f"₹{coupon['discount_value']}"
        print(f"  [{status}] Coupon '{coupon['code']}' ({val_str} off)")

    print("\nSeeding Gem Packages into MongoDB 'gemPackages'...")
    for pkg in GEM_PACKAGES_DATA:
        res = db.gemPackages.update_one(
            {"package_id": pkg["package_id"]},
            {"$set": pkg},
            upsert=True,
        )
        status = "Upserted" if res.upserted_id else "Updated"
        print(f"  [{status}] Gem Package '{pkg['name']}' ({pkg['gems']} Gems for ₹{pkg['price']})")

    print("\nSuccessfully seeded Phase 2 commercial foundation in MongoDB.")


if __name__ == "__main__":
    seed_subscription_plans()

