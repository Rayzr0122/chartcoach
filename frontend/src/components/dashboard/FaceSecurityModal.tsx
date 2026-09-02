"use client";

import { useState } from "react";
import { User, enrollFace, removeFace, ApiError } from "@/lib/api";
import FaceCapture from "@/components/FaceCapture";

type FaceSecurityModalProps = {
  user: User;
  onClose: () => void;
  onRefreshUser: () => Promise<void>;
};

export default function FaceSecurityModal({ user, onClose, onRefreshUser }: FaceSecurityModalProps) {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleCapture(samples: string[][]) {
    setIsSubmitting(true);
    setEnrollError(null);
    try {
      const photos = samples.map((s) => s[0]);
      await enrollFace(photos);
      await onRefreshUser();
      setIsEnrolling(false);
      setSuccessMessage("Face ID enrolled successfully! You can now unlock your account instantly with your face.");
    } catch (error) {
      setEnrollError(error instanceof ApiError ? error.message : "Could not complete face enrollment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveFace() {
    setIsSubmitting(true);
    try {
      await removeFace();
      await onRefreshUser();
      setSuccessMessage("Face biometric data removed from this account.");
    } catch {
      setEnrollError("Failed to remove face data. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-spring-pop">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                <circle cx="9" cy="10" r="1" fill="currentColor" />
                <circle cx="15" cy="10" r="1" fill="currentColor" />
                <path d="M9.5 15a4 4 0 0 0 5 0" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Biometric Face Security</h3>
              <p className="text-xs text-slate-400">Institutional-grade instant facial verification</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Success Banner */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 animate-fadeIn">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Current Status Card */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <div>
              <p className="text-xs font-bold text-slate-800">Face ID Login Status</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {user.has_face_enrolled
                  ? "Enrolled & active on this profile"
                  : "Not set up yet. Enroll to enable instant login"}
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                user.has_face_enrolled
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {user.has_face_enrolled ? "Active" : "Disabled"}
            </span>
          </div>

          {/* Enrolled Actions vs Setup Face ID */}
          {user.has_face_enrolled ? (
            <div className="space-y-4">
              <div className="bg-slate-50/60 border border-slate-200/60 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed">
                <p className="font-semibold text-slate-800 mb-1">How Face ID Works on ChartCoach:</p>
                <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-500">
                  <li>Your face vector is encrypted into a 512-dimensional embedding matrix.</li>
                  <li>Real photos are never stored; only one-way mathematical hashes are kept.</li>
                  <li>Enables seamless, passwordless login on all your trusted devices.</li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleRemoveFace}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                >
                  {isSubmitting ? "Removing…" : "Remove Face Data"}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="chartcoach-btn-primary !w-auto !py-2 !px-5 text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          ) : isEnrolling ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs text-slate-500 text-center max-w-sm leading-relaxed">
                Take 3 clear photos to register multiple facial angles for maximum recognition accuracy.
              </p>
              <FaceCapture
                onCapture={handleCapture}
                isBusy={isSubmitting}
                sampleCount={3}
                requireBlink={false}
                errorMessage={enrollError}
                onClearError={() => setEnrollError(null)}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-xs text-slate-700 leading-relaxed">
                <p className="font-bold text-blue-900 mb-1">Why set up Face ID?</p>
                <p className="text-[11px] text-slate-600">
                  Unlock your courses and live trading simulator in sub-seconds without typing passwords every session.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEnrolling(true)}
                className="chartcoach-btn-primary !py-3 text-xs font-semibold"
              >
                <span>Set Up Face ID Now</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
