"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User as UserIcon, Award, CheckCircle2, Flame, Clock, ShieldCheck, ShieldAlert, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getDashboardData, DashboardData } from "@/lib/learning";

export default function ProfilePage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!user) return;
    setData(getDashboardData(user.full_name || "Trader", user.email));
  }, [user]);

  if (!user || !data) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-36 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-slate-100 rounded-2xl" />
          <div className="h-24 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const initials = user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 animate-fade-up">
      {/* Profile Header Card */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white font-black text-xl flex items-center justify-center shadow-md shadow-slate-900/20 shrink-0">
            {initials}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                {user.full_name || user.email.split("@")[0]}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                Learner
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</p>
          </div>
        </div>

        <Link
          href="/settings"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors shrink-0"
        >
          <span>Account Settings</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>

      {/* Learning Stats Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Lessons Done
          </span>
          <span className="text-2xl font-extrabold text-slate-900">
            {data.stats.lessonsCompleted}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">/ {data.stats.totalLessons} total</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Courses Done
          </span>
          <span className="text-2xl font-extrabold text-blue-600">
            {data.stats.coursesCompleted}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Levels finished</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Streak
          </span>
          <span className="text-2xl font-extrabold text-amber-600">
            {data.stats.learningStreak} Days
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Daily practice</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Invested Time
          </span>
          <span className="text-2xl font-extrabold text-emerald-600">
            {Math.round(data.stats.learningTimeMinutes / 60)}h
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Focused study</span>
        </div>
      </section>

      {/* Biometric Status Section */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              user.has_face_enrolled ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
            }`}
          >
            {user.has_face_enrolled ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Workstation Biometric ID</h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${
                  user.has_face_enrolled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {user.has_face_enrolled ? "Enrolled & Protected" : "Setup Required"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {user.has_face_enrolled
                ? "Your workstation automatically locks when you step away, safeguarding your session."
                : "Protect your workstation and ensure continuous focus with Apple-grade Face ID."}
            </p>
          </div>
        </div>

        <Link
          href="/settings"
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors shrink-0 text-center"
        >
          {user.has_face_enrolled ? "Manage Face ID" : "Enroll Face ID"}
        </Link>
      </section>
    </div>
  );
}
