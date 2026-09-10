"use client";

import Link from "next/link";
import { DashboardData } from "@/lib/learning";

type LearningProgressSectionProps = {
  progressList: DashboardData["progress"];
};

export default function LearningProgressSection({ progressList }: LearningProgressSectionProps) {
  return (
    <section className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
            Your learning path
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            See how far you’ve come, one lesson at a time.
          </p>
        </div>
        <Link
          href="/learn/courses"
          className="text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors"
        >
          See all
        </Link>
      </div>

      <div className="space-y-3">
        {progressList.map((item) => (
          <Link
            key={item.courseId}
            href={`/learn/courses/${item.courseId}`}
            className="group block p-3 rounded-xl hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-100"
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate pr-2">
                {item.title}
              </span>
              <div className="flex items-center gap-2 shrink-0 font-mono">
                <span className="text-slate-400 text-[11px]">
                  {item.completedLessons} / {item.totalLessons}
                </span>
                <span className="font-bold text-blue-600">{item.percent}%</span>
              </div>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.percent === 100
                    ? "bg-emerald-500"
                    : item.percent > 0
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600"
                    : "bg-transparent"
                }`}
                style={{ width: `${item.percent}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
