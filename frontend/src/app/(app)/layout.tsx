"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useFaceMonitor } from "@/hooks/useFaceMonitor";
import AppSidebar from "@/components/app-shell/AppSidebar";
import AppTopbar from "@/components/app-shell/AppTopbar";
import MobileNav from "@/components/app-shell/MobileNav";
import FaceIdSheet from "@/components/dashboard/FaceIdSheet";
import ToastStack from "@/components/dashboard/ToastStack";
import { Lock, ShieldCheck } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, logout, refreshUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showFaceSheet, setShowFaceSheet] = useState(false);

  // Feature flag: Toggle continuous face monitoring & workstation lock
  // Set NEXT_PUBLIC_ENABLE_WORKSTATION_LOCK=false in .env.local to pause
  const isWorkstationLockEnabled =
    process.env.NEXT_PUBLIC_ENABLE_WORKSTATION_LOCK !== "false" &&
    process.env.NEXT_PUBLIC_DISABLE_WORKSTATION_LOCK !== "true" &&
    process.env.NEXT_PUBLIC_PAUSE_WORKSTATION_LOCK !== "true";

  // Continuous face monitoring
  const monitor = useFaceMonitor(isWorkstationLockEnabled && !!user?.has_face_enrolled);
  const monitorVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (monitorVideoRef.current && monitor.stream) {
      monitorVideoRef.current.srcObject = monitor.stream;
    }
  }, [monitor.stream]);

  const [lastFlashedAt, setLastFlashedAt] = useState<number | null>(null);
  const [showConfirmedFlash, setShowConfirmedFlash] = useState(false);
  if (monitor.lastConfirmedAt !== lastFlashedAt) {
    setLastFlashedAt(monitor.lastConfirmedAt);
    if (monitor.lastConfirmedAt !== null) setShowConfirmedFlash(true);
  }

  useEffect(() => {
    if (!showConfirmedFlash) return;
    const timer = setTimeout(() => setShowConfirmedFlash(false), 2000);
    return () => clearTimeout(timer);
  }, [showConfirmedFlash]);

  // Route protection: redirect to login if unauthenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading ChartCoach...</span>
        </div>
      </div>
    );
  }

  const isPaused = isWorkstationLockEnabled && monitor.status === "paused";

  return (
    <div className="min-h-screen flex bg-[#fbfcfe] text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Real-time Notification Toast Stack */}
      <ToastStack />

      {/* Desktop App Sidebar */}
      <AppSidebar
        user={user}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onOpenSecurity={() => setShowFaceSheet(true)}
        onLogout={logout}
      />

      {/* Main Content Shell (offsets for desktop sidebar width) */}
      <div
        style={{ "--sidebar-offset": collapsed ? "76px" : "240px" } as React.CSSProperties}
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-60"
        }`}
      >
        {/* Topbar */}
        <AppTopbar user={user} onOpenSecurity={() => setShowFaceSheet(true)} />

        {/* Page Content Container */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-7 py-6 pb-28 lg:pb-16">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>

      {/* Biometric Face ID Bottom Sheet */}
      {showFaceSheet && (
        <FaceIdSheet
          user={user}
          onClose={() => setShowFaceSheet(false)}
          onRefreshUser={refreshUser}
        />
      )}

      {/* Continuous Live Face Monitor Video Bubble */}
      {isWorkstationLockEnabled && user.has_face_enrolled && monitor.stream && (
        <div className="fixed bottom-16 lg:bottom-5 right-5 z-40 flex flex-col items-end gap-2 pointer-events-none">
          {showConfirmedFlash && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-lg animate-fade-up">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Face Verified</span>
            </div>
          )}
          <div className="relative rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-slate-950 w-24 h-18 pointer-events-auto">
            <video
              ref={monitorVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="absolute bottom-0.5 inset-x-0.5 flex items-center justify-between bg-slate-950/80 px-1.5 py-0.5 rounded text-[8px] text-slate-300 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live ID</span>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Session Lockout Overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-overlay-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-sm text-center shadow-2xl space-y-3 animate-fade-up">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-slate-700" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Workstation Locked</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{monitor.reason}</p>
            <p className="text-[11px] text-slate-400">
              Look directly at the camera to resume your session automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
