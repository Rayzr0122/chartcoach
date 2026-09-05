"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { User } from "@/lib/api";
import { useNotifications, NotificationType } from "@/context/NotificationContext";

type NavbarProps = {
  user: User;
  onLogout: () => void;
  onOpenSecurity: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

// ─── Notification type icon ───

function NotifIcon({ type, className }: { type: NotificationType; className?: string }) {
  const cls = className || "w-4 h-4";
  switch (type) {
    case "trade":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      );
    case "security":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "course":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
  }
}

function formatRelativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_ICON_BG: Record<string, string> = {
  trade: "bg-emerald-50 text-emerald-600",
  security: "bg-amber-50 text-amber-600",
  course: "bg-blue-50 text-blue-600",
  system: "bg-slate-100 text-slate-500",
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
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navItems = [
    { id: "overview", label: "Dashboard" },
    { id: "simulator", label: "Simulator" },
    { id: "courses", label: "Curriculum" },
    { id: "market-lab", label: "Market Lab" },
  ];

  const firstName = user.full_name?.split(" ")[0] || "Trader";

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* ─── Left: Brand ─── */}
          <div className="flex items-center gap-4 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-90">
              <Image
                src="/assets/chartcoach logo final trimmed.png"
                alt="ChartCoach"
                width={140}
                height={36}
                priority
                className="h-7 w-auto object-contain"
              />
            </Link>
            <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-medium text-slate-500">Live</span>
            </div>
          </div>

          {/* ─── Center: Nav Tabs ─── */}
          <nav className="hidden md:flex items-center gap-0.5 bg-slate-100/70 p-1 rounded-xl border border-slate-200/60">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === item.id
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* ─── Right: Actions ─── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-lg px-3 py-1.5 transition-all text-xs text-slate-400 cursor-pointer">
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="text-slate-500">Search...</span>
              <kbd className="text-[10px] font-mono bg-white border border-slate-200 rounded px-1 py-0.5 text-slate-400">&#8984;K</kbd>
            </div>

            {/* ─── Notifications ─── */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
                className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Center Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-up">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                          <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                          <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                          <path d="M18 8a6 6 0 0 0-9.33-5" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                        <span className="text-xs">No notifications yet</span>
                      </div>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => markAsRead(n.id)}
                          className={`w-full flex items-start gap-3 p-3.5 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
                            !n.read ? "bg-blue-50/30" : ""
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg ${TYPE_ICON_BG[n.type] || TYPE_ICON_BG.system} flex items-center justify-center shrink-0 mt-0.5`}>
                            <NotifIcon type={n.type} className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-slate-900 truncate">{n.title}</p>
                              <span className="text-[10px] text-slate-400 shrink-0">{formatRelativeTime(n.timestamp)}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.description}</p>
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Face ID Pill */}
            <button
              type="button"
              onClick={onOpenSecurity}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                user.has_face_enrolled
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/80"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                <circle cx="9" cy="10" r="1" fill="currentColor" />
                <circle cx="15" cy="10" r="1" fill="currentColor" />
                <path d="M9.5 15a4 4 0 0 0 5 0" />
              </svg>
              <span>{user.has_face_enrolled ? "Face ID" : "Setup Face ID"}</span>
            </button>

            {/* ─── Profile ─── */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-slate-200/80 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
                aria-label="User menu"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs">
                  {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-slate-700">{firstName}</span>
                <svg className="w-3 h-3 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-up p-1.5">
                  <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">{user.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full ${user.has_face_enrolled ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <span className={user.has_face_enrolled ? "text-emerald-700" : "text-amber-700"}>
                        {user.has_face_enrolled ? "Biometrics Active" : "Setup Pending"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSecurity();
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span>Face ID Settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("courses");
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
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
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
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
