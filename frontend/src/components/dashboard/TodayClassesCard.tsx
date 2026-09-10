"use client";

import Link from "next/link";
import { Clock, Play } from "lucide-react";
import { DashboardData } from "@/lib/learning";

type TodayClassesCardProps = {
  currentLearning: DashboardData["currentLearning"];
};

export default function TodayClassesCard({ currentLearning }: TodayClassesCardProps) {
  const activeCourseId = currentLearning?.courseId || "trading-101";
  const activeLessonId = currentLearning?.lessonId || "t101-l1";
  const activeLessonTitle = currentLearning?.lessonTitle || "What is Trading & Why People Trade";

  const scheduleItems = [
    {
      id: "class-1",
      title: activeLessonTitle,
      time: "Continue when you’re ready",
      duration: "20 mins",
      type: "Next lesson",
      badgeColor: "bg-[#D1FAE5] text-[#065F46]", // Soft mint/emerald like reference
      borderAccent: "border-l-[#3B82F6]",
      link: `/learn/courses/${activeCourseId}/lessons/${activeLessonId}`,
      isActive: true,
    },
    {
      id: "class-2",
      title: "How Buyers and Sellers Meet in Markets",
      time: "About 20 minutes",
      duration: "20 mins",
      type: "Coming up",
      badgeColor: "bg-[#FEF3C7] text-[#92400E]", // Soft yellow/amber like reference
      borderAccent: "border-l-slate-200 group-hover:border-l-blue-500",
      link: `/learn/courses/${activeCourseId}/lessons/t101-l2`,
      isActive: false,
    },
    {
      id: "class-3",
      title: "Types of Financial Assets: Stocks & Currencies",
      time: "About 22 minutes",
      duration: "22 mins",
      type: "Coming up",
      badgeColor: "bg-[#D1FAE5] text-[#065F46]", // Soft mint/emerald like reference
      borderAccent: "border-l-slate-200 group-hover:border-l-blue-500",
      link: `/learn/courses/${activeCourseId}/lessons/t101-l3`,
      isActive: false,
    },
  ];

  return (
    <section className="space-y-3.5">
      {/* Section Header matching reference */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-bold text-slate-800 tracking-tight">
          Your next lessons
        </h3>
        <Link
          href="/learn/courses"
          className="text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors"
        >
          See all
        </Link>
      </div>

      {/* Stacked Class Cards matching reference */}
      <div className="space-y-3">
        {scheduleItems.map((item) => (
          <Link
            key={item.id}
            href={item.link}
            className={`group block bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 border-l-4 ${item.borderAccent} hover:border-slate-200`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5 min-w-0">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {item.title}
                </h4>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.time}</span>
                  </span>

                </div>
              </div>

              {/* Right pill badge matching reference */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span
                  className={`text-[11px] font-semibold px-3 py-1 rounded-full ${item.badgeColor}`}
                >
                  {item.type}
                </span>
                {item.isActive && (
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
