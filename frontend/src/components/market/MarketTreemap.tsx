"use client";

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import { HeatmapTile } from "@/lib/api";
import { LayoutGrid, Layers, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";

/* ────────────────────────────────────────── types ───────────────── */

interface MarketTreemapProps {
  tiles: HeatmapTile[];
  onSelectStock?: (symbol: string) => void;
}

interface LeafData {
  name: string;
  symbol: string;
  companyName: string;
  sector: string;
  changePercent: number;
  isPositive: boolean;
  price?: number;
  marketCap: string;
  value: number;
}

interface SectorNode {
  name: string;
  children: LeafData[];
}

interface RootNode {
  name: string;
  children: SectorNode[];
}

/* ─────────────────────────── sector filter tabs ────────────────── */

const SECTOR_TABS = [
  "All Sectors",
  "Financials",
  "IT",
  "Energy",
  "Auto",
  "FMCG",
  "Pharma",
  "Metals",
  "Industrials",
  "Telecom",
];

/* ───────────── modern gradient color palette ───────────────────── */

function getTileStyle(changePercent: number, isPositive: boolean) {
  const abs = Math.abs(changePercent);

  if (abs < 0.05) {
    return {
      background: "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
      borderColor: "rgba(71,85,105,0.4)",
    };
  }

  if (isPositive) {
    if (abs >= 3.0)
      return {
        background: "linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)",
        borderColor: "rgba(16,185,129,0.35)",
      };
    if (abs >= 1.5)
      return {
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        borderColor: "rgba(52,211,153,0.3)",
      };
    if (abs >= 0.7)
      return {
        background: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
        borderColor: "rgba(110,231,183,0.3)",
      };
    return {
      background: "linear-gradient(135deg, #6ee7b7 0%, #34d399 100%)",
      borderColor: "rgba(134,239,172,0.3)",
    };
  } else {
    if (abs >= 3.0)
      return {
        background: "linear-gradient(135deg, #e11d48 0%, #be123c 50%, #9f1239 100%)",
        borderColor: "rgba(244,63,94,0.35)",
      };
    if (abs >= 1.5)
      return {
        background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
        borderColor: "rgba(251,113,133,0.3)",
      };
    if (abs >= 0.7)
      return {
        background: "linear-gradient(135deg, #fb7185 0%, #f43f5e 100%)",
        borderColor: "rgba(253,164,175,0.3)",
      };
    return {
      background: "linear-gradient(135deg, #fda4af 0%, #fb7185 100%)",
      borderColor: "rgba(254,205,211,0.3)",
    };
  }
}

/* ════════════════════ MarketTreemap Component ═══════════════════ */

export function MarketTreemap({ tiles, onSelectStock }: MarketTreemapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const treemapContainerRef = useRef<HTMLDivElement>(null);

  const [activeSector, setActiveSector] = useState("All Sectors");
  const [viewMode, setViewMode] = useState<"sector" | "flat">("sector");
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  // Tooltip tracked to actual mouse position in viewport
  const [tooltip, setTooltip] = useState<{
    data: LeafData;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const [dims, setDims] = useState({ width: 800, height: 480 });

  /* ── ResizeObserver ─────────────────────────────────────────────── */
  useEffect(() => {
    const el = treemapContainerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) {
          setDims({
            width: w,
            height: Math.max(400, Math.min(560, Math.round(w * 0.56))),
          });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── filter tiles ───────────────────────────────────────────────── */
  const filteredTiles = useMemo(() => {
    if (activeSector === "All Sectors") return tiles;
    return tiles.filter((t) => t.sector.toLowerCase() === activeSector.toLowerCase());
  }, [tiles, activeSector]);

  /* ── D3 layout computation ──────────────────────────────────────── */
  const { sectorGroups, leafNodes } = useMemo(() => {
    if (!filteredTiles.length || dims.width <= 0 || dims.height <= 0) {
      return { sectorGroups: [] as any[], leafNodes: [] as any[] };
    }

    const toLeaf = (t: HeatmapTile): LeafData => ({
      name: t.symbol,
      symbol: t.symbol,
      companyName: t.name,
      sector: t.sector,
      changePercent: t.changePercent,
      isPositive: t.isPositive,
      price: t.price,
      marketCap: t.marketCap,
      value: Math.max(1, t.size * 14 + 8),
    });

    if (viewMode === "sector" && activeSector === "All Sectors") {
      const sectorMap: Record<string, LeafData[]> = {};
      for (const t of filteredTiles) {
        (sectorMap[t.sector] ??= []).push(toLeaf(t));
      }

      const root: RootNode = {
        name: "Market",
        children: Object.entries(sectorMap).map(([name, children]) => ({
          name,
          children,
        })),
      };

      const h = hierarchy<RootNode | SectorNode | LeafData>(root)
        .sum((d) => ("value" in d ? (d as LeafData).value : 0))
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      const gen = treemap<RootNode | SectorNode | LeafData>()
        .size([dims.width, dims.height])
        .paddingInner(2)
        .paddingOuter(3)
        .paddingTop(24)
        .round(true)
        .tile(treemapSquarify);

      const tree = gen(h);
      return {
        sectorGroups: tree.descendants().filter((d) => d.depth === 1),
        leafNodes: tree.leaves(),
      };
    }

    // flat mode (or filtered to single sector)
    const root = { name: "Market", children: filteredTiles.map(toLeaf) };
    const h = hierarchy<any>(root)
      .sum((d: any) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
    const gen = treemap<any>()
      .size([dims.width, dims.height])
      .padding(2)
      .round(true)
      .tile(treemapSquarify);
    const tree = gen(h);
    return { sectorGroups: [], leafNodes: tree.leaves() };
  }, [filteredTiles, dims, viewMode, activeSector]);

  /* ── event handlers ─────────────────────────────────────────────── */
  const handleClick = useCallback(
    (symbol: string) => {
      onSelectStock ? onSelectStock(symbol) : router.push(`/dashboard?symbol=${symbol}`);
    },
    [onSelectStock, router],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, data: LeafData) => {
      setHoveredSymbol(data.symbol);
      setTooltip({ data, mouseX: e.clientX, mouseY: e.clientY });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredSymbol(null);
    setTooltip(null);
  }, []);

  /* ════════════════════════ render ═══════════════════════════════ */
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden flex flex-col">
      {/* ── header ────────────────────────────────────────────────── */}
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Market Heatmap
            </h2>
            <span className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20">
              LIVE
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
            Squarified treemap · Market-cap weighted · NSE
          </p>
        </div>

        {/* view toggle */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("sector")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] font-bold transition-all cursor-pointer ${
              viewMode === "sector"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Sectors
          </button>
          <button
            type="button"
            onClick={() => setViewMode("flat")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] font-bold transition-all cursor-pointer ${
              viewMode === "flat"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            All Stocks
          </button>
        </div>
      </div>

      {/* ── sector tabs ───────────────────────────────────────────── */}
      <div className="px-5 py-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar border-b border-slate-50 bg-white">
        {SECTOR_TABS.map((sec) => {
          const active = activeSector.toLowerCase() === sec.toLowerCase();
          return (
            <button
              key={sec}
              type="button"
              onClick={() => setActiveSector(sec)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              {sec}
            </button>
          );
        })}
      </div>

      {/* ── treemap canvas ────────────────────────────────────────── */}
      <div
        ref={treemapContainerRef}
        className="relative w-full bg-[#0c111b] select-none"
        style={{ height: dims.height }}
        onMouseLeave={handleMouseLeave}
      >
        {/* sector group outlines */}
        {sectorGroups.map((sec: any, i: number) => {
          const w = sec.x1 - sec.x0;
          const h = sec.y1 - sec.y0;
          if (w < 1 || h < 1) return null;
          return (
            <div
              key={`sec-${i}`}
              className="absolute pointer-events-none"
              style={{
                left: sec.x0,
                top: sec.y0,
                width: w,
                height: h,
                borderRadius: 8,
                border: "1px solid rgba(51,65,85,0.5)",
              }}
            >
              {w > 60 && (
                <span className="absolute top-[5px] left-[8px] text-[10px] font-black tracking-[0.08em] uppercase text-slate-500 select-none">
                  {String(sec.data.name || "").toUpperCase()}
                </span>
              )}
            </div>
          );
        })}

        {/* leaf tiles */}
        {leafNodes.map((leaf: any, idx: number) => {
          const d = leaf.data as LeafData;
          const w = leaf.x1 - leaf.x0;
          const h = leaf.y1 - leaf.y0;
          if (w < 2 || h < 2) return null;

          const isHov = hoveredSymbol === d.symbol;
          const isDim = hoveredSymbol !== null && !isHov;
          const style = getTileStyle(d.changePercent, d.isPositive);

          // adaptive font sizing
          const area = w * h;
          const showSym = w > 32 && h > 22;
          const showPct = w > 44 && h > 36;
          const showPrice = w > 72 && h > 56 && d.price;
          const symSize = Math.min(15, Math.max(9, Math.round(Math.sqrt(area) * 0.11)));

          return (
            <div
              key={`${d.symbol}-${idx}`}
              className="absolute flex flex-col items-center justify-center overflow-hidden cursor-pointer"
              style={{
                left: leaf.x0,
                top: leaf.y0,
                width: w,
                height: h,
                background: style.background,
                borderRadius: 6,
                border: isHov
                  ? "2px solid rgba(255,255,255,0.85)"
                  : `1px solid ${style.borderColor}`,
                opacity: isDim ? 0.3 : 1,
                transform: isHov ? "scale(1.03)" : "scale(1)",
                zIndex: isHov ? 20 : 1,
                boxShadow: isHov
                  ? "0 0 20px 4px rgba(255,255,255,0.12), 0 8px 24px rgba(0,0,0,0.35)"
                  : "inset 0 1px 0 rgba(255,255,255,0.08)",
                transition: "opacity 120ms ease, transform 120ms ease, box-shadow 120ms ease, border 80ms ease",
              }}
              onMouseMove={(e) => handleMouseMove(e, d)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(d.symbol)}
            >
              {showSym && (
                <span
                  className="font-black tracking-wide text-white/95 leading-none select-none"
                  style={{
                    fontSize: symSize,
                    textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                  }}
                >
                  {d.symbol}
                </span>
              )}
              {showPct && (
                <span
                  className="font-bold text-white/80 leading-none mt-[2px] select-none"
                  style={{
                    fontSize: Math.max(9, symSize - 2),
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  }}
                >
                  {d.isPositive ? "+" : ""}
                  {d.changePercent.toFixed(2)}%
                </span>
              )}
              {showPrice && (
                <span
                  className="text-white/55 leading-none mt-[2px] select-none"
                  style={{
                    fontSize: Math.max(8, symSize - 4),
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  }}
                >
                  ₹{d.price!.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── legend bar ────────────────────────────────────────────── */}
      <div className="px-5 py-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 bg-white">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-600">Change:</span>
          <div className="flex items-center gap-0.5">
            <span className="font-mono text-rose-500 font-bold text-[10px]">-3%</span>
            <div className="flex h-2 rounded-full overflow-hidden">
              {[
                "#9f1239",
                "#be123c",
                "#e11d48",
                "#f43f5e",
                "#475569",
                "#10b981",
                "#059669",
                "#047857",
              ].map((c) => (
                <div key={c} className="w-3.5 h-full" style={{ backgroundColor: c }} />
              ))}
            </div>
            <span className="font-mono text-emerald-500 font-bold text-[10px]">+3%</span>
          </div>
        </div>
        <span className="text-slate-400 font-medium">
          Tile area = relative market cap weight
        </span>
      </div>

      {/* ── mouse-tracking tooltip (fixed to viewport) ────────────── */}
      {tooltip && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: tooltip.mouseX + 16,
            top: tooltip.mouseY - 12,
            transform: "translateY(-100%)",
          }}
        >
          <div
            className="rounded-xl px-4 py-3 shadow-2xl min-w-[230px] max-w-[280px] text-white"
            style={{
              background: "rgba(15,23,42,0.92)",
              backdropFilter: "blur(16px) saturate(1.6)",
              WebkitBackdropFilter: "blur(16px) saturate(1.6)",
              border: "1px solid rgba(100,116,139,0.25)",
            }}
          >
            {/* heading row */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black">{tooltip.data.symbol}</span>
                  <span className="text-[9px] font-bold px-1.5 py-[1px] rounded bg-white/10 text-slate-300 ring-1 ring-white/10">
                    {tooltip.data.sector}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[180px] font-medium">
                  {tooltip.data.companyName}
                </p>
              </div>

              <div
                className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-extrabold ${
                  tooltip.data.isPositive
                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30"
                }`}
              >
                {tooltip.data.isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {tooltip.data.isPositive ? "+" : ""}
                {tooltip.data.changePercent.toFixed(2)}%
              </div>
            </div>

            {/* divider */}
            <div className="h-px bg-white/10 mb-2" />

            {/* stats */}
            <div className="space-y-1">
              {tooltip.data.price != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Price</span>
                  <span className="font-mono font-bold text-white">
                    ₹{tooltip.data.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Segment</span>
                <span className="font-semibold text-slate-200">
                  {tooltip.data.marketCap}
                </span>
              </div>
            </div>

            {/* footer */}
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-blue-400 font-bold">
              <span>Click to open chart →</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketTreemap;
