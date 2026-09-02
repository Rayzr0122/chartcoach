"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useFaceMonitor } from "@/hooks/useFaceMonitor";
import { Course, getSavedCourses, saveCourses } from "@/lib/courses";
import DashboardNavbar from "@/components/dashboard/Navbar";
import DashboardFooter from "@/components/dashboard/Footer";
import TradingViewSimulator from "@/components/dashboard/TradingViewSimulator";
import CourseModal from "@/components/dashboard/CourseModal";
import InteractivePatternSim from "@/components/dashboard/InteractivePatternSim";
import FaceSecurityModal from "@/components/dashboard/FaceSecurityModal";
import FaceOnboardingWizard from "@/components/dashboard/FaceOnboardingWizard";

type TradeRecord = {
  id: string;
  pnl: number;
  isWin: boolean;
  time: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout, refreshUser } = useAuth();
  const [, startTransition] = useTransition();

  const [activeNavTab, setActiveNavTab] = useState("overview");
  const [courseCategoryFilter, setCourseCategoryFilter] = useState("All");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
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
          <span className="text-xs font-semibold text-slate-500">Loading ChartCoach LMS…</span>
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
      course.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const showOnboarding = !user.has_face_enrolled && !dismissOnboarding;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-500 selection:text-white">
      {/* ─── Global Navbar ─── */}
      <DashboardNavbar
        user={user}
        onLogout={logout}
        onOpenSecurity={() => setShowSecurityModal(true)}
        activeTab={activeNavTab}
        setActiveTab={setActiveNavTab}
      />

      {/* ─── Main Content Container ─── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ─── OPTIONAL ONBOARDING: BIOMETRIC FACE ID SETUP WIZARD ─── */}
        {showOnboarding && (
          <section className="animate-fadeIn">
            <FaceOnboardingWizard
              user={user}
              onRefreshUser={refreshUser}
              onDismiss={() => setDismissOnboarding(true)}
            />
          </section>
        )}

        {/* ─── SECTION 1: REALTIME COMMAND CENTER (REAL USER METRICS) ─── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white p-6 sm:p-8 lg:p-10 shadow-xl border border-slate-800/80">
          {/* Subtle Ambient Radial Glows */}
          <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {user.has_face_enrolled ? "Workstation Secured • Face ID Active" : "New Trader • Setup in Progress"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                Welcome, {user.full_name}!
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                {enrolledCourses.length > 0
                  ? "Continue your institutional masterclass and test your setups in the live simulator."
                  : "Your trading journey begins today. Enroll in your first masterclass below or test market setups in the live simulator."}
              </p>

              {/* Realtime Live Performance Metrics */}
              <div className="grid grid-cols-3 gap-3 pt-2 max-w-lg">
                {/* Win-Rate */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Simulator Win-Rate
                  </span>
                  <span className="text-xl font-black text-emerald-400">
                    {winRatePercent !== null ? `${winRatePercent}%` : "--"}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {totalTradesCount > 0 ? `${totalTradesCount} Trades Logged` : "No trades yet"}
                  </span>
                </div>

                {/* Active Streak */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Learning Streak
                  </span>
                  <span className="text-xl font-black text-amber-400">1 Day</span>
                  <span className="text-[10px] text-slate-300 block mt-0.5">Active Session</span>
                </div>

                {/* Simulated P&L */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Simulated P&L
                  </span>
                  <span
                    className={`text-xl font-black ${
                      totalPnL > 0 ? "text-emerald-400" : totalPnL < 0 ? "text-rose-400" : "text-blue-400"
                    }`}
                  >
                    {totalPnL >= 0 ? `₹${totalPnL.toLocaleString()}` : `-₹${Math.abs(totalPnL).toLocaleString()}`}
                  </span>
                  <span className="text-[10px] text-slate-300 block mt-0.5">
                    {enrolledCourses.length} {enrolledCourses.length === 1 ? "Course" : "Courses"} Enrolled
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Active / Starter Course Card (5 cols) */}
            <div className="lg:col-span-5 bg-white/10 border border-white/15 rounded-3xl p-6 backdrop-blur-md space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-bold uppercase text-[10px] tracking-wider bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                  {activeCourse?.isEnrolled ? "Currently Enrolled" : "Recommended First Step"}
                </span>
                <span className="text-slate-300 font-bold font-mono">
                  {activeCourse?.progress || 0}% Completed
                </span>
              </div>

              <h3 className="text-base font-bold text-white line-clamp-1">{activeCourse?.title}</h3>

              {/* Real Progress Bar */}
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${activeCourse?.progress || 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                <span className="text-slate-200 truncate">
                  {activeCourse?.isEnrolled
                    ? "Module 1: The Foundations of Price Delivery"
                    : "12 Lessons • Beginner to Advanced"}
                </span>
                <span className="font-mono text-slate-400 shrink-0">{activeCourse?.duration}</span>
              </div>

              <div className="flex gap-2.5 pt-2">
                {activeCourse?.isEnrolled ? (
                  <button
                    type="button"
                    onClick={() => setSelectedCourse(activeCourse)}
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md hover:shadow-blue-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Resume Masterclass</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleEnrollCourse(activeCourse.id)}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md hover:shadow-emerald-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Start Masterclass (Free)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedCourse(activeCourse)}
                  className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                >
                  Curriculum
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── SECTION 2: TRADINGVIEW INTERACTIVE MARKET SIMULATOR STUDIO ─── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  TradingView Lightweight Engine
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
                Institutional Market Simulation Studio
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Interactive 60fps candlestick engine with EMA overlays, bar replay, and real-time AI trade critique.
            </p>
          </div>

          {/* TradingView Chart Component with real trade callback */}
          <TradingViewSimulator onTradeExecuted={handleTradeExecuted} />
        </section>

        {/* ─── SECTION 3: PATTERN DIAGNOSIS SCENARIO SANDBOX ─── */}
        <section className="space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Hands-on Skill Validation
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
              Pattern Recognition & Setup Diagnosis
            </h2>
          </div>

          <InteractivePatternSim />
        </section>

        {/* ─── SECTION 4: CURRICULUM & MASTERCLASSES CATALOG ─── */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Curriculum & Masterclasses</h2>
              <p className="text-xs text-slate-500 mt-0.5">Structured institutional modules for every stage of your trading journey</p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
              {["All", "Enrolled", "Price Action", "Smart Money (SMC)", "Options", "Risk Management"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCourseCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    courseCategoryFilter === cat
                      ? "bg-white text-blue-600 shadow-xs border border-slate-200/60 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                className="bg-white border border-slate-200/80 hover:border-blue-300 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group cursor-pointer"
              >
                {/* Top Card Info */}
                <div>
                  {/* Badge & Level */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                      {course.category}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">{course.level}</span>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {course.tagline}
                  </p>

                  {/* Metadata Chips */}
                  <div className="flex items-center gap-3 mt-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{course.duration}</span>
                    </span>

                    <span>•</span>

                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      <span>{course.totalLessons} Lessons</span>
                    </span>

                    <span>•</span>

                    <span className="flex items-center gap-1 text-amber-500 font-bold ml-auto">
                      <span>★</span>
                      <span>{course.rating.toFixed(1)}</span>
                    </span>
                  </div>

                  {/* Real Progress Bar */}
                  {course.isEnrolled && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1 font-semibold">
                        <span className="text-slate-500">Progress</span>
                        <span className="text-blue-600">{course.progress || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
                          style={{ width: `${course.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${course.instructor.avatarBg} text-white flex items-center justify-center text-xs font-bold`}>
                      {course.instructor.name.charAt(0)}
                    </div>
                    <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">{course.instructor.name}</span>
                  </div>

                  <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    <span>{course.isEnrolled ? "Continue" : "Explore"}</span>
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

      {/* ─── Face ID Security Settings Modal ─── */}
      {showSecurityModal && (
        <FaceSecurityModal
          user={user}
          onClose={() => setShowSecurityModal(false)}
          onRefreshUser={refreshUser}
        />
      )}

      {/* ─── Floating Continuous Face Monitor ─── */}
      {user.has_face_enrolled && monitor.stream && (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
          {showConfirmedFlash && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Biometrics Verified</span>
            </div>
          )}
          <div className="relative rounded-2xl overflow-hidden shadow-xl border-2 border-slate-800 bg-slate-950 w-32 h-24">
            <video
              ref={monitorVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="absolute bottom-1 inset-x-1 flex items-center justify-between bg-slate-950/80 px-2 py-0.5 rounded-lg text-[9px] text-slate-300 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active</span>
              </span>
              <span>Face ID</span>
            </div>
          </div>
        </div>
      )}

      {/* Lockscreen Modal when user turns away */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm text-center shadow-2xl space-y-3 animate-spring-pop">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">Session Locked</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{monitor.reason}</p>
            <p className="text-[11px] text-slate-400">
              Please look at the camera. Session unlocks automatically when you return.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
