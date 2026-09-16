import { describe, expect, it } from "vitest";
import { formatInr, sessionLabel } from "./simulator";

describe("simulator presentation helpers", () => {
  it("formats INR equity and labels synthetic replay clearly", () => {
    expect(formatInr("1000000.00")).toBe("₹10,00,000.00");
    expect(sessionLabel("replay", "synthetic-test")).toBe("Replay · Synthetic test data");
  });
});
