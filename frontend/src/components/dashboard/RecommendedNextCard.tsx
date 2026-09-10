"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { DashboardData } from "@/lib/learning";

type RecommendedNextCardProps = {
  recommendedNext: DashboardData["recommendedNext"];
};

export default function RecommendedNextCard({ recommendedNext }: RecommendedNextCardProps) {
  if (!recommendedNext) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Next Up</span>
          </div>
          <h3 className="text-base font-bold text-slate-900">Explore Course Catalog</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Find a lesson that fits the time and energy you have today.
          </p>
        </div>

        <Link
          href="/learn/courses"
          className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#206DF8] via-[#155CE9] to-[#0B50D9] text-white text-xs font-semibold shadow-[0_6px_16px_-2px_rgba(27,100,242,0.42)] hover:shadow-[0_10px_22px_-2px_rgba(27,100,242,0.52)] hover:brightness-105 active:scale-[0.98] transition-all"
        >
          <span>View All Courses</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Recommended Next</span>
        </div>
        <h3 className="text-base font-bold text-slate-900">{recommendedNext.title}</h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{recommendedNext.description}</p>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium">Est. 20-30 mins</span>
        <Link
          href={`/learn/courses/${recommendedNext.courseId}/lessons/${recommendedNext.lessonId}`}
          className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-gradient-to-r from-[#206DF8] via-[#155CE9] to-[#0B50D9] text-white text-xs font-semibold shadow-[0_6px_16px_-2px_rgba(27,100,242,0.42)] hover:shadow-[0_10px_22px_-2px_rgba(27,100,242,0.52)] hover:brightness-105 active:scale-[0.98] transition-all"
        >
          <span>{recommendedNext.actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
