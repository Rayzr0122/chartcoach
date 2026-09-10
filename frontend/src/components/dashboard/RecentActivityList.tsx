"use client";

import { CheckCircle2, Award, BookOpen } from "lucide-react";
import { LearningActivity } from "@/lib/learning";

type RecentActivityListProps = {
  activities: LearningActivity[];
};

export default function RecentActivityList({ activities }: RecentActivityListProps) {
  return (
    <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Activity</h3>
          <p className="text-xs text-slate-500 mt-0.5">Your latest learning milestones and quizzes</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="font-semibold text-slate-600">No learning activity yet.</p>
          <p className="mt-0.5">Start your first lesson to track your progress here.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {activities.map((act) => (
            <div key={act.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    act.type === "quiz_completed"
                      ? "bg-purple-50 text-purple-600"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {act.type === "quiz_completed" ? (
                    <Award className="w-3.5 h-3.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-slate-900 truncate">{act.title}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{act.subtitle}</p>
                </div>
              </div>

              <span className="text-[10px] text-slate-400 font-mono shrink-0 whitespace-nowrap mt-0.5">
                {act.timeAgo}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
