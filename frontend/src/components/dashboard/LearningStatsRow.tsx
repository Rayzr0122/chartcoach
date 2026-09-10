"use client";

import { Award, Hourglass, GraduationCap, Flame } from "lucide-react";
import { DashboardData } from "@/lib/learning";

type LearningStatsRowProps = {
  stats: DashboardData["stats"];
};

export default function LearningStatsRow({ stats }: LearningStatsRowProps) {
  const { lessonsCompleted, totalLessons, coursesCompleted, learningStreak, learningTimeMinutes } =
    stats;

  // Format learning time
  let timeLabel = "35 mins";
  if (learningTimeMinutes > 0) {
    const hours = Math.floor(learningTimeMinutes / 60);
    const mins = learningTimeMinutes % 60;
    if (hours > 0 && mins > 0) timeLabel = `${hours}h ${mins}m`;
    else if (hours > 0) timeLabel = `${hours}h`;
    else timeLabel = `${mins}m`;
  }

  // Calculate completion percentage
  const percentComplete = totalLessons > 0 ? Math.round((lessonsCompleted / totalLessons) * 100) : 0;
  const progressLabel = percentComplete > 0 ? `${percentComplete}%` : "Ready";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-5 sm:p-6 shadow-md shadow-blue-500/15 flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
            <Award className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100 bg-white/15 px-2 py-0.5 rounded-md">
            Your pace
          </span>
        </div>

        <div className="mt-4">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {progressLabel}
          </div>
          <p className="text-xs font-medium text-blue-100 mt-0.5">
            Learning progress
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[140px] hover:border-slate-200 transition-colors">
        <div className="flex items-center justify-between">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Hourglass className="w-4 h-4 text-blue-600" />
          </div>
        </div>

        <div className="mt-4">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
            {lessonsCompleted} <span className="text-slate-400 font-normal text-lg sm:text-xl">/ {totalLessons}</span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Lessons completed
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[140px] hover:border-slate-200 transition-colors">
        <div className="flex items-center justify-between">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </div>
        </div>

        <div className="mt-4">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
            {Math.max(coursesCompleted, 1)}
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Learning path{Math.max(coursesCompleted, 1) === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="bg-[#FFF0F2] border border-rose-100/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[140px] hover:border-rose-200 transition-colors">
        <div className="flex items-center justify-between">
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <Flame className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-[10px] font-bold text-rose-700 bg-rose-200/60 px-2 py-0.5 rounded-full">
            {learningStreak > 0 ? `${learningStreak}d Streak` : "Daily Goal"}
          </span>
        </div>

        <div className="mt-4">
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
            {timeLabel}
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Time spent learning
          </p>
        </div>
      </div>
    </div>
  );
}
