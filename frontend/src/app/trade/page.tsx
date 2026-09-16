"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MarketChart } from "@/components/simulator/MarketChart";
import {
  formatInr,
  sessionLabel,
  simulatorApi,
  simulatorErrorPresentation,
  type Instrument,
  type SimulatorSession,
} from "@/lib/simulator";

type Candle = { time: number | string; open: string; high: string; low: string; close: string; volume: string };

function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const presentation = simulatorErrorPresentation(error);
  const action = presentation.actionHref ? (
    <Link href={presentation.actionHref} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-100">
      {presentation.actionLabel}
    </Link>
  ) : presentation.actionLabel && onRetry ? (
    <button type="button" onClick={onRetry} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-100">
      {presentation.actionLabel}
    </button>
  ) : null;

  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold">{presentation.title}</p>
        <p className="mt-1 text-sm leading-6 text-rose-800">{presentation.message}</p>
      </div>
      {action}
    </div>
  );
}

function sourceLabel(source: string | undefined) {
  return sessionLabel("replay", source || "synthetic-test").replace("Replay · ", "");
}

export default function TradePage() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [selected, setSelected] = useState("NASDAQ:AAPL");
  const [session, setSession] = useState<SimulatorSession | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [mode, setMode] = useState<"replay" | "delayed">("replay");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [setupError, setSetupError] = useState<unknown>(null);
  const [workspaceError, setWorkspaceError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [accessReady, setAccessReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSetupError(null);
    setAccessReady(false);

    // These requests have independent failure modes. A failed entitlement
    // check must not discard the catalog, and a catalog outage must not be
    // presented as an authentication failure.
    Promise.allSettled([simulatorApi.instruments(), simulatorApi.bootstrap()]).then(([catalogResult, bootstrapResult]) => {
      if (cancelled) return;

      if (catalogResult.status === "fulfilled") {
        setInstruments(catalogResult.value);
        setSelected((current) => catalogResult.value.some((item) => item.id === current) ? current : catalogResult.value[0]?.id || "");
      }

      if (bootstrapResult.status === "fulfilled") {
        setAccessReady(true);
        if (catalogResult.status === "rejected") setSetupError(catalogResult.reason);
      } else {
        setSetupError(bootstrapResult.reason);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [retryToken]);

  const instrument = useMemo(() => instruments.find((item) => item.id === selected), [instruments, selected]);
  const selectedSource = mode === "delayed" ? instrument?.delayed_source : instrument?.replay_source;
  const selectedSourceLabel = sourceLabel(selectedSource || instrument?.source);
  const polygonSupported = mode === "delayed" && Boolean(instrument?.polygon_supported);

  async function loadSession(next: Promise<SimulatorSession>) {
    setUpdating(true);
    setWorkspaceError(null);
    try {
      const value = await next;
      setSession(value);
      try {
        setCandles(await simulatorApi.candles(value.id));
      } catch (error) {
        setWorkspaceError(error);
      }
    } catch (error) {
      setWorkspaceError(error);
    } finally {
      setUpdating(false);
    }
  }

  async function start() {
    if (!accessReady || !selected || starting) return;
    setStarting(true);
    setSetupError(null);
    try {
      const value = await simulatorApi.createSession(mode, selected);
      setSession(value);
      try {
        setCandles(await simulatorApi.candles(value.id));
      } catch (error) {
        setWorkspaceError(error);
      }
    } catch (error) {
      setSetupError(error);
    } finally {
      setStarting(false);
    }
  }

  async function placeOrder() {
    if (!session || updating) return;
    setUpdating(true);
    setWorkspaceError(null);
    try {
      await simulatorApi.order(session.id, { side, order_type: "market", quantity });
      const value = await simulatorApi.getSession(session.id);
      setSession(value);
      setCandles(await simulatorApi.candles(value.id));
    } catch (error) {
      setWorkspaceError(error);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-[#f5f7fb] text-sm text-slate-500">Checking practice service…</main>;
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-5 py-8 text-slate-950 sm:px-10 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <header className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.24em] text-indigo-600">ChartCoach / Trade</p>
              <p className="mt-2 text-xs font-medium text-slate-500">Server-owned practice environment</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${accessReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              {accessReady ? "Service ready" : "Account verification needed"}
            </span>
          </header>

          <section className="mt-12 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-[-.04em] text-slate-950 sm:text-6xl">Practice trading with clear market provenance.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Replay deterministic test data or use a persistent paper account with a labeled 15-minute delayed feed.</p>
          </section>

          <section className="mt-12 grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
            <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl sm:p-9">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
              <p className="relative text-sm font-medium text-indigo-200">Virtual equity</p>
              <p className="relative mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">₹10,00,000</p>
              <div className="relative mt-16 border-t border-white/10 pt-5">
                <p className="text-sm font-medium text-slate-300">What is assessed</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Risk sizing, plan adherence, and execution discipline. P&amp;L is shown separately.</p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Set up a session</h2>
                  <p className="mt-1 text-sm text-slate-500">Choose the clock and the data source before you start.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">INR reporting</span>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Practice mode">
                <button type="button" aria-pressed={mode === "replay"} onClick={() => setMode("replay")} className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${mode === "replay" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Historical replay</button>
                <button type="button" aria-pressed={mode === "delayed"} onClick={() => setMode("delayed")} className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${mode === "delayed" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Delayed paper</button>
              </div>

              <label className="mt-7 block text-sm font-semibold text-slate-800" htmlFor="trade-instrument">Instrument</label>
              <select id="trade-instrument" value={selected} onChange={(event) => setSelected(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" disabled={!instruments.length}>
                {instruments.map((item) => {
                  const source = mode === "delayed" ? item.delayed_source : item.replay_source || item.source;
                  return <option key={item.id} value={item.id}>{item.symbol} · {item.venue} · {sourceLabel(source)}</option>;
                })}
              </select>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">Selected feed</span>
                <span className={`font-semibold ${polygonSupported ? "text-emerald-700" : "text-slate-700"}`}>{selectedSourceLabel}</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {mode === "replay" ? "One-minute synthetic bars with deterministic replay controls." : polygonSupported ? "Polygon quotes and candles are used with the server-side delayed clock." : "This instrument uses labeled synthetic test data in delayed mode; Polygon delayed quotes are currently available for supported US stocks."}
              </p>

              <button type="button" onClick={start} disabled={!accessReady || !selected || starting} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-300">
                {starting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
                {starting ? "Opening session…" : "Start practice"}
              </button>
              {!accessReady && !setupError && <p className="mt-3 text-center text-xs text-slate-500">Verify your account to enable practice.</p>}
            </div>
          </section>

          {setupError ? <div className="mt-5"><ErrorNotice error={setupError} onRetry={() => setRetryToken((value) => value + 1)} /></div> : null}
        </div>
      </main>
    );
  }

  const last = candles.at(-1);
  const label = sessionLabel(session.mode, session.data_source || "synthetic-test");

  return (
    <main className="min-h-screen bg-[#0b1120] text-slate-100">
      <header className="border-b border-white/10 bg-[#111827] px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-indigo-300">{label}</p>
            <h1 className="mt-1 text-lg font-semibold">{session.instrument_id}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden rounded-lg bg-white/5 px-3 py-2 text-slate-400 sm:inline">{session.state}</span>
            <span className="rounded-lg bg-white/5 px-3 py-2">Equity <b>{formatInr(session.account.equity)}</b></span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl bg-[#111827] p-4 ring-1 ring-white/5 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-medium">Price action</h2>
              <p className="mt-1 text-xs text-slate-500">{last ? `Last ${last.close} · ${candles.length} visible bars` : "No market data loaded"}</p>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">1 minute · {session.data_source || "synthetic-test"}</span>
          </div>
          <div className="mt-5 h-[420px] overflow-hidden rounded-xl bg-[#0b1120]">
            {candles.length ? <MarketChart candles={candles} /> : <div className="grid h-full place-items-center text-sm text-slate-500">Waiting for visible market data…</div>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={updating} onClick={() => loadSession(simulatorApi.control(session.id, "step"))} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium disabled:opacity-50">Step one minute</button>
            <button type="button" disabled={updating} onClick={() => loadSession(simulatorApi.control(session.id, session.state === "playing" ? "pause" : "play"))} className="rounded-lg bg-white/10 px-4 py-2 text-sm disabled:opacity-50">{session.state === "playing" ? "Pause" : "Play"}</button>
            {[1, 5, 20].map((speed) => <button type="button" disabled={updating} key={speed} onClick={() => loadSession(simulatorApi.control(session.id, "speed", speed))} className="rounded-lg bg-white/5 px-3 py-2 text-xs disabled:opacity-50">{speed}×</button>)}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl bg-white p-5 text-slate-950 shadow-xl">
            <div className="flex justify-between gap-3"><h2 className="font-semibold">Order ticket</h2><span className="text-xs text-slate-400">Virtual funds</span></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" aria-pressed={side === "buy"} onClick={() => setSide("buy")} className={`rounded-lg py-2.5 font-semibold ${side === "buy" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}>Buy</button>
              <button type="button" aria-pressed={side === "sell"} onClick={() => setSide("sell")} className={`rounded-lg py-2.5 font-semibold ${side === "sell" ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"}`}>Sell</button>
            </div>
            <label className="mt-4 block text-xs font-medium text-slate-500" htmlFor="trade-quantity">Quantity</label>
            <input id="trade-quantity" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-3" inputMode="decimal" />
            <button type="button" disabled={updating || !candles.length} onClick={placeOrder} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              {updating && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
              Place {side} order
            </button>
          </section>

          <section className="rounded-2xl bg-[#111827] p-5">
            <h2 className="font-medium">Orders &amp; fills</h2>
            {session.orders.length ? session.orders.map((order) => <div key={order.id} className="mt-3 flex justify-between border-b border-white/5 pb-3 text-sm"><span>{order.side} {order.quantity}</span><span className="text-slate-400">{order.price} · {order.status}</span></div>) : <p className="mt-3 text-sm text-slate-500">Your executions will appear here.</p>}
          </section>
        </aside>
      </div>

      {workspaceError ? <div className="fixed bottom-5 left-1/2 z-10 w-[min(92vw,560px)] -translate-x-1/2"><ErrorNotice error={workspaceError} onRetry={() => loadSession(simulatorApi.getSession(session.id))} /></div> : null}
    </main>
  );
}
