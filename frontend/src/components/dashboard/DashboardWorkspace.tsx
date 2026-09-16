"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronRight,
  CirclePlay,
  Clock,
  Crosshair,
  FileText,
  GraduationCap,
  LayoutGrid,
  Link2,
  Play,
  Search,
  Sparkles,
  TrendingUp,
  BarChart3,
  BarChart2,
} from "lucide-react";
import { DashboardData } from "@/lib/learning";
import {
  fetchPolygonHistory,
  fetchPolygonWatchlist,
  fetchPolygonTicker,
  fetchPolygonTick,
  getPolygonStreamUrl,
  PolygonQuote,
  PolygonHistory,
  LiveTick,
} from "@/lib/api";
import MarketOverviewChart, { ChartType } from "@/components/dashboard/MarketOverviewChart";

type DashboardWorkspaceProps = {
  data: DashboardData;
  firstName: string;
  greeting: string;
};

const MARKET_ASSET_METADATA: Record<string, { name: string; exchange: string }> = {
  NVDA: { name: "NVIDIA Corporation", exchange: "NASDAQ" },
  AAPL: { name: "Apple Inc.", exchange: "NASDAQ" },
  TSLA: { name: "Tesla, Inc.", exchange: "NASDAQ" },
  SPY: { name: "SPDR S&P 500 ETF Trust", exchange: "NYSE Arca" },
  MSFT: { name: "Microsoft Corporation", exchange: "NASDAQ" },
  INFY: { name: "Infosys Limited", exchange: "NYSE" },
  XAUUSD: { name: "Gold Spot / US Dollar", exchange: "FOREX" },
};

// ─── CANDLESTICK CHART THUMBNAIL COMPONENT (16:9 VIDEO LESSON THUMBNAIL) ───
function CandlestickThumb({ variant = 1 }: { variant?: number }) {
  return (
    <div className="w-14 sm:w-16 aspect-video rounded-lg bg-slate-950 border border-slate-800 p-1 flex items-center justify-center shrink-0 overflow-hidden relative shadow-xs group-hover:border-slate-700 transition-colors">
      <svg viewBox="0 0 64 36" className="w-full h-full" fill="none">
        {/* Grid lines */}
        <line x1="0" y1="9" x2="64" y2="9" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="0" y1="18" x2="64" y2="18" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 2" />
        <line x1="0" y1="27" x2="64" y2="27" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 2" />

        {variant === 1 && (
          <>
            {/* Bullish pattern */}
            <line x1="12" y1="16" x2="12" y2="30" stroke="#10b981" strokeWidth="1" />
            <rect x="10.5" y="19" width="3" height="8" rx="0.5" fill="#10b981" />

            <line x1="26" y1="10" x2="26" y2="26" stroke="#ef4444" strokeWidth="1" />
            <rect x="24.5" y="13" width="3" height="9" rx="0.5" fill="#ef4444" />

            <line x1="40" y1="7" x2="40" y2="22" stroke="#10b981" strokeWidth="1" />
            <rect x="38.5" y="10" width="3" height="8" rx="0.5" fill="#10b981" />

            <line x1="54" y1="4" x2="54" y2="18" stroke="#10b981" strokeWidth="1" />
            <rect x="52.5" y="6" width="3" height="9" rx="0.5" fill="#10b981" />
          </>
        )}

        {variant === 2 && (
          <>
            {/* Breakout pattern */}
            <line x1="12" y1="18" x2="12" y2="28" stroke="#10b981" strokeWidth="1" />
            <rect x="10.5" y="20" width="3" height="6" rx="0.5" fill="#10b981" />

            <line x1="26" y1="16" x2="26" y2="26" stroke="#10b981" strokeWidth="1" />
            <rect x="24.5" y="18" width="3" height="5" rx="0.5" fill="#10b981" />

            <line x1="40" y1="12" x2="40" y2="22" stroke="#ef4444" strokeWidth="1" />
            <rect x="38.5" y="14" width="3" height="5" rx="0.5" fill="#ef4444" />

            <line x1="54" y1="3" x2="54" y2="18" stroke="#10b981" strokeWidth="1" />
            <rect x="52.5" y="5" width="3" height="10" rx="0.5" fill="#10b981" />
          </>
        )}

        {variant === 3 && (
          <>
            {/* Risk management consolidation */}
            <line x1="12" y1="10" x2="12" y2="26" stroke="#10b981" strokeWidth="1" />
            <rect x="10.5" y="13" width="3" height="8" rx="0.5" fill="#10b981" />

            <line x1="26" y1="12" x2="26" y2="24" stroke="#ef4444" strokeWidth="1" />
            <rect x="24.5" y="15" width="3" height="6" rx="0.5" fill="#ef4444" />

            <line x1="40" y1="14" x2="40" y2="26" stroke="#10b981" strokeWidth="1" />
            <rect x="38.5" y="17" width="3" height="6" rx="0.5" fill="#10b981" />

            <line x1="54" y1="8" x2="54" y2="22" stroke="#10b981" strokeWidth="1" />
            <rect x="52.5" y="11" width="3" height="8" rx="0.5" fill="#10b981" />
          </>
        )}
      </svg>

      {/* Subtle play indicator on hover */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Play className="w-3 h-3 text-white fill-current ml-0.5" />
      </div>
    </div>
  );
}

// ─── NEWS THUMBNAIL COMPONENT ───
function NewsThumb({ type = 1 }: { type?: number }) {
  const imgSrc = `/images/dashboard/news_${type}.jpg`;
  return (
    <div className="w-12 h-11 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden shrink-0 relative shadow-2xs">
      <img src={imgSrc} alt="News thumbnail" className="w-full h-full object-cover" />
    </div>
  );
}

// ─── LIVE MARKET TICKER CHIP COMPONENT ───
function TickerChip({
  item,
  liveTicks,
  selectedMarketIndex,
  setSelectedMarketIndex,
}: {
  item: any;
  liveTicks: Record<string, LiveTick>;
  selectedMarketIndex: string;
  setSelectedMarketIndex: (sym: string) => void;
}) {
  const sym = item.symbol;
  const liveItem = liveTicks[sym];
  const price = liveItem
    ? `$${liveItem.price.toFixed(2)}`
    : typeof item.price === "number"
    ? `$${item.price.toFixed(2)}`
    : item.price;
  const changePct = liveItem
    ? `${liveItem.change_percent >= 0 ? "+" : ""}${liveItem.change_percent.toFixed(2)}%`
    : typeof item.change_percent === "number"
    ? `${item.change_percent >= 0 ? "+" : ""}${item.change_percent.toFixed(2)}%`
    : (item.changePercent !== undefined ? `${item.changePercent >= 0 ? "+" : ""}${item.changePercent.toFixed(2)}%` : "+0.00%");
  const isPos = liveItem ? liveItem.is_positive : (item.is_positive ?? true);
  const tickDir = liveItem?.tick_direction;
  const isSelected = selectedMarketIndex === sym;

  return (
    <button
      type="button"
      onClick={() => setSelectedMarketIndex(sym)}
      title={`Click to view ${sym} in Market Overview`}
      className={`inline-flex items-center gap-2 shrink-0 px-2.5 py-1 rounded-lg transition-all text-xs font-mono cursor-pointer ${
        isSelected
          ? "bg-blue-50 text-blue-900 ring-1 ring-blue-500/30"
          : "hover:bg-slate-100/90 text-slate-700"
      }`}
    >
      <span className="font-extrabold text-blue-600 tracking-tight">{sym}</span>
      <span
        className={`font-semibold px-1.5 py-0.5 rounded transition-colors duration-300 ${
          tickDir === "up"
            ? "text-emerald-700 bg-emerald-100/90"
            : tickDir === "down"
            ? "text-rose-700 bg-rose-100/90"
            : "text-slate-800"
        }`}
      >
        {price}
      </span>
      <span
        className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
          isPos ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {isPos ? "▲" : "▼"} {changePct}
      </span>
      <span className="text-slate-200 select-none ml-1">·</span>
    </button>
  );
}

export default function DashboardWorkspace({
  data,
  firstName,
  greeting,
}: DashboardWorkspaceProps) {
  const { stats, currentLearning } = data;

  // Dynamic completed lessons count & total lessons across curriculum
  const completedLessons = stats.lessonsCompleted ?? 0;
  const totalLessons = stats.totalLessons > 0 ? stats.totalLessons : 68;
  const progressRatio = totalLessons > 0 ? Math.min(1, completedLessons / totalLessons) : 0;
  const ringCircumference = 2 * Math.PI * 34; // r=34 -> ~213.6
  const strokeDashoffset = ringCircumference * (1 - progressRatio);

  // Dynamic Continue Learning card logic
  const isEnrolled = !!currentLearning;
  const continueHref = currentLearning
    ? `/learn/courses/${currentLearning.courseId}/lessons/${currentLearning.lessonId}`
    : "/learn/courses/trading-101";

  const lessonCategory = currentLearning?.courseTitle || "Trading 101 · Beginner Foundation";
  const lessonTitle = currentLearning?.lessonTitle || "Trading Foundations — Start Your First Course";
  const lessonNumberLabel = currentLearning
    ? `Lesson ${currentLearning.lessonNumber} of ${currentLearning.totalLessons}`
    : "Level 1 · 14 Lessons";
  const lessonProgressPercent = currentLearning ? (currentLearning.progressPercent || 0) : 0;
  const continueActionText = currentLearning ? "Continue Watching" : "Enroll & Start Course";
  const courseDescription = currentLearning
    ? "Continue where you left off. Complete this lesson to maintain your learning streak and advance your journey."
    : "Master the fundamental mechanics of financial markets, price charts, order execution, and risk management.";

  // Dynamic Up Next lessons from active course or curriculum
  const dynamicUpNext = (data.upNextLessons && data.upNextLessons.length > 0)
    ? data.upNextLessons.slice(0, 3)
    : [
        {
          id: "t101-l2",
          courseId: "trading-101",
          title: "Financial Markets Overview",
          order: 2,
          durationMinutes: 25,
        },
        {
          id: "t101-l3",
          courseId: "trading-101",
          title: "Market Participants: Retail vs Institutional",
          order: 3,
          durationMinutes: 20,
        },
        {
          id: "t101-l4",
          courseId: "trading-101",
          title: "Orders & Execution Mechanics",
          order: 4,
          durationMinutes: 25,
        },
      ];

  // Selected stock / index symbol and timeframe
  const [selectedMarketIndex, setSelectedMarketIndex] = useState("NVDA");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1D");
  const [chartType, setChartType] = useState<ChartType>("area");
  const [historyData, setHistoryData] = useState<PolygonHistory | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [liveWatchlist, setLiveWatchlist] = useState<PolygonQuote[]>([]);
  const [liveTicker, setLiveTicker] = useState<PolygonQuote[]>([]);

  // Real-Time Live Ticking State
  const [liveTicks, setLiveTicks] = useState<Record<string, LiveTick>>({});
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);

  // Fetch TradingView Lightweight Charts history with AbortController (prevents out-of-order race conditions)
  useEffect(() => {
    const controller = new AbortController();
    setIsChartLoading(true);

    fetchPolygonHistory(selectedMarketIndex, selectedTimeframe, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted && res) {
          setHistoryData(res);
          setIsChartLoading(false);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("Polygon history fetch notice:", err);
          setIsChartLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedMarketIndex, selectedTimeframe]);

  // Real-Time Live Market Stream Engine (SSE with high-availability fallback)
  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;
    let tickInterval: NodeJS.Timeout | null = null;

    const symbols = ["NVDA", "AAPL", "TSLA", "SPY", "MSFT", "AMZN", "INFY", "XAUUSD"];

    // 1. Server-Sent Events (SSE) Stream
    try {
      const url = getPolygonStreamUrl(symbols);
      eventSource = new EventSource(url);

      eventSource.onmessage = (e) => {
        if (!isMounted) return;
        try {
          const payload = JSON.parse(e.data);
          if (Array.isArray(payload)) {
            const map: Record<string, LiveTick> = {};
            payload.forEach((t: LiveTick) => {
              map[t.symbol] = t;
            });
            setLiveTicks((prev) => ({ ...prev, ...map }));
          } else if (payload && payload.symbol) {
            setLiveTicks((prev) => ({ ...prev, [payload.symbol]: payload }));
          }
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
      };
    } catch {
      // fallback
    }

    // 2. Continuous 1.5s live tick fallback (ensures data is always live even if SSE is blocked)
    const runLiveTick = async () => {
      if (!isMounted) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      try {
        const tick = await fetchPolygonTick(selectedMarketIndex);
        if (isMounted && tick) {
          setLiveTicks((prev) => ({ ...prev, [tick.symbol]: tick }));
        }
      } catch {
        // ignore
      }
    };

    tickInterval = setInterval(runLiveTick, 1500);

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
      if (tickInterval) clearInterval(tickInterval);
    };
  }, [selectedMarketIndex]);

  // Visual price flash effect when selectedMarketIndex ticks
  useEffect(() => {
    const tick = liveTicks[selectedMarketIndex];
    if (tick) {
      setPriceFlash(tick.tick_direction === "up" ? "up" : tick.tick_direction === "down" ? "down" : null);
      const timer = setTimeout(() => setPriceFlash(null), 500);
      return () => clearTimeout(timer);
    }
  }, [liveTicks, selectedMarketIndex]);

  // Initial and periodic batch background refresh for quotes
  useEffect(() => {
    let isMounted = true;
    const fetchQuotes = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      try {
        const [wl, t] = await Promise.allSettled([fetchPolygonWatchlist(), fetchPolygonTicker()]);
        if (isMounted) {
          if (wl.status === "fulfilled" && wl.value && wl.value.length > 0) setLiveWatchlist(wl.value);
          if (t.status === "fulfilled" && t.value && t.value.length > 0) setLiveTicker(t.value);
        }
      } catch {}
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 25000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Selected market asset quote info with real-time live tick overlay
  const activeTick = liveTicks[selectedMarketIndex];
  const activeMarket = {
    price: activeTick
      ? `$${activeTick.price.toFixed(2)}`
      : historyData
      ? `$${historyData.current_price.toFixed(2)}`
      : "$225.83",
    change: activeTick
      ? `${activeTick.change >= 0 ? "+" : "-"}$${Math.abs(activeTick.change).toFixed(2)}`
      : historyData?.change !== undefined
      ? `${historyData.change >= 0 ? "+" : "-"}$${Math.abs(historyData.change).toFixed(2)}`
      : "-$7.29",
    changePercent: activeTick
      ? `${activeTick.change_percent >= 0 ? "+" : ""}${activeTick.change_percent.toFixed(2)}%`
      : historyData?.change_percent !== undefined
      ? `${historyData.change_percent >= 0 ? "+" : ""}${historyData.change_percent.toFixed(2)}%`
      : "-3.13%",
    isPositive: activeTick ? activeTick.is_positive : (historyData?.is_positive ?? false),
    name: activeTick?.name || historyData?.name || selectedMarketIndex,
  };

  // Quick tools list
  const quickTools = [
    {
      id: "screener",
      title: "Screener",
      subtitle: "Find winning stocks",
      icon: Search,
      iconBg: "bg-blue-50 text-blue-600",
      href: "/tools",
    },
    {
      id: "analyzer",
      title: "Chart Analyzer",
      subtitle: "Analyse any stock",
      icon: BarChart3,
      iconBg: "bg-blue-50 text-blue-600",
      href: "/tools",
    },
    {
      id: "options",
      title: "Options Chain",
      subtitle: "Explore derivatives",
      icon: Link2,
      iconBg: "bg-pink-50 text-pink-600",
      href: "/tools",
    },
    {
      id: "strategy",
      title: "Strategy Builder",
      subtitle: "Create & backtest",
      icon: LayoutGrid,
      iconBg: "bg-emerald-50 text-emerald-600",
      href: "/tools",
    },
    {
      id: "paper",
      title: "Paper Trading",
      subtitle: "Practice risk-free",
      icon: FileText,
      iconBg: "bg-teal-50 text-teal-600",
      href: "/simulator",
    },
    {
      id: "calendar",
      title: "Economic Calendar",
      subtitle: "Track key events",
      icon: Calendar,
      iconBg: "bg-indigo-50 text-indigo-600",
      href: "/tools",
    },
  ];

  // Default Watchlist fallback if initial load is pending
  const defaultWatchlist: PolygonQuote[] = [
    { symbol: "NVDA", name: "NVIDIA Corp", price: 226.17, change: 0.44, change_percent: 0.19, is_positive: true, open: 225.73, high: 226.83, low: 225.51, prev_close: 225.73, volume: 4500000, updated_at: Date.now() },
    { symbol: "AAPL", name: "Apple Inc", price: 316.22, change: -0.88, change_percent: -0.28, is_positive: false, open: 317.1, high: 320.7, low: 314.9, prev_close: 317.1, volume: 35477090, updated_at: Date.now() },
    { symbol: "TSLA", name: "Tesla Inc", price: 368.16, change: 11.06, change_percent: 3.10, is_positive: true, open: 357.1, high: 370.0, low: 355.75, prev_close: 357.1, volume: 51078786, updated_at: Date.now() },
    { symbol: "MSFT", name: "Microsoft Corp", price: 493.95, change: 0.94, change_percent: 0.19, is_positive: true, open: 493.01, high: 495.19, low: 490.15, prev_close: 493.01, volume: 18882338, updated_at: Date.now() },
    { symbol: "AMZN", name: "Amazon.com Inc", price: 256.97, change: 0.30, change_percent: 0.12, is_positive: true, open: 256.68, high: 257.99, low: 254.75, prev_close: 256.68, volume: 29397994, updated_at: Date.now() },
    { symbol: "INFY", name: "Infosys Ltd ADR", price: 11.15, change: 0.02, change_percent: 0.18, is_positive: true, open: 11.13, high: 11.18, low: 11.12, prev_close: 11.13, volume: 4500000, updated_at: Date.now() },
  ];

  const watchlistItems = liveWatchlist.length > 0 ? liveWatchlist : defaultWatchlist;

  const getBadgeStyle = (sym: string) => {
    switch (sym) {
      case "NVDA": return "bg-emerald-600 text-white";
      case "AAPL": return "bg-slate-900 text-white";
      case "TSLA": return "bg-rose-600 text-white";
      case "MSFT": return "bg-blue-600 text-white";
      case "AMZN": return "bg-amber-600 text-white";
      case "INFY": return "bg-sky-600 text-white";
      case "SPY": return "bg-purple-600 text-white";
      case "XAUUSD": return "bg-amber-500 text-white";
      default: return "bg-indigo-600 text-white";
    }
  };

  // Market news items
  const marketNews = [
    {
      id: "news-1",
      title: "Tech rally broadens; AI leaders drive volume surge",
      timeAgo: "2 hours ago",
      thumbType: 1,
    },
    {
      id: "news-2",
      title: "Federal Reserve hints at stable rate outlook",
      timeAgo: "4 hours ago",
      thumbType: 2,
    },
    {
      id: "news-3",
      title: "Global markets end higher ahead of quarterly reports",
      timeAgo: "6 hours ago",
      thumbType: 3,
    },
    {
      id: "news-4",
      title: "Top 5 high-beta momentum setups to watch this week",
      timeAgo: "8 hours ago",
      thumbType: 4,
    },
  ];

  // Live Ticker items for bottom strip from Polygon.io
  const defaultTicker: PolygonQuote[] = [
    { symbol: "SPY", name: "S&P 500 ETF", price: 765.23, change: -0.73, change_percent: -0.10, is_positive: false, open: 765.96, high: 766.32, low: 764.14, prev_close: 765.96, volume: 4500000, updated_at: Date.now() },
    { symbol: "QQQ", name: "Nasdaq 100", price: 482.25, change: -0.05, change_percent: -0.01, is_positive: false, open: 482.3, high: 482.32, low: 482.18, prev_close: 482.3, volume: 4500000, updated_at: Date.now() },
    { symbol: "NVDA", name: "NVIDIA", price: 226.17, change: 0.44, change_percent: 0.19, is_positive: true, open: 225.73, high: 226.83, low: 225.51, prev_close: 225.73, volume: 4500000, updated_at: Date.now() },
    { symbol: "AAPL", name: "Apple", price: 316.22, change: -0.88, change_percent: -0.28, is_positive: false, open: 317.1, high: 320.7, low: 314.9, prev_close: 317.1, volume: 35477090, updated_at: Date.now() },
    { symbol: "TSLA", name: "Tesla", price: 368.16, change: 11.06, change_percent: 3.10, is_positive: true, open: 357.1, high: 370.0, low: 355.75, prev_close: 357.1, volume: 51078786, updated_at: Date.now() },
    { symbol: "MSFT", name: "Microsoft", price: 493.95, change: 0.94, change_percent: 0.19, is_positive: true, open: 493.01, high: 495.19, low: 490.15, prev_close: 493.01, volume: 18882338, updated_at: Date.now() },
    { symbol: "AMZN", name: "Amazon", price: 256.97, change: 0.30, change_percent: 0.12, is_positive: true, open: 256.68, high: 257.99, low: 254.75, prev_close: 256.68, volume: 29397994, updated_at: Date.now() },
    { symbol: "INFY", name: "Infosys", price: 11.15, change: 0.02, change_percent: 0.18, is_positive: true, open: 11.13, high: 11.18, low: 11.12, prev_close: 11.13, volume: 4500000, updated_at: Date.now() },
    { symbol: "XAUUSD", name: "Gold Spot (USD)", price: 2655.80, change: 12.40, change_percent: 0.47, is_positive: true, open: 2643.40, high: 2662.10, low: 2640.20, prev_close: 2643.40, volume: 850000, updated_at: Date.now() },
  ];

  const tickerItems = liveTicker.length > 0 ? liveTicker : defaultTicker;

  return (
    <div className="space-y-4 sm:space-y-4.5 pb-4">
      {/* ─── HEADER ROW: GREETING & PHILOSOPHY QUOTE ─── */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-slate-900">
            {greeting}, {firstName || "Riya"} <span role="img" aria-label="wave">👋</span>
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
            Discipline today. Freedom tomorrow.
          </p>
        </div>

        <div className="text-right hidden md:block">
          <p className="text-xs sm:text-sm italic font-serif text-slate-700">
            “The stock market rewards the prepared mind.”
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">
            — Mark Minervini
          </p>
        </div>
      </div>

      {/* ─── ROW 1: LEARNING HUB (HIGHLIGHTED HERO SECTION) ─── */}
      <section className="relative rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-blue-50/90 via-indigo-50/45 to-sky-50/70 border border-blue-200/85 shadow-xs overflow-hidden">
        {/* Subtle ambient glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* CARD 1: CONTINUE LEARNING (Span 5) */}
          <div className="lg:col-span-5 bg-white/95 backdrop-blur-xs border border-blue-200/90 rounded-2xl p-4 sm:p-4.5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between ring-1 ring-blue-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Continue Learning</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60">
                Featured
              </span>
            </div>

            <div className="mt-3.5 flex flex-col sm:flex-row gap-3.5 items-start sm:items-center">
              {/* Left Video Thumbnail - STRICT 16:9 ASPECT RATIO */}
              <div className="relative w-full sm:w-48 md:w-52 aspect-video shrink-0 self-center rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group shadow-xs">
                <img
                  src="/images/dashboard/instructor_thumbnail.jpg"
                  alt="Support and Resistance Explained"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                {/* Center Play Button */}
                <Link
                  href={continueHref}
                  aria-label="Play video"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/95 hover:bg-white text-slate-900 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform cursor-pointer"
                >
                  <Play className="w-4.5 h-4.5 fill-current ml-0.5 text-slate-900" />
                </Link>

                {/* Duration Badge Bottom Right */}
                <span className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-black/80 text-[10px] font-mono text-white font-semibold shadow-xs">
                  24:18
                </span>
              </div>

              {/* Right Course & Lesson Details */}
              <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0 w-full">
                <div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-blue-600 shrink-0">
                      {currentLearning ? currentLearning.courseTitle : "Trading 101"}
                    </span>
                    <span className="text-slate-300 shrink-0">·</span>
                    <span className="text-slate-400 font-medium text-[11px] shrink-0 whitespace-nowrap">
                      {lessonNumberLabel}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 mt-1 leading-snug line-clamp-2">
                    {lessonTitle}
                  </h3>

                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {courseDescription}
                  </p>
                </div>

                <div className="mt-2.5 space-y-2">
                  {/* Progress Bar with label */}
                  <div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${lessonProgressPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
                      {lessonProgressPercent}% complete
                    </span>
                  </div>

                  {/* Continue Watching / Start Course Button */}
                  <Link
                    href={continueHref}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer w-fit"
                  >
                    <span>{continueActionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: UP NEXT (Span 4) */}
          <div className="lg:col-span-4 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Up Next</span>
            </div>

            <div className="mt-3 divide-y divide-slate-100 flex-1 flex flex-col justify-around">
              {dynamicUpNext.map((lesson: any, idx: number) => (
                <Link
                  key={lesson.id || idx}
                  href={`/learn/courses/${lesson.courseId || "trading-101"}/lessons/${lesson.id}`}
                  className="group flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <CandlestickThumb variant={((idx % 3) + 1) as 1 | 2 | 3} />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {lesson.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Lesson {lesson.order ?? idx + 2} · {lesson.durationMinutes ?? 20} min
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* CARD 3: YOUR LEARNING JOURNEY (Span 3) */}
          <div className="lg:col-span-3 bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Your Learning Journey</span>
            </div>

            {/* Donut Progress Ring */}
            <div className="flex items-center justify-center gap-4 py-3 my-auto">
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  {/* Background Ring */}
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="text-blue-100"
                    strokeWidth="7"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  {/* Progress Arc */}
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="text-blue-600"
                    strokeWidth="7"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
              </div>

              <div className="text-left">
                <div className="text-2xl font-black tracking-tight text-slate-900">
                  {completedLessons} / {totalLessons}
                </div>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Lessons Completed
                </p>
              </div>
            </div>

            {/* Go to Learn Button */}
            <Link
              href="/learn/courses"
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-blue-600 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            >
              <span>Go to Learn</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── ROW 2: QUICK TOOLS STRIP (6 PILL SHORTCUT CARDS) ─── */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {quickTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.id}
              href={tool.href}
              className="bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-xs rounded-2xl px-3 py-2.5 transition-all duration-150 flex items-center gap-2 group"
            >
              <div className={`w-8 h-8 rounded-xl ${tool.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[11.5px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap overflow-hidden text-ellipsis tracking-tight">
                  {tool.title}
                </h4>
                <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                  {tool.subtitle}
                </p>
              </div>
            </Link>
          );
        })}
      </section>

      {/* ─── ROW 3: MARKET OVERVIEW, WATCHLIST, MARKET NEWS (3 COLUMNS) ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* COLUMN 1: MARKET OVERVIEW (Span 6) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            {/* ─── Top Header: ChartCoach Brand & Asset Switcher ─── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/80 p-1 flex items-center justify-center shadow-2xs shrink-0">
                  <img
                    src="/assets/chartcoach_icon.png"
                    alt="ChartCoach"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Market Overview</h3>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-extrabold tracking-wider">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      LIVE STREAM
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-medium tracking-tight">
                    ChartCoach Real-Time Market Intelligence
                  </p>
                </div>
              </div>

              {/* Asset Selector Segmented Bar */}
              <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 gap-0.5 overflow-x-auto custom-scrollbar">
                {["NVDA", "AAPL", "TSLA", "SPY", "MSFT", "INFY", "XAUUSD"].map((idx) => {
                  const isSelected = selectedMarketIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedMarketIndex(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? "bg-white text-blue-600 shadow-xs ring-1 ring-slate-200/60"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
                      }`}
                    >
                      {idx}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── Middle Row: Big Hero Price & Unified Control Cluster ─── */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              {/* Asset Hero & Price */}
              <div className="flex items-baseline gap-3 flex-wrap">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    {MARKET_ASSET_METADATA[selectedMarketIndex]?.exchange || "US"}: {selectedMarketIndex} · {MARKET_ASSET_METADATA[selectedMarketIndex]?.name || activeMarket.name}
                  </div>
                  <div className="flex items-baseline gap-2.5 mt-0.5">
                    <span
                      className={`text-2xl sm:text-[28px] font-black tracking-tight font-mono px-1 rounded transition-colors duration-300 ${
                        priceFlash === "up"
                          ? "text-emerald-700 bg-emerald-100/90"
                          : priceFlash === "down"
                          ? "text-rose-700 bg-rose-100/90"
                          : "text-slate-900"
                      }`}
                    >
                      {activeMarket.price}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                        activeMarket.isPositive
                          ? "text-emerald-700 bg-emerald-50 border border-emerald-200/60"
                          : "text-rose-700 bg-rose-50 border border-rose-200/60"
                      }`}
                    >
                      {activeMarket.isPositive ? "▲" : "▼"} {activeMarket.change} ({activeMarket.changePercent})
                    </span>
                  </div>
                </div>
              </div>

              {/* Unified Toolbar: Timeframe Selector + Chart Type View Toggle */}
              <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/70 gap-1">
                {/* Timeframe Buttons */}
                <div className="flex items-center gap-0.5">
                  {["1D", "1W", "1M", "1Y", "ALL"].map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setSelectedTimeframe(tf)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        selectedTimeframe === tf
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-4 bg-slate-300 mx-0.5" />

                {/* View Switcher: Line vs Candle */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setChartType("area")}
                    title="Line View"
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      chartType === "area"
                        ? "bg-white text-blue-600 shadow-xs ring-1 ring-slate-200/60"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Line</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType("candle")}
                    title="Candle View"
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      chartType === "candle"
                        ? "bg-white text-blue-600 shadow-xs ring-1 ring-slate-200/60"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Candle</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TradingView Lightweight Chart Container */}
          <div className="w-full mt-3 min-h-[250px] flex-1">
            <MarketOverviewChart
              symbol={selectedMarketIndex}
              timeframe={selectedTimeframe}
              bars={historyData?.bars || []}
              isPositive={activeMarket.isPositive}
              isLoading={isChartLoading}
              liveTick={activeTick}
              chartType={chartType}
              onChartTypeChange={setChartType}
              hideViewToggle={true}
            />
          </div>
        </div>

        {/* COLUMN 2: WATCHLIST (Span 3) */}
        <div className="lg:col-span-3 bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header with View All */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Watchlist</span>
              </div>
              <Link href="/market" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Table Column Labels */}
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-2 border-b border-slate-50">
              <span>Symbol</span>
              <span>Price</span>
              <span>Change</span>
            </div>

            {/* Stock Rows */}
            <div className="divide-y divide-slate-100/80">
              {watchlistItems.map((stock) => {
                const liveStock = liveTicks[stock.symbol];
                const displayPrice = liveStock ? liveStock.price : stock.price;
                const displayChangePercent = liveStock ? liveStock.change_percent : stock.change_percent;
                const isPos = liveStock ? liveStock.is_positive : stock.is_positive;
                const tickDir = liveStock?.tick_direction;

                return (
                  <div
                    key={stock.symbol}
                    onClick={() => setSelectedMarketIndex(stock.symbol)}
                    className={`flex items-center justify-between py-2.5 hover:bg-slate-50/80 rounded-xl transition-all px-1.5 cursor-pointer group ${
                      selectedMarketIndex === stock.symbol ? "bg-blue-50/60 ring-1 ring-blue-500/20" : ""
                    }`}
                  >
                    {/* Stock Badge & Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-6 h-6 rounded-md ${getBadgeStyle(stock.symbol)} flex items-center justify-center text-[9px] font-black tracking-tighter shrink-0 shadow-2xs`}>
                        {stock.symbol.slice(0, 4)}
                      </span>
                      <div className="min-w-0 flex flex-col">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {stock.symbol}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate -mt-0.5">
                          {stock.name || stock.symbol}
                        </span>
                      </div>
                    </div>

                    {/* Price & Change with Live Flash */}
                    <div className="text-right">
                      <div
                        className={`text-xs font-mono font-bold px-1 rounded transition-colors duration-300 ${
                          tickDir === "up"
                            ? "text-emerald-700 bg-emerald-100"
                            : tickDir === "down"
                            ? "text-rose-700 bg-rose-100"
                            : "text-slate-900"
                        }`}
                      >
                        ${typeof displayPrice === "number" ? displayPrice.toFixed(2) : displayPrice}
                      </div>
                      <div className={`text-[11px] font-bold font-mono ${isPos ? "text-emerald-600" : "text-rose-600"}`}>
                        {isPos ? "+" : ""}{typeof displayChangePercent === "number" ? displayChangePercent.toFixed(2) : displayChangePercent}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMN 3: MARKET NEWS (Span 3) */}
        <div className="lg:col-span-3 bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header with View All */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <span>Market News</span>
              </div>
              <Link href="/market" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* News Items */}
            <div className="divide-y divide-slate-100/80">
              {marketNews.map((news) => (
                <div key={news.id} className="flex items-center gap-3 py-2.5 first:pt-2 last:pb-0 group cursor-pointer">
                  <NewsThumb type={news.thumbType} />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
                      {news.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                      {news.timeAgo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── ROW 4: PINNED BOTTOM LIVE MARKET TICKER STRIP (INFINITE SEAMLESS MARQUEE) ─── */}
      <footer className="fixed bottom-14 lg:bottom-0 left-0 right-0 lg:left-[var(--sidebar-offset,240px)] z-30 transition-all duration-300 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(15,23,42,0.06)]">
        <div className="h-10 sm:h-11 flex items-center justify-between overflow-hidden relative select-none">
          {/* Left Live Badge */}
          <div className="flex items-center gap-2 pl-3 sm:pl-4 pr-3 shrink-0 border-r border-slate-200/80 bg-white/95 z-20 h-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-900 whitespace-nowrap">
              Live Market
            </span>
            <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase tracking-wider border border-emerald-200/60">
              Feed
            </span>
          </div>

          {/* Scrolling Marquee Area */}
          <div className="relative flex-1 overflow-hidden h-full flex items-center ticker-marquee-wrapper">
            {/* Left Edge Gradient Fade Mask */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />

            {/* Infinite Marquee Track (Double duplicate for seamless continuous loop) */}
            <div className="animate-ticker-marquee flex items-center gap-2 text-xs font-mono py-1 px-4 cursor-pointer">
              {/* Set 1 */}
              {[...tickerItems, ...tickerItems].map((item: any, idx: number) => (
                <TickerChip
                  key={`marquee-1-${item.symbol || idx}-${idx}`}
                  item={item}
                  liveTicks={liveTicks}
                  selectedMarketIndex={selectedMarketIndex}
                  setSelectedMarketIndex={setSelectedMarketIndex}
                />
              ))}
              {/* Set 2 (Identical for seamless wrap without jump) */}
              {[...tickerItems, ...tickerItems].map((item: any, idx: number) => (
                <TickerChip
                  key={`marquee-2-${item.symbol || idx}-${idx}`}
                  item={item}
                  liveTicks={liveTicks}
                  selectedMarketIndex={selectedMarketIndex}
                  setSelectedMarketIndex={setSelectedMarketIndex}
                />
              ))}
            </div>

            {/* Right Edge Gradient Fade Mask */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-14 bg-gradient-to-l from-white via-white/80 to-transparent z-10" />
          </div>

          {/* Right Action Link */}
          <div className="flex items-center gap-2 pl-3 pr-3 sm:pr-4 shrink-0 border-l border-slate-200/80 bg-white/95 z-20 h-full">
            <Link
              href="/market"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap group"
            >
              <span>All Markets</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
