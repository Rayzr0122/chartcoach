"use client";

// This hook keeps the camera running quietly in the background after login,
// and checks every few seconds that the same person is still there.

import { useEffect, useRef, useState } from "react";
import { startCamera, stopCamera, captureFrame } from "@/lib/camera";
import { getMonitorSocketUrl } from "@/lib/api";

const CHECK_INTERVAL_MS = 4000;

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
            const frame = captureFrame(videoRef.current);
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
