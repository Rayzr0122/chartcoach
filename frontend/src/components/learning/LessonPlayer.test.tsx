import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import LessonPlayer from "./LessonPlayer";
import {
  lesson,
  progress,
  authorization,
  FakePlayer,
} from "@/test/lesson-fixtures";
import type { ProgressObservation, PromptAttempt } from "@/lib/learning-api";
afterEach(() => vi.useRealTimers());
it("changes playback speed without changing the playback position", async () => {
  const { player } = setup();
  const speed = await screen.findByRole("combobox", { name: "Playback speed" });
  await waitFor(() => expect(speed).toBeEnabled());
  const position = player.snapshot().position;
  fireEvent.change(speed, { target: { value: "2" } });
  expect(player.snapshot().playbackRate).toBe(2);
  expect(player.snapshot().position).toBe(position);
  fireEvent.change(speed, { target: { value: "0.5" } });
  expect(player.snapshot().playbackRate).toBe(0.5);
});
it("shows three non-blocking reminders before the focused pause warning", async () => {
  const { player } = setup({ passed_prompt_ids: ["q1"] });
  const play = await screen.findByRole("button", { name: "Play" });
  await waitFor(() => expect(play).toBeEnabled());
  await userEvent.click(play);
  expect(player.snapshot().paused).toBe(false);
  const timeline = screen.getByRole("slider", { name: "Playback position" });
  for (let reminder = 1; reminder <= 3; reminder++) {
    fireEvent.change(timeline, { target: { value: "35" } });
    expect(screen.getByRole("status", { name: "Skip reminder" })).toHaveTextContent(`Reminder ${reminder} of 3`);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(player.snapshot().paused).toBe(false);
    fireEvent.change(timeline, { target: { value: "0" } });
  }
  fireEvent.change(timeline, { target: { value: "35" } });
  const dialog = await screen.findByRole("alertdialog");
  const resume = within(dialog).getByRole("button", { name: "Continue watching" });
  expect(resume).toHaveFocus();
  expect(player.snapshot().paused).toBe(true);
  await userEvent.click(resume);
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  expect(player.snapshot().paused).toBe(false);
});
function setup(
  overrides: Partial<typeof progress> = {},
  source: Partial<typeof authorization> = {},
) {
  const player = new FakePlayer();
  let saved = { ...progress, ...overrides };
  const observations: ProgressObservation[] = [];
  let authorizations = 0;
  const api = {
    getLesson: async () => ({ ...lesson, progress: saved }),
    authorizePlayback: async () => {
      authorizations++;
      return {
        ...authorization,
        resume_position_seconds: saved.resume_position_seconds,
        pending_prompt_id: saved.pending_prompt_id,
      };
    },
    saveProgress: async (_id: string, body: ProgressObservation) => {
      observations.push(body);
      saved = {
        ...saved,
        resume_position_seconds: body.position_seconds,
        pending_prompt_id:
          body.position_seconds >= 20 && !saved.passed_prompt_ids.includes("q1")
            ? "q1"
            : null,
      };
      return saved;
    },
    submitAttempt: async (
      _id: string,
      _prompt: string,
      body: PromptAttempt,
    ) => {
      const correct = body.option_id === "a";
      if (correct)
        saved = {
          ...saved,
          passed_prompt_ids: ["q1"],
          pending_prompt_id: null,
        };
      return {
        is_correct: correct,
        feedback: correct
          ? "Yes, identify the high."
          : "Look for the highest point.",
        explanation: "Identify the high.",
        retry_allowed: true,
        progress: saved,
      };
    },
  };
  const view = render(
    <LessonPlayer
      lesson={{ ...lesson, progress: saved }}
      authorization={{
        ...authorization,
        ...source,
        resume_position_seconds: saved.resume_position_seconds,
        pending_prompt_id: saved.pending_prompt_id,
      }}
      factory={() => player}
      api={api}
      onUnauthorized={() => {}}
    />,
  );
  return {
    player,
    api,
    observations,
    view,
    authorizations: () => authorizations,
  };
}
it("offers named controls, actual play state, mute/volume, captions, buffering and expanded inline", async () => {
  const t = setup();
  await screen.findByRole("button", { name: "Play" });
  await userEvent.click(screen.getByRole("button", { name: "Play" }));
  expect(screen.getByRole("button", { name: "Pause" })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Mute" }));
  expect(screen.getByRole("button", { name: "Unmute" })).toBeVisible();
  fireEvent.change(screen.getByRole("slider", { name: "Volume" }), {
    target: { value: "0.4" },
  });
  expect(t.player.state.volume).toBe(0.4);
  await userEvent.click(
    screen.getByRole("button", { name: "English captions" }),
  );
  expect(
    screen.getByRole("button", { name: "English captions" }),
  ).toHaveAttribute("aria-pressed", "true");
  act(() => t.player.emit("waiting", { buffering: true }));
  expect(screen.getByText("Buffering…")).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: "Expand player" }));
  expect(
    screen.getByRole("button", { name: "Exit expanded view" }),
  ).toBeVisible();
  t.view.unmount();
  expect(t.player.destroyed).toBe(true);
});
it("shows chapter preview, highlights active chapter, and allows backward seeking", async () => {
  const t = setup({ passed_prompt_ids: ["q1"] });
  await screen.findByRole("button", { name: "Play" });
  act(() => t.player.emit("timeupdate", { position: 30 }));
  expect(screen.getByRole("button", { name: /Chapter 2/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
  expect(
    screen.getByRole("button", { name: "Preview The next move" }),
  ).toHaveAttribute("aria-current", "true");
  fireEvent.focus(screen.getByRole("button", { name: /Preview The opening/ }));
  expect(screen.getByRole("tooltip")).toHaveTextContent(
    "Find the first swing.",
  );
  expect(within(screen.getByRole("tooltip")).getByRole("img")).toHaveAttribute(
    "src",
    "https://example.test/one.jpg",
  );
  await userEvent.click(screen.getByRole("button", { name: /Chapter 1/ }));
  expect(screen.getByLabelText("Playback position")).toHaveValue("0");
});
it.each(["timeline", "chapter", "keyboard", "native", "natural"])(
  "stops %s forward movement at the required check",
  async (entry) => {
    const t = setup();
    await screen.findByRole("button", { name: "Play" });
    if (entry === "timeline")
      fireEvent.change(screen.getByLabelText("Playback position"), {
        target: { value: "50" },
      });
    if (entry === "chapter")
      await userEvent.click(screen.getByRole("button", { name: /Chapter 2/ }));
    if (entry === "keyboard") {
      act(() => t.player.emit("timeupdate", { position: 18 }));
      fireEvent.keyDown(screen.getByRole("region", { name: "Lesson video" }), {
        key: "ArrowRight",
      });
    }
    if (entry === "native")
      act(() => t.player.emit("seeking", { position: 50 }));
    if (entry === "natural")
      act(() => t.player.emit("timeupdate", { position: 21, paused: false }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "Which point is the swing high?",
    );
    expect(t.player.state.position).toBe(20);
    expect(t.player.state.paused).toBe(true);
    await waitFor(() =>
      expect(t.observations.at(-1)?.position_seconds).toBe(20),
    );
    expect(
      t.observations.every((x) => x.end_seconds - x.start_seconds <= 15),
    ).toBe(true);
  },
);
it("restores pending check with focus, retries wrong answers, and continues only on learner action", async () => {
  const t = setup({ resume_position_seconds: 20, pending_prompt_id: "q1" });
  const dialog = await screen.findByRole("dialog");
  expect(dialog).toContainElement(document.activeElement as HTMLElement);
  await userEvent.click(
    within(dialog).getByRole("button", { name: "The lowest point" }),
  );
  expect(await screen.findByText("Look for the highest point.")).toBeVisible();
  await userEvent.click(
    within(dialog).getByRole("button", { name: "The highest point" }),
  );
  expect(
    await screen.findByRole("button", { name: "Continue lesson" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Continue lesson" })).toHaveFocus();
  expect(t.player.state.paused).toBe(true);
  await userEvent.click(
    screen.getByRole("button", { name: "Continue lesson" }),
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Pause" })).toBeVisible();
});
it("renews an expired capability on the heartbeat without automatic playback", async () => {
  vi.useFakeTimers();
  const t = setup({}, { expires_at: "2000-01-01T00:00:00Z" });
  await act(async () => {});
  await act(async () => {
    vi.advanceTimersByTime(8000);
  });
  expect(t.authorizations()).toBe(1);
  expect(t.player.state.paused).toBe(true);
  await act(async () => {
    vi.advanceTimersByTime(16000);
  });
  expect(t.authorizations()).toBe(1);
});
it("handles shortcuts without taking keys from buttons, and exits native video fullscreen", async () => {
  setup();
  await screen.findByRole("button", { name: "Play" });
  const region = screen.getByRole("region", { name: "Lesson video" });
  fireEvent.keyDown(region, { key: "k" });
  expect(screen.getByRole("button", { name: "Pause" })).toBeVisible();
  fireEvent.keyDown(screen.getByRole("button", { name: "Pause" }), {
    key: "k",
  });
  expect(screen.getByRole("button", { name: "Pause" })).toBeVisible();
  fireEvent.keyDown(region, { key: "m" });
  expect(screen.getByRole("button", { name: "Unmute" })).toBeVisible();
  fireEvent(
    screen.getByLabelText("Lesson media"),
    new Event("webkitbeginfullscreen"),
  );
  expect(screen.getByRole("button", { name: "Play" })).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Exit expanded view" }),
  ).toBeVisible();
});
it("sends short observed heartbeat intervals and trusts only server completion", async () => {
  vi.useFakeTimers();
  const t = setup({ passed_prompt_ids: ["q1"] });
  await act(async () => {});
  await act(async () => {
    await t.player.play();
  });
  for (let position = 1; position <= 10; position++) {
    await act(async () => {
      vi.advanceTimersByTime(1000);
      t.player.emit("timeupdate", { position });
    });
  }
  expect(t.observations.length).toBeGreaterThan(0);
  expect(t.observations[0]).toMatchObject({
    playback_session_id: "s",
    start_seconds: 0,
  });
  expect(t.observations[0].end_seconds).toBeLessThanOrEqual(10);
  act(() => t.player.emit("ended", { position: 60, ended: true }));
  expect(screen.queryByText("Lesson complete")).toBeNull();
  vi.useRealTimers();
  t.view.unmount();
  setup({ completed: true, passed_prompt_ids: ["q1"] });
  expect(await screen.findByText("Lesson complete")).toBeVisible();
});
it("refreshes authorization once then stops on another authorization error", async () => {
  const t = setup();
  await screen.findByRole("button", { name: "Play" });
  const error = {
    category: "authorization" as const,
    retryable: true,
    message: "Playback authorization needs refreshing.",
  };
  await act(async () => {
    t.player.emit("error", {}, error);
  });
  expect(t.authorizations()).toBe(1);
  await act(async () => {
    t.player.emit("error", {}, error);
  });
  expect(t.authorizations()).toBe(1);
  expect(within(screen.getByRole("region", { name: "Lesson video" })).getByRole("alert")).toHaveTextContent(/retry/i);
});
it("does not credit a native jump as watched coverage", async () => {
  const t = setup();
  await screen.findByRole("button", { name: "Play" });
  act(() => t.player.emit("timeupdate", { position: 10, paused: false }));
  await act(async () => t.player.emit("seeking", { position: 40 }));
  expect(t.observations.at(-1)).toMatchObject({
    position_seconds: 20,
    start_seconds: 20,
    end_seconds: 20,
  });
});
it("restores authoritative position after server rejection", async () => {
  const t = setup();
  await screen.findByRole("button", { name: "Play" });
  t.api.saveProgress = async () => {
    throw new Error("private vendor detail");
  };
  await act(async () => t.player.emit("seeking", { position: 40 }));
  expect(t.player.state.position).toBe(0);
  expect(within(screen.getByRole("region", { name: "Lesson video" })).getByRole("alert")).toHaveTextContent(/refreshed/i);
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("keeps recovery reachable when a server error restores a pending prompt", async () => {
  const t = setup({ resume_position_seconds: 20, pending_prompt_id: "q1" });
  const dialog = await screen.findByRole("dialog");
  t.api.submitAttempt = async () => {
    throw new Error("private");
  };
  await userEvent.click(
    within(dialog).getByRole("button", { name: "The highest point" }),
  );
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    /refreshed/i,
  );
  expect(
    within(dialog).getByRole("button", { name: "Retry playback" }),
  ).toBeVisible();
});
