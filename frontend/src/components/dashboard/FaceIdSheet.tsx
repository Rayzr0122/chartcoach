"use client";

import { useState, useEffect, useCallback } from "react";
import { User, enrollFace, removeFace, ApiError } from "@/lib/api";
import FaceCapture from "@/components/FaceCapture";

type FaceIdSheetProps = {
  user: User;
  onClose: () => void;
  onRefreshUser: () => Promise<void>;
};

type SheetView = "status" | "scanning" | "success";

export default function FaceIdSheet({ user, onClose, onRefreshUser }: FaceIdSheetProps) {
  const [view, setView] = useState<SheetView>("status");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleCapture = useCallback(
    async (samples: string[][]) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const photos = samples.map((s) => s[0]);
        await enrollFace(photos);
        setEnrollSuccess(true);
        await new Promise((r) => setTimeout(r, 900));
        await onRefreshUser();
        setView("success");
      } catch (err) {
        setEnrollSuccess(false);
        setError(err instanceof ApiError ? err.message : "Could not complete face enrollment. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [onRefreshUser]
  );

  async function handleRemoveFace() {
    setIsSubmitting(true);
    setError(null);
    try {
      await removeFace();
      await onRefreshUser();
      setSuccessMessage("Face data removed from this account.");
    } catch {
      setError("Failed to remove face data. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* Overlay -- click to dismiss */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-overlay-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed top-4 left-1/2 z-50 w-full max-w-md animate-sheet-enter">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">

          {/* ─── Header ─── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                  <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" />
                  <circle cx="15" cy="10" r="1" fill="currentColor" />
                  <path d="M9.5 15a4 4 0 0 0 5 0" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Face ID</h3>
                <p className="text-[11px] text-slate-500">Biometric authentication</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* ─── Body ─── */}
          <div className="px-5 py-5 space-y-4">

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 animate-fade-up">
                <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Success banner */}
            {successMessage && (
              <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 animate-fade-up">
                <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{successMessage}</span>
              </div>
            )}

            {/* ─── Status View ─── */}
            {view === "status" && (
              <div className="space-y-4 animate-fade-up">
                {/* Status badge */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    {user.has_face_enrolled ? (
                      <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    )}
                    <span className="text-xs font-medium text-slate-700">
                      {user.has_face_enrolled ? "Enrolled and active" : "Not configured"}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      user.has_face_enrolled
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {user.has_face_enrolled ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Feature list */}
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      512-dimensional encrypted vector. No photos are stored.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Sub-second passwordless authentication.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Continuous session monitoring when active.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
                  {user.has_face_enrolled ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { setView("scanning"); setError(null); setSuccessMessage(null); }}
                        className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Re-enroll
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleRemoveFace}
                        className="py-2.5 px-4 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? "Removing..." : "Remove"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setView("scanning"); setError(null); setSuccessMessage(null); }}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm cursor-pointer"
                    >
                      Set Up Face ID
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ─── Scanning View ─── */}
            {view === "scanning" && (
              <div className="flex flex-col items-center gap-3 animate-fade-up">
                <p className="text-xs text-slate-500 text-center max-w-xs leading-relaxed">
                  Capture 3 reference angles for maximum recognition accuracy.
                </p>
                <FaceCapture
                  onCapture={handleCapture}
                  isBusy={isSubmitting}
                  isSuccess={enrollSuccess}
                  successMessage="All Angles Enrolled ✓"
                  sampleCount={3}
                  requireBlink={false}
                  errorMessage={error}
                  onClearError={() => setError(null)}
                />
                <button
                  type="button"
                  onClick={() => setView("status")}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer pt-1"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span>Back</span>
                </button>
              </div>
            )}

            {/* ─── Success View ─── */}
            {view === "success" && (
              <div className="flex flex-col items-center text-center gap-3 py-4 animate-fade-up">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-slate-900">Face ID Configured</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">
                  Your biometric vector is encrypted and linked to your profile. You can now use Face ID to sign in.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer mt-1"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
