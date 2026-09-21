"use client";
import { useEffect, useRef, useState } from "react";
import type { Chart, KLineData } from "klinecharts";
import { type Candle } from "@/lib/simulator";

export type Overlay = "sma" | "ema" | "vwap";
export type Drawing = { name: string; points: Array<{ timestamp?: number; value?: number }> };
const asBars = (candles: Candle[]): KLineData[] => candles.map((item) => ({ timestamp: item.time * 1000, open: Number(item.open), high: Number(item.high), low: Number(item.low), close: Number(item.close), volume: Number(item.volume) }));

export function MarketChart({ candles, overlays, horizontalLine, drawings = [], drawingTool, onDrawingsChange, onLoadOlder }: { candles: Candle[]; overlays: Overlay[]; horizontalLine?: number; drawings?: Drawing[]; drawingTool?: string; onDrawingsChange?: (drawings: Drawing[]) => void; onLoadOlder: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<Chart | null>(null);
  const [ready, setReady] = useState(false);
  const bars = useRef<KLineData[]>([]);
  const loadOlder = useRef(onLoadOlder);
  const drawingState = useRef(drawings);
  const emitDrawings = () => {
    if (!chart.current || !onDrawingsChange) return;
    onDrawingsChange(chart.current.getOverlays({ groupId: "learner" }).map((overlay) => ({ name: overlay.name, points: overlay.points.map(({ timestamp, value }) => ({ timestamp, value })) })));
  };
  useEffect(() => { loadOlder.current = onLoadOlder; }, [onLoadOlder]);
  useEffect(() => {
    if (!container.current) return;
    let instance: Chart | null = null;
    let destroy: ((value: HTMLElement | Chart | string) => void) | null = null;
    let disposed = false;
    void import("klinecharts").then(({ dispose, init }) => {
      if (disposed || !container.current) return;
      instance = init(container.current);
      if (!instance) return;
      destroy = dispose;
      instance.setSymbol({ ticker: "SIM", pricePrecision: 4, volumePrecision: 2 });
      instance.setPeriod({ type: "minute", span: 1 });
      instance.setDataLoader({ getBars: ({ type, callback }) => { if (type === "backward") loadOlder.current(); callback(bars.current, type === "backward" ? { backward: Boolean(bars.current.length) } : false); } });
      chart.current = instance;
      setReady(true);
    });
    return () => { disposed = true; if (instance && destroy) destroy(instance); chart.current = null; };
  }, []);
  useEffect(() => {
    bars.current = asBars(candles);
    chart.current?.resetData();
    if (!chart.current) return;
    chart.current.getIndicators().forEach((indicator) => chart.current?.removeIndicator({ id: indicator.id }));
    chart.current.createIndicator("VOL");
    if (overlays.includes("sma")) chart.current.createIndicator("MA", false);
    if (overlays.includes("ema")) chart.current.createIndicator("EMA", false);
    if (overlays.includes("vwap")) chart.current.createIndicator("AVP", false);
    if (horizontalLine !== undefined) chart.current.createOverlay({ name: "horizontalStraightLine", points: [{ value: horizontalLine }] });
  }, [candles, overlays, horizontalLine, ready]);
  useEffect(() => {
    drawingState.current = drawings;
    if (!chart.current) return;
    chart.current.removeOverlay({ groupId: "learner" });
    drawings.forEach((drawing) => chart.current?.createOverlay({ name: drawing.name, groupId: "learner", points: drawing.points, onDrawEnd: emitDrawings, onPressedMoveEnd: emitDrawings, onRemoved: emitDrawings }));
  }, [drawings, ready]);
  useEffect(() => {
    if (!drawingTool || !chart.current) return;
    chart.current.createOverlay({ name: drawingTool.split("#", 1)[0], groupId: "learner", onDrawEnd: emitDrawings, onPressedMoveEnd: emitDrawings, onRemoved: emitDrawings });
  }, [drawingTool, ready]);
  return <div ref={container} className="market-chart" aria-label="Interactive market chart" />;
}
