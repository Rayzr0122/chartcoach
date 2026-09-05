"use client";

// This hook keeps the camera running quietly in the background after login,
// and checks every few seconds that the same person is still there.
//
// Optimizations applied:
// - Uses captureMonitorFrame() (320×240 WebP) instead of full-res JPEG
// - Skips sending frame if pixel difference from last frame is negligible
//   (user hasn't moved = no need to re-verify, saves bandwidth + server CPU)

import { useEffect, useRef, useState } from "react";
import { startCamera, stopCamera, captureMonitorFrame } from "@/lib/camera";
import { getMonitorSocketUrl } from "@/lib/api";

const CHECK_INTERVAL_MS = 4000;

// Minimum % of pixels that must change before we bother sending a new frame.
// Prevents redundant verification when user is sitting still.
const MOTION_THRESHOLD = 0.02;

export type MonitorStatus = "connecting" | "active" | "paused" | "error";

type MonitorState = {
  status: MonitorStatus;
  reason: string | null;
  // The live camera stream, so the UI can show a small preview if it wants to
  stream: MediaStream | null;
  // Updated every time a check comes back "you're still you" — the UI can
  // watch this to flash a brief success message
  lastConfirmedAt: number | null;
};

const REASON_MESSAGES: Record<string, string> = {
  no_face: "We can't see your face. Please face the camera.",
  multiple_faces: "More than one person is visible. Please continue alone.",
  face_mismatch: "This doesn't look like the enrolled user.",
  spoof_detected: "Please use your real face, not a photo or screen.",
};

// Simple pixel-level motion detection using a small sample of the frame
function hasSignificantMotion(
  video: HTMLVideoElement,
  lastPixels: Uint8ClampedArray | null
): { moved: boolean; pixels: Uint8ClampedArray | null } {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return { moved: true, pixels: null };
  }

  // Sample at a very small resolution for speed
  const w = 32;
  const h = 24;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { moved: true, pixels: null };

  ctx.drawImage(video, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  if (!lastPixels) {
    return { moved: true, pixels: data };
  }

  // Count pixels that changed significantly
  let changedPixels = 0;
  const totalPixels = w * h;
  for (let i = 0; i < data.length; i += 4) {
    const diff =
      Math.abs(data[i] - lastPixels[i]) +
      Math.abs(data[i + 1] - lastPixels[i + 1]) +
      Math.abs(data[i + 2] - lastPixels[i + 2]);
    if (diff > 60) changedPixels++;
  }

  const motionRatio = changedPixels / totalPixels;
  return { moved: motionRatio > MOTION_THRESHOLD, pixels: data };
}

export function useFaceMonitor(enabled: boolean): MonitorState {
  const [state, setState] = useState<MonitorState>({
    status: "connecting",
    reason: null,
    stream: null,
    lastConfirmedAt: null,
  });

  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPixelsRef = useRef<Uint8ClampedArray | null>(null);
  // Force-send at least every 3rd cycle even without motion (keep-alive)
  const skipCountRef = useRef(0);
  const MAX_SKIPS = 3;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function setup() {
      try {
        const stream = await startCamera();
        if (cancelled) {
          stopCamera(stream);
          return;
        }
        streamRef.current = stream;
        setState((prev) => ({ ...prev, stream }));

        // This second, hidden video element is what we actually grab frames
        // from — the visible preview the UI shows uses the same stream directly.
        const video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        videoRef.current = video;

        const socket = new WebSocket(getMonitorSocketUrl());
        socketRef.current = socket;

        socket.onopen = () => {
          intervalRef.current = setInterval(() => {
            if (!videoRef.current || socket.readyState !== WebSocket.OPEN) return;

            // Check for motion before capturing a full frame
            const { moved, pixels } = hasSignificantMotion(
              videoRef.current,
              lastPixelsRef.current
            );
            lastPixelsRef.current = pixels;

            if (!moved && skipCountRef.current < MAX_SKIPS) {
              // No meaningful change — skip this cycle to save bandwidth + server CPU
              skipCountRef.current++;
              return;
            }

            skipCountRef.current = 0;

            // Use optimized monitor frame (320×240, WebP @ q=0.6)
            const frame = captureMonitorFrame(videoRef.current);
            if (frame) {
              socket.send(JSON.stringify({ image_base64: frame }));
            }
          }, CHECK_INTERVAL_MS);
        };

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          const status: MonitorStatus = data.status === "paused" ? "paused" : "active";
          const reason = status === "paused" ? REASON_MESSAGES[data.reason] ?? "Identity check failed." : null;
          setState((prev) => ({
            ...prev,
            status,
            reason,
            lastConfirmedAt: status === "active" ? Date.now() : prev.lastConfirmedAt,
          }));
        };

        socket.onerror = () => {
          setState((prev) => ({ ...prev, status: "error", reason: "Lost connection to the monitoring service." }));
        };

        socket.onclose = () => {
          if (intervalRef.current) clearInterval(intervalRef.current);
        };
      } catch {
        setState((prev) => ({ ...prev, status: "error", reason: "Could not access the camera for monitoring." }));
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      socketRef.current?.close();
      stopCamera(streamRef.current);
      setState((prev) => ({ ...prev, stream: null }));
    };
  }, [enabled]);

  return state;
}
