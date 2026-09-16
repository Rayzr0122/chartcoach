"use client";

import { useEffect, useState, useId } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  fetchMarketsPage,
  MarketsPageData,
  MarketTickerItem,
  AIInsight,
  TopMover,
  SectorPerf,
  MarketNewsItem,
  EconomicEvent,
} from "@/lib/api";
import { MarketTreemap } from "@/components/market/MarketTreemap";
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Search,
  Activity,
  Flame,
  Globe,
  Calendar,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Zap,
  BarChart3,
  SlidersHorizontal,
} from "lucide-react";

// ─── Enhanced Mini Area Sparkline ────────────────────────────────────────────

function EnhancedSparkline({
  points,
  isPositive,
  width = 72,
  height = 28,
}: {
  points: number[];
  isPositive: boolean;
  width?: number;
  height?: number;
}) {
  const gradientId = useId();
  if (!points || points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const polyPoints = points.map((v, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return { x, y };
  });

  const pathStr = polyPoints.reduce(
    (acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
    ""
  );

  const areaStr = `${pathStr} L ${width},${height} L 0,${height} Z`;

  const strokeColor = isPositive ? "#10B981" : "#F43F5E";
  const stopColor = isPositive ? "#10B981" : "#F43F5E";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stopColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stopColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaStr} fill={`url(#${gradientId})`} />
      <path
        d={pathStr}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Index Ticker Card ───────────────────────────────────────────────────────

function IndexTickerCard({ item, onClick }: { item: MarketTickerItem; onClick: () => void }) {
  const sparkPoints = Array.from({ length: 14 }, (_, i) => {
    const seed = item.symbol.charCodeAt(i % item.symbol.length) + i * 3;
    return item.price * (1 + ((seed % 20) - 10) * 0.00035);
  });

  const priceStr =
    item.symbol === "XAUUSD"
      ? `$${item.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
      : item.symbol === "GOLD"
      ? `₹${item.price.toLocaleString("en-IN")}`
      : item.symbol === "USD/INR"
      ? item.price.toFixed(2)
      : item.price.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  return (
    <div
      onClick={onClick}
      className="flex flex-col justify-between min-w-[170px] p-3.5 rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-sm cursor-pointer group transition-all"
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
          {item.symbol}
        </span>
        <div
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
            item.isPositive
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
              : "bg-rose-50 text-rose-700 border border-rose-200/60"
          }`}
        >
          {item.isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          <span>
            {item.isPositive ? "+" : ""}
            {item.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="my-1.5">
        <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-mono">
          {priceStr}
        </span>
        <p className="text-[10px] font-medium text-slate-400">
          {item.isPositive ? "+" : ""}
          {item.change.toFixed(2)} pts
        </p>
      </div>

      <div className="pt-1 flex items-center justify-between">
        <EnhancedSparkline points={sparkPoints} isPositive={item.isPositive} width={88} height={24} />
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}

// ─── AI Market Insights Card ─────────────────────────────────────────────────

function AIInsightsCard({
  insights,
  onInspect,
}: {
  insights: AIInsight[];
  onInspect: (sym: string) => void;
}) {
  const router = useRouter();
  const tagColorMap: Record<string, { bg: string; text: string; border: string }> = {
    green: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    orange: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">AI Market Radar</h2>
              <p className="text-[11px] text-slate-500">Autonomous pattern & volume detection</p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Realtime
          </span>
        </div>

        <div className="space-y-2.5">
          {insights.map((ins) => {
            const style = tagColorMap[ins.tagColor] || tagColorMap.green;
            return (
              <div
                key={ins.symbol}
                onClick={() => onInspect(ins.symbol)}
                className="group p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer flex items-start gap-3"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-black shadow-xs"
                  style={{ backgroundColor: ins.iconColor }}
                >
                  {ins.symbol.slice(0, 1)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {ins.symbol}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}
                    >
                      {ins.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                    {ins.description}
                  </p>
                </div>

                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0 mt-1" />
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push("/dashboard?ai_chat=true")}
        className="mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
      >
        <Zap className="w-3.5 h-3.5 text-amber-300" />
        <span>Ask ChartCoach Copilot</span>
        <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </button>
    </div>
  );
}

// ─── Top Movers Card ─────────────────────────────────────────────────────────

function TopMoversCard({
  gainers,
  losers,
  active,
  onSelectStock,
}: {
  gainers: TopMover[];
  losers: TopMover[];
  active: TopMover[];
  onSelectStock: (symbol: string) => void;
}) {
  const [tab, setTab] = useState<"gainers" | "losers" | "active">("gainers");
  const tabs = [
    { key: "gainers" as const, label: "Gainers", icon: TrendingUp },
    { key: "losers" as const, label: "Losers", icon: TrendingDown },
    { key: "active" as const, label: "Most Active", icon: Flame },
  ];
  const items = tab === "gainers" ? gainers : tab === "losers" ? losers : active;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900">Top Movers</h2>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              Intraday
            </span>
          </div>
        </div>

        {/* Segmented control */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl mb-4">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isSel = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSel
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon
                  className={`w-3 h-3 ${
                    t.key === "gainers"
                      ? "text-emerald-600"
                      : t.key === "losers"
                      ? "text-rose-600"
                      : "text-amber-500"
                  }`}
                />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Movers list */}
        <div className="space-y-1.5">
          {items.slice(0, 5).map((item, idx) => (
            <div
              key={item.symbol}
              onClick={() => onSelectStock(item.symbol)}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 text-center text-[10px] font-bold text-slate-400">
                  {idx + 1}
                </span>
                <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-blue-50 border border-slate-200/80 flex items-center justify-center text-xs font-black text-slate-700 group-hover:text-blue-600 transition-colors">
                  {item.symbol.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {item.symbol}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[90px]">
                    {item.name}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <EnhancedSparkline
                  points={item.sparkline}
                  isPositive={item.isPositive}
                  width={54}
                  height={20}
                />
                <div
                  className={`min-w-[62px] text-right px-2 py-0.5 rounded text-xs font-extrabold font-mono ${
                    item.isPositive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                      : "bg-rose-50 text-rose-700 border border-rose-200/60"
                  }`}
                >
                  {item.isPositive ? "+" : ""}
                  {item.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelectStock("NIFTY 50")}
        className="mt-3 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 py-1.5 transition-colors cursor-pointer"
      >
        <span>View Full Screener</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Sector Performance Card ─────────────────────────────────────────────────

function SectorPerformanceCard({
  sectors,
  onSelectSector,
}: {
  sectors: SectorPerf[];
  onSelectSector?: (sector: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900">Sector Performance</h2>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              Weighted
            </span>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          {sectors.map((sec) => (
            <div
              key={sec.sector}
              onClick={() => onSelectSector && onSelectSector(sec.sector)}
              className="flex items-center gap-3 cursor-pointer group py-0.5"
            >
              <span className="text-base shrink-0 w-6 text-center">{sec.icon}</span>
              <span className="text-xs font-bold text-slate-700 w-28 truncate group-hover:text-blue-600 transition-colors">
                {sec.sector}
              </span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    sec.isPositive
                      ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                      : "bg-gradient-to-r from-rose-400 to-rose-600"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, sec.barPercent))}%` }}
                />
              </div>
              <span
                className={`text-xs font-mono font-bold min-w-[54px] text-right ${
                  sec.isPositive ? "text-emerald-600" : "text-rose-500"
                }`}
              >
                {sec.isPositive ? "+" : ""}
                {sec.changePercent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span>Click sector to isolate in heatmap</span>
        <Layers className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

// ─── CTA Card ────────────────────────────────────────────────────────────────

function MarketCTACard() {
  const router = useRouter();
  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
            PRO INTELLIGENCE
          </span>
          <Activity className="w-4 h-4 text-blue-400" />
        </div>
        <h3 className="text-base sm:text-lg font-black leading-tight text-white mt-2">
          Master Institutional <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300">
            Capital Flows & Levels
          </span>
        </h3>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Unlock algorithmic orderflow analytics, dark pool tracking, and predictive entry levels.
        </p>
      </div>

      <div className="mt-5 relative z-10">
        <button
          type="button"
          onClick={() => router.push("/pricing")}
          className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
        >
          <span>Upgrade to ChartCoach Pro</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Market News Card ────────────────────────────────────────────────────────

const NEWS_TABS = ["Top News", "Earnings", "Corporate", "Global", "Macro"];

function MarketNewsCard({ news }: { news: MarketNewsItem[] }) {
  const [activeTab, setActiveTab] = useState("Top News");
  const filteredNews =
    activeTab === "Top News" ? news : news.filter((n) => n.category === activeTab);
  const displayNews = filteredNews.length > 0 ? filteredNews : news.slice(0, 3);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600" />
          <h2 className="text-base font-black text-slate-900">Market Newsfeed</h2>
        </div>
        <span className="text-[11px] font-bold text-slate-400">Live Wire</span>
      </div>

      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 custom-scrollbar">
        {NEWS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-3.5">
        {displayNews.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3.5 cursor-pointer group p-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 group-hover:text-blue-600 transition-colors">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {item.category}
                </span>
                <span className="text-[10px] text-slate-400">
                  {item.timeAgo} • {item.source}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                {item.headline}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {item.summary}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Economic Calendar Card ──────────────────────────────────────────────────

const CALENDAR_TABS = ["Upcoming", "Earnings", "IPO", "Dividends"];

function EconomicCalendarCard({ events }: { events: EconomicEvent[] }) {
  const [activeTab, setActiveTab] = useState("Upcoming");
  const filteredEvents =
    activeTab === "Upcoming" ? events : events.filter((e) => e.category === activeTab);
  const displayEvents = filteredEvents.length > 0 ? filteredEvents : events;

  const importanceMap: Record<string, { bg: string; text: string; border: string }> = {
    High: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
    Medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    Low: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <h2 className="text-base font-black text-slate-900">Economic & Event Calendar</h2>
        </div>
        <span className="text-[11px] font-bold text-slate-400">NSE / RBI</span>
      </div>

      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 custom-scrollbar">
        {CALENDAR_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {displayEvents.slice(0, 4).map((ev) => {
          const imp = importanceMap[ev.importance] || importanceMap.Low;
          return (
            <div
              key={ev.id}
              className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex flex-col items-center justify-center shrink-0 text-slate-800">
                <span className="text-xs font-black leading-none">{ev.day}</span>
                <span className="text-[8px] font-extrabold uppercase text-slate-400 tracking-wider">
                  {ev.month}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-900 truncate">{ev.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span>{ev.time}</span>
                  <span>•</span>
                  <span>{ev.location}</span>
                </div>
              </div>

              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${imp.bg} ${imp.text} ${imp.border}`}
              >
                {ev.importance}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Markets Page ───────────────────────────────────────────────────────

export default function MarketsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<MarketsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState("All");

  const quickFilters = ["All", "NIFTY 50", "BANK NIFTY", "NIFTY IT", "AUTO", "ENERGY", "FMCG"];

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    let isMounted = true;
    async function loadMarkets() {
      try {
        setLoading(true);
        const result = await fetchMarketsPage();
        if (isMounted) setData(result);
      } catch (err) {
        console.warn("Failed to load markets page:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadMarkets();

    const interval = setInterval(() => {
      fetchMarketsPage()
        .then((result) => {
          if (isMounted) setData(result);
        })
        .catch(() => {});
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, authLoading, router]);

  const handleSelectStock = (symbol: string) => {
    router.push(`/dashboard?symbol=${encodeURIComponent(symbol)}`);
  };

  if (authLoading || loading || !data) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-14 bg-slate-200/70 rounded-2xl w-1/2" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-slate-200/70 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-96 bg-slate-200/70 rounded-2xl" />
          <div className="lg:col-span-4 h-96 bg-slate-200/70 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 bg-slate-200/70 rounded-2xl" />
          <div className="h-72 bg-slate-200/70 rounded-2xl" />
          <div className="h-72 bg-slate-200/70 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Calculate market breadth
  const totalHeatmap = data.heatmap.length;
  const advances = data.heatmap.filter((t) => t.isPositive).length;
  const declines = totalHeatmap - advances;
  const advanceRatio = totalHeatmap > 0 ? Math.round((advances / totalHeatmap) * 100) : 50;

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Top Header & Market Breadth Bar ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Markets & Sectors
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-xs font-extrabold">
              <Activity className="w-3 h-3" />
              <span>NSE / BSE</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time capital flow treemaps, sector momentum, and AI pattern signals.
          </p>
        </div>

        {/* Market Status & Breadth Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Breadth Meter */}
          <div className="flex flex-col gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 min-w-[160px]">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-emerald-600">{advances} Adv</span>
              <span className="text-slate-400 font-mono text-[10px]">{advanceRatio}% Bull</span>
              <span className="text-rose-600">{declines} Dec</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${advanceRatio}%` }} />
              <div className="bg-rose-500 h-full" style={{ width: `${100 - advanceRatio}%` }} />
            </div>
          </div>

          {/* Session Status */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                data.marketStatus === "open"
                  ? "bg-emerald-500 animate-pulse shadow-xs shadow-emerald-500"
                  : "bg-amber-400"
              }`}
            />
            <div>
              <span className="font-black text-slate-800">
                Market {data.marketStatus === "open" ? "Open" : "Closed"}
              </span>
              <span className="hidden xl:inline text-slate-400 text-[11px] ml-1.5">
                {data.marketStatusTime}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard?ai_chat=true")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Market Synthesis</span>
          </button>
        </div>
      </div>

      {/* ─── Search Bar & Quick Filter Chips ─── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search any stock, index, sector, or ETF (e.g. HDFCBANK, NIFTY 50, IT)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                handleSelectStock(searchQuery.trim().toUpperCase());
              }
            }}
            className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-white border border-slate-200/90 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs transition-all"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
            ↵ Enter
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {quickFilters.map((flt) => (
            <button
              key={flt}
              type="button"
              onClick={() => {
                setActiveQuickFilter(flt);
                if (flt !== "All") {
                  handleSelectStock(flt);
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeQuickFilter === flt
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              {flt}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Index Ticker Strip ─── */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Major Benchmark Indices
          </span>
          <span className="text-[11px] font-semibold text-slate-400">
            Click index for full chart
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {data.indexTicker.map((item) => (
            <IndexTickerCard
              key={item.symbol}
              item={item}
              onClick={() => handleSelectStock(item.symbol)}
            />
          ))}
        </div>
      </div>

      {/* ─── Heatmap + AI Insights ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <MarketTreemap tiles={data.heatmap} onSelectStock={handleSelectStock} />
        </div>
        <div className="lg:col-span-4">
          <AIInsightsCard insights={data.aiInsights} onInspect={handleSelectStock} />
        </div>
      </div>

      {/* ─── Top Movers + Sector Performance + CTA ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <TopMoversCard
          gainers={data.topGainers}
          losers={data.topLosers}
          active={data.mostActive}
          onSelectStock={handleSelectStock}
        />
        <SectorPerformanceCard
          sectors={data.sectorPerformance}
          onSelectSector={(sec) => {
            // Scroll to treemap
            window.scrollTo({ top: 400, behavior: "smooth" });
          }}
        />
        <MarketCTACard />
      </div>

      {/* ─── Market News + Economic Calendar ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MarketNewsCard news={data.news} />
        <EconomicCalendarCard events={data.calendar} />
      </div>

      {/* ─── Watchlist CTA Banner ─── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
            <BarChart3 className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight">
              Create Your Institutional Watchlist
            </h3>
            <p className="text-xs sm:text-sm text-blue-200/80 mt-0.5">
              Set custom price triggers, volume breakout alerts, and receive instant AI analysis.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs sm:text-sm hover:bg-slate-100 transition-all cursor-pointer whitespace-nowrap shadow-sm"
        >
          Open Trading Terminal
        </button>
      </div>
    </div>
  );
}
