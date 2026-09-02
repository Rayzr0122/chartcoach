"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User } from "@/lib/api";

type NavbarProps = {
  user: User;
  onLogout: () => void;
  onOpenSecurity: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

export default function DashboardNavbar({
  user,
  onLogout,
  onOpenSecurity,
  activeTab,
  setActiveTab,
}: NavbarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const navItems = [
    { id: "overview", label: "Dashboard" },
    { id: "simulator", label: "Simulator" },
    { id: "courses", label: "Curriculum" },
    { id: "market-lab", label: "Market Lab" },
  ];

  const notifications = [
    {
      id: "1",
      title: "Welcome to ChartCoach",
      desc: "Get started by securing your account with Face ID and exploring the Price Action track.",
      time: "Just now",
      unread: true,
    },
    {
      id: "2",
      title: "Interactive Simulator Ready",
      desc: "Live 60fps candlestick replay engine is online for practice.",
      time: "10m ago",
      unread: false,
    },
  ];

  const firstName = user.full_name?.split(" ")[0] || "Trader";

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* ─── Left: Brand Logo & Status ─── */}
          <div className="flex items-center gap-4 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-90">
              <Image
                src="/assets/chartcoach logo final trimmed.png"
                alt="ChartCoach"
                width={140}
                height={36}
                priority
                className="h-8 w-auto object-contain"
              />
            </Link>

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-medium text-slate-500">Live</span>
            </div>
          </div>

          {/* ─── Center: Main Navigation Tabs ─── */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 p-1 rounded-2xl border border-slate-200/60">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === item.id
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200/60 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* ─── Right: Search, Notifications, Face ID & Profile ─── */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Quick Search Trigger */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-100/60 hover:bg-slate-100 border border-slate-200/60 rounded-xl px-3 py-1.5 transition-all text-xs text-slate-400 cursor-pointer">
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="text-slate-500">Search…</span>
              <kbd className="text-[10px] font-mono bg-white border border-slate-200 rounded px-1 py-0.5 text-slate-400">⌘K</kbd>
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
                className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-600" />
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <span className="text-xs font-bold text-slate-900">Notifications</span>
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">1 New</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className={`p-3.5 hover:bg-slate-50/80 transition-colors text-left ${n.unread ? "bg-blue-50/20" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Face ID Status Pill */}
            <button
              type="button"
              onClick={onOpenSecurity}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                user.has_face_enrolled
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/80"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                <circle cx="9" cy="10" r="1" fill="currentColor" />
                <circle cx="15" cy="10" r="1" fill="currentColor" />
                <path d="M9.5 15a4 4 0 0 0 5 0" />
              </svg>
              <span>{user.has_face_enrolled ? "Face ID" : "Setup Face ID"}</span>
            </button>

            {/* User Profile Pill Capsule */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-slate-200/80 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
                aria-label="User menu"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-slate-700">{firstName}</span>
                <svg className="w-3 h-3 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn p-2">
                  <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md self-start inline-flex">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{user.has_face_enrolled ? "Biometrics Active" : "Setup Pending"}</span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSecurity();
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span>Biometric Face Security</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("courses");
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      <span>Enrolled Curriculum</span>
                    </button>

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
