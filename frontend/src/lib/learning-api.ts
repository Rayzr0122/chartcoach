export type LessonProgress = {
  user_id: string;
  lesson_id: string;
  playback_session_id: string | null;
  resume_position_seconds: number;
  watched_intervals: number[][];
  watched_seconds: number;
  watch_percent: number;
  passed_prompt_ids: string[];
  pending_prompt_id: string | null;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
};
export type LessonPrompt = {
  id: string;
  question: string;
  options: { id: string; text: string }[];
};
export type LessonSegment = {
  id: string;
  title: string;
  description: string;
  start_seconds: number;
  end_seconds: number;
  thumbnail: { time_seconds: number; url: string };
  required_prompt: LessonPrompt | null;
};
export type LessonMetadata = {
  id: string;
  course_id: string;
  title: string;
  duration_seconds: number;
  captions: { language: string; label: string; url: string };
  segments: LessonSegment[];
  progress: LessonProgress;
};
export type PlaybackAuthorization = {
  playback_session_id: string;
  resume_position_seconds: number;
  pending_prompt_id: string | null;
  playback_id: string;
  manifest_url: string;
  widevine_license_url: string;
  playready_license_url: string;
  fairplay_license_url: string;
  fairplay_certificate_url: string;
  playback_token: string;
  drm_token: string;
  expires_at: string;
};
export type ProgressObservation = {
  playback_session_id: string;
  position_seconds: number;
  start_seconds: number;
  end_seconds: number;
};
export type PromptAttempt = { playback_session_id: string; option_id: string };
export type AttemptResult = {
  is_correct: boolean;
  explanation: string;
  feedback: string;
  retry_allowed: boolean;
  progress: LessonProgress;
};
export class LearningApiError extends Error {
  constructor(public status: number) {
    super(
      status === 401
        ? "Please sign in to continue."
        : status === 403
          ? "An active enrollment is required for this lesson."
          : status === 404
            ? "This lesson is unavailable."
            : status === 409 || status === 422
              ? "Your lesson progress needs to be refreshed."
              : "Secure playback is temporarily unavailable. Please retry.",
    );
  }
}
async function request<T>(
  path: string,
  method: string,
  body?: unknown,
): Promise<T> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? ""}/learning/lessons/${path}`,
      {
        method,
        credentials: "include",
        cache: "no-store",
        ...(body
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      },
    );
    if (!response.ok) throw new LearningApiError(response.status);
    return (await response.json()) as T;
  } catch (error) {
    throw error instanceof LearningApiError ? error : new LearningApiError(503);
  }
}
export const getLesson = (id: string) =>
  request<LessonMetadata>(encodeURIComponent(id), "GET");
export const authorizePlayback = (id: string) =>
  request<PlaybackAuthorization>(`${encodeURIComponent(id)}/playback`, "POST");
export const saveProgress = (id: string, body: ProgressObservation) =>
  request<LessonProgress>(`${encodeURIComponent(id)}/progress`, "PUT", body);
export const submitAttempt = (
  id: string,
  prompt: string,
  body: PromptAttempt,
) =>
  request<AttemptResult>(
    `${encodeURIComponent(id)}/prompts/${encodeURIComponent(prompt)}/attempts`,
    "POST",
    body,
  );
