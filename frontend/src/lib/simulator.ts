export type SimulatorSession = {
  id: string; mode: "replay" | "delayed" | "drill"; instrument_id: string; clock: number;
  state: string; speed: number; assisted: boolean; revision: number;
  data_source?: string;
  account: { id: string; cash: string; equity: string; reporting_currency: string };
  orders: SimulatorOrder[]; fills: SimulatorFill[];
};
export type SimulatorOrder = { id: string; side: string; order_type: string; quantity: string; price: string; status: string };
export type SimulatorFill = { id: string; order_id: string; price: string; quantity: string; fee: string };
export type Instrument = {
  id: string;
  symbol: string;
  venue: string;
  asset_class: string;
  quote_currency: string;
  source: string;
  replay_source?: string;
  delayed_source?: string;
  polygon_supported?: boolean;
};

const baseUrl = () => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || (typeof window === "undefined" ? "http://localhost:8000" : `${window.location.protocol}//${window.location.hostname}:8000`);
export class SimulatorApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); this.name = "SimulatorApiError"; }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${baseUrl()}/api/v1/simulator${path}`, { credentials: "include", cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error?.message || body?.detail?.message || body?.detail || (response.status === 401 ? "Your session has expired. Sign in again to use practice trading." : response.status === 403 ? "Practice trading requires the Trader plan or higher." : `Simulator request failed (${response.status}).`);
      throw new SimulatorApiError(typeof message === "string" ? message : "Simulator request failed.", response.status, body?.error?.code || body?.detail?.code);
    }
    return response.json();
  } catch (error) {
    if (error instanceof SimulatorApiError) throw error;
    throw new SimulatorApiError("The practice service is not reachable. Check that the backend is running on port 8000, then retry.", 0, "BACKEND_UNREACHABLE");
  }
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
export type SimulatorErrorPresentation = { title: string; message: string; actionLabel?: string; actionHref?: string };

export function simulatorErrorPresentation(error: unknown): SimulatorErrorPresentation {
  const apiError = error instanceof SimulatorApiError ? error : undefined;
  const candidate = error && typeof error === "object" ? error as { code?: unknown; status?: unknown; message?: unknown } : undefined;
  const code = apiError?.code || (typeof candidate?.code === "string" ? candidate.code : undefined);
  const status = apiError?.status ?? (typeof candidate?.status === "number" ? candidate.status : undefined);
  if (code === "BACKEND_UNREACHABLE" || status === 0) {
    return { title: "Simulator backend unavailable", message: "The practice service is not reachable. Check that the backend is running on port 8000, then retry.", actionLabel: "Retry" };
  }
  if (code === "UNAUTHORIZED" || status === 401) {
    return { title: "Sign in required", message: "Sign in to open the practice simulator.", actionLabel: "Sign in", actionHref: "/login?next=%2Ftrade" };
  }
  if (code === "ENTITLEMENT_REQUIRED" || status === 403) {
    return { title: "Practice access is locked", message: "Trading practice requires the Trader plan or higher.", actionLabel: "View plans", actionHref: "/pricing" };
  }
  if (code === "MARKET_DATA_UNAVAILABLE" || status === 503) {
    return { title: "Delayed market data unavailable", message: "Polygon did not return a usable quote or candle set for this instrument. No order was submitted.", actionLabel: "Retry" };
  }
  const message = error instanceof Error && error.message ? error.message : typeof candidate?.message === "string" && candidate.message ? candidate.message : "The simulator could not complete that request.";
  return { title: "Simulator request failed", message, actionLabel: "Retry" };
}

const sourceLabels: Record<string, string> = {
  "synthetic-test": "Synthetic test data",
  "polygon-delayed": "Polygon delayed data",
  "historical-replay": "Historical replay data",
  "delayed-feed": "Delayed market feed",
};

export const sessionLabel = (mode: string, source: string) => `${mode === "replay" ? "Replay" : mode === "delayed" ? "Delayed practice" : "Guided drill"} · ${sourceLabels[source] || source}`;
