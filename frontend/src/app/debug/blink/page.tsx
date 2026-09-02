"use client";

// A small diagnostic page: blink at the camera and see the raw eye-openness
// numbers the backend computed for each frame, plus whether it counted as a
// real blink. This exists purely to tune the blink-detection threshold with
// real webcam data — it does not save anything.

import { useState } from "react";
import FaceCapture from "@/components/FaceCapture";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type DebugResult = {
  openness_by_frame: (number | null)[];
  valid_frame_count: number;
  threshold: number;
  blink_confirmed: boolean;
  best_frame_index: number;
  most_open: number | null;
  most_closed: number | null;
  closed_over_open_ratio: number | null;
};

export default function BlinkDebugPage() {
  const [result, setResult] = useState<DebugResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<DebugResult[]>([]);

  async function handleCapture(samples: string[][]) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/face/debug-blink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images_base64: samples[0] }),
      });

      if (!response.ok) {
        setError("Request failed. Check the backend is running.");
        return;
      }

      const data: DebugResult = await response.json();
      setResult(data);
      setHistory((previous) => [data, ...previous].slice(0, 5));
    } catch {
      setError("Could not reach the backend.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center p-6 gap-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">Blink Detection Debug</h1>
        <p className="text-base-content/60 text-sm mt-1">
          Blink normally at the camera. Every blink sends a fresh reading below — no login needed, nothing is saved.
        </p>
      </div>

      <FaceCapture onCapture={handleCapture} isBusy={isLoading} />

      {error && (
        <div role="alert" className="alert alert-error max-w-md text-sm">
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
          <div className="card-body gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Result</span>
              <span className={`badge ${result.blink_confirmed ? "badge-success" : "badge-error"}`}>
                {result.blink_confirmed ? "Blink confirmed" : "No blink detected"}
              </span>
            </div>

            <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-base-content/60">Valid frames</span>
              <span>{result.valid_frame_count}</span>

              <span className="text-base-content/60">Most open</span>
              <span>{result.most_open?.toFixed(3) ?? "—"}</span>

              <span className="text-base-content/60">Most closed</span>
              <span>{result.most_closed?.toFixed(3) ?? "—"}</span>

              <span className="text-base-content/60">Closed / open ratio</span>
              <span>{result.closed_over_open_ratio?.toFixed(3) ?? "—"}</span>

              <span className="text-base-content/60">Threshold (must be under)</span>
              <span>{result.threshold}</span>
            </div>

            <div className="divider my-0" />

            <div>
              <span className="text-sm text-base-content/60">Per-frame openness</span>
              <div className="flex items-end gap-1 h-24 mt-2">
                {result.openness_by_frame.map((value, index) => {
                  const heightPct = value ? Math.min(100, (value / 1.0) * 100) : 4;
                  const isBest = index === result.best_frame_index;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t ${
                          value === null ? "bg-base-300" : isBest ? "bg-success" : "bg-primary/60"
                        }`}
                        style={{ height: `${heightPct}%` }}
                        title={value?.toFixed(3) ?? "no face"}
                      />
                      <span className="text-[10px] text-base-content/40">{index}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {history.length > 1 && (
        <div className="text-xs text-base-content/50 max-w-md">
          Last {history.length} readings —{" "}
          {history.map((h) => (h.blink_confirmed ? "✔" : "✘")).join(" ")}
        </div>
      )}
    </main>
  );
}
