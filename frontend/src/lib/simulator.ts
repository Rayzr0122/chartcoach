export type SimulatorSession = {
  id: string; mode: "replay" | "delayed" | "drill"; instrument_id: string; clock: number;
  state: string; speed: number; assisted: boolean; revision: number;
  data_source?: string;
  account: { id: string; cash: string; equity: string; reporting_currency: string };
  orders: SimulatorOrder[]; fills: SimulatorFill[];
};
export type SimulatorOrder = { id: string; side: string; order_type: string; quantity: string; price: string; status: string };
export type SimulatorFill = { id: string; order_id: string; price: string; quantity: string; fee: string };
export type Instrument = { id: string; symbol: string; venue: string; asset_class: string; quote_currency: string; source: string };

const baseUrl = () => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || (typeof window === "undefined" ? "http://localhost:8000" : `${window.location.protocol}//${window.location.hostname}:8000`);
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl()}/api/v1/simulator${path}`, { credentials: "include", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail?.message || "Simulator request failed.");
  return response.json();
}
export const simulatorApi = {
  bootstrap: () => request<{ equity: string; account_id: string; modes: string[] }>("/bootstrap"),
  instruments: () => request<Instrument[]>("/instruments"),
  drills: () => request<Array<{ id: string; title: string; title_hi: string; objective: string }>>("/drills"),
  createSession: (mode: "replay" | "delayed" | "drill", instrument_id: string, drill_id?: string) => request<SimulatorSession>("/sessions", { method: "POST", body: JSON.stringify({ mode, instrument_id, drill_id }) }),
  getSession: (id: string) => request<SimulatorSession>(`/sessions/${id}`),
  candles: (id: string) => request<Array<{ time: number; open: string; high: string; low: string; close: string; volume: string }>>(`/sessions/${id}/candles`),
  control: (id: string, action: string, value?: number) => request<SimulatorSession>(`/sessions/${id}/controls`, { method: "POST", body: JSON.stringify({ action, value }) }),
  order: (id: string, payload: Record<string, unknown>) => request<SimulatorOrder>(`/sessions/${id}/orders`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(payload) }),
  journal: (id: string, plan: string, reflection: string) => request<{ saved: boolean }>(`/sessions/${id}/journal`, { method: "PUT", body: JSON.stringify({ plan, reflection }) }),
  review: (id: string) => request<{ score: number; passed: boolean; assisted: boolean; dimensions: Record<string, number> }>(`/sessions/${id}/review`),
};
export const formatInr = (value: string | number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(Number(value));
export const sessionLabel = (mode: string, source: string) => `${mode === "replay" ? "Replay" : mode === "delayed" ? "Delayed practice" : "Guided drill"} · ${source === "synthetic-test" ? "Synthetic test data" : source}`;
