"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import * as learningApi from "@/lib/learning-api";
import type {
  LessonMetadata,
  PlaybackAuthorization,
  LessonSegment,
} from "@/lib/learning-api";
import {
  createPlayerAdapter,
  type PlayerAdapterFactory,
} from "@/lib/player-adapter";
import {
  LessonController,
  type LessonApi,
  type LessonView,
} from "@/lib/lesson-controller";
import styles from "./lesson-player.module.css";
const time = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
type Props = {
  lesson: LessonMetadata;
  authorization: PlaybackAuthorization;
  factory?: PlayerAdapterFactory;
  api?: LessonApi;
  onUnauthorized: () => void;
  onRetry?: () => void;
};
export default function LessonPlayer({
  lesson,
  authorization,
  factory = createPlayerAdapter,
  api = learningApi,
  onUnauthorized,
  onRetry,
}: Props) {
  const video = useRef<HTMLVideoElement>(null),
    container = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDivElement>(null),
    play = useRef<HTMLButtonElement>(null);
  const controller = useRef<LessonController | null>(null);
  const [view, setView] = useState<LessonView | null>(null);
  const [expanded, setExpanded] = useState(false),
    [preview, setPreview] = useState<LessonSegment | null>(null);
  useEffect(() => {
    const element = video.current!;
    const instance = new LessonController(
      lesson,
      authorization,
      factory(element),
      api,
      setView,
      onUnauthorized,
    );
    controller.current = instance;
    void instance.start();
    const exitNative = () => {
      instance.pause();
      (
        element as HTMLVideoElement & { webkitExitFullscreen?: () => void }
      ).webkitExitFullscreen?.();
      setExpanded(true);
    };
    element.addEventListener("webkitbeginfullscreen", exitNative);
    return () => {
      element.removeEventListener("webkitbeginfullscreen", exitNative);
      instance.destroy();
      controller.current = null;
    };
  }, [lesson, authorization, factory, api, onUnauthorized]);
  const prompt = view?.prompt;
  useEffect(() => {
    if (prompt) {
      dialog.current
        ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
        ?.focus();
    }
  }, [prompt, view?.correct, view?.busy]);
  async function fullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setExpanded(false);
    } else if (expanded) setExpanded(false);
    else if (container.current?.requestFullscreen) {
      try {
        await container.current.requestFullscreen();
        setExpanded(true);
      } catch {
        setExpanded(true);
      }
    } else setExpanded(true);
  }
  useEffect(() => {
    const changed = () => {
      if (!document.fullscreenElement) setExpanded(false);
    };
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (
      (event.target as HTMLElement).closest(
        "button,input,a,textarea,select,[contenteditable=true],[role=dialog]",
      ) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const key = event.key.toLowerCase(),
      c = controller.current,
      s = view?.snapshot;
    if (!c || !s) return;
    if ([" ", "k", "m", "c", "f", "arrowleft", "arrowright"].includes(key))
      event.preventDefault();
    if (key === " " || key === "k") void c.togglePlay();
    if (key === "m") c.setMuted(!s.muted);
    if (key === "c") c.setCaptions(!s.captionsEnabled);
    if (key === "f") void fullscreen();
    if (key === "arrowleft") c.seek(s.position - 5);
    if (key === "arrowright") c.seek(s.position + 5);
  }
  const s = view?.snapshot,
    position = s?.position ?? authorization.resume_position_seconds;
  const active =
    lesson.segments.find(
      (segment) =>
        position >= segment.start_seconds && position < segment.end_seconds,
    ) ?? lesson.segments.at(-1);
  return (
    <div
      ref={container}
      className={`${styles.workspace} ${expanded ? styles.expanded : ""}`}
    >
      <div
        className={styles.player}
        role="region"
        aria-label="Lesson video"
        tabIndex={0}
        onKeyDown={keyboard}
      >
        <header className={styles.brand}>
          <span>ChartCoach</span>
          <span>LESSON ROOM · ENGLISH</span>
        </header>
        <div className={styles.screen}>
          <video
            ref={video}
            aria-label="Lesson media"
            playsInline
            preload="metadata"
            controls={false}
          />
          {(!view?.ready || s?.buffering) && (
            <p className={styles.loading} role="status">
              {s?.buffering ? "Buffering…" : "Preparing secure playback…"}
            </p>
          )}
        </div>
        <div className={styles.controls} inert={Boolean(prompt)}>
          <div className={styles.timeline}>
            <input
              type="range"
              aria-label="Playback position"
              min={0}
              max={lesson.duration_seconds}
              step={0.1}
              value={position}
              onChange={(e) => controller.current?.seek(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, #56cbb1 ${(position / lesson.duration_seconds) * 100}%, #344152 0)`,
              }}
            />
            <div className={styles.markers}>
              {lesson.segments.map((segment) => (
                <button
                  key={segment.id}
                  type="button"
                  aria-label={`Preview ${segment.title}`}
                  aria-current={active?.id === segment.id ? "true" : undefined}
                  style={{
                    left: `${(segment.start_seconds / lesson.duration_seconds) * 100}%`,
                  }}
                  onMouseEnter={() => setPreview(segment)}
                  onMouseLeave={() => setPreview(null)}
                  onFocus={() => setPreview(segment)}
                  onBlur={() => setPreview(null)}
                  onClick={() =>
                    controller.current?.seek(segment.start_seconds)
                  }
                >
                  │
                </button>
              ))}
              {lesson.segments
                .filter(
                  (segment) =>
                    segment.required_prompt &&
                    !view?.progress.passed_prompt_ids.includes(
                      segment.required_prompt.id,
                    ),
                )
                .map((segment) => (
                  <span
                    key={segment.id}
                    className={styles.promptMarker}
                    style={{
                      left: `${(segment.end_seconds / lesson.duration_seconds) * 100}%`,
                    }}
                    title="Required knowledge check"
                    aria-label="Required knowledge check"
                  >
                    ◆
                  </span>
                ))}
            </div>
            {preview && (
              <div role="tooltip" className={styles.preview}>
                <Image
                  unoptimized
                  width={160}
                  height={90}
                  src={preview.thumbnail.url}
                  alt={`${preview.title} preview`}
                />
                <div>
                  <small>{time(preview.thumbnail.time_seconds)}</small>
                  <strong>{preview.title}</strong>
                  <p>{preview.description}</p>
                </div>
              </div>
            )}
          </div>
          <div className={styles.buttons}>
            <button
              ref={play}
              type="button"
              disabled={!view?.ready}
              onClick={() => void controller.current?.togglePlay()}
              aria-label={s?.paused !== false ? "Play" : "Pause"}
            >
              {s?.paused !== false ? "▶ Play" : "Ⅱ Pause"}
            </button>
            <button
              type="button"
              aria-label={s?.muted ? "Unmute" : "Mute"}
              onClick={() => controller.current?.setMuted(!s?.muted)}
            >
              {s?.muted ? "Unmute" : "Mute"}
            </button>
            <input
              type="range"
              aria-label="Volume"
              min={0}
              max={1}
              step={0.05}
              value={s?.volume ?? 1}
              onChange={(e) =>
                controller.current?.setVolume(Number(e.target.value))
              }
            />
            <span className={styles.clock}>
              {time(position)} / {time(lesson.duration_seconds)}
            </span>
            <button
              type="button"
              aria-label="English captions"
              aria-pressed={s?.captionsEnabled ?? false}
              disabled={!s?.captionsAvailable}
              onClick={() =>
                controller.current?.setCaptions(!s?.captionsEnabled)
              }
            >
              CC
            </button>
            <button
              type="button"
              aria-label={expanded ? "Exit expanded view" : "Expand player"}
              onClick={() => void fullscreen()}
            >
              {expanded ? "Exit expanded view" : "Expand player"}
            </button>
          </div>
          <p className={styles.hint}>
            Space / K play · ← → seek 5s · M mute · C captions · F expand
          </p>
        </div>
        {view?.error && !prompt && (
          <div role="alert" className={styles.error}>
            {view.error}{" "}
            <button type="button" onClick={onRetry}>
              Retry playback
            </button>
          </div>
        )}
      </div>
      <aside
        className={styles.chapters}
        aria-label="Lesson chapters"
        inert={Boolean(prompt)}
      >
        <p className={styles.eyebrow}>YOUR LEARNING PATH</p>
        <h2>In this lesson</h2>
        <ol>
          {lesson.segments.map((segment, index) => (
            <li key={segment.id}>
              <button
                type="button"
                aria-label={`Chapter ${index + 1}: ${segment.title}`}
                aria-current={active?.id === segment.id ? "true" : undefined}
                onClick={() => controller.current?.seek(segment.start_seconds)}
              >
                <Image
                  unoptimized
                  width={96}
                  height={54}
                  src={segment.thumbnail.url}
                  alt=""
                />
                <span>
                  <small>
                    {String(index + 1).padStart(2, "0")} ·{" "}
                    {time(segment.start_seconds)}
                  </small>
                  <strong>{segment.title}</strong>
                  <span>{segment.description}</span>
                  {segment.required_prompt && (
                    <small>
                      Knowledge check{" "}
                      {view?.progress.passed_prompt_ids.includes(
                        segment.required_prompt.id,
                      )
                        ? "✓"
                        : "◆"}
                    </small>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className={styles.progress} aria-live="polite">
          {view?.progress.completed
            ? "Lesson complete"
            : `${Math.round(view?.progress.watch_percent ?? 0)}% watched · Progress saved as you learn`}
        </p>
      </aside>
      {prompt && (
        <div className={styles.dialogShade}>
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="check-title"
            className={styles.dialog}
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const buttons = Array.from(
                dialog.current?.querySelectorAll<HTMLButtonElement>(
                  "button:not(:disabled)",
                ) ?? [],
              );
              const first = buttons[0],
                last = buttons.at(-1);
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
          >
            <p className={styles.eyebrow}>PAUSE & REFLECT</p>
            <h2 id="check-title">{prompt.question}</h2>
            <p>Answer this check to continue your lesson.</p>
            {view.error && (
              <div role="alert">
                <p>{view.error}</p>
                <button type="button" onClick={onRetry}>
                  Retry playback
                </button>
              </div>
            )}
            <div className={styles.options}>
              {prompt.options.map((option) => (
                <button
                  type="button"
                  disabled={view.busy || view.correct}
                  key={option.id}
                  onClick={() => void controller.current?.answer(option.id)}
                >
                  {option.text}
                </button>
              ))}
            </div>
            {view.feedback && (
              <p role="status" className={styles.feedback}>
                {view.feedback}
              </p>
            )}
            {view.correct && (
              <button
                type="button"
                onClick={() => {
                  void controller.current?.continue();
                  play.current?.focus();
                }}
              >
                Continue lesson
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
