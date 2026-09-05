"use client";

import { useEffect, useState } from "react";
import { useNotifications, Notification } from "@/context/NotificationContext";

// Auto-dismiss duration in ms
const TOAST_DURATION = 4000;

// Accent colors per notification type
const ACCENT: Record<string, string> = {
  trade: "border-l-emerald-500",
  security: "border-l-amber-500",
  course: "border-l-blue-500",
  system: "border-l-slate-400",
};

// Icons per notification type (inline SVG)
function TypeIcon({ type }: { type: string }) {
  const cls = "w-4 h-4 shrink-0";
  switch (type) {
    case "trade":
      return (
        <svg className={`${cls} text-emerald-600`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      );
    case "security":
      return (
        <svg className={`${cls} text-amber-600`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "course":
      return (
        <svg className={`${cls} text-blue-600`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    default:
      return (
        <svg className={`${cls} text-slate-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
  }
}

function formatTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function ToastItem({ notification, onDismiss }: { notification: Notification; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setExiting(true);
        setTimeout(onDismiss, 150);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [onDismiss]);

  function handleClose() {
    setExiting(true);
    setTimeout(onDismiss, 150);
  }

  const accent = ACCENT[notification.type] || ACCENT.system;

  return (
    <div
      className={`relative bg-white border border-slate-200 border-l-[3px] ${accent} rounded-xl shadow-lg w-80 overflow-hidden group ${
        exiting ? "animate-toast-out" : "animate-toast-in"
      }`}
    >
      <div className="flex items-start gap-3 p-3.5">
        <div className="mt-0.5">
          <TypeIcon type={notification.type} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate">{notification.title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{notification.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-slate-400 font-medium">{formatTime(notification.timestamp)}</span>
          <button
            type="button"
            onClick={handleClose}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            aria-label="Dismiss"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-[2px] bg-slate-100">
        <div
          className="h-full bg-slate-300 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function ToastStack() {
  const { toastQueue, dismissToast } = useNotifications();

  if (toastQueue.length === 0) return null;

  return (
    <div className="fixed top-20 right-5 z-50 flex flex-col gap-2.5">
      {toastQueue.map((n) => (
        <ToastItem key={n.id} notification={n} onDismiss={() => dismissToast(n.id)} />
      ))}
    </div>
  );
}
