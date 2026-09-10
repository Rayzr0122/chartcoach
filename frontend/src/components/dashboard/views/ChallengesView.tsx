"use client";

import { useState } from "react";
import { User } from "@/lib/api";
import { Course } from "@/lib/courses";

type ChallengesViewProps = {
  user: User;
  courses: Course[];
  onOpenCourse: (course: Course) => void;
};

type ChallengePuzzle = {
  id: string;
  title: string;
  asset: string;
  timeframe: string;
  context: string;
  options: { label: string; outcome: string; correct: boolean }[];
  explanation: string;
  points: number;
};

const PUZZLES: ChallengePuzzle[] = [
  {
    id: "p1",
    title: "The False Breakout Liquidity Sweep",
    asset: "NIFTY 50",
    timeframe: "15m Chart",
    context:
      "Price breaks above a 3-day resistance high with a sudden huge green candle, but immediately forms a massive upper-wick Shooting Star on the next candle with surging volume.",
    options: [
      { label: "Bullish: Hold long because resistance was broken", outcome: "Incorrect", correct: false },
      { label: "Bearish: Institutional trap (liquidity sweep), expect reversal down", outcome: "Correct!", correct: true },
      { label: "Sideways: The market is in an equilibrium state", outcome: "Incorrect", correct: false },
    ],
    explanation:
      "This is a classic 'Bull Trap'. Institutions pushed price above resistance to trigger retail breakout buy orders, using that liquidity to fill large short positions. The shooting star candle proves supply overwhelmed demand.",
    points: 50,
  },
  {
    id: "p2",
    title: "Confluence at the 200 EMA + Value Area",
    asset: "BankNIFTY",
    timeframe: "1-Hour Chart",
    context:
      "In a strong daily uptrend, price pulls back into the rising 200 EMA, tests a previous breakout resistance (now support), and prints a Bullish Morning Star 3-candle pattern.",
    options: [
      { label: "Enter Long: Triple confluence of Trend + 200 EMA + Morning Star", outcome: "Correct!", correct: true },
      { label: "Enter Short: Price has been falling for 4 consecutive hours", outcome: "Incorrect", correct: false },
      { label: "Wait: 1-hour timeframes are too slow to trade", outcome: "Incorrect", correct: false },
    ],
    explanation:
      "High probability confluence! When market trend, dynamic EMA support, prior horizontal structure, and a 3-candle bullish reversal align at the same price zone, the win-rate and risk-to-reward are heavily in your favor.",
    points: 75,
  },
];

const BADGES = [
  {
    id: "b1",
    title: "7-Day Streak",
    desc: "Maintained a 7-day continuous learning streak",
    icon: "🔥",
    unlocked: true,
    category: "Consistency",
  },
  {
    id: "b2",
    title: "Zero-FOMO Discipline",
    desc: "Logged 5 consecutive trades with Calm / Confident mindset",
    icon: "🧘",
    unlocked: true,
    category: "Psychology",
  },
  {
    id: "b3",
    title: "1:3 Risk Guardian",
    desc: "Executed a verified 1:3 Risk-to-Reward simulator trade",
    icon: "🛡️",
    unlocked: true,
    category: "Risk Math",
  },
  {
    id: "b4",
    title: "Pattern Virtuoso",
    desc: "Correctly identified 25 candlestick patterns in the sandbox",
    icon: "🎯",
    unlocked: false,
    category: "Technical",
  },
  {
    id: "b5",
    title: "Institutional Scout",
    desc: "Mastered Level 3 Order Flow & Fair Value Gaps",
    icon: "⚡",
    unlocked: false,
    category: "Order Flow",
  },
  {
    id: "b6",
    title: "Mastery Capstone",
    desc: "Graduated all 5 levels with 80%+ quiz score",
    icon: "👑",
    unlocked: false,
    category: "Elite",
  },
];

export default function ChallengesView({ user, courses, onOpenCourse }: ChallengesViewProps) {
  const [activePuzzleIndex, setActivePuzzleIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [userPoints, setUserPoints] = useState(325);

  const currentPuzzle = PUZZLES[activePuzzleIndex];

  function handleSelect(idx: number) {
    if (submitted) return;
    setSelectedOption(idx);
    setSubmitted(true);
    if (currentPuzzle.options[idx].correct) {
      setUserPoints((prev) => prev + currentPuzzle.points);
    }
  }

  function handleNextPuzzle() {
    setSelectedOption(null);
    setSubmitted(false);
    setActivePuzzleIndex((prev) => (prev + 1) % PUZZLES.length);
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ─── XP & MASTERY SUMMARY BANNER ─── */}
      <section className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
            Trader Progression & Achievements
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Daily Chart Puzzles & Mastery Milestones
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Test your pattern intuition against real historical setups. Earn XP, unlock mastery levels, and build the confidence required for live markets.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl shrink-0">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center text-2xl font-bold border border-purple-500/30">
            🏆
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Total Reputation</span>
            <span className="text-2xl font-extrabold text-white font-mono">{userPoints} XP</span>
            <span className="text-[10px] text-emerald-400 block font-semibold mt-0.5">Top 12% Trader Rank</span>
          </div>
        </div>
      </section>

      {/* ─── DAILY CHART PUZZLE SANDBOX ─── */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              Puzzle #{activePuzzleIndex + 1}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {currentPuzzle.asset} · {currentPuzzle.timeframe}
            </span>
          </div>

          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            +{currentPuzzle.points} XP
          </span>
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">{currentPuzzle.title}</h3>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/70">
            {currentPuzzle.context}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {currentPuzzle.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            let style = "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800";

            if (submitted) {
              if (option.correct) {
                style = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20";
              } else if (isSelected && !option.correct) {
                style = "border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20";
              } else {
                style = "border-slate-100 bg-slate-50/50 text-slate-400";
              }
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(idx)}
                disabled={submitted}
                className={`w-full p-3.5 rounded-xl border text-xs sm:text-[13px] text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${style}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{option.label}</span>
                </div>

                {submitted && (
                  <span className={`text-xs font-bold shrink-0 ${option.correct ? "text-emerald-700" : "text-rose-700"}`}>
                    {option.correct ? "✓ Correct" : isSelected ? "✗ Incorrect" : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback / Explanation Box */}
        {submitted && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-900 space-y-2 animate-fade-up">
            <div className="font-bold flex items-center gap-1.5 text-blue-950">
              <span>💡</span>
              <span>Mentor Breakdown & Rationale:</span>
            </div>
            <p className="leading-relaxed">{currentPuzzle.explanation}</p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleNextPuzzle}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold cursor-pointer shadow-xs"
              >
                Next Challenge →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ─── 5-LEVEL MASTERY SKILL TREE ROADMAP ─── */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Skill Progression Tree
          </span>
          <h3 className="text-base font-bold text-slate-900">The 5 Stages of Trader Competence</h3>
        </div>

        <div className="space-y-3">
          {courses.map((c) => {
            const isUnlocked = c.levelNumber <= 2;
            return (
              <div
                key={c.id}
                onClick={() => onOpenCourse(c)}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer ${
                  isUnlocked
                    ? "bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    : "bg-slate-50/30 border-slate-100 opacity-75"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      isUnlocked
                        ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    L{c.levelNumber}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{c.levelName}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">({c.totalLessons} Lessons)</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{c.tagline}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                  <span className="text-xs font-semibold text-blue-600 font-mono">
                    {c.progress || 0}% Done
                  </span>
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs"
                  >
                    View Curriculum
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── TROPHY CASE / BADGES ─── */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Trader Trophy Case
          </span>
          <h3 className="text-base font-bold text-slate-900">Badges & Honor Roll</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BADGES.map((badge) => (
            <div
              key={badge.id}
              className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                badge.unlocked
                  ? "bg-white border-slate-200 shadow-xs"
                  : "bg-slate-50/60 border-slate-100 opacity-60"
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                  badge.unlocked ? "bg-amber-50 border border-amber-200/80 shadow-xs" : "bg-slate-100 grayscale"
                }`}
              >
                {badge.icon}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900">{badge.title}</h4>
                  {badge.unlocked && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                      Earned
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{badge.desc}</p>
                <span className="text-[10px] text-slate-400 font-mono mt-1.5 block">
                  Category: {badge.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
