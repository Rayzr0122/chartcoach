"use client";

import { useState } from "react";
import { AlertCircle, X, ShieldCheck, Loader2, HeartHandshake } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { useModalAnimation } from "@/components/ui/use-modal-animation";

type CancellationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  currentPeriodEnd?: string | null;
  onConfirmCancel: (reason: string) => Promise<void>;
};

const REASONS = [
  "Looking for something more affordable",
  "Finished the courses I needed",
  "Taking a break from learning",
  "Looking for different features or tools",
  "Other reason",
];

export function CancellationModal({
  isOpen,
  onClose,
  planName,
  currentPeriodEnd,
  onConfirmCancel,
}: CancellationModalProps) {
  const { isRendered, isClosing, handleClose } = useModalAnimation(isOpen, onClose);
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isRendered) return null;

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      await onConfirmCancel(selectedReason);
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Portal>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) {
            handleClose();
          }
        }}
        className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md ${
          isClosing ? "animate-backdrop-out" : "animate-backdrop-in"
        }`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden p-6 sm:p-7 space-y-5 ${
            isClosing ? "animate-modal-exit" : "animate-modal-enter"
          }`}
        >
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-2">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-slate-900">
            Cancel your {planName} plan?
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Your {planName} access (courses, market simulator, and AI Coach) will
            remain fully active until the end of your current billing period
            {currentPeriodEnd ? ` on ${currentPeriodEnd}` : ""}. You will not be charged again.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Feedback on your experience:
          </span>
          <div className="space-y-1.5">
            {REASONS.map((r) => (
              <label
                key={r}
                className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-100/60 transition-colors"
              >
                <input
                  type="radio"
                  name="cancellation_reason"
                  checked={selectedReason === r}
                  onChange={() => setSelectedReason(r)}
                  className="text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span className="font-medium">{r}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            Keep My {planName} Membership
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="w-full py-2.5 px-4 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing cancellation...</span>
              </>
            ) : (
              <span>Proceed to Cancel Auto-Renewal</span>
            )}
          </button>
        </div>
      </div>
    </div>
  </Portal>
  );
}
