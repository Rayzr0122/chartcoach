"use client";
import { useState } from "react";
import { formatQuote, type OrderDraft, type PositionEffect, validateOrderDraft } from "@/lib/simulator";

const empty: OrderDraft = { side: "buy", position_effect: "open_long", order_type: "market", quantity: "", limit_price: "", stop_price: "", stop_loss: "", take_profit: "", time_in_force: "DAY" };
const actions: Array<{ label: string; side: "buy" | "sell"; effect: PositionEffect }> = [
  { label: "Buy", side: "buy", effect: "open_long" }, { label: "Sell", side: "sell", effect: "close_long" },
  { label: "Sell short", side: "sell", effect: "open_short" }, { label: "Buy to cover", side: "buy", effect: "close_short" },
];
const actionLabel = (effect: PositionEffect) => actions.find((action) => action.effect === effect)!.label.toLowerCase();
export function OrderTicket({ instrumentId, quoteCurrency, onSubmit, pending, simple = false, live = false, shortable = false, referencePrice }: { instrumentId: string; quoteCurrency: string; onSubmit: (payload: Record<string, unknown>) => void; pending: boolean; simple?: boolean; live?: boolean; shortable?: boolean; referencePrice?: string }) {
  const [draft, setDraft] = useState(empty); const [errors, setErrors] = useState<string[]>([]); const [confirm, setConfirm] = useState(false);
  const update = (key: keyof OrderDraft, value: string) => { setConfirm(false); setErrors([]); setDraft((current) => ({ ...current, [key]: value })); };
  const chooseAction = (action: typeof actions[number]) => { setConfirm(false); setErrors([]); setDraft((current) => ({ ...current, side: action.side, position_effect: action.effect })); };
  const review = () => { const next = validateOrderDraft(draft); setErrors(next); if (!next.length) setConfirm(true); };
  const effect = draft.position_effect || (draft.side === "buy" ? "open_long" : "close_long");
  const submit = () => { const payload: Record<string, unknown> = { instrument_id: instrumentId, side: draft.side, position_effect: effect, order_type: draft.order_type, quantity: draft.quantity, time_in_force: draft.time_in_force }; if (draft.limit_price) payload.limit_price = draft.limit_price; if (draft.stop_price) payload.stop_price = draft.stop_price; if (draft.stop_loss) payload.stop_loss = draft.stop_loss; if (draft.take_profit) payload.take_profit = draft.take_profit; onSubmit(payload); setConfirm(false); };
  return <section className="ticket" aria-label="Order ticket">
    <fieldset disabled={pending} className="ticket-fields">
    <legend className="sr-only">Order details</legend>
    <div className={`segmented ${shortable ? "four-actions" : ""}`} role="group" aria-label="Trade action">{actions.filter((action) => shortable || !action.effect.includes("short")).map((action) => <button key={action.effect} aria-pressed={effect === action.effect} className={effect === action.effect ? `active ${action.side}` : ""} onClick={() => chooseAction(action)}>{action.label}</button>)}</div>
    <p className="action-explanation">{effect === "open_long" ? "Open or add to a long position." : effect === "close_long" ? "Sell shares or units you already hold." : effect === "open_short" ? "Open a short position using available margin." : "Buy back units to reduce or close a short."}</p>
    {!simple && <label>Order type<select aria-label="Order type" value={draft.order_type} onChange={(event) => update("order_type", event.target.value)}><option value="market">Market</option><option value="limit">Limit</option><option value="stop_market">Stop market</option><option value="stop_limit">Stop limit</option></select></label>}
    <div className="field-pair"><label>Quantity<input aria-label="Quantity" inputMode="decimal" value={draft.quantity} onChange={(event) => update("quantity", event.target.value)} /></label>{!simple && <label>TIF<select value={draft.time_in_force} onChange={(event) => update("time_in_force", event.target.value)}><option>DAY</option><option>GTC</option></select></label>}</div>
    {(draft.order_type === "limit" || draft.order_type === "stop_limit") && <label>Limit price <span>{quoteCurrency}</span><input aria-label="Limit price" inputMode="decimal" value={draft.limit_price} onChange={(event) => update("limit_price", event.target.value)} /></label>}
    {(draft.order_type === "stop_market" || draft.order_type === "stop_limit") && <label>Stop price <span>{quoteCurrency}</span><input aria-label="Stop price" inputMode="decimal" value={draft.stop_price} onChange={(event) => update("stop_price", event.target.value)} /></label>}
    <details className={simple ? "simple-protection" : ""}><summary>{simple ? "Protect this trade (optional)" : "Bracket protection"}</summary><div className="field-pair"><label>Stop loss<input aria-label="Stop loss" inputMode="decimal" value={draft.stop_loss} onChange={(event) => update("stop_loss", event.target.value)} /></label><label>Take profit<input aria-label="Take profit" inputMode="decimal" value={draft.take_profit} onChange={(event) => update("take_profit", event.target.value)} /></label></div>{simple && referencePrice && draft.stop_loss && Number.isFinite(Number(draft.stop_loss)) && Number.isFinite(Number(draft.quantity)) && <small className="estimated-risk">Estimated price risk: {formatQuote(Math.abs(Number(referencePrice) - Number(draft.stop_loss)) * Number(draft.quantity), quoteCurrency)}</small>}</details>
    {simple && <p className="ticket-help">{live ? "Market orders cross the current displayed bid or ask." : "Market orders fill on the next replayed price."} Switch to Pro for limit and stop order types.</p>}
    {errors.length ? <div className="form-errors" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
    {!confirm && <button className="primary full" onClick={review} disabled={pending}>{pending ? "Submitting order…" : `Review ${actionLabel(effect)} order`}</button>}
    {confirm ? <section className="order-review" aria-label="Confirm order" onKeyDown={(event) => { if (event.key === "Escape") setConfirm(false); }}><strong>Confirm {actionLabel(effect)} {draft.quantity} {instrumentId}</strong><p>{draft.order_type.replaceAll("_", " ")} · {draft.time_in_force}{draft.limit_price ? ` · ${draft.limit_price} ${quoteCurrency}` : ""}</p><div><button autoFocus onClick={() => setConfirm(false)}>Edit order</button><button className="primary" disabled={pending} onClick={submit}>{pending ? "Submitting…" : `Place ${actionLabel(effect)} order`}</button></div></section> : null}
    </fieldset>
  </section>;
}
