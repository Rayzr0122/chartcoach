"use client";

import Image from "next/image";
import Link from "next/link";

export default function DashboardFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/dashboard" className="inline-block">
              <Image
                src="/assets/chartcoach logo final trimmed.png"
                alt="ChartCoach"
                width={170}
                height={42}
                className="h-9 w-auto object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              ChartCoach is India&apos;s premier EdTech & AI trading simulation platform. We empower aspiring and professional traders with institutional order flow concepts, risk management discipline, and real-time simulator analytics.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a href="#" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                </svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Curriculum Tracks */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Curriculum</h3>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#" className="hover:text-white transition-colors">Price Action Foundations</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Smart Money Concepts (SMC)</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Options Greeks & Volatility</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Algorithmic Scalping</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Risk & Behavioral Mastery</a></li>
            </ul>
          </div>

          {/* Col 3: Platform Tools */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">LMS Platform</h3>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#" className="hover:text-white transition-colors">AI Market Simulator</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Live Interactive Labs</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Trading Journal Analytics</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Verified Certificates</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Live Trader Community</a></li>
            </ul>
          </div>

          {/* Col 4: Trust & Support */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Security & Support</h3>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#" className="hover:text-white transition-colors">Apple-Grade Face ID Auth</a></li>
              <li><a href="#" className="hover:text-white transition-colors">SEBI Compliance Notice</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Help Center & FAQ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Regulatory & Risk Disclaimer */}
        <div className="mt-10 pt-6 border-t border-slate-800 text-[11px] leading-relaxed text-slate-500">
          <p>
            <strong className="text-slate-400">Risk & Educational Disclaimer:</strong> ChartCoach is an educational learning technology platform. All market simulations, courses, charts, and AI analysis are provided solely for educational and training purposes and do not constitute financial, investment, or trading advice. Trading in equities, derivatives, commodities, and currencies carries market risk.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ChartCoach Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>All Systems Operational</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
