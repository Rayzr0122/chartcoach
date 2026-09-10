"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, BookOpen, Clock, ArrowRight, Play, CheckCircle2, RotateCcw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCourses, fetchCoursesFromApi, Course, LevelType } from "@/lib/learning";

function CoursesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [courses, setCourses] = useState<Course[]>([]);
  const initialSearch = searchParams.get("search") || "";
  const initialLevel = searchParams.get("level") || "All";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedLevel, setSelectedLevel] = useState<string>(initialLevel);

  useEffect(() => {
    const email = user?.email || "trader@chartcoach.com";
    setCourses(getCourses(email));
    fetchCoursesFromApi(email).then((data) => {
      if (data && data.length > 0) {
        setCourses(data);
      }
    });
  }, [user]);

  // Keep query params in sync
  function handleLevelChange(level: string) {
    setSelectedLevel(level);
    const params = new URLSearchParams(searchParams.toString());
    if (level === "All") params.delete("level");
    else params.set("level", level.toLowerCase());
    router.replace(`/learn/courses?${params.toString()}`);
  }

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    const params = new URLSearchParams(searchParams.toString());
    if (!q.trim()) params.delete("search");
    else params.set("search", q.trim());
    router.replace(`/learn/courses?${params.toString()}`);
  }

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Level filter
      if (selectedLevel !== "All" && course.level.toLowerCase() !== selectedLevel.toLowerCase()) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = course.title.toLowerCase().includes(q);
        const matchTag = course.tagline.toLowerCase().includes(q);
        const matchDesc = course.description.toLowerCase().includes(q);
        if (!matchTitle && !matchTag && !matchDesc) return false;
      }
      return true;
    });
  }, [courses, selectedLevel, searchQuery]);

  const levelTabs = ["All", "Beginner", "Intermediate", "Advanced"];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-up">
      {/* Header */}
      <header className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Courses & Masterclasses
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
          Progress from foundational market mechanics to institutional order flow and position sizing.
        </p>
      </header>

      {/* Search & Level Filters */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        {/* Level Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {levelTabs.map((level) => {
            const isSelected = selectedLevel.toLowerCase() === level.toLowerCase();
            return (
              <button
                key={level}
                type="button"
                onClick={() => handleLevelChange(level)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-9 pr-3 py-2 bg-white text-xs text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200/90 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all shadow-xs"
          />
        </div>
      </section>

      {/* Courses Grid */}
      <section>
        {filteredCourses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-3">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
            <h3 className="text-base font-bold text-slate-800">No courses found.</h3>
            <p className="text-xs text-slate-400">Try adjusting your keyword search or selected level filter.</p>
            <button
              type="button"
              onClick={() => {
                handleLevelChange("All");
                handleSearchChange("");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCourses.map((course) => {
              const isCompleted = course.progressPercent === 100;
              const isStarted = course.progressPercent > 0;

              return (
                <div
                  key={course.id}
                  className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between group"
                >
                  {/* Top: Badges & Description */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70">
                        {course.level}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        Level {course.levelNumber}
                      </span>
                    </div>

                    <div>
                      <Link href={`/learn/courses/${course.id}`}>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                          {course.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {course.tagline}
                      </p>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 font-mono">
                      <span className="flex items-center gap-1 text-slate-500">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span>{course.lessonCount} Lessons</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{course.durationLabel}</span>
                      </span>
                    </div>

                    {/* Progress Bar (if started) */}
                    {isStarted && (
                      <div className="pt-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Progress</span>
                          <span className="font-bold text-blue-600">{course.progressPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted ? "bg-emerald-500" : "bg-blue-600"
                            }`}
                            style={{ width: `${course.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-400">
                      {isCompleted ? "Completed" : isStarted ? "In Progress" : "Not started"}
                    </span>

                    <Link
                      href={`/learn/courses/${course.id}`}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                        isCompleted
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          : isStarted
                          ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Review</span>
                        </>
                      ) : isStarted ? (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Continue</span>
                        </>
                      ) : (
                        <>
                          <span>Start Course</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-64 bg-slate-200 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="h-56 bg-slate-100 rounded-2xl" />
            <div className="h-56 bg-slate-100 rounded-2xl" />
            <div className="h-56 bg-slate-100 rounded-2xl" />
          </div>
        </div>
      }
    >
      <CoursesContent />
    </Suspense>
  );
}
