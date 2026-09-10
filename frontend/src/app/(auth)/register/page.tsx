"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser, ApiError } from "@/lib/api";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 25, label: "Weak", color: "#ef4444" };
  if (score <= 2) return { score: 50, label: "Fair", color: "#f59e0b" };
  if (score <= 3) return { score: 75, label: "Good", color: "#0d6efd" };
  return { score: 100, label: "Strong", color: "#10b981" };
}

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const strength = getPasswordStrength(password);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  function triggerError(msg: string) {
    setErrorMessage(msg);
    setShakeKey((k) => k + 1);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await registerUser(email, fullName, password);
      router.push("/login?registered=1");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Could not create account. Please try again.";
      triggerError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      {/* ─── Header ─── */}
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Create Account
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1 font-normal">
          Join ChartCoach & start mastering the markets
        </p>
      </div>

      {/* ─── Segmented Tab Switcher (Sign In / Signup) ─── */}
      <div className="tab-switcher mb-6">
        <Link href="/login" className="tab-btn">
          Sign In
        </Link>
        <Link href="/register" className="tab-btn active">
          Signup
        </Link>
      </div>

      {/* ─── Error alert ─── */}
      {errorMessage && (
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

      {/* ─── Form ─── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Full Name */}
        <div className="chartcoach-input-container">
          <div className="text-gray-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Full Name</div>
            <input
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="chartcoach-input font-medium"
              placeholder="Jane Doe"
              autoComplete="name"
            />
          </div>
        </div>

        {/* Email Address */}
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
              onChange={(e) => setEmail(e.target.value)}
              className="chartcoach-input font-medium"
              placeholder="your@email.com"
              autoComplete="email"
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

        {/* Password */}
        <div className="chartcoach-input-container">
          <div className="text-gray-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Password</div>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="chartcoach-input font-mono tracking-wider"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="m1 1 22 22" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {/* Password Strength */}
        {password && (
          <div className="flex items-center gap-2.5 px-1">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${strength.score}%`,
                  backgroundColor: strength.color,
                }}
              />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: strength.color }}>
              {strength.label}
            </span>
          </div>
        )}

        {/* Continue (Primary Button) */}
        <div className="mt-2">
          <button type="submit" disabled={isSubmitting} className="chartcoach-btn-primary">
            {isSubmitting ? (
              <span>Creating account…</span>
            ) : (
              <span>Continue</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
