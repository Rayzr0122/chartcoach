"""
Central Subscription Plans & Entitlements Architecture for ChartCoach.
Complies with Sections 10, 11, 13, 16 of the Senior Engineering Specification.
"""

from typing import Dict, Any, List


class PlanTier:
    FREE = "free"
    BASIC = "basic"
    TRADER = "trader"
    PRO = "pro"
    ELITE = "elite"


PLAN_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    PlanTier.FREE: {
        "name": "Free",
        "code": "free",
        "price": 0,
        "priceYearly": 0,
        "yearlyDiscountPercent": 0,
        "positioning": "Explore ChartCoach",
        "description": "Explore the platform overview and free market data previews.",
        "monthlyGems": 0,
        "includedCourses": [],
        "includedTools": ["screener", "economic-calendar"],
        "simulatorAccess": "none",
        "communityTier": "limited",
        "aiCoachAccess": False,
        "entitlements": {
            "courses": [],
            "tools": ["screener", "economic-calendar"],
            "hasSimulator": False,
            "hasAiCoach": False,
            "communityTier": "limited",
            "monthlyGems": 0,
        },
    },
    PlanTier.BASIC: {
        "name": "Basic",
        "code": "basic",
        "price": 1,
        "priceYearly": 10,
        "yearlyDiscountPercent": 20,
        "positioning": "Getting started",
        "description": "Learn the fundamentals of stock charts and market basics at your own pace.",
        "monthlyGems": 200,
        "includedCourses": ["trading-101"],
        "includedTools": ["screener", "economic-calendar"],
        "simulatorAccess": "none",
        "communityTier": "limited",
        "aiCoachAccess": True,
        "entitlements": {
            "courses": ["trading-101"],
            "tools": ["screener", "economic-calendar"],
            "hasSimulator": False,
            "hasAiCoach": True,
            "communityTier": "limited",
            "monthlyGems": 200,
        },
    },
    PlanTier.TRADER: {
        "name": "Trader",
        "code": "trader",
        "price": 2,
        "priceYearly": 20,
        "yearlyDiscountPercent": 20,
        "positioning": "Learn & practice",
        "description": "Practice reading price charts risk-free with our realistic market simulator.",
        "monthlyGems": 500,
        "includedCourses": ["trading-101", "chart-reading-101"],
        "includedTools": ["screener", "chart-analyzer", "economic-calendar", "paper-trading"],
        "simulatorAccess": "full",
        "communityTier": "standard",
        "aiCoachAccess": True,
        "entitlements": {
            "courses": ["trading-101", "chart-reading-101"],
            "tools": ["screener", "chart-analyzer", "economic-calendar", "paper-trading"],
            "hasSimulator": True,
            "hasAiCoach": True,
            "communityTier": "standard",
            "monthlyGems": 500,
        },
    },
    PlanTier.PRO: {
        "name": "Pro",
        "code": "pro",
        "price": 3,
        "priceYearly": 30,
        "yearlyDiscountPercent": 20,
        "positioning": "Most popular",
        "description": "Our most complete plan. Master technical analysis, build trading strategies, and get guided AI coaching.",
        "monthlyGems": 1500,
        "includedCourses": [
            "trading-101",
            "chart-reading-101",
            "reading-the-market",
            "language-of-price",
        ],
        "includedTools": [
            "screener",
            "chart-analyzer",
            "options-chain",
            "strategy-builder",
            "paper-trading",
            "economic-calendar",
        ],
        "simulatorAccess": "full",
        "communityTier": "full",
        "aiCoachAccess": True,
        "entitlements": {
            "courses": [
                "trading-101",
                "chart-reading-101",
                "reading-the-market",
                "language-of-price",
            ],
            "tools": [
                "screener",
                "chart-analyzer",
                "options-chain",
                "strategy-builder",
                "paper-trading",
                "economic-calendar",
            ],
            "hasSimulator": True,
            "hasAiCoach": True,
            "communityTier": "full",
            "monthlyGems": 1500,
        },
    },
    PlanTier.ELITE: {
        "name": "Elite",
        "code": "elite",
        "price": 5,
        "priceYearly": 50,
        "yearlyDiscountPercent": 20,
        "positioning": "All-inclusive",
        "description": "Complete access to all courses, every tool, maximum monthly AI coaching gems, and priority support.",
        "monthlyGems": 4000,
        "includedCourses": [
            "trading-101",
            "chart-reading-101",
            "reading-the-market",
            "language-of-price",
            "building-trading-strategy",
        ],
        "includedTools": [
            "screener",
            "chart-analyzer",
            "options-chain",
            "strategy-builder",
            "paper-trading",
            "economic-calendar",
        ],
        "simulatorAccess": "full",
        "communityTier": "priority",
        "aiCoachAccess": True,
        "entitlements": {
            "courses": [
                "trading-101",
                "chart-reading-101",
                "reading-the-market",
                "language-of-price",
                "building-trading-strategy",
            ],
            "tools": [
                "screener",
                "chart-analyzer",
                "options-chain",
                "strategy-builder",
                "paper-trading",
                "economic-calendar",
            ],
            "hasSimulator": True,
            "hasAiCoach": True,
            "communityTier": "priority",
            "monthlyGems": 4000,
        },
    },
}

# Mapping capabilities to the minimum required plan
MINIMUM_PLAN_FOR_CAPABILITY: Dict[str, str] = {
    # Courses
    "course:trading-101": PlanTier.BASIC,
    "course:chart-reading-101": PlanTier.TRADER,
    "course:reading-the-market": PlanTier.PRO,
    "course:language-of-price": PlanTier.PRO,
    "course:building-trading-strategy": PlanTier.ELITE,
    # Tools
    "tool:screener": PlanTier.BASIC,
    "tool:economic-calendar": PlanTier.BASIC,
    "tool:chart-analyzer": PlanTier.TRADER,
    "tool:paper-trading": PlanTier.TRADER,
    "tool:options-chain": PlanTier.PRO,
    "tool:strategy-builder": PlanTier.PRO,
    # Simulator & Coach
    "simulator": PlanTier.TRADER,
    "ai-coach": PlanTier.BASIC,
}


def get_plan_definition(plan_code: str | None) -> Dict[str, Any]:
    code = (plan_code or PlanTier.FREE).lower()
    return PLAN_DEFINITIONS.get(code, PLAN_DEFINITIONS[PlanTier.FREE])


def get_plan_entitlements(plan_code: str | None) -> Dict[str, Any]:
    return get_plan_definition(plan_code)["entitlements"]


def get_minimum_plan_for_capability(capability: str) -> str:
    return MINIMUM_PLAN_FOR_CAPABILITY.get(capability, PlanTier.PRO)


def list_plans() -> List[Dict[str, Any]]:
    return [
        PLAN_DEFINITIONS[PlanTier.BASIC],
        PLAN_DEFINITIONS[PlanTier.TRADER],
        PLAN_DEFINITIONS[PlanTier.PRO],
        PLAN_DEFINITIONS[PlanTier.ELITE],
    ]


COURSE_STANDALONE_PRICES: Dict[str, Dict[str, Any]] = {
    "trading-101": {"price": 1, "title": "Trading 101 — Beginner Foundation"},
    "course-1": {"price": 1, "title": "Trading 101 — Beginner Foundation"},
    "chart-reading-101": {"price": 2, "title": "Chart Reading 101"},
    "course-2": {"price": 2, "title": "Chart Reading 101"},
    "reading-the-market": {"price": 3, "title": "Reading the Market"},
    "course-3": {"price": 3, "title": "Reading the Market"},
    "language-of-price": {"price": 4, "title": "The Language of Price"},
    "course-4": {"price": 4, "title": "The Language of Price"},
    "building-trading-strategy": {"price": 5, "title": "Building a Trading Strategy"},
    "course-5": {"price": 5, "title": "Building a Trading Strategy"},
}


GEM_PACKAGES: List[Dict[str, Any]] = [
    {"package_id": "gems_500", "name": "Starter Pack", "gems": 500, "price": 199, "is_popular": False},
    {"package_id": "gems_1500", "name": "Trader Pack", "gems": 1500, "price": 499, "is_popular": True},
    {"package_id": "gems_5000", "name": "Institutional Pack", "gems": 5000, "price": 1299, "is_popular": False},
]

