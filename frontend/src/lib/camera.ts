// This file has small helper functions for using the browser webcam.
//
// Performance optimizations:
// - Monitor frames captured at 320×240 (not full webcam resolution)
// - WebP @ quality 0.6 for ~4x smaller payloads vs default JPEG
// - Reusable canvas to avoid per-frame DOM allocation

// Turns on the camera and returns the raw video stream
export async function startCamera(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { width: 480, height: 360, facingMode: "user" },
    audio: false,
  });
}

// Turns the camera off
export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

// ── Reusable canvases (avoid creating new DOM elements every frame) ──

let _captureCanvas: HTMLCanvasElement | null = null;
let _monitorCanvas: HTMLCanvasElement | null = null;

function getCaptureCanvas(): HTMLCanvasElement {
  if (!_captureCanvas) {
    _captureCanvas = document.createElement("canvas");
  }
  return _captureCanvas;
}

function getMonitorCanvas(): HTMLCanvasElement {
  if (!_monitorCanvas) {
    _monitorCanvas = document.createElement("canvas");
  }
  return _monitorCanvas;
}

// Takes a snapshot of the current video frame and returns it as base64 JPEG text.
// This is what gets sent to the backend for face recognition.
export function captureFrame(video: HTMLVideoElement): string | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;

  const canvas = getCaptureCanvas();
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // "image/jpeg" keeps the file small, which matters since we send this often
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return dataUrl.split(",")[1]; // strip the "data:image/jpeg;base64," prefix
}

// Captures a downscaled, WebP-encoded frame optimized for monitoring.
// 320×240 @ WebP q=0.6 is ~5-10KB vs ~200KB for full-res JPEG.
// This is specifically for the continuous face monitor, not enrollment.
const MONITOR_WIDTH = 320;
const MONITOR_HEIGHT = 240;

export function captureMonitorFrame(video: HTMLVideoElement): string | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;

  const canvas = getMonitorCanvas();
  canvas.width = MONITOR_WIDTH;
  canvas.height = MONITOR_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) return null;

  // Downscale from webcam resolution to 320×240
  context.drawImage(video, 0, 0, MONITOR_WIDTH, MONITOR_HEIGHT);

  // WebP at quality 0.6 produces much smaller payloads than JPEG at 0.85
  // Browser support for WebP toDataURL is universal in modern browsers
  const dataUrl = canvas.toDataURL("image/webp", 0.6);
  return dataUrl.split(",")[1];
}

// Measures how bright the current video frame is, from 0 (black) to 255 (white).
// This is plain pixel math, no face-detection model needed, so it is cheap
// enough to check every second or so and warn the user if the room is too dark.
export function getFrameBrightness(video: HTMLVideoElement): number | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;

  // A tiny canvas is enough to estimate overall brightness and keeps this fast
  const sampleWidth = 32;
  const sampleHeight = 24;

  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(video, 0, 0, sampleWidth, sampleHeight);
  const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);

  let total = 0;
  const pixelCount = sampleWidth * sampleHeight;
  for (let i = 0; i < data.length; i += 4) {
    // Standard formula for how bright a pixel looks to the human eye
    total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  return total / pixelCount;
}
