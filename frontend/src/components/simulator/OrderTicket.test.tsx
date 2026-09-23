import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OrderTicket } from "./OrderTicket";

describe("OrderTicket", () => {
  it("invalidates confirmation when the trade action changes and locks edits while submitting", async () => {
    const user = userEvent.setup();
    const view = render(<OrderTicket instrumentId="NASDAQ:AAPL" quoteCurrency="USD" onSubmit={vi.fn()} pending={false} />);
    await user.type(screen.getByLabelText("Quantity"), "2");
    await user.click(screen.getByRole("button", { name: "Review buy order" }));
    await user.click(screen.getByRole("button", { name: "Sell" }));
    expect(screen.queryByRole("region", { name: "Confirm order" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sell" })).toHaveAttribute("aria-pressed", "true");
    view.rerender(<OrderTicket instrumentId="NASDAQ:AAPL" quoteCurrency="USD" onSubmit={vi.fn()} pending />);
    expect(screen.getByLabelText("Quantity")).toBeDisabled();
  });
  it("blocks an invalid limit order and submits the confirmed valid draft", async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    render(<OrderTicket instrumentId="NASDAQ:AAPL" quoteCurrency="USD" onSubmit={submit} pending={false} />);
    await user.selectOptions(screen.getByLabelText("Order type"), "limit");
    await user.click(screen.getByRole("button", { name: "Review buy order" }));
    expect(screen.getByText("Quantity must be greater than zero.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Quantity"), "2");
    await user.type(screen.getByLabelText("Limit price"), "100");
    await user.click(screen.getByRole("button", { name: "Review buy order" }));
    expect(screen.getByRole("region", { name: "Confirm order" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Place buy order" }));
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ quantity: "2", limit_price: "100", order_type: "limit" }));
  });

  it("keeps the simple ticket focused on a market order", async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    render(<OrderTicket instrumentId="NASDAQ:AAPL" quoteCurrency="USD" onSubmit={submit} pending={false} simple />);

    expect(screen.queryByLabelText("Order type")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Quantity"), "1");
    await user.click(screen.getByRole("button", { name: "Review buy order" }));
    await user.click(screen.getByRole("button", { name: "Place buy order" }));

    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ quantity: "1", order_type: "market" }));
  });

  it("uses quote-based language when simplified live practice is selected", () => {
    render(<OrderTicket instrumentId="NASDAQ:AAPL" quoteCurrency="USD" onSubmit={vi.fn()} pending={false} simple live />);

    expect(screen.getByText(/Market orders cross the current displayed bid or ask/)).toBeInTheDocument();
  });

  it("offers a clear short-sale action only for shortable instruments", async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    render(<OrderTicket instrumentId="NASDAQ:AAPL" quoteCurrency="USD" onSubmit={submit} pending={false} simple shortable />);

    await user.click(screen.getByRole("button", { name: "Sell short" }));
    await user.type(screen.getByLabelText("Quantity"), "1");
    await user.click(screen.getByRole("button", { name: "Review sell short order" }));
    await user.click(screen.getByRole("button", { name: "Place sell short order" }));

    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ side: "sell", position_effect: "open_short", quantity: "1" }));
  });
});
