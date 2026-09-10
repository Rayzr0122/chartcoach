"use client";

import { useState, useRef, useEffect } from "react";
import { User } from "@/lib/api";
import { useNotifications } from "@/context/NotificationContext";
import { NavTabId } from "./Sidebar";

type HeaderProps = {
  user: User;
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  onOpenSecurity: () => void;
  onOpenMobileMenu: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
};

const TAB_TITLES: Record<NavTabId, { title: string; subtitle: string; category: string }> = {
  home: {
    title: "Command Center",
    subtitle: "Track your progress, daily goals, and personalized market insights.",
    category: "Dashboard",
  },
  courses: {
    title: "Curriculum & Masterclasses",
    subtitle: "5 structured levels from Market Foundations to Elite Analysis.",
    category: "Learning",
  },
  mentor: {
    title: "AI Trading Mentor",
    subtitle: "Your 24/7 personal tutor. Ask any chart, risk, or mindset question in plain English.",
    category: "Copilot",
  },
  simulator: {
    title: "Market Simulator & Pattern Sandbox",
    subtitle: "Practice price action replay and test trading setups risk-free.",
    category: "Practice",
  },
  journal: {
    title: "Trading Journal & Psychology Log",
    subtitle: "Record trades, analyze win rates, and monitor emotional patterns.",
    category: "Performance",
  },
  challenges: {
    title: "Daily Challenges & Skill Tree",
    subtitle: "Solve real chart puzzles, build your streak, and earn trader badges.",
    category: "Achievements",
  },
};

export default function DashboardHeader({
  user,
  activeTab,
  onSelectTab,
  onOpenSecurity,
  onOpenMobileMenu,
  searchQuery,
  onSearchChange,
}: HeaderProps) {
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const tabInfo = TAB_TITLES[activeTab] || TAB_TITLES.home;

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Active Tab Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open sidebar menu"
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80 transition-colors cursor-pointer shrink-0"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider hidden sm:inline">
                {tabInfo.category}
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                {tabInfo.title}
              </h1>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-normal truncate hidden sm:block">
              {tabInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Center/Right: Global Search, Quick Status, Face ID, Notifications */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Global Search Bar */}
          <div className="relative hidden md:block w-56 lg:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search courses, setups, patterns..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-normal"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Quick Status Ticker */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/70 border border-slate-200/60 text-[11px] font-medium text-slate-600">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Paper Trading Active</span>
          </div>

          {/* Biometric Status Chip */}
          <button
            type="button"
            onClick={onOpenSecurity}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
              user.has_face_enrolled
                ? "bg-emerald-50/80 border-emerald-200/80 text-emerald-700 hover:bg-emerald-100/70"
                : "bg-amber-50/80 border-amber-200/80 text-amber-700 hover:bg-amber-100/70"
            }`}
            title="Biometric Security Status"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
              <circle cx="9" cy="10" r="1" fill="currentColor" />
              <circle cx="15" cy="10" r="1" fill="currentColor" />
              <path d="M9.5 15a4 4 0 0 0 5 0" />
            </svg>
            <span className="font-semibold">{user.has_face_enrolled ? "Face ID" : "Setup Face"}</span>
          </button>

          {/* Notification Bell Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
              className="relative p-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200/80 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-blue-600 text-white text-[9px] font-bold ring-2 ring-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-3 z-50 animate-fade-up">
                <div className="flex items-center justify-between px-4 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-[11px] text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      <svg
                        className="w-8 h-8 mx-auto mb-2 text-slate-300"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`p-3.5 transition-colors cursor-pointer hover:bg-slate-50 flex items-start gap-3 ${
                          !n.read ? "bg-blue-50/40" : ""
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                            n.type === "trade"
                              ? "bg-emerald-100 text-emerald-700"
                              : n.type === "course"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {n.type === "trade" ? "₹" : n.type === "course" ? "📚" : "🛡️"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-semibold text-slate-900 truncate">{n.title}</h4>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.description}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Button */}
          {activeTab !== "mentor" ? (
            <button
              type="button"
              onClick={() => onSelectTab("mentor")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Ask Mentor</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelectTab("simulator")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
              <span>Practice Trade</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
