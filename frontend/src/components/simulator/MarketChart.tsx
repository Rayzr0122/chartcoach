"use client";

import { useEffect, useRef } from "react";
import { CandlestickSeries, ColorType, HistogramSeries, createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";

type Candle = { time: number | string; open: string; high: string; low: string; close: string; volume: string };

function timestamp(value: number | string): UTCTimestamp {
  return (typeof value === "number" ? (value > 10_000_000_000 ? value / 1000 : value) : Math.floor(new Date(value).getTime() / 1000)) as UTCTimestamp;
}

export function MarketChart({ candles }: { candles: Candle[] }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candlesSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeries = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!container.current) return;
    const instance = createChart(container.current, { layout: { background: { type: ColorType.Solid, color: "#080d18" }, textColor: "#94a3b8" }, grid: { vertLines: { color: "#ffffff08" }, horzLines: { color: "#ffffff08" } }, rightPriceScale: { borderColor: "#ffffff12" }, timeScale: { borderColor: "#ffffff12", timeVisible: true }, crosshair: { mode: 0 } });
    const series = instance.addSeries(CandlestickSeries, { upColor: "#34d399", downColor: "#fb7185", borderVisible: false, wickUpColor: "#34d399", wickDownColor: "#fb7185" });
    const volume = instance.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "" });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    chart.current = instance; candlesSeries.current = series; volumeSeries.current = volume;
    const resize = () => instance.applyOptions({ width: container.current?.clientWidth || 600, height: container.current?.clientHeight || 420 });
    const observer = new ResizeObserver(resize); observer.observe(container.current); resize();
    return () => { observer.disconnect(); instance.remove(); chart.current = undefined; candlesSeries.current = undefined; volumeSeries.current = undefined; };
  }, []);

  useEffect(() => {
    if (!candlesSeries.current || !candles.length) return;
    candlesSeries.current.setData(candles.map((candle) => ({ time: timestamp(candle.time), open: Number(candle.open), high: Number(candle.high), low: Number(candle.low), close: Number(candle.close) })));
    volumeSeries.current?.setData(candles.map((candle) => ({ time: timestamp(candle.time), value: Number(candle.volume), color: Number(candle.close) >= Number(candle.open) ? "#34d39955" : "#fb718555" })));
    chart.current.timeScale().fitContent();
  }, [candles]);

  return <div ref={container} className="h-full w-full" aria-label="Interactive market chart" />;
}
