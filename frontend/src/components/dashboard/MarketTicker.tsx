"use client";

import { useEffect, useRef, useState } from "react";
import { Activity } from "lucide-react";

const TICKER_CONFIG = {
  symbols: [
    { proName: "NSE:NIFTY", title: "NIFTY 50" },
    { proName: "NSE:BANKNIFTY", title: "BANK NIFTY" },
    { proName: "BSE:SENSEX", title: "SENSEX" },
    { proName: "NASDAQ:NDX", title: "NASDAQ 100" },
    { proName: "TVC:GOLD", title: "GOLD" },
    { proName: "FX_IDC:USDINR", title: "USD / INR" },
  ],
  showSymbolLogo: true,
  isTransparent: true,
  displayMode: "adaptive",
  colorTheme: "light",
  locale: "en",
};

export default function MarketTicker() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || container.querySelector("script")) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.textContent = JSON.stringify(TICKER_CONFIG);
    script.onerror = () => setUnavailable(true);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Activity className="h-3.5 w-3.5" />
        </span>
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-bold text-slate-800">Markets</span>
          <span className="hidden text-[11px] text-slate-400 sm:inline">Live prices from TradingView</span>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
        </span>
      </div>
      {unavailable ? (
        <div className="flex h-[46px] items-center gap-5 overflow-x-auto px-4 text-xs whitespace-nowrap">
          <span className="font-semibold text-slate-700">NIFTY 50</span><span className="text-slate-400">Live prices are unavailable right now.</span>
        </div>
      ) : (
        <div className="tradingview-widget-container h-[46px] bg-white" ref={containerRef} />
      )}
    </section>
  );
}
