"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, ShieldCheck, ShieldAlert, ChevronRight, X } from "lucide-react";
import { User } from "@/lib/api";
import { useNotifications } from "@/context/NotificationContext";

import ChartCoachLogo from "@/components/brand/ChartCoachLogo";

type AppTopbarProps = {
  user: User;
  onOpenSecurity: () => void;
};

export default function AppTopbar({ user, onOpenSecurity }: AppTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();

  const [showNotifs, setShowNotifs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute breadcrumb segments based on pathname
  function getBreadcrumbs() {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0 || (segments.length === 1 && segments[0] === "dashboard")) {
      return [{ label: "Dashboard", href: "/dashboard" }];
    }

    const crumbs = [];
    if (segments[0] === "learn") {
      crumbs.push({ label: "Learn", href: "/learn/courses" });
      if (segments[1] === "path") {
        crumbs.push({ label: "Learning Path", href: "/learn/path" });
      } else if (segments[1] === "courses") {
        crumbs.push({ label: "Courses", href: "/learn/courses" });
        if (segments[2]) {
          crumbs.push({ label: "Course Details", href: `/learn/courses/${segments[2]}` });
        }
        if (segments[3] === "lessons" && segments[4]) {
          crumbs.push({ label: "Lesson", href: `/learn/courses/${segments[2]}/lessons/${segments[4]}` });
        }
      } else if (segments[1] === "quizzes") {
        crumbs.push({ label: "Quizzes", href: "/learn/quizzes" });
        if (segments[2]) {
          crumbs.push({ label: "Quiz Assessment", href: `/learn/quizzes/${segments[2]}` });
        }
      }
    } else if (segments[0] === "profile") {
      crumbs.push({ label: "Profile", href: "/profile" });
    } else if (segments[0] === "settings") {
      crumbs.push({ label: "Settings", href: "/settings" });
    }
    return crumbs;
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/learn/courses?search=${encodeURIComponent(searchQuery.trim())}`);
  }

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-7 h-16 flex items-center justify-between gap-4">
      {/* Left: Brand Logo on mobile + Breadcrumbs (hidden on dashboard) */}
      <div className="flex items-center gap-3 min-w-0">
        <ChartCoachLogo size="sm" showText={true} className="lg:hidden" />

        {pathname !== "/dashboard" && (
          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
            <Link href="/dashboard" className="font-semibold text-slate-700 hover:text-blue-600 transition-colors shrink-0">
              ChartCoach
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.href + idx} className="flex items-center gap-1.5 truncate">
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <Link
                  href={crumb.href}
                  className={`truncate hover:text-blue-600 transition-colors ${
                    idx === breadcrumbs.length - 1 ? "font-bold text-slate-900 pointer-events-none" : "font-medium text-slate-500"
                  }`}
                >
                  {crumb.label}
                </Link>
              </div>
            ))}
          </nav>
        )}
      </div>

      {/* Center: Search Input matching reference with ⌘ K */}
      <div className="flex-1 max-w-xl mx-auto px-2 hidden sm:block">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for stocks, strategies, tools or anything..."
            className="w-full pl-9 pr-12 py-2 bg-slate-50/70 hover:bg-white focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 shadow-xs transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs font-mono">
              ⌘ K
            </kbd>
          </div>
        </form>
      </div>

      {/* Right: Notifications, Biometric Status, User Profile Capsule */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification Bell matching reference */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifs(!showNotifs)}
            aria-label="Open notifications"
            className="relative w-9 h-9 rounded-xl bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/90 shadow-xs flex items-center justify-center transition-all cursor-pointer"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {/* Notifications Popover */}
          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-3 z-50 animate-fade-up">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
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

              <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-3 transition-colors cursor-pointer hover:bg-slate-50 flex items-start gap-2.5 ${
                        !n.read ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-semibold text-slate-900 truncate">{n.title}</h4>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Capsule matching reference with green online status and Free Plan */}
        <Link
          href="/profile"
          aria-label="View Profile"
          className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs overflow-hidden">
              <img
                src={user.avatar_url || "/images/dashboard/default_avatar.jpg"}
                alt={user.full_name || "User"}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Green Online Dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div className="hidden sm:flex flex-col text-left leading-tight">
            <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              {user.full_name?.split(" ")[0] || "Riya"}
            </span>
            <span className="text-[10px] font-medium text-slate-400 capitalize">
              {user.subscription_plan ? `${user.subscription_plan} Plan` : "Free Plan"}
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors hidden sm:block rotate-90" />
        </Link>
      </div>
    </header>
  );
}
