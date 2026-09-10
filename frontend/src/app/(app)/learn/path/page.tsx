"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Lock, Play, ArrowRight, Route as RouteIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCourses, fetchCoursesFromApi, Course } from "@/lib/learning";

export default function LearningPathPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const email = user?.email || "trader@chartcoach.com";
    setCourses(getCourses(email));
    fetchCoursesFromApi(email).then((data) => {
      if (data && data.length > 0) {
        setCourses(data);
      }
    });
  }, [user]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-up max-w-4xl mx-auto">
      {/* Header */}
      <header className="space-y-1.5 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider">
          <RouteIcon className="w-4 h-4" />
          <span>Curriculum Roadmap</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Your Learning Path
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
          Follow our 5-stage sequential progression. Complete each lesson and knowledge check to unlock the next level and build institutional-grade competence.
        </p>
      </header>

      {/* Path List */}
      <div className="space-y-6">
        {courses.map((course, cIdx) => {
          const isCourseCompleted = course.progressPercent === 100;
          const isCourseStarted = course.progressPercent > 0;
          const isCourseLocked = cIdx > 1 && !courses[cIdx - 1]?.progressPercent;

          return (
            <section
              key={course.id}
              className={`rounded-2xl border transition-all ${
                isCourseLocked
                  ? "bg-slate-50/50 border-slate-200/60 opacity-70"
                  : "bg-white border-slate-200/90 shadow-xs"
              } p-5 sm:p-6`}
            >
              {/* Course Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                      isCourseCompleted
                        ? "bg-emerald-600 text-white"
                        : isCourseStarted
                        ? "bg-blue-600 text-white shadow-blue-500/20"
                        : isCourseLocked
                        ? "bg-slate-200 text-slate-400"
                        : "bg-slate-800 text-white"
                    }`}
                  >
                    {isCourseCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isCourseLocked ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      `L${course.levelNumber}`
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {course.levelName}
                      </span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-500 font-mono">{course.durationLabel}</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {course.title}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 font-mono block">
                      {course.progressPercent}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {isCourseCompleted ? "Completed" : isCourseStarted ? "In Progress" : isCourseLocked ? "Locked" : "Not Started"}
                    </span>
                  </div>

                  {!isCourseLocked && (
                    <Link
                      href={`/learn/courses/${course.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <span>Overview</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Course Lessons List */}
              <div className="pt-4 space-y-2.5">
                {course.modules.flatMap((m) => m.lessons).map((lesson, idx) => {
                  const isCurrent = !lesson.completed && !lesson.locked;

                  return (
                    <div
                      key={lesson.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? "bg-blue-50/70 border-blue-200 text-blue-950 font-semibold shadow-xs"
                          : lesson.completed
                          ? "bg-slate-50/40 border-slate-100 text-slate-700"
                          : "bg-white border-slate-100 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="shrink-0">
                          {lesson.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : isCurrent ? (
                            <div className="w-4 h-4 rounded-full border-2 border-blue-600 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            </div>
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-300" />
                          )}
                        </div>

                        <div className="truncate">
                          <span className="text-xs truncate block">
                            {idx + 1}. {lesson.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal font-mono block">
                            {lesson.durationMinutes} mins
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {lesson.completed ? (
                          <Link
                            href={`/learn/courses/${course.id}/lessons/${lesson.id}`}
                            className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 px-2 py-1"
                          >
                            Review
                          </Link>
                        ) : isCurrent ? (
                          <Link
                            href={`/learn/courses/${course.id}/lessons/${lesson.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-colors"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Continue</span>
                          </Link>
                        ) : (
                          <span className="text-[11px] text-slate-300 font-medium px-2">Locked</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
