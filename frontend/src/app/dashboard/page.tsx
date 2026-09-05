"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useFaceMonitor } from "@/hooks/useFaceMonitor";
import { Course, getSavedCourses, saveCourses } from "@/lib/courses";
import DashboardNavbar from "@/components/dashboard/Navbar";
import DashboardFooter from "@/components/dashboard/Footer";
import TradingViewSimulator from "@/components/dashboard/TradingViewSimulator";
import CourseModal from "@/components/dashboard/CourseModal";
import InteractivePatternSim from "@/components/dashboard/InteractivePatternSim";
import FaceIdSheet from "@/components/dashboard/FaceIdSheet";
import FaceOnboardingWizard from "@/components/dashboard/FaceOnboardingWizard";
import ToastStack from "@/components/dashboard/ToastStack";

type TradeRecord = {
  id: string;
  pnl: number;
  isWin: boolean;
  time: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout, refreshUser } = useAuth();
  const { addNotification } = useNotifications();
  const [, startTransition] = useTransition();

  const [activeNavTab, setActiveNavTab] = useState("overview");
  const [courseCategoryFilter, setCourseCategoryFilter] = useState("All");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showFaceSheet, setShowFaceSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dismissOnboarding, setDismissOnboarding] = useState(false);

  // Dynamic user courses state
  const [courses, setCourses] = useState<Course[]>([]);
  // Dynamic trade metrics state
  const [trades, setTrades] = useState<TradeRecord[]>([]);

  // Load user data on mount / user change
  useEffect(() => {
    if (!user?.email) return;
    const loadedCourses = getSavedCourses(user.email);
    setCourses(loadedCourses);

    try {
      const savedTrades = localStorage.getItem(`chartcoach_trades_${user.email}`);
      if (savedTrades) {
        setTrades(JSON.parse(savedTrades));
      } else {
        setTrades([]);
      }
    } catch {
      setTrades([]);
    }
  }, [user?.email]);

  // Live Biometric Continuous Monitor
  const monitor = useFaceMonitor(!!user?.has_face_enrolled);
  const monitorVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (monitorVideoRef.current) {
      monitorVideoRef.current.srcObject = monitor.stream;
    }
  }, [monitor.stream]);

  const [lastFlashedAt, setLastFlashedAt] = useState<number | null>(null);
  const [showConfirmedFlash, setShowConfirmedFlash] = useState(false);
  if (monitor.lastConfirmedAt !== lastFlashedAt) {
    setLastFlashedAt(monitor.lastConfirmedAt);
    if (monitor.lastConfirmedAt !== null) setShowConfirmedFlash(true);
  }

  useEffect(() => {
    if (!showConfirmedFlash) return;
    const timer = setTimeout(() => setShowConfirmedFlash(false), 2000);
    return () => clearTimeout(timer);
  }, [showConfirmedFlash]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading ChartCoach LMS...</span>
        </div>
      </div>
    );
  }

  const isPaused = monitor.status === "paused";

  // Handle live trade execution from simulator
  function handleTradeExecuted(pnl: number, isWin: boolean) {
    const newTrade: TradeRecord = {
      id: Date.now().toString(),
      pnl,
      isWin,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updatedTrades = [newTrade, ...trades];
    setTrades(updatedTrades);
    if (user?.email) {
      try {
        localStorage.setItem(`chartcoach_trades_${user.email}`, JSON.stringify(updatedTrades));
      } catch {
        // Ignore
      }
    }
    // Trigger notification
    addNotification(
      "trade",
      isWin ? "Trade Closed in Profit" : "Trade Closed at Loss",
      `${isWin ? "+" : ""}${pnl >= 0 ? "+" : ""}₹${Math.abs(pnl).toLocaleString()} P&L on simulated position.`
    );
  }

  // Handle course enrollment
  function handleEnrollCourse(courseId: string) {
    const updated = courses.map((c) =>
      c.id === courseId ? { ...c, isEnrolled: true, progress: c.progress || 0 } : c
    );
    setCourses(updated);
    if (user?.email) {
      saveCourses(user.email, updated);
    }
    const enrolled = updated.find((c) => c.id === courseId);
    if (enrolled) {
      setSelectedCourse(enrolled);
      addNotification("course", "Enrolled in Masterclass", `You have enrolled in "${enrolled.title}".`);
    }
  }

  // Handle lesson completion updates
  function handleProgressChange(courseId: string, progressPercent: number) {
    const updated = courses.map((c) =>
      c.id === courseId ? { ...c, progress: progressPercent, isEnrolled: true } : c
    );
    setCourses(updated);
    if (user?.email) {
      saveCourses(user.email, updated);
    }
    if (selectedCourse?.id === courseId) {
      setSelectedCourse((prev) => (prev ? { ...prev, progress: progressPercent } : null));
    }
  }

  // Real-time calculated metrics
  const totalTradesCount = trades.length;
  const winningTradesCount = trades.filter((t) => t.isWin).length;
  const winRatePercent =
    totalTradesCount > 0 ? Math.round((winningTradesCount / totalTradesCount) * 100) : null;
  const totalPnL = trades.reduce((acc, t) => acc + t.pnl, 0);

  const enrolledCourses = courses.filter((c) => c.isEnrolled);
  const activeCourse = enrolledCourses[0] || courses[0];

  // Filtered Courses
  const filteredCourses = courses.filter((course) => {
    const matchesCategory =
      courseCategoryFilter === "All"
        ? true
        : courseCategoryFilter === "Enrolled"
        ? !!course.isEnrolled
        : course.category.toLowerCase().includes(courseCategoryFilter.toLowerCase());

    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.tagline.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const showOnboarding = !user.has_face_enrolled && !dismissOnboarding;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-500 selection:text-white">
      {/* Toast Stack */}
      <ToastStack />

      {/* ─── Global Navbar ─── */}
      <DashboardNavbar
        user={user}
        onLogout={logout}
        onOpenSecurity={() => setShowFaceSheet(true)}
        activeTab={activeNavTab}
        setActiveTab={setActiveNavTab}
      />

      {/* ─── Main Content Container ─── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ─── OPTIONAL ONBOARDING: BIOMETRIC FACE ID SETUP WIZARD ─── */}
        {showOnboarding && (
          <section className="animate-fade-up">
            <FaceOnboardingWizard
              user={user}
              onRefreshUser={refreshUser}
              onDismiss={() => setDismissOnboarding(true)}
            />
          </section>
        )}

        {/* ─── SECTION 1: COMMAND CENTER ─── */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-6 sm:p-8 shadow-lg border border-slate-800/60">
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] px-3 py-1 rounded-lg text-xs font-medium text-slate-300">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span>
                  {user.has_face_enrolled ? "Workstation Secured" : "Setup in Progress"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                Welcome back, {user.full_name?.split(" ")[0] || "Trader"}
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 max-w-lg leading-relaxed">
                {enrolledCourses.length > 0
                  ? "Continue your masterclass and test setups in the live simulator."
                  : "Start your trading journey. Enroll in a masterclass or practice in the simulator."}
              </p>

              {/* Metric Tiles */}
              <div className="grid grid-cols-3 gap-3 pt-1 max-w-lg">
                {/* Win Rate */}
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Win Rate</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-400">
                    {winRatePercent !== null ? `${winRatePercent}%` : "--"}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {totalTradesCount > 0 ? `${totalTradesCount} trades` : "No trades yet"}
                  </span>
                </div>

                {/* Streak */}
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Streak</span>
                  </div>
                  <span className="text-xl font-bold text-amber-400">1 Day</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Active session</span>
                </div>

                {/* P&L */}
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                      <polyline points="16 7 22 7 22 13" />
                    </svg>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">P&L</span>
                  </div>
                  <span
                    className={`text-xl font-bold ${
                      totalPnL > 0 ? "text-emerald-400" : totalPnL < 0 ? "text-rose-400" : "text-blue-400"
                    }`}
                  >
                    {totalPnL >= 0 ? `+₹${totalPnL.toLocaleString()}` : `-₹${Math.abs(totalPnL).toLocaleString()}`}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {enrolledCourses.length} {enrolledCourses.length === 1 ? "course" : "courses"} enrolled
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Active Course Card */}
            <div className="lg:col-span-5 bg-white/[0.06] border border-white/[0.08] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">
                  {activeCourse?.isEnrolled ? "Active Course" : "Recommended"}
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  {activeCourse?.progress || 0}%
                </span>
              </div>

              <h3 className="text-sm font-semibold text-white line-clamp-1">{activeCourse?.title}</h3>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${activeCourse?.progress || 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate">
                  {activeCourse?.isEnrolled
                    ? "Module 1: The Foundations of Price Delivery"
                    : `${activeCourse?.totalLessons} Lessons`}
                </span>
                <span className="font-mono shrink-0">{activeCourse?.duration}</span>
              </div>

              <div className="flex gap-2 pt-1">
                {activeCourse?.isEnrolled ? (
                  <button
                    type="button"
                    onClick={() => setSelectedCourse(activeCourse)}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleEnrollCourse(activeCourse.id)}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Start (Free)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedCourse(activeCourse)}
                  className="py-2.5 px-4 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-medium border border-white/[0.08] transition-colors cursor-pointer"
                >
                  Details
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 2: SIMULATOR ─── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Market Simulation Studio</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Interactive candlestick engine with EMA overlays and real-time trade execution.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <TradingViewSimulator onTradeExecuted={handleTradeExecuted} />
          </div>
        </section>

        {/* ─── SECTION 3: PATTERN SANDBOX ─── */}
        <section className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" />
                <line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" />
                <line x1="15" y1="20" x2="15" y2="23" />
                <line x1="20" y1="9" x2="23" y2="9" />
                <line x1="20" y1="14" x2="23" y2="14" />
                <line x1="1" y1="9" x2="4" y2="9" />
                <line x1="1" y1="14" x2="4" y2="14" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Pattern Recognition & Diagnosis</h2>
              <p className="text-xs text-slate-500 mt-0.5">Hands-on skill validation with interactive chart pattern scenarios.</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <InteractivePatternSim />
          </div>
        </section>

        {/* ─── SECTION 4: CURRICULUM CATALOG ─── */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Curriculum & Masterclasses</h2>
              <p className="text-xs text-slate-500 mt-0.5">Structured modules for every stage of your trading journey.</p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 self-start sm:self-auto">
              {["All", "Enrolled", "Price Action", "Smart Money (SMC)", "Options", "Risk Management"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCourseCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    courseCategoryFilter === cat
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 hover:shadow-sm transition-all duration-150 flex flex-col justify-between group cursor-pointer"
              >
                {/* Top Card Info */}
                <div>
                  {/* Badge & Level */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                      {course.category}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">{course.level}</span>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {course.tagline}
                  </p>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-2.5 mt-3.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{course.duration}</span>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      <span>{course.totalLessons} Lessons</span>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="flex items-center gap-1 ml-auto">
                      <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span className="font-semibold text-slate-700">{course.rating.toFixed(1)}</span>
                    </span>
                  </div>

                  {/* Progress Bar (enrolled) */}
                  {course.isEnrolled && (
                    <div className="mt-3.5 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500 font-medium">Progress</span>
                        <span className="text-blue-600 font-semibold">{course.progress || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${course.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md bg-gradient-to-tr ${course.instructor?.avatarBg || "from-slate-500 to-slate-600"} text-white flex items-center justify-center text-[10px] font-bold`}>
                      {course.instructor?.name?.charAt(0) || "?"}
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 truncate max-w-[120px]">
                      {course.instructor?.name || "Instructor"}
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    <span>{course.isEnrolled ? "Continue" : "View"}</span>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ─── Global Footer ─── */}
      <DashboardFooter />

      {/* ─── Course Detail / Curriculum Modal ─── */}
      {selectedCourse && (
        <CourseModal
          course={selectedCourse}
          userEmail={user.email}
          onClose={() => setSelectedCourse(null)}
          onProgressChange={handleProgressChange}
          onLaunchSimulator={(course) => {
            setSelectedCourse(null);
            window.scrollTo({ top: 480, behavior: "smooth" });
          }}
        />
      )}

      {/* ─── Face ID Sheet ─── */}
      {showFaceSheet && (
        <FaceIdSheet
          user={user}
          onClose={() => setShowFaceSheet(false)}
          onRefreshUser={refreshUser}
        />
      )}

      {/* ─── Floating Continuous Face Monitor ─── */}
      {user.has_face_enrolled && monitor.stream && (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
          {showConfirmedFlash && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-lg animate-fade-up">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Verified</span>
            </div>
          )}
          <div className="relative rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-slate-950 w-28 h-20">
            <video
              ref={monitorVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="absolute bottom-0.5 inset-x-0.5 flex items-center gap-1 bg-slate-950/80 px-1.5 py-0.5 rounded-md text-[9px] text-slate-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Active</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Session Lock Overlay ─── */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-overlay-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-sm text-center shadow-2xl space-y-3 animate-fade-up">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-900">Session Paused</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{monitor.reason}</p>
            <p className="text-[11px] text-slate-400">
              Look at the camera to resume. Session unlocks automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
