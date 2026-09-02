"use client";

import { useState } from "react";
import { User, enrollFace, ApiError } from "@/lib/api";
import FaceCapture from "@/components/FaceCapture";

type FaceOnboardingWizardProps = {
  user: User;
  onRefreshUser: () => Promise<void>;
  onDismiss: () => void;
};

export default function FaceOnboardingWizard({ user, onRefreshUser, onDismiss }: FaceOnboardingWizardProps) {
  const [step, setStep] = useState<"intro" | "scan" | "success">("intro");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCapture(samples: string[][]) {
    setIsSubmitting(true);
    setError(null);
    try {
      const photos = samples.map((s) => s[0]);
      await enrollFace(photos);
      await onRefreshUser();
      setStep("success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Face scan could not be processed. Please try again with good lighting.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-blue-500/30 p-6 sm:p-8 shadow-2xl text-white">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {step === "intro" && (
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-semibold text-blue-300">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Step 1 of 2 • Workstation Security Onboarding</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Set Up Biometric Face ID
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              ChartCoach utilizes hardware-accelerated biometric authentication. Register your face now for instant passwordless sign-ins and continuous background security during live trading simulations.
            </p>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center mb-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h4 className="text-xs font-bold text-white">Instant Sign-In</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Sub-second biometric unlock across all your devices.</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h4 className="text-xs font-bold text-white">Focus Monitor</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Auto-locks workspace when you step away from the screen.</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center mb-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h4 className="text-xs font-bold text-white">512-bit Vector</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Encrypted mathematical vectors; no real photos stored.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setStep("scan")}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" />
                  <circle cx="15" cy="10" r="1" fill="currentColor" />
                  <path d="M9.5 15a4 4 0 0 0 5 0" />
                </svg>
                <span>Start Face ID Enrollment (15s)</span>
              </button>

              <button
                type="button"
                onClick={onDismiss}
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Remind me later
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-center">
            <div className="w-48 h-48 rounded-full border-2 border-dashed border-blue-400/40 flex flex-col items-center justify-center p-4 text-center bg-blue-950/40 backdrop-blur-md">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                  <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" />
                  <circle cx="15" cy="10" r="1" fill="currentColor" />
                  <path d="M9.5 15a4 4 0 0 0 5 0" />
                </svg>
              </div>
              <span className="text-xs font-bold text-white">3 Quick Angles</span>
              <span className="text-[11px] text-slate-400 mt-0.5">Takes under 15 seconds</span>
            </div>
          </div>
        </div>
      )}

      {step === "scan" && (
        <div className="relative z-10 flex flex-col items-center text-center space-y-4 max-w-xl mx-auto py-2">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">Position Your Face in Frame</h3>
            <p className="text-xs text-slate-300">
              Hold still while we capture 3 high-definition reference embeddings.
            </p>
          </div>

          <FaceCapture
            onCapture={handleCapture}
            isBusy={isSubmitting}
            sampleCount={3}
            requireBlink={false}
            errorMessage={error}
            onClearError={() => setError(null)}
          />

          <button
            type="button"
            onClick={() => setStep("intro")}
            className="text-xs text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer pt-2"
          >
            ← Back to Onboarding Overview
          </button>
        </div>
      )}

      {step === "success" && (
        <div className="relative z-10 flex flex-col items-center text-center space-y-4 max-w-md mx-auto py-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h3 className="text-2xl font-bold text-white">Face ID Setup Complete!</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your biometric hash is encrypted and linked to your ChartCoach profile. You can now unlock your workstation instantly and start learning.
          </p>

          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            Enter Dashboard & Masterclasses →
          </button>
        </div>
      )}
    </div>
  );
}
