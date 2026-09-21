import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarketChart } from "./MarketChart";

const init = vi.fn();
vi.mock("klinecharts", () => ({ init: (...args: unknown[]) => init(...args), dispose: vi.fn() }));
const fixture = () => ({ setSymbol: vi.fn(), setPeriod: vi.fn(), setDataLoader: vi.fn(), createIndicator: vi.fn(), getIndicators: () => [], getOverlays: () => [], removeIndicator: vi.fn(), removeOverlay: vi.fn(), resetData: vi.fn(), createOverlay: vi.fn() });

describe("MarketChart", () => {
  beforeEach(() => { init.mockReset(); init.mockImplementation(fixture); });
  it("keeps one KLineChart instance when data updates", async () => {
    const candles = Array.from({ length: 24 }, (_, index) => ({ time: 1_700_000_000 + index * 60, open: "100", high: "102", low: "99", close: "101", volume: "1000" }));
    const view = render(<MarketChart candles={candles} overlays={["ema"]} onLoadOlder={() => undefined} />);
    view.rerender(<MarketChart candles={[...candles]} overlays={["ema"]} onLoadOlder={() => undefined} />);
    await waitFor(() => expect(init).toHaveBeenCalledTimes(1));
  });
});
