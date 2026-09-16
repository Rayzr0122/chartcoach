"use client";

import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Sparkles,
  BookOpen,
  Wrench,
  Zap,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { Portal } from "@/components/ui/portal";
import { useModalAnimation } from "@/components/ui/use-modal-animation";

type PostPurchaseSuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planSlug: string;
  monthlyGems: number;
  coursesCount?: number;
  toolsCount?: number;
};

export function PostPurchaseSuccessModal({
  isOpen,
  onClose,
  planName,
  planSlug,
  monthlyGems,
  coursesCount = 4,
  toolsCount = 6,
}: PostPurchaseSuccessModalProps) {
  const router = useRouter();
  const { isRendered, isClosing, handleClose } = useModalAnimation(isOpen, onClose);

  if (!isRendered) return null;

  function handleContinueLearning() {
    handleClose();
    router.push("/learn/courses");
  }

  function handleExploreTools() {
    handleClose();
    router.push("/dashboard");
  }

  return (
    <Portal>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
        className={`fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md ${
          isClosing ? "animate-backdrop-out" : "animate-backdrop-in"
        }`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden text-center p-6 sm:p-8 space-y-6 ${
            isClosing ? "animate-modal-exit" : "animate-modal-enter"
          }`}
        >
        {/* Success Badge */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-8 ring-emerald-50">
            <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Membership Active</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Welcome to ChartCoach {planName}
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm">
            Payment confirmed! Your courses, practice tools, and AI Coach are ready to use.
          </p>
        </div>

        {/* Benefits Unlocked Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-1">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xl font-black text-slate-900 font-mono block">{coursesCount}</span>
            <span className="text-[11px] text-slate-500 font-semibold">Courses</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-1">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="text-xl font-black text-slate-900 font-mono block">{toolsCount}</span>
            <span className="text-[11px] text-slate-500 font-semibold">Trading Tools</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-1">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <span className="text-xl font-black text-slate-900 font-mono block">
              {monthlyGems.toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">AI Coach Gems</span>
          </div>
        </div>

        {/* Recommended Next Step */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200/60 text-left flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">
              Recommended First Step
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
              Chart Reading 101 — Technical Patterns
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Start building your pattern recognition instincts right away.
            </p>
          </div>
          <button
            type="button"
            onClick={handleContinueLearning}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shrink-0 transition-colors shadow-xs cursor-pointer"
            aria-label="Start course"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Action CTAs */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleContinueLearning}
            className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Start Learning Courses</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            onClick={handleExploreTools}
            className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Go to Trading Dashboard & Simulator
          </button>
        </div>
      </div>
    </div>
  </Portal>
  );
}
