import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it } from "vitest";
import LessonTour from "./LessonTour";

beforeEach(() => localStorage.clear());

it("recommends the first lesson guide with anchored labels and forward-seek guidance", async () => {
  const user = userEvent.setup();
  render(
    <div>
      <button data-tour-target="player">Player</button>
      <LessonTour storageKey="chartcoach-tour-test" />
    </div>,
  );

  expect(screen.getByRole("dialog", { name: "Lesson player guide" })).toBeVisible();
  expect(screen.getByText("Meet your lesson player")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("Watch in sequence")).toBeVisible();
  expect(screen.getByText(/Forward seeking is disabled/)).toBeVisible();
});

it("lets learners skip the recommended guide and remembers that choice", async () => {
  const user = userEvent.setup();
  render(<LessonTour storageKey="chartcoach-tour-test" />);
  await user.click(screen.getByRole("button", { name: "Skip tour" }));
  expect(screen.queryByRole("dialog", { name: "Lesson player guide" })).not.toBeInTheDocument();
  expect(localStorage.getItem("chartcoach-tour-test")).toBe("dismissed");
});
