"""
Central Subscription Plans & Entitlements Architecture for ChartCoach.
Complies with Sections 14, 25, and 34 of the Product State Specification.
"""

from typing import Dict, Any, List


class PlanTier:
    FREE = "free"
    PRO = "pro"
    MASTER = "master"
    INSTITUTIONAL = "institutional"


PLAN_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    PlanTier.FREE: {
        "name": "Free",
        "code": "free",
        "description": "Foundational market education and core learning path.",
        "entitlements": {
            "canAccessBeginnerCourses": True,
            "canAccessAdvancedCourses": False,
            "canAccessLiveStream": False,
            "canAccessSim": True,
            "canAccessAITutor": True,
            "maxWatchlistItems": 10,
            "maxDailySimTrades": 5,
            "tier": "free",
        },
    },
    PlanTier.PRO: {
        "name": "Pro",
        "code": "pro",
        "description": "Full curriculum access, advanced chart patterns, and real-time simulator.",
        "entitlements": {
            "canAccessBeginnerCourses": True,
            "canAccessAdvancedCourses": True,
            "canAccessLiveStream": True,
            "canAccessSim": True,
            "canAccessAITutor": True,
            "maxWatchlistItems": 50,
            "maxDailySimTrades": 50,
            "tier": "pro",
        },
    },
    PlanTier.MASTER: {
        "name": "Master",
        "code": "master",
        "description": "Priority mentorship, algorithmic execution drills, and pro community.",
        "entitlements": {
            "canAccessBeginnerCourses": True,
            "canAccessAdvancedCourses": True,
            "canAccessLiveStream": True,
            "canAccessSim": True,
            "canAccessAITutor": True,
            "maxWatchlistItems": 200,
            "maxDailySimTrades": -1,  # Unlimited
            "tier": "master",
        },
    },
    PlanTier.INSTITUTIONAL: {
        "name": "Institutional",
        "code": "institutional",
        "description": "Desk-level risk management, team workspaces, and bespoke mentorship.",
        "entitlements": {
            "canAccessBeginnerCourses": True,
            "canAccessAdvancedCourses": True,
            "canAccessLiveStream": True,
            "canAccessSim": True,
            "canAccessAITutor": True,
            "maxWatchlistItems": -1,
            "maxDailySimTrades": -1,
            "tier": "institutional",
        },
    },
}


def get_plan_definition(plan_code: str | None) -> Dict[str, Any]:
    code = (plan_code or PlanTier.FREE).lower()
    return PLAN_DEFINITIONS.get(code, PLAN_DEFINITIONS[PlanTier.FREE])


def get_plan_entitlements(plan_code: str | None) -> Dict[str, Any]:
    return get_plan_definition(plan_code)["entitlements"]


def list_plans() -> List[Dict[str, Any]]:
    return list(PLAN_DEFINITIONS.values())
