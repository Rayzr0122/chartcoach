"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Chart, KLineData } from "klinecharts";
import { type Candle } from "@/lib/simulator";

export type Overlay = "sma" | "ema" | "vwap" | "rsi" | "macd";
export type Drawing = { name: string; points: Array<{ timestamp?: number; value?: number }> };
export type PriceLevel = { id: string; value: number; kind: "order" | "fill" | "position" | "stop" | "target" | "margin" };
const asBars = (candles: Candle[]): KLineData[] => candles.map((item) => ({ timestamp: item.time * 1000, open: Number(item.open), high: Number(item.high), low: Number(item.low), close: Number(item.close), volume: Number(item.volume) }));

export function MarketChart({ candles, overlays, symbol = "SIM", timeframe = "1m", showVolume = false, horizontalLine, priceLevels = [], drawings = [], drawingTool, onDrawingsChange, onLoadOlder }: { candles: Candle[]; overlays: Overlay[]; symbol?: string; timeframe?: "1m" | "5m" | "15m" | "1h" | "1d"; showVolume?: boolean; horizontalLine?: number; priceLevels?: PriceLevel[]; drawings?: Drawing[]; drawingTool?: string; onDrawingsChange?: (drawings: Drawing[]) => void; onLoadOlder?: (before: number) => Promise<Candle[]> }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<Chart | null>(null);
  const [ready, setReady] = useState(false);
  const bars = useRef<KLineData[]>(asBars(candles));
  const updateBar = useRef<((bar: KLineData) => void) | undefined>(undefined);
  const retryHistory = useRef<(() => void) | undefined>(undefined);
  const [historyStatus, setHistoryStatus] = useState("Scroll left to explore older candles");
  const loadOlder = useRef(onLoadOlder);
  const emitDrawings = useCallback(() => {
    if (!chart.current || !onDrawingsChange) return;
    onDrawingsChange(chart.current.getOverlays({ groupId: "learner" }).map((overlay) => ({ name: overlay.name, points: overlay.points.map(({ timestamp, value }) => ({ timestamp, value })) })));
  }, [onDrawingsChange]);
  useEffect(() => { loadOlder.current = onLoadOlder; }, [onLoadOlder]);
  useEffect(() => {
    if (!container.current) return;
    let instance: Chart | null = null;
    let destroy: ((value: HTMLElement | Chart | string) => void) | null = null;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    void import("klinecharts").then(({ dispose, init }) => {
      if (disposed || !container.current) return;
      const family = getComputedStyle(container.current).fontFamily || "Inter, sans-serif";
      const text = { family, size: 13, color: "#cbd5e1", weight: 400 };
      const axis = { tickText: { ...text, marginStart: 8, marginEnd: 8 }, axisLine: { color: "#263449" }, tickLine: { show: false } };
      instance = init(container.current, { styles: {
        grid: { horizontal: { color: "#1c293b", style: "solid" }, vertical: { show: false } },
        xAxis: axis, yAxis: axis,
        candle: {
          bar: { upColor: "#34d399", downColor: "#fb7185", upBorderColor: "#34d399", downBorderColor: "#fb7185", upWickColor: "#34d399", downWickColor: "#fb7185" },
          tooltip: { showRule: "follow_cross", showType: "rect", title: { ...text, size: 14 }, legend: text, rect: { color: "#142033", borderColor: "#334155", borderRadius: 8, paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10 } },
          priceMark: { high: { show: false }, low: { show: false }, last: { text: { ...text, color: "#ffffff", weight: 600, paddingLeft: 8, paddingRight: 8 }, upColor: "#047857", downColor: "#be123c" } },
        },
        indicator: { tooltip: { title: text, legend: text } },
        crosshair: { horizontal: { line: { color: "#64748b" }, text: { ...text, color: "#ffffff", backgroundColor: "#334155", borderColor: "#334155" } }, vertical: { line: { color: "#64748b" }, text: { ...text, color: "#ffffff", backgroundColor: "#334155", borderColor: "#334155" } } },
        separator: { color: "#263449" }, overlay: { text: { ...text, backgroundColor: "#142033" }, line: { color: "#60a5fa" } },
      } });
      if (!instance) return;
      destroy = dispose;
      let generation = 0;
      instance.setDataLoader({ getBars: ({ type, timestamp, callback }) => {
        if (type === "init") {
          generation += 1;
          retryHistory.current = undefined;
          callback(bars.current, { forward: Boolean(loadOlder.current), backward: false });
          return;
        }
        // KLineChart names prepending older candles "forward".
        if (type !== "forward" || timestamp === null || !loadOlder.current) { callback([], false); return; }
        const requestGeneration = generation;
        let pending = false;
        const fetchPage = async () => {
          if (pending || disposed || requestGeneration !== generation) return;
          pending = true;
          retryHistory.current = undefined;
          setHistoryStatus("Loading older candles…");
          try {
            const page = await loadOlder.current!(timestamp / 1000);
            if (disposed || requestGeneration !== generation) return;
            const unique = new Map(asBars(page).filter((bar) => bar.timestamp < timestamp).map((bar) => [bar.timestamp, bar]));
            const older = [...unique.values()].sort((a, b) => a.timestamp - b.timestamp);
            bars.current = [...older, ...bars.current];
            setHistoryStatus(older.length ? "Scroll left to explore older candles" : "Beginning of available history");
            callback(older, { forward: older.length > 0, backward: false });
          } catch {
            if (disposed || requestGeneration !== generation) return;
            retryHistory.current = () => { void fetchPage(); };
            setHistoryStatus("History could not load. Your chart is preserved.");
          } finally { pending = false; }
        };
        void fetchPage();
      }, subscribeBar: ({ callback }) => { updateBar.current = callback; }, unsubscribeBar: () => { updateBar.current = undefined; } });
      chart.current = instance;
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => instance?.resize());
        observer.observe(container.current);
      }
      setReady(true);
    });
    return () => { disposed = true; observer?.disconnect(); if (instance && destroy) destroy(instance); chart.current = null; };
  }, []);
  useEffect(() => {
    if (!chart.current) return;
    chart.current.setSymbol({ ticker: symbol, pricePrecision: symbol.includes("-") ? 4 : 2, volumePrecision: 0 });
    const period = timeframe === "1d" ? { type: "day" as const, span: 1 } : timeframe === "1h" ? { type: "hour" as const, span: 1 } : { type: "minute" as const, span: Number(timeframe.replace("m", "")) };
    chart.current.setPeriod(period);
  }, [symbol, timeframe, ready]);
  useEffect(() => {
    const incoming = asBars(candles);
    const lastTimestamp = bars.current.at(-1)?.timestamp ?? 0;
    incoming.filter((bar) => bar.timestamp >= lastTimestamp).forEach((bar) => updateBar.current?.(bar));
    bars.current = [...new Map([...bars.current, ...incoming].map((bar) => [bar.timestamp, bar])).values()].sort((a, b) => a.timestamp - b.timestamp);
  }, [candles]);
  useEffect(() => {
    if (!chart.current) return;
    chart.current.getIndicators().forEach((indicator) => chart.current?.removeIndicator({ id: indicator.id }));
    if (showVolume) chart.current.createIndicator("VOL");
    if (overlays.includes("sma")) chart.current.createIndicator("MA", false);
    if (overlays.includes("ema")) chart.current.createIndicator("EMA", false);
    if (overlays.includes("vwap")) chart.current.createIndicator("AVP", false);
    if (overlays.includes("rsi")) chart.current.createIndicator("RSI");
    if (overlays.includes("macd")) chart.current.createIndicator("MACD");
    if (horizontalLine !== undefined) chart.current.createOverlay({ name: "horizontalStraightLine", points: [{ value: horizontalLine }] });
  }, [overlays, showVolume, horizontalLine, ready]);
  useEffect(() => {
    if (!chart.current) return;
    chart.current.removeOverlay({ groupId: "simulation" });
    priceLevels.filter((level) => Number.isFinite(level.value)).forEach((level) => chart.current?.createOverlay({ name: "horizontalStraightLine", groupId: "simulation", points: [{ value: level.value }] }));
  }, [priceLevels, ready]);
  useEffect(() => {
    if (!chart.current) return;
    chart.current.removeOverlay({ groupId: "learner" });
    drawings.forEach((drawing) => chart.current?.createOverlay({ name: drawing.name, groupId: "learner", points: drawing.points, onDrawEnd: emitDrawings, onPressedMoveEnd: emitDrawings, onRemoved: emitDrawings }));
  }, [drawings, ready, emitDrawings]);
  useEffect(() => {
    if (!drawingTool || !chart.current) return;
    chart.current.createOverlay({ name: drawingTool.split("#", 1)[0], groupId: "learner", onDrawEnd: emitDrawings, onPressedMoveEnd: emitDrawings, onRemoved: emitDrawings });
  }, [drawingTool, ready, emitDrawings]);
  return <><div className="chart-navigation" role="group" aria-label="Chart navigation"><span role="status">{historyStatus}</span><button onClick={() => { chart.current?.setBarSpace(8); chart.current?.scrollToRealTime(); }} disabled={!ready}>Reset view</button><button onClick={() => chart.current?.scrollToRealTime()} disabled={!ready}>Latest candle</button>{retryHistory.current && <button onClick={() => retryHistory.current?.()}>Retry history</button>}</div><div ref={container} className="market-chart" aria-label="Interactive market chart" /></>;
}
