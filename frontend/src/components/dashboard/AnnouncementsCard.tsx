"use client";

import Link from "next/link";
import { Bell, ShieldCheck, Sparkles, BookOpen } from "lucide-react";
import { LearningActivity } from "@/lib/learning";

type AnnouncementsCardProps = {
  activities: LearningActivity[];
};

export default function AnnouncementsCard({ activities }: AnnouncementsCardProps) {
  // Combine real activities with curriculum announcements
  const announcementsList = [
    {
      id: "ann-1",
      title: activities[0]?.title || "Trading 101 Foundations Quiz completed with 100% score",
      date: activities[0]?.timeAgo || "10/13/2026",
      isHero: true,
      icon: Bell,
    },
    {
      id: "ann-2",
      title: activities[1]?.title || "Candlestick Anatomy: Real Body vs. Wicks completed",
      date: activities[1]?.timeAgo || "10/13/2026",
      isHero: true,
      icon: Bell,
    },
    {
      id: "ann-3",
      title: "New Course Released: Building a Trading Strategy (14 Modules)",
      date: "10/13/2026",
      isHero: true,
      icon: Bell,
    },
    {
      id: "ann-4",
      title: "Biometric Face ID Session Protection verified and operational",
      date: "10/13/2026",
      isHero: false,
      icon: Bell,
    },
    {
      id: "ann-5",
      title: "Market Reading Practice Lab scenarios updated for Live Nifty session",
      date: "10/12/2026",
      isHero: false,
      icon: Bell,
    },
    {
      id: "ann-6",
      title: "Interactive Pattern Simulator: Pin Bar Rejections calibrated",
      date: "10/11/2026",
      isHero: false,
      icon: Bell,
    },
  ];

  return (
    <section className="space-y-3.5">
      {/* Section Header matching reference */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-bold text-slate-800 tracking-tight">
          Announcements
        </h3>
        <Link
          href="/learn/courses"
          className="text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors"
        >
          See all
        </Link>
      </div>

      {/* Stacked Announcement Cards matching reference */}
      <div className="space-y-2.5">
        {announcementsList.map((item) => {
          const Icon = item.icon;

          if (item.isHero) {
            // Signature Vibrant Blue Gradient Card (matching top 3 in reference)
            return (
              <div
                key={item.id}
                className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl p-4 shadow-sm flex items-center gap-3.5 hover:shadow-md transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-white text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white leading-snug line-clamp-1">
                    {item.title}
                  </p>
                  <span className="text-[10px] text-blue-100 font-mono mt-0.5 block">
                    {item.date}
                  </span>
                </div>
              </div>
            );
          }

          // Subsequent Clean White Cards with Blue Icon (matching 4th+ in reference)
          return (
            <div
              key={item.id}
              className="bg-white border border-slate-100 rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center gap-3.5 hover:bg-slate-50/70 hover:border-slate-200 transition-all group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </p>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                  {item.date}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
