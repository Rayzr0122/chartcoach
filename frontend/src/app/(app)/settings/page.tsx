"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { User, Bell, Palette, Shield, Check, Save } from "lucide-react";
import FaceIdSheet from "@/components/dashboard/FaceIdSheet";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"account" | "notifications" | "appearance" | "security">("account");
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [showFaceSheet, setShowFaceSheet] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Preference toggles
  const [streakReminders, setStreakReminders] = useState(true);
  const [courseUpdates, setCourseUpdates] = useState(true);
  const [themePref, setThemePref] = useState<"system" | "light" | "dark">("light");

  function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 animate-fade-up">
      {/* Page Header */}
      <header className="space-y-1 pb-4 border-b border-slate-200/80">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Manage your account profile, learning notifications, and workstation biometric security.
        </p>
      </header>

      {/* Tabs Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar border-b border-slate-200/80">
        {[
          { id: "account" as const, label: "Account", icon: User },
          { id: "notifications" as const, label: "Notifications", icon: Bell },
          { id: "appearance" as const, label: "Appearance", icon: Palette },
          { id: "security" as const, label: "Biometric Security", icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Account */}
      {activeTab === "account" && (
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Account Details</h2>
            <p className="text-xs text-slate-500 mt-0.5">Your personal details and identification.</p>
          </div>

          <form onSubmit={handleSaveAccount} className="space-y-4 max-w-lg text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-xs text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Email Address</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3.5 py-2.5 bg-slate-100/70 border border-slate-200 text-slate-500 rounded-xl text-xs font-mono cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Email is bound to your account credentials.</span>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>

              {savedSuccess && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 animate-fade-up">
                  <Check className="w-4 h-4" />
                  <span>Changes saved successfully</span>
                </span>
              )}
            </div>
          </form>
        </section>
      )}

      {/* Tab 2: Notifications */}
      {activeTab === "notifications" && (
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Notification Preferences</h2>
            <p className="text-xs text-slate-500 mt-0.5">Control how and when you receive learning updates.</p>
          </div>

          <div className="space-y-4 max-w-xl text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
              <div>
                <span className="font-bold text-slate-800 block">Daily Streak Reminders</span>
                <span className="text-[11px] text-slate-400">Receive gentle alerts before your streak resets.</span>
              </div>
              <input
                type="checkbox"
                checked={streakReminders}
                onChange={(e) => setStreakReminders(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
              <div>
                <span className="font-bold text-slate-800 block">Course & Quiz Milestone Alerts</span>
                <span className="text-[11px] text-slate-400">Get notified when you unlock the next curriculum level.</span>
              </div>
              <input
                type="checkbox"
                checked={courseUpdates}
                onChange={(e) => setCourseUpdates(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </section>
      )}

      {/* Tab 3: Appearance */}
      {activeTab === "appearance" && (
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Appearance</h2>
            <p className="text-xs text-slate-500 mt-0.5">Customize your viewing preferences.</p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md text-xs">
            {[
              { id: "light" as const, label: "Light", icon: "☀️" },
              { id: "dark" as const, label: "Dark", icon: "🌙" },
              { id: "system" as const, label: "System", icon: "💻" },
            ].map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setThemePref(theme.id)}
                className={`p-4 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                  themePref === theme.id
                    ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="text-xl mb-1">{theme.icon}</div>
                <div>{theme.label}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Tab 4: Biometric Security */}
      {activeTab === "security" && (
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Workstation Biometric Protection</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure your learning terminal using on-device optical Face ID verification.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800">Face ID Status</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${
                    user.has_face_enrolled ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {user.has_face_enrolled ? "Enrolled" : "Not Enrolled"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 max-w-md">
                {user.has_face_enrolled
                  ? "Your face template is encrypted and stored safely. Continuous monitoring locks the screen when you leave your seat."
                  : "Enroll your face to enable instant workstation unlocking and distraction prevention."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowFaceSheet(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              {user.has_face_enrolled ? "Re-Enroll / Test Face ID" : "Setup Face ID"}
            </button>
          </div>
        </section>
      )}

      {/* Biometric Face ID Sheet modal trigger */}
      {showFaceSheet && (
        <FaceIdSheet
          user={user}
          onClose={() => setShowFaceSheet(false)}
          onRefreshUser={refreshUser}
        />
      )}
    </div>
  );
}
