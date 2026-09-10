"use client";

import { useState } from "react";
import { Course } from "@/lib/courses";

type CoursesViewProps = {
  courses: Course[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCourse: (course: Course) => void;
  onEnrollCourse: (courseId: string) => void;
};

export default function CoursesView({
  courses,
  searchQuery,
  onSearchChange,
  onOpenCourse,
  onEnrollCourse,
}: CoursesViewProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const levelBadges = [
    { num: "all" as const, label: "All Levels", count: courses.length },
    { num: 1 as const, label: "Level 1: Foundations", color: "blue", count: courses.filter((c) => c.levelNumber === 1).length },
    { num: 2 as const, label: "Level 2: Technician", color: "emerald", count: courses.filter((c) => c.levelNumber === 2).length },
    { num: 3 as const, label: "Level 3: Strategist", color: "purple", count: courses.filter((c) => c.levelNumber === 3).length },
    { num: 4 as const, label: "Level 4: Risk Manager", color: "amber", count: courses.filter((c) => c.levelNumber === 4).length },
    { num: 5 as const, label: "Level 5: Elite Analyst", color: "rose", count: courses.filter((c) => c.levelNumber === 5).length },
  ];

  const categories = ["All", "Enrolled", "Price Action", "Smart Money (SMC)", "Risk Management", "Options & Derivatives"];

  // Filter courses
  const filtered = courses.filter((course) => {
    // Level filter
    if (selectedLevel !== "all" && course.levelNumber !== selectedLevel) {
      return false;
    }

    // Category filter
    if (selectedCategory === "Enrolled") {
      if (!course.isEnrolled) return false;
    } else if (selectedCategory !== "All") {
      if (course.category !== selectedCategory) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = course.title.toLowerCase().includes(q);
      const matchTagline = course.tagline.toLowerCase().includes(q);
      const matchDesc = course.description.toLowerCase().includes(q);
      if (!matchTitle && !matchTagline && !matchDesc) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ─── LEVEL PROGRESSION ROADMAP BANNER ─── */}
      <section className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <span className="text-[11px] uppercase font-bold text-blue-400 tracking-wider">
              5-Stage Mastery Curriculum
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Structured from First Candle to Institutional Order Flow
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              No guesswork or random YouTube videos. Follow our step-by-step masterclasses designed to build disciplined, profitable trading habits.
            </p>
          </div>

          {/* Quick 5 Level Stepper Indicator */}
          <div className="grid grid-cols-5 gap-2 bg-white/5 p-3 rounded-xl border border-white/10 shrink-0">
            {[
              { lvl: "L1", title: "Foundations", active: true },
              { lvl: "L2", title: "Patterns", active: true },
              { lvl: "L3", title: "Order Flow", active: true },
              { lvl: "L4", title: "Risk Math", active: true },
              { lvl: "L5", title: "Mindset", active: true },
            ].map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center justify-center mx-auto mb-1">
                  {step.lvl}
                </div>
                <span className="text-[10px] text-slate-300 font-medium block">{step.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FILTERS & SEARCH ROW ─── */}
      <section className="space-y-3">
        {/* Level Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {levelBadges.map((lvl) => {
            const isSelected = selectedLevel === lvl.num;
            return (
              <button
                key={String(lvl.num)}
                type="button"
                onClick={() => setSelectedLevel(lvl.num)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{lvl.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {lvl.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary Category Pills & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Showing <strong className="text-slate-700">{filtered.length}</strong> masterclasses
          </div>
        </div>
      </section>

      {/* ─── COURSE CARDS GRID ─── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <svg
              className="w-10 h-10 mx-auto mb-3 text-slate-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <h3 className="text-sm font-semibold text-slate-800">No courses match your criteria</h3>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or changing your search terms.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedLevel("all");
                setSelectedCategory("All");
                onSearchChange("");
              }}
              className="mt-3.5 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filtered.map((course) => (
            <div
              key={course.id}
              className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer"
              onClick={() => onOpenCourse(course)}
            >
              {/* Top Details */}
              <div>
                {/* Badges Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      course.levelNumber === 1
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : course.levelNumber === 2
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : course.levelNumber === 3
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : course.levelNumber === 4
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    Level {course.levelNumber}
                  </span>

                  <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    {course.category}
                  </span>
                </div>

                {/* Title & Tagline */}
                <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                  {course.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {course.tagline}
                </p>

                {/* Course Metadata */}
                <div className="flex items-center gap-3 mt-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{course.duration}</span>
                  </span>

                  <span className="text-slate-300">·</span>

                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <span>{course.totalLessons} Lessons</span>
                  </span>

                  <span className="text-slate-300">·</span>

                  <span className="flex items-center gap-1 ml-auto">
                    <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span className="font-bold text-slate-700">{course.rating.toFixed(2)}</span>
                  </span>
                </div>

                {/* Progress Bar for Enrolled Course */}
                {course.isEnrolled && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 font-medium">Progress</span>
                      <span className="text-blue-600 font-bold">{course.progress || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${course.progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Instructor + Button */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${course.instructor.avatarBg} text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs`}
                  >
                    {course.instructor.name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-semibold text-slate-800 block truncate">
                      {course.instructor.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {course.instructor.role}
                    </span>
                  </div>
                </div>

                {course.isEnrolled ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCourse(course);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEnrollCourse(course.id);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    Enroll Free
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
