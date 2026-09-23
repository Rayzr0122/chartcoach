"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityPanel } from "@/components/simulator/ActivityPanel";
import { MarketChart, type Overlay, type PriceLevel } from "@/components/simulator/MarketChart";
import { OrderTicket } from "@/components/simulator/OrderTicket";
import {
  formatInr,
  formatQuote,
  instrumentSupportsMode,
  mergeCandles,
  sessionLabel,
  simulatorApi,
  simulatorErrorPresentation,
  type Candle,
  type Instrument,
  type ChartLayout,
  type Journal,
  type Review,
  type SimulatorSession,
  type Timeframe,
} from "@/lib/simulator";
import "./terminal.css";
const uid = () => crypto.randomUUID();
export default function TradePage() {
  const [instruments, setInstruments] = useState<Instrument[]>([]),
    [selected, setSelected] = useState("NASDAQ:AAPL"),
    [mode, setMode] = useState<"replay" | "delayed">("replay"),
    [days, setDays] = useState<7 | 30 | 90 | 365>(7),
    [workspace, setWorkspace] = useState<"simple" | "pro">("simple"),
    [session, setSession] = useState<SimulatorSession | null>(null),
    [candles, setCandles] = useState<Candle[]>([]),
    [timeframe, setTimeframe] = useState<Timeframe>("1m"),
    [overlays, setOverlays] = useState<Overlay[]>([]),
    [chartLayout, setChartLayout] = useState<ChartLayout>({ instrument_id: "", timeframe: "1m", revision: 0, drawings: [] }),
    [drawingTool, setDrawingTool] = useState<string>(),
    [journal, setJournal] = useState<Journal>({ plan: "", reflection: "" }),
    [review, setReview] = useState<Review>(),
    [query, setQuery] = useState(""),
    [seekDraft, setSeekDraft] = useState<number | null>(null),
    [pending, setPending] = useState(false),
    [loading, setLoading] = useState(true),
    [streamRetry, setStreamRetry] = useState(0),
    [error, setError] = useState<unknown>();
  const controller = useRef(uid()),
    commandInFlight = useRef(false),
    firstWorkspaceWrite = useRef(true),
    eventCursor = useRef(0),
    instrument = useMemo(
      () =>
        instruments.find((x) => x.id === (session?.instrument_id || selected)),
      [instruments, selected, session],
    ),
    filtered = useMemo(
      () =>
        instruments.filter((x) =>
          `${x.symbol} ${x.venue}`.toLowerCase().includes(query.toLowerCase()),
        ),
      [instruments, query],
    ),
    priceLevels = useMemo<PriceLevel[]>(() => {
      if (!session) return [];
      const levels: PriceLevel[] = [];
      const add = (id: string, value: string | undefined, kind: PriceLevel["kind"]) => { const number = Number(value); if (Number.isFinite(number)) levels.push({ id, value: number, kind }); };
      session.orders.filter((order) => order.status === "open" && order.instrument_id === session.instrument_id).forEach((order) => { add(`${order.id}:limit`, order.limit_price, "order"); add(`${order.id}:stop`, order.stop_price || order.stop_loss, "stop"); add(`${order.id}:target`, order.take_profit, "target"); });
      session.positions?.filter((position) => position.instrument_id === session.instrument_id && Number(position.quantity) !== 0).forEach((position) => add(`${position.instrument_id}:mark`, position.average_price || position.avg_price, "position"));
      return levels;
    }, [session]),
    last = candles.at(-1);
  const sessionId = session?.id,
    sessionInstrumentId = session?.instrument_id,
    sessionState = session?.state,
    sessionMode = session?.mode;
  const refresh = useCallback(
    async (id: string) => {
      const [s, c] = await Promise.all([
        simulatorApi.getSession(id),
        simulatorApi.candles(id, { limit: 700, timeframe }),
      ]);
      setSession(s);
      setCandles((current) => mergeCandles(current, c));
      return s;
    },
    [timeframe],
  );
  useEffect(() => {
    Promise.allSettled([simulatorApi.instruments(), simulatorApi.bootstrap(), simulatorApi.capabilities()])
      .then(async ([catalog, access, capabilities]) => {
        if (catalog.status === "fulfilled") setInstruments(catalog.value);
        else setError(catalog.reason);
        if (access.status === "rejected") setError(access.reason);
        if (capabilities.status === "rejected") setError(capabilities.reason);
        const id = new URLSearchParams(location.search).get("session");
        if (id && access.status === "fulfilled") {
          const s = await refresh(id);
          setJournal(await simulatorApi.getJournal(s.id));
        }
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [refresh]);
  useEffect(() => {
    eventCursor.current = 0;
  }, [session?.id]);
  useEffect(() => {
    if (localStorage.getItem("chartcoach-practice-workspace") === "pro") setWorkspace("pro");
  }, []);
  useEffect(() => {
    if (firstWorkspaceWrite.current) { firstWorkspaceWrite.current = false; return; }
    localStorage.setItem("chartcoach-practice-workspace", workspace);
  }, [workspace]);
  useEffect(() => {
    if (!sessionId) return;
    let closed = false;
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${location.hostname}:8000/api/v1/simulator/ws?session_id=${encodeURIComponent(sessionId)}&cursor=${eventCursor.current}`);
    socket.onmessage = (message) => {
      try {
        const update = JSON.parse(message.data) as { cursor?: number; payload?: SimulatorSession };
        if (!update.payload) return;
        if (typeof update.cursor === "number") eventCursor.current = update.cursor;
        setSession(update.payload);
        void simulatorApi.candles(update.payload.id, { limit: 700, timeframe }).then((next) => { if (!closed) setCandles((current) => mergeCandles(current, next)); }).catch((error) => { if (!closed) setError(error); });
      } catch {
        setError(new Error("The simulator event stream returned an invalid update."));
      }
    };
    socket.onclose = () => {
      if (!closed) window.setTimeout(() => setStreamRetry((value) => value + 1), 1000);
    };
    return () => {
      closed = true;
      socket.close();
    };
  }, [sessionId, timeframe, streamRetry]);
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setCandles([]);
    void simulatorApi.candles(sessionId, { limit: 700, timeframe }).then((page) => { if (!cancelled) setCandles(page); }).catch((error) => { if (!cancelled) setError(error); });
    return () => { cancelled = true; };
  }, [sessionId, timeframe]);
  useEffect(() => {
    if (!sessionInstrumentId) return;
    simulatorApi.chartLayout(sessionInstrumentId, timeframe).then(setChartLayout).catch(setError);
  }, [sessionInstrumentId, timeframe]);
  const saveDrawings = useCallback((drawings: Array<Record<string, unknown>>) => {
    if (!session) return;
    const next = { ...chartLayout, drawings };
    setChartLayout(next);
    void simulatorApi.saveChartLayout(session.instrument_id, timeframe, next).then(setChartLayout).catch(setError);
  }, [session, timeframe, chartLayout]);
  useEffect(() => {
    if (!sessionId || sessionState !== "playing" || sessionMode !== "replay")
      return;
    const timer = setInterval(
      () =>
        simulatorApi
          .control(
            sessionId,
            "heartbeat",
            uid(),
            undefined,
            controller.current,
          )
          .catch(setError),
      5000,
    );
    return () => clearInterval(timer);
  }, [sessionId, sessionState, sessionMode]);
  async function start() {
    setPending(true);
    setError(undefined);
    try {
      const s = await simulatorApi.createSession(
        { mode, instrument_id: selected, history_days: days },
        uid(),
      );
      setSession(s);
      setCandles(await simulatorApi.candles(s.id, { limit: 700, timeframe }));
      history.replaceState(null, "", `/trade?session=${s.id}`);
    } catch (e) {
      setError(e);
    } finally {
      setPending(false);
    }
  }
  async function mutate(job: () => Promise<unknown>) {
    if (!session || pending || commandInFlight.current) return;
    commandInFlight.current = true;
    setPending(true);
    setError(undefined);
    try {
      await job();
      await refresh(session.id);
    } catch (e) {
      setError(e);
    } finally {
      commandInFlight.current = false;
      setPending(false);
    }
  }
  async function seek(target: number) {
    if (!session || pending || target === session.clock) return;
    setPending(true);
    setError(undefined);
    try {
      const next = await simulatorApi.control(
        session.id,
        "seek",
        uid(),
        target,
      );
      setSession(next);
      setCandles(
        await simulatorApi.candles(next.id, { limit: 700, timeframe }),
      );
      if (next.id !== session.id) {
        setJournal(await simulatorApi.getJournal(next.id));
        setReview(undefined);
      }
      history.replaceState(null, "", `/trade?session=${next.id}`);
    } catch (e) {
      setError(e);
    } finally {
      setSeekDraft(null);
      setPending(false);
    }
  }
  const older = useCallback(async (before: number) => {
    if (!sessionId) return [];
    return simulatorApi.candles(sessionId, { before, limit: 700, timeframe });
  }, [sessionId, timeframe]);
  if (loading)
    return (
      <main className="trade-page loading">
        <b>CC</b>
        <p>Connecting to the practice exchange…</p>
      </main>
    );
  if (!session)
    return (
      <main className="trade-page launch">
        <header className="launch-header">
          <div className="brand-lockup"><b>ChartCoach</b><span>Practice</span></div>
          <div className="experience-toggle" aria-label="Workspace mode">
            <button className={workspace === "simple" ? "active" : ""} onClick={() => { setWorkspace("simple"); setMode("replay"); }}>Simple</button>
            <button className={workspace === "pro" ? "active" : ""} onClick={() => setWorkspace("pro")}>Pro</button>
          </div>
        </header>
        <div className="launch-grid">
          <section className="launch-copy">
            <p className="eyebrow">Paper trading for deliberate practice</p>
            <h1>Learn the process.<br /><em>Keep the pressure virtual.</em></h1>
            <p>Start with a focused replay, place an order, and see the position change as the market moves. The simple workspace keeps the chart, replay controls, and order form in one clear view.</p>
            <ul className="launch-points"><li>₹10,00,000 virtual starting balance</li><li>Market orders and positions are recorded in your session</li><li>Pro mode adds indicators, drawings, and advanced orders</li></ul>
          </section>
          <section className="builder">
            <div className="modes">
              <button className={mode === "replay" ? "on" : ""} onClick={() => setMode("replay")}>Replay practice<small>Control the clock</small></button>
              <button className={mode === "delayed" ? "on" : ""} disabled={!instrumentSupportsMode(instrument || {}, "delayed")} onClick={() => setMode("delayed")}>Live practice<small>{instrumentSupportsMode(instrument || {}, "delayed") ? "Approved market route" : "Data route unavailable"}</small></button>
            </div>
            <label>Instrument<select value={selected} onChange={(e) => { const next = instruments.find((item) => item.id === e.target.value); setSelected(e.target.value); if (mode === "delayed" && next && !instrumentSupportsMode(next, mode)) setMode("replay"); }}>{instruments.map((x) => <option key={x.id} value={x.id}>{x.symbol} · {x.venue} · {x.asset_class}</option>)}</select></label>
            <div className="row"><label>Practice length<select value={days} onChange={(e) => setDays(Number(e.target.value) as typeof days)}>{[7, 30, 90, 365].map((x) => <option key={x} value={x}>{x === 365 ? "1 year" : `${x} days`}</option>)}</select></label></div>
            <p className="note">{mode === "replay" ? "Replay is ready for paper trading. The workspace labels the exact data source before you place an order." : "Live paper orders use the approved quote and trade feed."}</p>
            <button className="open" disabled={pending} onClick={start}>{pending ? `Preparing ${mode === "delayed" ? "live" : "replay"} practice…` : `Start ${mode === "delayed" ? "live" : "replay"} practice`}</button>
          </section>
        </div>
        {Boolean(error) && <Toast error={error} close={() => setError(undefined)} />}
      </main>
    );
  const date = session.market_time
    ? new Date(session.market_time * 1000).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Waiting for market";
  return (
    <main className="trade-page terminal" data-workspace={workspace}>
      <header className="top">
        <div className="brand-lockup"><b className="logo">CC</b><span>Practice</span></div>
        <div className="instrument-summary">
          <strong>{instrument?.symbol}</strong>
          <small>
            {instrument?.venue} · {instrument?.asset_class}
          </small>
        </div>
        <div className="price-summary">
          <strong>
            {last
              ? formatQuote(last.close, instrument?.quote_currency || "USD")
              : "—"}
          </strong>
          <small>{date}</small>
        </div>
        <span className={`feed ${session.data_status === "synthetic_test" ? "fixture" : ""}`}>● {sessionLabel(session.mode, session.data_source || "synthetic-test")}</span>
        <div className="top-actions">
          <div className="experience-toggle" aria-label="Workspace mode">
            <button className={workspace === "simple" ? "active" : ""} onClick={() => setWorkspace("simple")}>Simple</button>
            <button className={workspace === "pro" ? "active" : ""} onClick={() => setWorkspace("pro")}>Pro</button>
          </div>
          <button className="exit" onClick={() => { setSession(null); setWorkspace("simple"); setMode("replay"); history.replaceState(null, "", "/trade"); }}>New practice</button>
        </div>
      </header>
      <div className="metrics">
        <Metric n="Equity" v={session.account.equity} />
        <Metric
          n="Available"
          v={session.account.buying_power || session.account.cash}
        />
        <Metric n="Realized P&L" v={session.account.realized_pnl || "0"} />
        {workspace === "pro" && <><Metric n="Reserved" v={session.account.reserved || "0"} /><Metric n="Unrealized P&L" v={session.account.unrealized_pnl || "0"} /></>}
      </div>
      <div className="body">
        {workspace === "pro" && <aside className="watch">
          <h3>
            WATCHLIST <small>{filtered.length}</small>
          </h3>
          <input
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtered.map((x) => (
            <button
              key={x.id}
              className={x.id === session.instrument_id ? "on" : ""}
              disabled={pending || x.id === session.instrument_id}
              title={x.id === session.instrument_id ? "Current instrument" : `Set up practice for ${x.symbol}`}
              onClick={() => { setSelected(x.id); setSession(null); history.replaceState(null, "", "/trade"); }}
            >
              <b>
                {x.symbol}
                <small>{x.venue}</small>
              </b>
              <span>{x.quote_currency}</span>
            </button>
          ))}
        </aside>}
        <section className="work">
          <nav className="tools" aria-label="Chart tools">
            <div role="group" aria-label="Timeframe">
              {(["1m", "5m", "15m", "1h", "1d"] as Timeframe[]).map((x) => (
                <button
                  className={x === timeframe ? "on" : ""}
                  aria-pressed={x === timeframe}
                  key={x}
                  onClick={() => setTimeframe(x)}
                >
                  {x}
                </button>
              ))}
            </div>
            {workspace === "pro" && <div>
              {(["sma", "ema", "vwap", "rsi", "macd"] as Overlay[]).map((x) => (
                <button
                  className={overlays.includes(x) ? "on" : ""}
                  aria-pressed={overlays.includes(x)}
                  key={x}
                  onClick={() =>
                    setOverlays((v) =>
                      v.includes(x) ? v.filter((y) => y !== x) : [...v, x],
                    )
                  }
                >
                  {x.toUpperCase()}
                </button>
              ))}
            </div>}
            {workspace === "pro" && <div>
              {[ ["horizontalStraightLine", "Line"], ["segment", "Trend"], ["fibonacciLine", "Fib"] ].map(([tool, label]) => <button key={tool} onClick={() => setDrawingTool(`${tool}#${uid()}`)}>{label}</button>)}
            </div>}
            <small>{candles.length} bars</small>
          </nav>
          <div className="chart">
            {candles.length ? (
              <MarketChart
                key={`${session.id}:${timeframe}`}
                candles={candles}
                overlays={workspace === "pro" ? overlays : []}
                symbol={instrument?.symbol || "SIM"}
                timeframe={timeframe}
                showVolume={workspace === "pro"}
                priceLevels={priceLevels}
                drawings={workspace === "pro" ? chartLayout.drawings as Array<{ name: string; points: Array<{ timestamp?: number; value?: number }> }> : []}
                drawingTool={workspace === "pro" ? drawingTool : undefined}
                onDrawingsChange={workspace === "pro" ? saveDrawings : undefined}
                onLoadOlder={older}
              />
            ) : (
              <p>No visible data</p>
            )}
          </div>
          {session.mode === "replay" && (
            <div className="controls">
              <button
                disabled={pending || session.state === "playing" || session.state === "finished"}
                title="Advance one candle while replay is paused"
                onClick={() =>
                  mutate(() => simulatorApi.control(session.id, "step", uid()))
                }
              >
                Next candle
              </button>
              <button
                className="play"
                disabled={pending || session.state === "finished"}
                onClick={() =>
                  mutate(() =>
                    simulatorApi.control(
                      session.id,
                      session.state === "playing" ? "pause" : "play",
                      uid(),
                    ),
                  )
                }
              >
                {session.state === "playing" ? "Pause replay" : "Play replay"}
              </button>
              {[5, 10, 20, 30].map((x) => (
                <button
                  className={session.speed === x ? "on" : ""}
                  aria-pressed={session.speed === x}
                  title={`Replay speed: ${x} times`}
                  disabled={pending}
                  key={x}
                  onClick={() =>
                    mutate(() =>
                      simulatorApi.control(session.id, "speed", uid(), x),
                    )
                  }
                >
                  {x}×
                </button>
              ))}
              <div className="seek-control">
                <input
                  aria-label="Replay position"
                  type="range"
                  min={session.initial_clock ?? 0}
                  max={session.total_bars ?? session.clock ?? 0}
                  value={seekDraft ?? session.clock ?? 0}
                  disabled={pending}
                  onChange={(event) =>
                    setSeekDraft(Number(event.currentTarget.value))
                  }
                  onPointerUp={(event) =>
                    void seek(Number(event.currentTarget.value))
                  }
                  onKeyUp={(event) => {
                    if (
                      [
                        "ArrowLeft",
                        "ArrowRight",
                        "Home",
                        "End",
                        "PageUp",
                        "PageDown",
                      ].includes(event.key)
                    )
                      void seek(Number(event.currentTarget.value));
                  }}
                />
                <output>
                  {seekDraft ?? session.clock ?? 0} / {session.total_bars ?? 0}
                </output>
                <small>Backtracking creates an assisted copy</small>
              </div>
            </div>
          )}
          <ActivityPanel
            session={session}
            instrument={instrument}
            journal={journal}
            review={review}
            onCancel={(id) =>
              mutate(() => simulatorApi.cancelOrder(session.id, id, uid()))
            }
            onAmend={(id, price) =>
              mutate(() =>
                simulatorApi.amendOrder(
                  session.id,
                  id,
                  { limit_price: price },
                  uid(),
                ),
              )
            }
            onClose={(id, q) =>
              mutate(() => simulatorApi.closePosition(session.id, id, q, uid()))
            }
            onSaveJournal={(j) =>
              mutate(async () => {
                await simulatorApi.journal(
                  session.id,
                  j.plan,
                  j.reflection,
                  uid(),
                );
                setJournal(j);
              })
            }
            onReview={() =>
              simulatorApi.review(session.id).then(setReview).catch(setError)
            }
            simple={workspace === "simple"}
          />
        </section>
        <aside className="rail">
          <h3>
            {workspace === "simple" ? "Place a practice order" : "Order entry"} <small>{instrument?.symbol}</small>
          </h3>
          <OrderTicket
            instrumentId={session.instrument_id}
            quoteCurrency={instrument?.quote_currency || "USD"}
            pending={pending}
            simple={workspace === "simple"}
            live={session.mode === "stream"}
            shortable={Boolean(instrument?.shortable)}
            referencePrice={last?.close}
            onSubmit={(p) =>
              mutate(() => simulatorApi.order(session.id, p, uid()))
            }
          />
          <div className="risk">
            <b>{session.account.margin_state === "liquidated" ? "Margin restriction" : workspace === "simple" ? "Practice account" : "Educational execution profile"}</b>
            <p>
              {session.account.margin_state === "liquidated" ? "New exposure is blocked after liquidation. Start a new practice session to reset the account." : instrument?.shortable ? `Long, close, short, and cover are available. Initial margin ${Number(instrument.initial_margin_rate || 0) * 100}% · maintenance ${Number(instrument.maintenance_margin_rate || 0) * 100}%.` : "Long-only paper trading. Your fill and position update as the market moves."}
            </p>
          </div>
        </aside>
      </div>
      {Boolean(error) && <Toast error={error} close={() => setError(undefined)} />}
    </main>
  );
}
function Metric({ n, v }: { n: string; v: string }) {
  const x = Number(v);
  return (
    <div>
      <span>{n}</span>
      <b className={x < 0 ? "neg" : n.includes("P&L") && x > 0 ? "pos" : ""}>
        {formatInr(v)}
      </b>
    </div>
  );
}
function Toast({ error, close }: { error: unknown; close: () => void }) {
  const e = simulatorErrorPresentation(error);
  return (
    <div className="toast" role="alert">
      <div>
        <b>{e.title}</b>
        <p>{e.message}</p>
      </div>
      <div className="toast-actions">
        {e.actionHref ? <a href={e.actionHref}>{e.actionLabel}</a> : e.actionLabel ? <button className="retry" onClick={() => location.reload()}>{e.actionLabel}</button> : null}
        <button aria-label="Dismiss message" onClick={close}>×</button>
      </div>
    </div>
  );
}
