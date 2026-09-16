"use client";

import { useState } from "react";
import { Zap, Sparkles, Check, X, ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import { createGemCheckout, verifyGemPayment, GemPackage } from "@/lib/api";
import { Portal } from "@/components/ui/portal";
import { useModalAnimation } from "@/components/ui/use-modal-animation";

type BuyGemsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentBalance?: number;
};

const DEFAULT_PACKAGES: GemPackage[] = [
  {
    package_id: "gems_500",
    name: "Starter Pack",
    gems: 500,
    price: 199,
    currency: "INR",
    is_popular: false,
  },
  {
    package_id: "gems_1500",
    name: "Trader Pack",
    gems: 1500,
    price: 499,
    currency: "INR",
    is_popular: true,
  },
  {
    package_id: "gems_5000",
    name: "Master Pack",
    gems: 5000,
    price: 1299,
    currency: "INR",
    is_popular: false,
  },
];

export function BuyGemsModal({
  isOpen,
  onClose,
  onSuccess,
  currentBalance = 0,
}: BuyGemsModalProps) {
  const { isRendered, isClosing, handleClose } = useModalAnimation(isOpen, onClose);
  const [selectedPkgId, setSelectedPkgId] = useState("gems_1500");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isRendered) return null;

  async function handleBuy() {
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      const checkoutData = await createGemCheckout(selectedPkgId);
      const mockPayId = `pay_gem_${Date.now()}`;
      await verifyGemPayment(selectedPkgId, mockPayId);

      setSuccessMessage("Gems added to your account successfully!");
      setTimeout(() => {
        if (onSuccess) onSuccess();
        handleClose();
      }, 1100);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }

  const selectedPkg = DEFAULT_PACKAGES.find((p) => p.package_id === selectedPkgId) || DEFAULT_PACKAGES[1];

  return (
    <Portal>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget && !isProcessing) {
            handleClose();
          }
        }}
        className={`fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md ${
          isClosing ? "animate-backdrop-out" : "animate-backdrop-in"
        }`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden ${
            isClosing ? "animate-modal-exit" : "animate-modal-enter"
          }`}
        >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-white">
                  Add AI Coach Gems
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Instant Credit
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Current Balance: <span className="font-mono font-bold text-amber-400">{currentBalance.toLocaleString("en-IN")} Gems</span>
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

        {/* Content */}
        <div className="p-6 sm:p-7 space-y-5">
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Gems let you ask your personal AI Coach questions, analyze charts, and review trading decisions.
            Gems you buy never expire and stack with your subscription.
          </p>

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Package Options */}
          <div className="grid grid-cols-3 gap-3">
            {DEFAULT_PACKAGES.map((pkg) => {
              const isSelected = selectedPkgId === pkg.package_id;
              return (
                <div
                  key={pkg.package_id}
                  onClick={() => setSelectedPkgId(pkg.package_id)}
                  className={`relative rounded-2xl p-4 border text-center transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  {pkg.is_popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                      Best Value
                    </span>
                  )}
                  <div>
                    <span className="text-xl font-black text-slate-900 font-mono block mt-1">
                      {pkg.gems.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 block mt-0.5 flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3 fill-current" />
                      Gems
                    </span>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <span className="text-sm font-black text-slate-900 font-mono block">
                      ₹{pkg.price}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleBuy}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 group"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing Payment...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Credit {selectedPkg.gems.toLocaleString("en-IN")} Gems — ₹{selectedPkg.price}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Instant wallet credit • 256-Bit SSL Protected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Portal>
  );
}
