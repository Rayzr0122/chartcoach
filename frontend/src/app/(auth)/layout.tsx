"use client";

import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row overflow-x-hidden">
      {/* ─── LEFT SIDE: Form & Content (60% on desktop, 100% on mobile) ─── */}
      <div className="w-full auth-panel-left flex flex-col justify-between p-6 sm:p-10 md:p-14 lg:p-12 xl:p-16 min-h-screen">
        {/* Main Content Area */}
        <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col justify-center my-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href="/login" className="inline-block transition-transform hover:scale-[1.02]">
              <Image
                src="/assets/chartcoach logo final trimmed.png"
                alt="ChartCoach - Your Personal AI Coach"
                width={240}
                height={60}
                priority
                className="h-auto w-auto max-h-12 object-contain"
              />
            </Link>
          </div>

          {/* Form Children (Login / Signup) */}
          {children}
        </div>

        {/* Bottom Disclaimer & Footer Links */}
        <div className="w-full max-w-[420px] mx-auto mt-8 pt-4 border-t border-gray-100 text-left">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Build your market confidence with Chart Coach. Learn through realistic market simulations, AI-powered insights, hands-on chart analysis, and practical trading scenarios designed to turn knowledge into smarter decisions.
          </p>
          <div className="mt-2 flex gap-2 text-[11px] text-blue-600 font-medium">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <span className="text-gray-300">|</span>
            <a href="#" className="hover:underline">Terms and Conditions</a>
          </div>
        </div>
      </div>

      {/* ─── RIGHT SIDE: Artwork with Minimalist SaaS Gradient Overlay (40% on desktop) ─── */}
      <div className="hidden lg:flex auth-panel-right h-screen sticky top-0 bg-[#dff0fa] relative overflow-hidden items-end justify-end select-none">
        {/* Background Artwork */}
        <img
          src="/assets/nandi-sign.png"
          alt="ChartCoach"
          className="absolute inset-0 h-full w-full object-cover object-right pointer-events-none"
        />

        {/* Professional Dark Gradient Mask */}
        <div
          className="absolute inset-x-0 bottom-0 h-[48%] pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(10, 15, 29, 0.94) 0%, rgba(10, 15, 29, 0.72) 40%, rgba(10, 15, 29, 0.25) 75%, transparent 100%)",
          }}
        />

        {/* Minimalist International SaaS Content */}
        <div className="relative z-10 w-full p-8 xl:p-10 pb-8 flex flex-col gap-2.5 text-left">
          {/* Subtle Kicker */}
          <div className="flex items-center gap-2 self-start bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full">
            <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-200">
              Trading Intelligence
            </span>
          </div>

          {/* Clean Headline */}
          <h2 className="text-2xl xl:text-[1.75rem] font-bold text-white leading-tight tracking-tight">
            Turn market theory into trading instinct.
          </h2>

          {/* Crisp Subheading */}
          <p className="text-xs xl:text-[13px] text-slate-300/90 leading-relaxed font-normal max-w-md">
            Master chart patterns, validate risk strategies in simulated execution, and build disciplined habits with adaptive AI coaching.
          </p>

          {/* Professional Micro-Feature Chips (Zero Emojis, Pure SVGs) */}
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-200 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
              <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span>Live AI Feedback</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-200 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Risk Management</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-200 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
              <svg className="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <span>Realistic Simulation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
