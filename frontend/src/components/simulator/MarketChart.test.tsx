import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarketChart } from "./MarketChart";

const init = vi.fn();
vi.mock("klinecharts", () => ({ init: (...args: unknown[]) => init(...args), dispose: vi.fn() }));
const fixture = () => ({ setSymbol: vi.fn(), setPeriod: vi.fn(), setDataLoader: vi.fn(), createIndicator: vi.fn(), getIndicators: () => [], getOverlays: () => [], removeIndicator: vi.fn(), removeOverlay: vi.fn(), resetData: vi.fn(), createOverlay: vi.fn() });

describe("MarketChart", () => {
  it("resets chart zoom and returns to the latest candle without recreating the chart", async () => {
    const chart = { ...fixture(), setBarSpace: vi.fn(), scrollToRealTime: vi.fn() };
    init.mockReturnValue(chart);
    render(<MarketChart candles={[]} overlays={[]} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Reset view" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    expect(chart.setBarSpace).toHaveBeenCalledWith(8);
    expect(chart.scrollToRealTime).toHaveBeenCalledOnce();
  });
  beforeEach(() => { init.mockReset(); init.mockImplementation(fixture); });
  it("keeps one KLineChart instance when data updates", async () => {
    const candles = Array.from({ length: 24 }, (_, index) => ({ time: 1_700_000_000 + index * 60, open: "100", high: "102", low: "99", close: "101", volume: "1000" }));
    const view = render(<MarketChart candles={candles} overlays={["ema"]} onLoadOlder={async () => []} />);
    view.rerender(<MarketChart candles={[...candles]} overlays={["ema"]} onLoadOlder={async () => []} />);
    await waitFor(() => expect(init).toHaveBeenCalledTimes(1));
  });

  it("loads older candles through native prepend pagination and stops at the dataset boundary", async () => {
    const chart = fixture();
    init.mockReturnValue(chart);
    const loadOlder = vi.fn().mockResolvedValue([]);
    const candles = [{ time: 1_700_000_000, open: "100", high: "102", low: "99", close: "101", volume: "1000" }];
    render(<MarketChart candles={candles} overlays={[]} symbol="AAPL" timeframe="5m" onLoadOlder={loadOlder} />);

    await waitFor(() => expect(chart.setDataLoader).toHaveBeenCalled());
    const loader = chart.setDataLoader.mock.calls[0][0] as { getBars: (request: { type: string; timestamp: number; callback: ReturnType<typeof vi.fn> }) => void };
    const callback = vi.fn();
    loader.getBars({ type: "forward", timestamp: 1_700_000_000_000, callback });

    expect(loadOlder).toHaveBeenCalledWith(1_700_000_000);
    await waitFor(() => expect(callback).toHaveBeenCalledWith([], { forward: false, backward: false }));
    expect(chart.resetData).not.toHaveBeenCalled();
    expect(chart.setSymbol).toHaveBeenCalledWith(expect.objectContaining({ ticker: "AAPL" }));
    expect(chart.setPeriod).toHaveBeenCalledWith({ type: "minute", span: 5 });
  });

  it("creates separate RSI and MACD indicator panes when requested", async () => {
    const chart = fixture();
    init.mockReturnValue(chart);
    const candles = [{ time: 1_700_000_000, open: "100", high: "102", low: "99", close: "101", volume: "1000" }];
    render(<MarketChart candles={candles} overlays={["rsi", "macd"]} />);

    await waitFor(() => expect(chart.createIndicator).toHaveBeenCalledWith("RSI"));
    expect(chart.createIndicator).toHaveBeenCalledWith("MACD");
  });

  it("retries a failed history page, deduplicates it, and keeps live updates incremental", async () => {
    const chart = fixture();
    init.mockReturnValue(chart);
    const candle = { time: 1700000000, open: "100", high: "102", low: "99", close: "101", volume: "1000" };
    const older = { ...candle, time: candle.time - 60 };
    const loadOlder = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([older, older, candle]);
    const view = render(<MarketChart candles={[candle]} overlays={[]} onLoadOlder={loadOlder} />);
    await waitFor(() => expect(chart.setDataLoader).toHaveBeenCalled());
    const loader = chart.setDataLoader.mock.calls[0][0];
    const callback = vi.fn();
    loader.getBars({ type: "forward", timestamp: candle.time * 1000, callback });
    await waitFor(() => expect(screen.getByRole("button", { name: "Retry history" })).toBeVisible());
    expect(callback).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry history" }));
    await waitFor(() => expect(callback).toHaveBeenCalledWith([expect.objectContaining({ timestamp: older.time * 1000 })], { forward: true, backward: false }));
    const update = vi.fn();
    loader.subscribeBar({ callback: update });
    view.rerender(<MarketChart candles={[candle, { ...candle, time: candle.time + 60 }]} overlays={[]} onLoadOlder={loadOlder} />);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ timestamp: (candle.time + 60) * 1000 }));
    expect(chart.resetData).not.toHaveBeenCalled();
  });

  it("discards a history response after its chart unmounts", async () => {
    const chart = fixture();
    init.mockReturnValue(chart);
    let resolve!: (value: []) => void;
    const loadOlder = vi.fn(() => new Promise<[]>((done) => { resolve = done; }));
    const view = render(<MarketChart candles={[]} overlays={[]} onLoadOlder={loadOlder} />);
    await waitFor(() => expect(chart.setDataLoader).toHaveBeenCalled());
    const callback = vi.fn();
    chart.setDataLoader.mock.calls[0][0].getBars({ type: "forward", timestamp: 1700000000000, callback });
    view.unmount();
    resolve([]);
    await Promise.resolve();
    expect(callback).not.toHaveBeenCalled();
  });

  it("renders submitted order levels over the real price bars", async () => {
    const chart = fixture();
    init.mockReturnValue(chart);
    const candles = [{ time: 1_700_000_000, open: "100", high: "102", low: "99", close: "101", volume: "1000" }];
    render(<MarketChart candles={candles} overlays={[]} priceLevels={[{ id: "stop", value: 95, kind: "stop" }]} />);

    await waitFor(() => expect(chart.createOverlay).toHaveBeenCalledWith(expect.objectContaining({ groupId: "simulation", points: [{ value: 95 }] })));
  });
});
