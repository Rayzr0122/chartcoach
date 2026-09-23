import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ActivityPanel } from "./ActivityPanel";
import type { SimulatorSession } from "@/lib/simulator";

it("separates completed orders from active orders without deleting history", () => {
  const session = { positions: [], fills: [], orders: [{ id: "done", side: "buy", order_type: "market", quantity: "1", status: "filled" }] } as unknown as SimulatorSession;
  render(<ActivityPanel session={session} journal={{ plan: "", reflection: "" }} onCancel={vi.fn()} onAmend={vi.fn()} onClose={vi.fn()} onSaveJournal={vi.fn()} onReview={vi.fn()} simple />);
  fireEvent.click(screen.getByRole("button", { name: /orders/i }));
  expect(screen.queryByText("filled")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox"));
  expect(screen.getByText("filled")).toBeInTheDocument();
  expect(session.orders).toHaveLength(1);
});
