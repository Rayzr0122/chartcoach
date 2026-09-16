import { describe, expect, it } from "vitest";
import { formatInr, sessionLabel, simulatorErrorPresentation, SimulatorApiError } from "./simulator";

describe("simulator presentation helpers", () => {
  it("formats INR equity and labels synthetic replay clearly", () => {
    expect(formatInr("1000000.00")).toBe("₹10,00,000.00");
    expect(sessionLabel("replay", "synthetic-test")).toBe("Replay · Synthetic test data");
  });

  it("turns an unauthenticated simulator response into a sign-in action", () => {
    expect(simulatorErrorPresentation(new SimulatorApiError("Could not verify your login. Please log in again.", 401, "UNAUTHORIZED"))).toEqual({
      title: "Sign in required",
      message: "Sign in to open the practice simulator.",
      actionLabel: "Sign in",
      actionHref: "/login?next=%2Ftrade",
    });
  });

  it("classifies API errors even when an app bundle returns a plain error object", () => {
    expect(simulatorErrorPresentation({ message: "Could not verify your login. Please log in again.", status: 401, code: "UNAUTHORIZED" })).toEqual({
      title: "Sign in required",
      message: "Sign in to open the practice simulator.",
      actionLabel: "Sign in",
      actionHref: "/login?next=%2Ftrade",
    });
  });

  it("explains when the backend cannot be reached", () => {
    expect(simulatorErrorPresentation(new SimulatorApiError("", 0, "BACKEND_UNREACHABLE"))).toEqual({
      title: "Simulator backend unavailable",
      message: "The practice service is not reachable. Check that the backend is running on port 8000, then retry.",
      actionLabel: "Retry",
    });
  });

  it("labels Polygon delayed instruments separately from synthetic fixtures", () => {
    expect(sessionLabel("delayed", "polygon-delayed")).toBe("Delayed practice · Polygon delayed data");
  });
});
