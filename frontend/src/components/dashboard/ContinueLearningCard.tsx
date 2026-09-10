"use client";

import Link from "next/link";
import { Play, ArrowRight, BookOpen } from "lucide-react";
import { DashboardData } from "@/lib/learning";

type ContinueLearningCardProps = {
  currentLearning: DashboardData["currentLearning"];
};

export default function ContinueLearningCard({ currentLearning }: ContinueLearningCardProps) {
  if (!currentLearning) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
            Start Learning
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Begin with Trading 101
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
            Start your trading journey with the essential foundations: financial markets, order types, and price movement.
          </p>
        </div>

        <Link
          href="/learn/courses/trading-101"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Start Learning</span>
        </Link>
      </div>
    );
  }

  const { courseId, courseTitle, lessonId, lessonTitle, lessonNumber, totalLessons, progressPercent } =
    currentLearning;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800">
      {/* Background glow orb */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Column: Course details & progress */}
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-500/15 border border-blue-400/20 px-2.5 py-0.5 rounded-md">
              Continue Learning
            </span>
            <span className="text-xs text-slate-400 font-medium">·</span>
            <span className="text-xs text-slate-300 font-medium truncate">{courseTitle}</span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              {lessonTitle}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 text-slate-300">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  Lesson {lessonNumber} of {totalLessons}
                </span>
              </span>
              <span>·</span>
              <span className="text-blue-400 font-semibold">{progressPercent}% complete</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Action: Continue Button */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
          <Link
            href={`/learn/courses/${courseId}/lessons/${lessonId}`}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/30 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Continue Learning</span>
          </Link>

          <Link
            href={`/learn/courses/${courseId}`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition-colors"
          >
            <span>View Course Overview</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
