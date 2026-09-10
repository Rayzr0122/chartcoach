"use client";

import { User } from "@/lib/api";

export type NavTabId = "home" | "courses" | "mentor" | "simulator" | "journal" | "challenges";

type SidebarProps = {
  user: User;
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  onOpenSecurity: () => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
};

type NavItem = {
  id: NavTabId;
  label: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  icon: (active: boolean) => React.ReactNode;
};

export default function DashboardSidebar({
  user,
  activeTab,
  onSelectTab,
  onOpenSecurity,
  onLogout,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const navItems: NavItem[] = [
    {
      id: "home",
      label: "Home",
      description: "Overview & Daily Goal",
      icon: (active) => (
        <svg
          className={`w-5 h-5 transition-colors ${active ? "text-blue-600" : "text-slate-500 group-hover:text-slate-800"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      id: "courses",
      label: "Courses",
      description: "Structured Curriculum",
      badge: "5 Levels",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      icon: (active) => (
        <svg
          className={`w-5 h-5 transition-colors ${active ? "text-blue-600" : "text-slate-500 group-hover:text-slate-800"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="9" y1="7" x2="15" y2="7" />
          <line x1="9" y1="11" x2="13" y2="11" />
        </svg>
      ),
    },
    {
      id: "mentor",
      label: "AI Mentor",
      description: "Ask Anything in Plain English",
      badge: "AI 2.0",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: (active) => (
        <svg
          className={`w-5 h-5 transition-colors ${active ? "text-blue-600" : "text-slate-500 group-hover:text-slate-800"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M9.5 9h.01M14.5 9h.01" strokeWidth={2.5} />
          <path d="M9.5 13a3.5 3.5 0 0 0 5 0" />
        </svg>
      ),
    },
    {
      id: "simulator",
      label: "Chart Simulator",
      description: "Replay & Pattern Trainer",
      badge: "Live",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      icon: (active) => (
        <svg
          className={`w-5 h-5 transition-colors ${active ? "text-blue-600" : "text-slate-500 group-hover:text-slate-800"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      ),
    },
    {
      id: "journal",
      label: "Trading Journal",
      description: "Log Trades & Psychology",
      icon: (active) => (
        <svg
          className={`w-5 h-5 transition-colors ${active ? "text-blue-600" : "text-slate-500 group-hover:text-slate-800"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      id: "challenges",
      label: "Challenges",
      description: "Daily Puzzles & Streaks",
      badge: "Daily",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      icon: (active) => (
        <svg
          className={`w-5 h-5 transition-colors ${active ? "text-blue-600" : "text-slate-500 group-hover:text-slate-800"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden animate-overlay-in"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 lg:w-72 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-300 ease-out lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Top: Logo & Main Navigation */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {/* Logo Brand Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-slate-900 tracking-tight">ChartCoach</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200/60 uppercase">
                    LMS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">AI Trading Platform</p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Navigation Section */}
          <div className="px-3.5 py-4 space-y-1">
            <div className="px-3 pb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Navigation</span>
            </div>

            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-blue-50/90 text-blue-900 font-semibold shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg transition-colors ${
                        active ? "bg-blue-600/10 text-blue-600" : "bg-slate-100/80 text-slate-500 group-hover:bg-slate-200/60"
                      }`}
                    >
                      {item.icon(active)}
                    </div>
                    <div className="truncate">
                      <span className="text-xs sm:text-[13px] block truncate">{item.label}</span>
                      <span className="text-[10px] text-slate-400 font-normal block truncate">
                        {item.description}
                      </span>
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${
                        item.badgeColor || "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: Biometric Workstation & User Profile */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 space-y-2.5">
          {/* Face ID Status Card */}
          <button
            type="button"
            onClick={onOpenSecurity}
            className="w-full group bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl p-3 flex items-center justify-between transition-all shadow-xs cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  user.has_face_enrolled ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                  <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                  <circle cx="9" cy="10" r="1" fill="currentColor" />
                  <circle cx="15" cy="10" r="1" fill="currentColor" />
                  <path d="M9.5 15a4 4 0 0 0 5 0" />
                </svg>
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800">Face ID</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      user.has_face_enrolled ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                </div>
                <span className="text-[10px] text-slate-400 block truncate">
                  {user.has_face_enrolled ? "Workstation Protected" : "Setup Biometrics"}
                </span>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-blue-600 group-hover:underline shrink-0">
              {user.has_face_enrolled ? "Manage" : "Setup"}
            </span>
          </button>

          {/* User Account Capsule */}
          <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <span className="text-xs font-semibold text-slate-800 block truncate">
                  {user.full_name || user.email.split("@")[0]}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">{user.email}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
