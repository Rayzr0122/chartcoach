"use client";

import { useState } from "react";
import { X, ArrowDown, ShieldCheck, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { useModalAnimation } from "@/components/ui/use-modal-animation";

type DowngradeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: {
    name: string;
    slug: string;
    price: number;
    priceYearly?: number;
    description: string;
  };
  currentPlanName: string;
  renewalDate?: string;
  onConfirmDowngrade?: (targetPlanSlug: string) => Promise<void>;
};

export function DowngradeModal({
  isOpen,
  onClose,
  targetPlan,
  currentPlanName,
  renewalDate,
  onConfirmDowngrade,
}: DowngradeModalProps) {
  const { isRendered, isClosing, handleClose } = useModalAnimation(isOpen, onClose);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isRendered) return null;

  async function handleConfirm() {
    setIsProcessing(true);
    try {
      if (onConfirmDowngrade) {
        await onConfirmDowngrade(targetPlan.slug);
      }
      setIsConfirmed(true);
      setTimeout(() => {
        setIsConfirmed(false);
        handleClose();
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Portal>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget && !isProcessing) {
            handleClose();
          }
        }}
        className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md ${
          isClosing ? "animate-backdrop-out" : "animate-backdrop-in"
        }`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden ${
            isClosing ? "animate-modal-exit" : "animate-modal-enter"
          }`}
        >
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                <ArrowDown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  Switch to {targetPlan.name} Plan
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Changing from {currentPlanName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {isConfirmed ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                </div>
                <h4 className="text-lg font-black text-slate-900">Plan Change Scheduled</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Your subscription will switch to {targetPlan.name} on your next renewal date. You retain full {currentPlanName} access until then.
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/70 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>How your plan change works</span>
                  </div>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    You keep all your current <strong className="font-semibold">{currentPlanName}</strong> features, courses, and simulator access until the end of your current prepaid billing period{renewalDate ? ` (${renewalDate})` : ""}.
                  </p>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    Starting on your next renewal date, your subscription will be billed at the lower rate of <strong className="font-semibold">₹{targetPlan.price.toLocaleString("en-IN")}/month</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      New Plan
                    </span>
                    <span className="text-sm font-black text-slate-900">{targetPlan.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 font-mono">
                      ₹{targetPlan.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] text-slate-400 block font-medium">/ month</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleConfirm}
                    className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating plan preference...</span>
                      </>
                    ) : (
                      <span>Confirm Switch to {targetPlan.name}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isProcessing}
                    className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Keep My Current {currentPlanName} Plan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
