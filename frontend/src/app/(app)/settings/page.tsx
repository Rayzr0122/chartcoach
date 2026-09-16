"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  Bell,
  Palette,
  Shield,
  CreditCard,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Lock,
} from "lucide-react";
import FaceIdSheet from "@/components/dashboard/FaceIdSheet";
import { fetchMembership, cancelSubscription, resumeSubscription, MembershipDetails } from "@/lib/api";
import { CancellationModal } from "@/components/billing/CancellationModal";
import { BuyGemsModal } from "@/components/billing/BuyGemsModal";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "membership" | "account" | "notifications" | "appearance" | "security"
  >("membership");
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [showFaceSheet, setShowFaceSheet] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Membership state (Section 37 & 38)
  const [membership, setMembership] = useState<MembershipDetails | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isBuyGemsOpen, setIsBuyGemsOpen] = useState(false);

  // Preference toggles
  const [streakReminders, setStreakReminders] = useState(true);
  const [courseUpdates, setCourseUpdates] = useState(true);
  const [themePref, setThemePref] = useState<"system" | "light" | "dark">("light");

  useEffect(() => {
    if (user) {
      setLoadingMembership(true);
      fetchMembership()
        .then((data) => setMembership(data))
        .catch((err) => console.warn("Could not fetch membership:", err))
        .finally(() => setLoadingMembership(false));
    }
  }, [user]);

  function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  }

  async function handleConfirmCancel(reason: string) {
    setCancelling(true);
    setCancelMessage(null);
    try {
      const res = await cancelSubscription();
      setCancelMessage(res.message);
      const updated = await fetchMembership();
      setMembership(updated);
      await refreshUser();
    } catch (err: any) {
      setCancelMessage(err.message || "Failed to cancel subscription.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleResumeAutoRenew() {
    setResuming(true);
    setCancelMessage(null);
    try {
      const res = await resumeSubscription();
      setCancelMessage(res.message);
      const updated = await fetchMembership();
      setMembership(updated);
      await refreshUser();
    } catch (err: any) {
      setCancelMessage(err.message || "Failed to resume subscription.");
    } finally {
      setResuming(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fade-up">
      {/* Page Header */}
      <header className="space-y-1 pb-4 border-b border-slate-200/80">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Manage your membership tier, commercial billing, security preferences, and alerts.
        </p>
      </header>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-slate-200/80 gap-2 sm:gap-6 overflow-x-auto pb-px">
        {[
          { id: "membership", label: "Subscription & Billing", icon: CreditCard },
          { id: "account", label: "Profile & Identity", icon: User },
          { id: "security", label: "Security & Face ID", icon: Shield },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "appearance", label: "Preferences", icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-3 sm:px-1 border-b-2 text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Membership & Commercial Billing (Section 37, 38) */}
      {activeTab === "membership" && (
        <div className="space-y-6 animate-fade-in">
          {/* Status Banners (Section 49) */}
          {membership?.status === "cancelled" && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
              <div className="space-y-0.5">
                <span className="text-xs font-bold block">Auto-Renewal Cancelled</span>
                <p className="text-xs text-amber-800">
                  Your benefits will expire on{" "}
                  {membership.renewalDate
                    ? new Date(membership.renewalDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "the end of your billing cycle"}
                  . You can restore auto-renewal anytime to maintain your uninterrupted edge.
                </p>
              </div>
              <button
                type="button"
                disabled={resuming}
                onClick={handleResumeAutoRenew}
                className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shrink-0 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
              >
                {resuming ? "Restoring..." : "Resume Auto-Renewal"}
              </button>
            </div>
          )}

          {cancelMessage && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{cancelMessage}</span>
            </div>
          )}

          {/* Current Membership Overview Card */}
          <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Current Membership
                </span>
                <div className="flex items-center gap-2.5 mt-1">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {membership?.planName || "Free Plan"}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      membership?.status === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : membership?.status === "cancelled"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {membership?.status === "cancelled" ? "Cancelling at Cycle End" : membership?.status || "Free"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/pricing"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{membership?.plan === "free" ? "Upgrade Plan" : "Change Plan"}</span>
                </Link>

                {membership && membership.plan !== "free" && membership.autoRenew && (
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => setIsCancelModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel Auto-Renewal
                  </button>
                )}

                {membership && membership.status === "cancelled" && (
                  <button
                    type="button"
                    disabled={resuming}
                    onClick={handleResumeAutoRenew}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {resuming ? "Restoring..." : "Resume"}
                  </button>
                )}
              </div>
            </div>

            {/* Metrics Matrix (Section 37) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Renewal Date */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Renewal Date
                </span>
                <span className="text-sm font-black text-slate-900 mt-1 block">
                  {membership?.renewalDate
                    ? new Date(membership.renewalDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "No Active Renewal"}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {membership?.autoRenew
                    ? `Auto-renews ${membership?.billingInterval || "monthly"}`
                    : "Expires at cycle end"}
                </span>
              </div>

              {/* Gems Balance */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Gems Balance
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsBuyGemsOpen(true)}
                      className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      + Top Up
                    </button>
                  </div>
                  <span className="text-sm font-black text-blue-600 font-mono mt-1 block flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    {membership?.gems?.balance?.toLocaleString("en-IN") || 0}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {membership?.gems?.monthlyAllocation || 0} Gems / mo
                </span>
              </div>

              {/* Courses Unlocked */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Courses Unlocked
                </span>
                <span className="text-sm font-black text-slate-900 mt-1 block">
                  {membership?.unlockedCourses?.unlocked || 0} / {membership?.unlockedCourses?.total || 5}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Full curriculum access</span>
              </div>

              {/* Tools Unlocked */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Tools Unlocked
                </span>
                <span className="text-sm font-black text-slate-900 mt-1 block">
                  {membership?.unlockedTools?.unlocked || 0} / {membership?.unlockedTools?.total || 6}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {membership?.simulatorAccess ? "Simulator Active" : "No Simulator"}
                </span>
              </div>
            </div>

            {/* Access Summary (Section 37) */}
            <div className="pt-2 space-y-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                What’s included in your plan
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Community Access</span>
                  <span className="font-bold text-slate-900">{membership?.communityAccess || "Limited"} Access</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Live Market Simulator</span>
                  <span className="font-bold text-slate-900">{membership?.simulatorAccess ? "Full Access" : "Locked"}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Payment Receipts & Transaction History */}
          <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Payment History & Receipts</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Past billing statements and payment verification records.
              </p>
            </div>

            {membership?.paymentHistory && membership.paymentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Transaction ID</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {membership.paymentHistory.map((pmt) => (
                      <tr key={pmt.id}>
                        <td className="py-3 px-3">{pmt.date}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{pmt.paymentId}</td>
                        <td className="py-3 px-3 font-mono font-bold">₹{pmt.amount.toLocaleString("en-IN")}</td>
                        <td className="py-3 px-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {pmt.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No past transactions recorded yet.
              </div>
            )}
          </section>
        </div>
      )}

      {/* Tab: Account Details */}
      {activeTab === "account" && (
        <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
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

            {savedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Account settings saved successfully.</span>
              </div>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </form>
        </section>
      )}

      {/* Tab: Biometric Security */}
      {activeTab === "security" && (
        <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
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

      {/* Tab: Notifications */}
      {activeTab === "notifications" && (
        <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Notifications</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage learning milestones and course notifications.</p>
          </div>

          <div className="space-y-4 max-w-lg text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div>
                <span className="font-bold text-slate-900 block">Daily Streak Reminders</span>
                <span className="text-[11px] text-slate-400">Receive nudges to maintain your learning streak.</span>
              </div>
              <input
                type="checkbox"
                checked={streakReminders}
                onChange={(e) => setStreakReminders(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div>
                <span className="font-bold text-slate-900 block">Course Announcements</span>
                <span className="text-[11px] text-slate-400">Updates when new modules or quizzes are published.</span>
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

      {/* Tab: Appearance */}
      {activeTab === "appearance" && (
        <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
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

      {/* Biometric Face ID Sheet */}
      {showFaceSheet && (
        <FaceIdSheet
          user={user}
          onClose={() => setShowFaceSheet(false)}
          onRefreshUser={refreshUser}
        />
      )}

      {/* Cancellation Feedback Modal */}
      {isCancelModalOpen && (
        <CancellationModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          planName={membership?.planName || "Current Plan"}
          currentPeriodEnd={membership?.renewalDate}
          onConfirmCancel={async (reason) => {
            await handleConfirmCancel(reason);
            setIsCancelModalOpen(false);
          }}
        />
      )}

      {/* Gem Top-Up Modal */}
      {isBuyGemsOpen && (
        <BuyGemsModal
          isOpen={isBuyGemsOpen}
          onClose={() => setIsBuyGemsOpen(false)}
          currentBalance={membership?.gems?.balance || 0}
          onSuccess={async () => {
            const updated = await fetchMembership();
            setMembership(updated);
            await refreshUser();
          }}
        />
      )}
    </div>
  );
}
