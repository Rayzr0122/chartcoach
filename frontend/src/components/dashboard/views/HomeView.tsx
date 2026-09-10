"use client";

import { useState } from "react";
import { User } from "@/lib/api";
import { Course } from "@/lib/courses";
import { NavTabId } from "../Sidebar";

type TradeRecord = {
  id: string;
  pnl: number;
  isWin: boolean;
  time: string;
};

type HomeViewProps = {
  user: User;
  courses: Course[];
  trades: TradeRecord[];
  onSelectTab: (tab: NavTabId) => void;
  onOpenCourse: (course: Course) => void;
};

export default function HomeView({
  user,
  courses,
  trades,
  onSelectTab,
  onOpenCourse,
}: HomeViewProps) {
  // Compute user metrics
  const totalTrades = trades.length;
  const winTrades = trades.filter((t) => t.isWin).length;
  const winRate = totalTrades > 0 ? Math.round((winTrades / totalTrades) * 100) : null;
  const totalPnL = trades.reduce((acc, t) => acc + t.pnl, 0);

  // Completed lessons calculation
  const totalLessonsInCurriculum = courses.reduce((acc, c) => acc + c.totalLessons, 0);
  const enrolledCourses = courses.filter((c) => c.isEnrolled);
  const activeCourse = enrolledCourses[0] || courses[0];

  const completedLessonsEstimate = courses.reduce((acc, c) => {
    if (!c.progress) return acc;
    return acc + Math.round((c.progress / 100) * c.totalLessons);
  }, 0);

  // Dynamic Readiness Score (0-100)
  const technicalScore = Math.min(
    95,
    Math.max(25, (activeCourse?.progress || 10) * 0.6 + (winRate || 50) * 0.4)
  );
  const riskScore = Math.min(
    98,
    Math.max(30, (totalTrades > 3 ? (winRate || 50) : 55) + 20)
  );
  const psychologyScore = Math.min(90, Math.max(35, 45 + (user.has_face_enrolled ? 25 : 0)));
  const overallReadiness = Math.round((technicalScore + riskScore + psychologyScore) / 3);

  // Daily Challenge Interactive State
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const dailyQuestion = {
    scenario: "NIFTY 50 15m Chart: Price approaches a major daily support floor and prints a long bottom-wick Hammer with high volume.",
    options: [
      { text: "Enter Long: Long wick shows buyers absorbing supply at support", correct: true },
      { text: "Enter Short: Market momentum was previously falling fast", correct: false },
      { text: "Do Nothing: Hammers only work on 1-day timeframes", correct: false },
    ],
    explanation:
      "Correct! A long lower wick at established support proves buyers stepped in aggressively, rejecting lower prices and signaling a high-probability bullish bounce.",
  };

  function handleSelectOption(index: number) {
    if (answered) return;
    setSelectedAnswer(index);
    setAnswered(true);
  }

  // Greeting time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ─── HERO GREETING & READINESS COMMAND BANNER ─── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800/80">
        {/* Glow orb */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Welcome & Progress Pitch */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                {activeCourse?.levelName || "Level 1: Foundations"}
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10 text-xs">
                <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>3-Day Streak</span>
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {greeting}, {user.full_name?.split(" ")[0] || "Trader"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                Your discipline is your edge. Complete today’s lesson and test your execution in the live chart simulator.
              </p>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => onOpenCourse(activeCourse)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Resume Lesson</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab("simulator")}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
                <span>Open Simulator</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab("mentor")}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Ask AI</span>
              </button>
            </div>
          </div>

          {/* Right Column: Trader Readiness Score Gauge */}
          <div className="lg:col-span-5 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 backdrop-blur-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Trader Readiness Index</span>
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                {overallReadiness >= 75 ? "Market Ready" : "Skill Building"}
              </span>
            </div>

            <div className="flex items-center gap-5">
              {/* Radial Gauge */}
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/10"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-500 transition-all duration-1000 ease-out"
                    strokeDasharray={`${overallReadiness}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xl font-extrabold text-white">{overallReadiness}</span>
                  <span className="text-[9px] text-slate-400 block -mt-1">%</span>
                </div>
              </div>

              {/* Breakdown Bars */}
              <div className="flex-1 space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                    <span>Technical Chart Reading</span>
                    <span className="font-semibold text-blue-400">{Math.round(technicalScore)}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${technicalScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                    <span>Risk & Position Sizing</span>
                    <span className="font-semibold text-emerald-400">{Math.round(riskScore)}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${riskScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-0.5">
                    <span>Emotional Discipline</span>
                    <span className="font-semibold text-amber-400">{Math.round(psychologyScore)}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${psychologyScore}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4 KPI METRIC CARDS ─── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Win Rate */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Practice Win Rate</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {winRate !== null ? `${winRate}%` : "--"}
            </span>
            <span className="text-xs text-slate-400">
              {totalTrades > 0 ? `${winTrades}/${totalTrades} wins` : "No trades yet"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Based on simulated order flow</p>
        </div>

        {/* Card 2: Simulated P&L */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Simulated P&L</span>
            <div className={`p-1.5 rounded-lg ${totalPnL >= 0 ? "bg-blue-50 text-blue-600" : "bg-rose-50 text-rose-600"}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold ${totalPnL >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {totalPnL >= 0 ? `+₹${totalPnL.toLocaleString()}` : `-₹${Math.abs(totalPnL).toLocaleString()}`}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Zero risk paper capital</p>
        </div>

        {/* Card 3: Lessons Completed */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Curriculum Progress</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{completedLessonsEstimate}</span>
            <span className="text-xs text-slate-400">/ {totalLessonsInCurriculum} lessons</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{enrolledCourses.length} active courses</p>
        </div>

        {/* Card 4: Learning Streak */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Daily Streak</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-600">3 Days</span>
            <span className="text-xs text-emerald-600 font-semibold">Active</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Next badge at 7 days</p>
        </div>
      </section>

      {/* ─── TWO COLUMN GRID: ACTIVE COURSE & DAILY CHALLENGE ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Course / Resume Box */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-blue-600 uppercase tracking-wider">Current Milestone</span>
              <span className="font-mono text-slate-400">{activeCourse?.progress || 0}% Complete</span>
            </div>

            <h3 className="text-base font-bold text-slate-900 line-clamp-1">{activeCourse?.title}</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {activeCourse?.tagline}
            </p>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-4">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${activeCourse?.progress || 0}%` }}
              />
            </div>

            {/* Next Lesson Chip */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-slate-400 block">Up Next:</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {activeCourse?.modules?.[0]?.lessons?.[0]?.title || "Market Structure Foundations"}
                  </span>
                </div>
              </div>
              <span className="text-slate-400 font-mono text-[11px] shrink-0">
                {activeCourse?.modules?.[0]?.lessons?.[0]?.duration || "20m"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenCourse(activeCourse)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>{activeCourse?.isEnrolled ? "Continue Learning" : "Start Course"}</span>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("courses")}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              View All Courses
            </button>
          </div>
        </div>

        {/* Right Column: Daily Interactive Chart Puzzle */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="8" r="7" />
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                </svg>
                Daily Pattern Quiz
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
                +25 XP
              </span>
            </div>

            <p className="text-xs text-slate-700 font-medium leading-relaxed mb-3.5">
              {dailyQuestion.scenario}
            </p>

            {/* Options */}
            <div className="space-y-2">
              {dailyQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswer === idx;
                let btnStyle = "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700";

                if (answered) {
                  if (option.correct) {
                    btnStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold";
                  } else if (isSelected && !option.correct) {
                    btnStyle = "border-rose-500 bg-rose-50 text-rose-800";
                  } else {
                    btnStyle = "border-slate-100 bg-slate-50/50 text-slate-400";
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    disabled={answered}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-2.5 ${btnStyle}`}
                  >
                    <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="leading-snug">{option.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Explanation card upon answer */}
            {answered && (
              <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-900 animate-fade-up">
                <span className="font-bold block mb-0.5">Explanation:</span>
                <p className="text-[11px] leading-relaxed text-blue-800">{dailyQuestion.explanation}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            <span>New puzzle every 24 hours</span>
            <button
              type="button"
              onClick={() => onSelectTab("challenges")}
              className="text-blue-600 font-semibold hover:underline cursor-pointer"
            >
              See All Challenges →
            </button>
          </div>
        </div>
      </section>

      {/* ─── PSYCHOLOGY & DISCIPLINE TIP OF THE DAY ─── */}
      <section className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Psychology Wisdom of the Day
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
              "Never move your stop loss further away after entering."
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
              Moving your stop loss increases your risk on a losing idea. If the market invalidates your setup, accept the small planned loss and protect your mental capital for the next opportunity.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectTab("mentor")}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-xs"
        >
          Talk to Mindset Coach
        </button>
      </section>
    </div>
  );
}
