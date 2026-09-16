"use client";

import { Suspense, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { loginUser, faceLogin, ApiError } from "@/lib/api";
import FaceCapture from "@/components/FaceCapture";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useFaceLogin, setUseFaceLogin] = useState(false);
  const [faceStep, setFaceStep] = useState<"email" | "scan">("email");
  const [faceLoginSuccess, setFaceLoginSuccess] = useState(false);
  const [dismissRegistered, setDismissRegistered] = useState(false);
  const [dismissSessionNotice, setDismissSessionNotice] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const justRegistered = searchParams.get("registered") === "1" && !dismissRegistered && !useFaceLogin;
  const noticeParam = searchParams.get("notice");
  const isSessionExpired =
    !dismissSessionNotice &&
    !useFaceLogin &&
    (noticeParam === "session_expired" || searchParams.get("error")?.includes("verify your login"));
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  function triggerError(msg: string) {
    setErrorMessage(msg);
    setShakeKey((k) => k + 1);
  }

  async function handleFaceLogin(samples: string[][]) {
    setErrorMessage(null);
    setDismissSessionNotice(true);
    setIsSubmitting(true);
    try {
      await faceLogin(email.trim(), samples[0]);
      setFaceLoginSuccess(true);
      await new Promise((r) => setTimeout(r, 1100));
      await login();
      router.push("/dashboard");
    } catch (error) {
      setFaceLoginSuccess(false);
      triggerError(error instanceof ApiError ? error.message : "Face not recognized. Please ensure your face is enrolled.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setDismissRegistered(true);
    setDismissSessionNotice(true);
    setIsSubmitting(true);
    try {
      await loginUser(email.trim(), password);
      await login();
      router.push("/dashboard");
    } catch (error) {
      triggerError(error instanceof ApiError ? error.message : "Invalid credentials. Please check your details.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      {/* ─── Header ─── */}
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-[1.75rem] font-bold text-gray-900 tracking-tight">
          Welcome Back
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1 font-normal">
          Welcome Back , Please enter Your details
        </p>
      </div>

      {/* ─── Segmented Tab Switcher (Sign In / Signup) ─── */}
      <div className="tab-switcher mb-6">
        <Link href="/login" className="tab-btn active">
          Sign In
        </Link>
        <Link href="/register" className="tab-btn">
          Signup
        </Link>
      </div>

      {/* ─── Registration Success Alert ─── */}
      {justRegistered && (
        <div className="mb-5 flex items-center justify-between gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-emerald-800 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium">Account created successfully. Please sign in.</span>
          </div>
          <button
            type="button"
            onClick={() => setDismissRegistered(true)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Session Expired / Login Verification Alert ─── */}
      {isSessionExpired && (
        <div className="mb-5 flex items-center justify-between gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-3 text-amber-900 text-xs shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="font-bold text-amber-950">Could not verify your login</p>
              <p className="text-amber-800/90 mt-0.5 font-medium">Please sign in again to access your account.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissSessionNotice(true)}
            className="text-amber-700 hover:text-amber-950 font-bold ml-2 text-sm px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Form Error Alert ─── */}
      {!useFaceLogin && errorMessage && (
        <div
          key={shakeKey}
          className="mb-5 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-rose-700 text-xs shadow-sm animate-shake"
        >
          <svg className="w-4 h-4 text-rose-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {useFaceLogin ? (
        /* ─── Face ID 2-Step View ─── */
        <div className="flex flex-col gap-4">
          {/* Back Navigation */}
          <button
            type="button"
            onClick={() => {
              setUseFaceLogin(false);
              setFaceStep("email");
              setErrorMessage(null);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors self-start mb-1"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Back to password</span>
          </button>

          {/* STEP 1: Ask Email First */}
          {faceStep === "email" && (
            <div className="flex flex-col gap-4">
              <div className="chartcoach-input-container">
                <div className="text-gray-400">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
                    <rect x="2" y="4" width="20" height="16" rx="3" />
                    <path d="m2 7 10 6 10-6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Email Address</div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMessage(null);
                      setDismissRegistered(true);
                    }}
                    className="chartcoach-input font-medium"
                    placeholder="Enter your registered email"
                    autoFocus
                  />
                </div>
                {isEmailValid && (
                  <div className="text-emerald-500">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Continue to Face Scan Button */}
              <button
                type="button"
                disabled={!isEmailValid}
                onClick={() => {
                  setErrorMessage(null);
                  setFaceStep("scan");
                }}
                className="chartcoach-btn-primary !py-3 font-semibold text-sm"
              >
                <span>Continue to Face Scan</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

              <p className="text-[11px] text-gray-400 text-center">
                Enter your registered email address to unlock with biometric verification.
              </p>
            </div>
          )}

          {/* STEP 2: Load Camera & Scanning Frame */}
          {faceStep === "scan" && (
            <div className="flex flex-col items-center gap-3">
              {/* Account Capsule with Change link */}
              <div className="flex items-center justify-between w-full bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl text-xs">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-800 truncate">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setFaceStep("email");
                  }}
                  className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] ml-2 shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Biometric Circular Scanner */}
              <FaceCapture
                onCapture={handleFaceLogin}
                isBusy={isSubmitting}
                isSuccess={faceLoginSuccess}
                successMessage="Face Verified • Welcome Back"
                errorMessage={errorMessage}
                onClearError={() => setErrorMessage(null)}
              />
            </div>
          )}
        </div>
      ) : (
        /* ─── Standard Email & Password Form ─── */
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email Address Input */}
          <div className="chartcoach-input-container">
            <div className="text-gray-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <path d="m2 7 10 6 10-6" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Email Address</div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setDismissRegistered(true);
                }}
                className="chartcoach-input font-medium"
                placeholder="your@email.com"
              />
            </div>
            {isEmailValid && (
              <div className="text-emerald-500">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
            )}
          </div>

          {/* Password Input */}
          <div className="chartcoach-input-container">
            <div className="text-gray-400">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Password</div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="chartcoach-input font-medium"
                placeholder="••••••••••••"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
            >
              {showPassword ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {/* Remember Me and Forgot Password */}
          <div className="flex items-center justify-between text-xs my-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-gray-600 font-medium">Remember me</span>
            </label>
            <a href="#" className="text-blue-600 hover:underline font-semibold">
              Forgot Password?
            </a>
          </div>

          {/* ─── Prominent Dual Sign In Action Row (Sign In + Unlock with Face ID) ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {/* Primary Sign In */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="chartcoach-btn-primary !mt-0 !py-3 font-semibold text-sm"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing In…
                </span>
              ) : (
                "Sign In"
              )}
            </button>

            {/* Prominent Unlock with Face ID Button */}
            <button
              type="button"
              onClick={() => {
                setUseFaceLogin(true);
                setFaceStep(isEmailValid ? "scan" : "email");
                setErrorMessage(null);
                setDismissRegistered(true);
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-50/90 hover:bg-blue-100 text-blue-600 font-semibold text-sm border border-blue-200/90 transition-all shadow-sm hover:shadow active:scale-[0.99] cursor-pointer"
            >
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
              <span>Unlock with Face ID</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-gray-400">Loading…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
