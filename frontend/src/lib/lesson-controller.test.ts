import { afterEach, expect, it, vi } from "vitest";
import {
  LessonController,
  type LessonView,
  type LessonApi,
} from "./lesson-controller";
import {
  lesson,
  authorization,
  progress,
  FakePlayer,
} from "@/test/lesson-fixtures";
afterEach(() => vi.useRealTimers());
it("keeps heartbeats running after authorization recovery during initial load", async () => {
  vi.useFakeTimers();
  const player = new FakePlayer();
  let loads = 0,
    saves = 0;
  player.load = async () => {
    if (loads++ === 0) {
      const error = {
        category: "authorization" as const,
        retryable: true,
        message: "Refresh needed",
      };
      player.emit("error", {}, error);
      throw error;
    }
    player.emit("ready");
  };
  const api: LessonApi = {
    getLesson: async () => lesson,
    authorizePlayback: async () => authorization,
    saveProgress: async () => {
      saves++;
      return progress;
    },
    submitAttempt: async () => {
      throw new Error("unused");
    },
  };
  const views: LessonView[] = [];
  const controller = new LessonController(
    lesson,
    authorization,
    player,
    api,
    (view) => views.push(view),
    () => {},
  );
  await controller.start();
  await vi.advanceTimersByTimeAsync(8000);
  expect(views.at(-1)?.ready).toBe(true);
  expect(saves).toBeGreaterThan(0);
  controller.destroy();
});
it("serializes a pending answer with heartbeat writes to prevent overwriting passed prompts", async () => {
  vi.useFakeTimers();
  const player = new FakePlayer();
  let resolve!: () => void;
  let answerPending = false;
  let overlap = false;
  const saved = {
    ...progress,
    resume_position_seconds: 20,
    pending_prompt_id: "q1",
  };
  const api: LessonApi = {
    getLesson: async () => ({ ...lesson, progress: saved }),
    authorizePlayback: async () => authorization,
    saveProgress: async () => {
      if (answerPending) overlap = true;
      return saved;
    },
    submitAttempt: async () => {
      answerPending = true;
      await new Promise<void>((r) => (resolve = r));
      answerPending = false;
      return {
        is_correct: true,
        feedback: "Correct",
        explanation: "Correct",
        retry_allowed: true,
        progress: {
          ...saved,
          passed_prompt_ids: ["q1"],
          pending_prompt_id: null,
        },
      };
    },
  };
  const controller = new LessonController(
    { ...lesson, progress: saved },
    { ...authorization, resume_position_seconds: 20, pending_prompt_id: "q1" },
    player,
    api,
    () => {},
    () => {},
  );
  await controller.start();
  const answer = controller.answer("a");
  await vi.advanceTimersByTimeAsync(8000);
  expect(overlap).toBe(false);
  resolve();
  await answer;
  controller.destroy();
});
