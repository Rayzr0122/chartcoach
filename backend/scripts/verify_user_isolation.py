"""
Multi-user data isolation and product state verification script.
Tests all 8 criteria in the Master Implementation Plan:
1. Brand new user registration
2. Baseline verification (0 enrollments, 0 progress, 0 streak, continue learning status == 'empty')
3. Explicit enrollment via POST /api/v1/courses/{course_id}/enroll
4. Verification that enrollment does not bleed into other courses or users
5. Lesson progress update & completion
6. Next lesson advancement
7. Multi-user isolation: User B registers and maintains clean 0 baseline
"""

import sys
import requests

BASE_URL = "http://127.0.0.1:8001"

def run_tests():
    print("=== Starting ChartCoach Product State & Multi-User Isolation Tests ===")
    
    # 1. Clean up test users if they exist
    from app.database import get_db
    db = get_db()
    for email in ["verify_user_a@chartcoach.com", "verify_user_b@chartcoach.com"]:
        user_doc = db.users.find_one({"email": email})
        if user_doc:
            db.enrollments.delete_many({"user_id": user_doc["_id"]})
            db.lesson_progress.delete_many({"user_id": user_doc["_id"]})
            db.learning_activities.delete_many({"user_id": user_doc["_id"]})
            db.users.delete_one({"_id": user_doc["_id"]})

    session_a = requests.Session()
    session_b = requests.Session()

    # Register User A
    print("\n[Step 1] Registering User A (verify_user_a@chartcoach.com)...")
    res = session_a.post(f"{BASE_URL}/auth/register", json={
        "email": "verify_user_a@chartcoach.com",
        "full_name": "User Alpha",
        "password": "Password123!"
    })
    assert res.status_code in (200, 201), f"Failed to register User A: {res.text}"
    user_a = res.json()
    print("User A registered successfully. Subscription plan:", user_a.get("subscription_plan"))
    assert user_a.get("subscription_plan") == "free", "User A subscription_plan must default to 'free'"

    # Login User A
    res = session_a.post(f"{BASE_URL}/auth/login", data={
        "username": "verify_user_a@chartcoach.com",
        "password": "Password123!"
    })
    assert res.status_code == 200, f"Failed to login User A: {res.text}"
    print("User A logged in.")

    # [Step 2] Verify User A Baseline State
    print("\n[Step 2] Verifying User A baseline state...")
    res = session_a.get(f"{BASE_URL}/api/v1/learning/continue")
    assert res.status_code == 200, f"Failed to get continue learning: {res.text}"
    continue_data = res.json()
    print("Continue learning status:", continue_data.get("status"))
    print("hasActiveLearning:", continue_data.get("hasActiveLearning"))
    assert continue_data.get("status") == "empty", "Status must be 'empty'"
    assert continue_data.get("hasActiveLearning") is False, "hasActiveLearning must be False"
    assert continue_data.get("course") is None, "course must be None"
    assert continue_data.get("lesson") is None, "lesson must be None"
    assert continue_data.get("recommendedCourse") is not None, "recommendedCourse must be provided"
    assert continue_data.get("recommendedCourse", {}).get("id") == "trading-101", "recommendedCourse must be trading-101"

    # Verify Summary
    res = session_a.get(f"{BASE_URL}/api/v1/learning/summary")
    assert res.status_code == 200
    summary = res.json()
    print("Summary:", summary)
    assert summary["lessonsCompleted"] == 0, "lessonsCompleted must be 0"
    assert summary["coursesCompleted"] == 0, "coursesCompleted must be 0"
    assert summary["learningStreak"] == 0, "learningStreak must be 0"
    assert summary["learningTimeMinutes"] == 0, "learningTimeMinutes must be 0"
    assert summary["activeStage"] == "Not Started", "activeStage must be 'Not Started'"

    # Verify Course Catalog for User A
    res = session_a.get(f"{BASE_URL}/api/v1/courses")
    assert res.status_code == 200
    catalog = res.json()
    assert len(catalog) == 5, f"Expected 5 courses, got {len(catalog)}"
    for c in catalog:
        user_state = c["userState"]
        assert user_state["enrolled"] is False, f"Course {c['id']} should not be enrolled"
        assert user_state["progressPercentage"] == 0, f"Course {c['id']} progress should be 0"
        assert user_state["status"] == "not_enrolled", f"Course {c['id']} status should be 'not_enrolled'"
    print("All 5 courses in catalog verified as not_enrolled with 0% progress.")

    # [Step 3] Explicit Enrollment for User A
    print("\n[Step 3] User A explicitly enrolls in trading-101...")
    res = session_a.post(f"{BASE_URL}/api/v1/courses/trading-101/enroll")
    assert res.status_code == 201, f"Failed to enroll: {res.text}"
    enroll_data = res.json()
    print("Enrollment response:", enroll_data)
    assert enroll_data["courseId"] == "trading-101"
    assert enroll_data["status"] == "active"
    assert enroll_data["progressPercentage"] == 0

    # Idempotent re-enroll check
    res = session_a.post(f"{BASE_URL}/api/v1/courses/trading-101/enroll")
    assert res.status_code == 201
    assert res.json()["courseId"] == "trading-101"

    # Verify catalog after enrollment
    res = session_a.get(f"{BASE_URL}/api/v1/courses")
    catalog = res.json()
    t101 = next(c for c in catalog if c["id"] == "trading-101")
    assert t101["userState"]["enrolled"] is True, "trading-101 must be enrolled"
    assert t101["userState"]["status"] == "in_progress", "trading-101 must be in_progress"
    
    # Check other courses remain unenrolled
    for c in catalog:
        if c["id"] != "trading-101":
            assert c["userState"]["enrolled"] is False, f"{c['id']} must remain unenrolled"

    # Verify continue learning now points to lesson 1
    res = session_a.get(f"{BASE_URL}/api/v1/learning/continue")
    continue_data = res.json()
    assert continue_data["hasActiveLearning"] is True
    assert continue_data["status"] == "ready"
    assert continue_data["course"]["id"] == "trading-101"
    assert continue_data["lesson"]["id"] == "t101-l1"
    print("Continue learning now points to trading-101 / t101-l1.")

    # [Step 4] Progress tracking & Lesson completion
    print("\n[Step 4] User A updates progress and completes t101-l1...")
    res = session_a.post(f"{BASE_URL}/api/v1/learning/courses/trading-101/lessons/t101-l1/complete")
    assert res.status_code == 200, f"Failed to complete lesson: {res.text}"
    comp_data = res.json()
    print("Complete lesson response:", comp_data)
    assert comp_data["completed"] is True
    assert comp_data["progressPercentage"] == 100
    assert comp_data["totalCompletedLessons"] == 1

    # Verify Summary reflects 1 lesson completed
    res = session_a.get(f"{BASE_URL}/api/v1/learning/summary")
    summary = res.json()
    print("User A updated summary:", summary)
    assert summary["lessonsCompleted"] == 1
    assert summary["learningStreak"] >= 1
    assert summary["learningTimeMinutes"] > 0

    # Verify Continue Learning advances to Lesson 2 (t101-l2)
    res = session_a.get(f"{BASE_URL}/api/v1/learning/continue")
    continue_data = res.json()
    print("User A next continue learning lesson:", continue_data["lesson"]["id"])
    assert continue_data["lesson"]["id"] == "t101-l2", f"Expected t101-l2, got {continue_data['lesson']['id']}"

    # [Step 5] Multi-User Isolation: User B Registers
    print("\n[Step 5] Registering User B (verify_user_b@chartcoach.com)...")
    res = session_b.post(f"{BASE_URL}/auth/register", json={
        "email": "verify_user_b@chartcoach.com",
        "full_name": "User Beta",
        "password": "Password123!"
    })
    assert res.status_code in (200, 201)
    
    session_b.post(f"{BASE_URL}/auth/login", data={
        "username": "verify_user_b@chartcoach.com",
        "password": "Password123!"
    })

    # Verify User B is completely isolated and starts at clean 0 baseline
    res = session_b.get(f"{BASE_URL}/api/v1/learning/continue")
    b_continue = res.json()
    print("User B continue learning status:", b_continue.get("status"))
    assert b_continue["status"] == "empty", "User B must have status 'empty'"
    assert b_continue["hasActiveLearning"] is False, "User B must have hasActiveLearning == False"
    assert b_continue["course"] is None, "User B course must be None"

    res = session_b.get(f"{BASE_URL}/api/v1/learning/summary")
    b_summary = res.json()
    print("User B summary:", b_summary)
    assert b_summary["lessonsCompleted"] == 0, "User B lessonsCompleted must be 0"
    assert b_summary["learningStreak"] == 0, "User B learningStreak must be 0"
    assert b_summary["learningTimeMinutes"] == 0, "User B learningTimeMinutes must be 0"

    res = session_b.get(f"{BASE_URL}/api/v1/courses")
    b_catalog = res.json()
    for c in b_catalog:
        assert c["userState"]["enrolled"] is False, f"User B should NOT be enrolled in {c['id']}"
        assert c["userState"]["progressPercentage"] == 0

    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! User isolation and product state verified! <<<")

if __name__ == "__main__":
    run_tests()
