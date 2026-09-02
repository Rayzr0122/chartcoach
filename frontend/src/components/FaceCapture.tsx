"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { startCamera, stopCamera, captureFrame, getFrameBrightness } from "@/lib/camera";

type FaceCaptureProps = {
  onCapture: (samples: string[][]) => void;
  isBusy?: boolean;
  sampleCount?: number;
  requireBlink?: boolean;
  errorMessage?: string | null;
  onClearError?: () => void;
};

const BURST_DURATION_MS = 800;
const BURST_STEP_MS = 100;
const LOW_LIGHT_THRESHOLD = 45;
const HIGH_LIGHT_THRESHOLD = 225;
const BRIGHTNESS_CHECK_INTERVAL_MS = 400;

export default function FaceCapture({
  onCapture,
  isBusy = false,
  sampleCount = 1,
  requireBlink = true,
  errorMessage = null,
  onClearError,
}: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [lightingStatus, setLightingStatus] = useState<"low" | "high" | "optimal">("optimal");
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedSamples, setCapturedSamples] = useState<string[][]>([]);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Auto-expiring error animation state (resets back after 3s)
  const [showErrorAnimation, setShowErrorAnimation] = useState(false);
  const [displayedError, setDisplayedError] = useState<string | null>(null);

  useEffect(() => {
    const err = errorMessage || captureError;
    if (err) {
      setShowErrorAnimation(true);
      setDisplayedError(err);
      const timer = setTimeout(() => {
        setShowErrorAnimation(false);
        setCaptureError(null);
        if (onClearError) onClearError();
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowErrorAnimation(false);
      setDisplayedError(null);
    }
  }, [errorMessage, captureError, onClearError]);

  // Attach stream to video element whenever both are ready
  const attachStreamToVideo = useCallback((stream: MediaStream) => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current
        .play()
        .then(() => setIsCameraActive(true))
        .catch(() => {
          setIsCameraActive(true);
        });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    startCamera()
      .then((stream) => {
        if (cancelled) {
          stopCamera(stream);
          return;
        }
        streamRef.current = stream;
        attachStreamToVideo(stream);
      })
      .catch((err) => {
        console.error("Camera error:", err);
        setCameraError("Camera access permission was denied or unavailable.");
      });

    return () => {
      cancelled = true;
      stopCamera(streamRef.current);
      streamRef.current = null;
      setIsCameraActive(false);
    };
  }, [attachStreamToVideo]);

  // Real-time continuous lighting intelligence
  useEffect(() => {
    if (!isCameraActive || cameraError) return;
    const interval = setInterval(() => {
      if (!videoRef.current || videoRef.current.videoWidth === 0) return;
      const brightness = getFrameBrightness(videoRef.current);
      if (brightness !== null) {
        if (brightness < LOW_LIGHT_THRESHOLD) {
          setLightingStatus("low");
        } else if (brightness > HIGH_LIGHT_THRESHOLD) {
          setLightingStatus("high");
        } else {
          setLightingStatus("optimal");
        }
      }
    }, BRIGHTNESS_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isCameraActive, cameraError]);

  const capturedSamplesRef = useRef<string[][]>([]);

  async function handleCapture() {
    setCaptureError(null);
    setShowErrorAnimation(false);
    if (onClearError) onClearError();

    const video = videoRef.current;
    if (!video || isCapturing || isBusy) return;

    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
      setCaptureError("Camera is warming up. Please wait a second and try again.");
      return;
    }

    let frames: string[] = [];

    if (requireBlink) {
      setIsCapturing(true);
      const totalSteps = Math.round(BURST_DURATION_MS / BURST_STEP_MS);
      for (let i = 0; i < totalSteps; i++) {
        const frame = captureFrame(video);
        if (frame) {
          frames.push(frame);
        }
        await new Promise((r) => setTimeout(r, BURST_STEP_MS));
      }
      setIsCapturing(false);
    } else {
      const frame = captureFrame(video);
      if (frame) frames.push(frame);
    }

    const minRequired = requireBlink ? 3 : 1;
    if (frames.length < minRequired) {
      setCaptureError("Unable to capture video stream. Please ensure your camera is visible and try again.");
      return;
    }

    const updated = [...capturedSamplesRef.current, frames];
    capturedSamplesRef.current = updated;
    setCapturedSamples(updated);

    if (updated.length >= sampleCount) {
      capturedSamplesRef.current = [];
      setCapturedSamples([]);
      onCapture(updated);
    }
  }

  const isScanning = isCapturing || isBusy;
  const currentSampleNumber = Math.min(capturedSamples.length + 1, sampleCount);

  // Generate 48 circular tick marks for the biometric ring
  const ticks = Array.from({ length: 48 });

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* ─── Circular Biometric Viewport ─── */}
      <div className="relative flex items-center justify-center p-3">
        {/* Outer Glowing Gradient Ring (Red on error, Blue/Green when normal) */}
        <div
          className={`absolute inset-0 rounded-full p-[2.5px] pointer-events-none transition-all duration-500 ${
            showErrorAnimation && !isScanning
              ? "scale-105 shadow-[0_0_35px_rgba(239,68,68,0.5)] animate-shake"
              : isScanning
              ? "scale-105 shadow-[0_0_30px_rgba(13,110,253,0.35)]"
              : "animate-ambient-ring"
          }`}
          style={{
            background:
              showErrorAnimation && !isScanning
                ? "linear-gradient(135deg, #f43f5e 0%, #ef4444 50%, #dc2626 100%)"
                : "linear-gradient(135deg, #0d6efd 0%, #06b6d4 50%, #10b981 100%)",
          }}
        >
          <div className="w-full h-full rounded-full bg-white" />
        </div>

        {/* Circular Camera Viewport Container */}
        <div
          className={`biometric-circular-frame ${
            showErrorAnimation && !isScanning ? "has-error animate-shake" : isScanning ? "scanning" : ""
          } relative w-[275px] h-[275px] sm:w-[290px] sm:h-[290px] rounded-full overflow-hidden flex items-center justify-center`}
        >
          {/* Video Element is ALWAYS mounted so srcObject is never lost */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => {
              if (videoRef.current) {
                videoRef.current.play().catch(() => {});
                setIsCameraActive(true);
              }
            }}
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              isCameraActive && !cameraError ? "opacity-100 scale-105" : "opacity-0"
            }`}
            style={{ transform: "scaleX(-1)" }}
          />

          {/* Camera Permission / Error Overlay */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-xs text-slate-300 gap-2.5 bg-slate-950 z-30">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="leading-relaxed">{cameraError}</p>
            </div>
          )}

          {/* Camera Initializing Placeholder */}
          {!isCameraActive && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 p-6 bg-slate-950 z-20">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 animate-pulse">
                <svg
                  className="w-9 h-9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" />
                  <circle cx="15" cy="10" r="1" fill="currentColor" />
                  <path d="M9.5 15a4 4 0 0 0 5 0" />
                </svg>
              </div>
              <span className="text-[11px] font-medium text-slate-400 tracking-wide">Starting camera…</span>
            </div>
          )}

          {/* Active Camera Biometric HUD Overlays */}
          {isCameraActive && !cameraError && (
            <>
              {/* Radial Ticks / Dots Ring */}
              <div className={`absolute inset-3 pointer-events-none z-15 ${isScanning ? "animate-tick-spin" : ""}`}>
                <svg className="w-full h-full" viewBox="0 0 200 200">
                  {ticks.map((_, i) => {
                    const angle = (i * 360) / ticks.length;
                    const rad = (angle * Math.PI) / 180;
                    const r1 = 88;
                    const r2 = 93;
                    const x1 = 100 + r1 * Math.cos(rad);
                    const y1 = 100 + r1 * Math.sin(rad);
                    const x2 = 100 + r2 * Math.cos(rad);
                    const y2 = 100 + r2 * Math.sin(rad);
                    const isLeft = x1 < 100;
                    const tickStroke =
                      showErrorAnimation && !isScanning ? "#ef4444" : isLeft ? "#0d6efd" : "#10b981";
                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={tickStroke}
                        strokeWidth="1.2"
                        strokeOpacity={i % 2 === 0 ? "0.6" : "0.25"}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </svg>
              </div>

              {/* 4 Biometric Corner Target Brackets (Turns Red on error) */}
              <div className={`bio-target-bracket tl ${showErrorAnimation && !isScanning ? "error-bracket" : ""}`} />
              <div className={`bio-target-bracket bl ${showErrorAnimation && !isScanning ? "error-bracket" : ""}`} />
              <div className={`bio-target-bracket tr ${showErrorAnimation && !isScanning ? "error-bracket" : ""}`} />
              <div className={`bio-target-bracket br ${showErrorAnimation && !isScanning ? "error-bracket" : ""}`} />

              {/* Smooth Bottom Vignette Fade */}
              <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                  background: "radial-gradient(circle at 50% 30%, transparent 60%, rgba(10, 15, 30, 0.6) 100%)",
                }}
              />

              {/* ─── Apple-Grade Red Error Cross & Fade-in Blur Overlay ─── */}
              {showErrorAnimation && !isScanning && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[3px] transition-all duration-300 animate-fadeIn">
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.7)] animate-spring-pop">
                    <svg
                      className="w-8 h-8 text-rose-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.75}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-semibold text-rose-200 mt-2 tracking-wide drop-shadow">
                    Recognition Failed
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Floating Dynamic Island Status Badge ─── */}
      <div className="w-full max-w-[340px] flex justify-center">
        <div
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full border backdrop-blur-md shadow-md transition-all duration-300 ${
            showErrorAnimation && !isScanning
              ? "bg-rose-50/95 border-rose-200 text-rose-800 shadow-rose-500/10 animate-shake"
              : lightingStatus === "low" && !isScanning
              ? "bg-amber-50/95 border-amber-200 text-amber-900"
              : lightingStatus === "high" && !isScanning
              ? "bg-amber-50/95 border-amber-200 text-amber-900"
              : isScanning
              ? "bg-blue-50/95 border-blue-200 text-blue-900 shadow-blue-500/10"
              : "bg-white/95 border-slate-200 text-slate-700"
          }`}
        >
          {/* Icon */}
          {isBusy ? (
            <svg className="w-4 h-4 animate-spin text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : isCapturing ? (
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping shrink-0" />
          ) : showErrorAnimation ? (
            <svg className="w-4 h-4 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : lightingStatus === "low" ? (
            <svg className="w-4 h-4 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : lightingStatus === "high" ? (
            <svg className="w-4 h-4 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-blue-600 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
              <circle cx="9" cy="10" r="1" fill="currentColor" />
              <circle cx="15" cy="10" r="1" fill="currentColor" />
              <path d="M9.5 15a4 4 0 0 0 5 0" />
            </svg>
          )}

          {/* Real-time Status Text */}
          <span className="text-xs font-semibold tracking-tight text-center">
            {isBusy
              ? "Authenticating biometrics…"
              : isCapturing
              ? "Scanning… Please hold still and blink"
              : showErrorAnimation && displayedError
              ? displayedError
              : lightingStatus === "low"
              ? "Lighting is low — please face a light source"
              : lightingStatus === "high"
              ? "Glare detected — please adjust angle"
              : "Position face inside circle"}
          </span>
        </div>
      </div>

      {/* Multi-sample progress dots */}
      {sampleCount > 1 && !isScanning && (
        <div className="flex gap-2 mt-1">
          {Array.from({ length: sampleCount }).map((_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i < capturedSamples.length ? "bg-emerald-500 scale-110" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      )}

      {/* Action Trigger Button */}
      {!cameraError && (
        <div className="flex flex-col items-center gap-1.5 w-full max-w-[290px] mt-1">
          <button
            type="button"
            onClick={handleCapture}
            disabled={isScanning || !isCameraActive}
            className="chartcoach-btn-primary !py-2.5 !rounded-xl text-sm shadow-md"
          >
            {isBusy ? (
              <span>Authenticating…</span>
            ) : isCapturing ? (
              <span>Scanning…</span>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" />
                  <circle cx="15" cy="10" r="1" fill="currentColor" />
                  <path d="M9.5 15a4 4 0 0 0 5 0" />
                </svg>
                <span>
                  {sampleCount > 1 ? `Scan Face (${currentSampleNumber}/${sampleCount})` : "Start Face Scan"}
                </span>
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-400 text-center font-medium">
            {requireBlink ? "Click start scan and blink naturally" : "Click to capture clear frame"}
          </p>
        </div>
      )}
    </div>
  );
}
