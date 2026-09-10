"""
Database Enrollment Flush Script for ChartCoach.
Purges all enrollments, lesson progresses, and user learning activities.
Resets courses in MongoDB to un-enrolled baseline state.
"""

from app.database import db

def flush():
    print("Flushing ChartCoach enrollments and progress...")

    e_res = db.enrollments.delete_many({})
    print(f"Deleted {e_res.deleted_count} enrollments.")

    lp_res = db.lesson_progress.delete_many({})
    print(f"Deleted {lp_res.deleted_count} lesson_progress records.")

    la_res = db.learning_activities.delete_many({})
    print(f"Deleted {la_res.deleted_count} learning_activities records.")

    # Reset any cached enrollment flags on courses
    c_res = db.courses.update_many(
        {},
        {"$set": {"isEnrolled": False, "progressPercent": 0}}
    )
    print(f"Updated {c_res.modified_count} course documents to isEnrolled=False, progressPercent=0.")

    # Reset any module lesson completed flags in courses
    courses = list(db.courses.find({}))
    for course in courses:
        modules = course.get("modules", [])
        modified = False
        for m in modules:
            for l in m.get("lessons", []):
                if l.get("completed", False):
                    l["completed"] = False
                    modified = True
        if modified:
            db.courses.update_one({"_id": course["_id"]}, {"$set": {"modules": modules}})

    # Verification checks
    total_enrollments = db.enrollments.count_documents({})
    total_progress = db.lesson_progress.count_documents({})
    total_courses = db.courses.count_documents({})
    
    total_lessons = sum(c.get("lessonCount", 0) for c in db.courses.find({}))

    print("\n--- Flush Summary ---")
    print(f"Active Enrollments: {total_enrollments}")
    print(f"Active Lesson Progress: {total_progress}")
    print(f"Total Global Courses: {total_courses}")
    print(f"Total Curriculum Lessons: {total_lessons}")
    print(">>> FLUSH COMPLETE! All courses are now NOT PURCHASED / UNENROLLED. <<<\n")

if __name__ == "__main__":
    flush()
