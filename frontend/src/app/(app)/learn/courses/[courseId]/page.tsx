"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { CheckCircle2, Lock, Play, ArrowLeft, BookOpen, Clock, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCourse, fetchCourseFromApi, Course, Lesson, enrollCourse } from "@/lib/learning";
import { enrollInCourse } from "@/lib/api";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default function CourseDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { courseId } = resolvedParams;

  const { user } = useAuth();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = user?.email || "trader@chartcoach.com";
    const localCourse = getCourse(courseId, email);
    if (localCourse) {
      setCourse(localCourse);
      setLoading(false);
    }
    fetchCourseFromApi(courseId, email).then((remoteCourse) => {
      if (remoteCourse) {
        setCourse(remoteCourse);
      }
      setLoading(false);
    });
  }, [courseId, user]);

  const handleStartOrContinue = async (e: React.MouseEvent, targetLessonId: string) => {
    if (course && !course.isEnrolled) {
      e.preventDefault();
      try {
        await enrollInCourse(course.id);
      } catch (err) {
        console.warn("Backend enrollment:", err);
      }
      enrollCourse(course.id, user?.email || "trader@chartcoach.com");
      router.push(`/learn/courses/${course.id}/lessons/${targetLessonId}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="h-44 bg-slate-200 rounded-2xl" />
        <div className="space-y-3">
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!course) {
    notFound();
  }

  // Find next actionable lesson
  const allLessons: Lesson[] = [];
  course.modules.forEach((m) => m.lessons.forEach((l) => allLessons.push(l)));
  const nextLesson = allLessons.find((l) => !l.completed) || allLessons[0];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-up max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        href="/learn/courses"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Courses</span>
      </Link>

      {/* Hero Overview Card */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            {course.level}
          </span>
          <span className="text-xs text-slate-400 font-medium">·</span>
          <span className="text-xs text-slate-500 font-semibold">{course.levelName}</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {course.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed max-w-2xl">
            {course.description}
          </p>
        </div>

        {/* Metadata + CTA Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>{course.lessonCount} Lessons</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{course.durationLabel}</span>
            </span>
          </div>

          {nextLesson && (
            <Link
              href={`/learn/courses/${course.id}/lessons/${nextLesson.id}`}
              onClick={(e) => handleStartOrContinue(e, nextLesson.id)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{course.progressPercent > 0 ? "Continue Learning" : "Start Course"}</span>
            </Link>
          )}
        </div>
      </section>

      {/* Progress Section */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
            Your Progress
          </span>
          <span className="font-extrabold text-blue-600 font-mono text-sm">
            {course.progressPercent}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              course.progressPercent === 100 ? "bg-emerald-500" : "bg-blue-600"
            }`}
            style={{ width: `${course.progressPercent}%` }}
          />
        </div>
      </section>

      {/* Course Content Modules */}
      <section className="space-y-4">
        <div className="pb-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Course Content
          </span>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Structured Curriculum</h2>
        </div>

        <div className="space-y-4">
          {course.modules.map((module) => (
            <div
              key={module.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3"
            >
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {module.title}
              </h3>

              <div className="space-y-2">
                {module.lessons.map((lesson) => {
                  const isCurrent = !lesson.completed && !lesson.locked;

                  if (lesson.locked) {
                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed"
                        title="Complete previous lesson to unlock"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono font-bold text-slate-300 w-6 shrink-0">
                            {String(lesson.order).padStart(2, "0")}
                          </span>
                          <Lock className="w-4 h-4 text-slate-300 shrink-0" />
                          <div className="truncate">
                            <span className="text-xs font-medium text-slate-400 block truncate">
                              {lesson.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {lesson.durationMinutes} mins · Locked
                            </span>
                          </div>
                        </div>

                        <span className="text-[11px] text-slate-400 font-medium shrink-0">
                          Locked
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={lesson.id}
                      href={`/learn/courses/${course.id}/lessons/${lesson.id}`}
                      onClick={(e) => handleStartOrContinue(e, lesson.id)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        isCurrent
                          ? "bg-blue-50/80 border-blue-200 text-blue-950 font-bold shadow-xs hover:border-blue-300"
                          : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <span className="text-xs font-mono font-bold text-slate-400 w-6 shrink-0">
                          {String(lesson.order).padStart(2, "0")}
                        </span>

                        {lesson.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-blue-600 flex items-center justify-center shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          </div>
                        )}

                        <div className="truncate">
                          <span className="text-xs block truncate">{lesson.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">
                            {lesson.durationMinutes} mins {lesson.completed ? "· Completed" : "· Current"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-blue-600">
                        <span>{lesson.completed ? "Review" : "Continue"}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
