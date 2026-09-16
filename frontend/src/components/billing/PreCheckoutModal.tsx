"use client";

import { useState } from "react";
import {
  Check,
  Sparkles,
  ArrowRight,
  X,
  ShieldCheck,
  Tag,
  Loader2,
  Calendar,
  Lock,
  Zap,
  BookOpen,
  Wrench,
} from "lucide-react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { validateCoupon } from "@/lib/api";

type PreCheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    slug: string;
    name: string;
    price: number;
    priceYearly?: number;
    description: string;
    monthly_gems: number;
    included_courses: string[];
    included_tools: string[];
    simulator_access: string;
  };
  interval: "monthly" | "yearly";
  onProceedToPayment: (couponCode?: string) => Promise<void>;
  isPreparingCheckout: boolean;
};

export function PreCheckoutModal({
  isOpen,
  onClose,
  plan,
  interval,
  onProceedToPayment,
  isPreparingCheckout,
}: PreCheckoutModalProps) {
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalPrice: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  if (!isOpen) return null;

  const isYearly = interval === "yearly";
  const basePrice = isYearly ? (plan.priceYearly || Math.round(plan.price * 12 * 0.8)) : plan.price;
  const finalPrice = appliedCoupon ? appliedCoupon.finalPrice : basePrice;

  // Next renewal date
  const nextDate = new Date();
  if (isYearly) {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  } else {
    nextDate.setDate(nextDate.getDate() + 30);
  }
  const renewalDateStr = nextDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await validateCoupon(couponCode.trim(), plan.slug, interval);
      if (res.valid && res.discountAmount !== undefined && res.finalPrice !== undefined) {
        setAppliedCoupon({
          code: res.code || couponCode.toUpperCase(),
          discountAmount: res.discountAmount,
          finalPrice: res.finalPrice,
        });
      } else {
        setCouponError(res.message || "Invalid coupon code.");
        setAppliedCoupon(null);
      }
    } catch (err: any) {
      setCouponError(err.message || "Error validating coupon.");
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-[3px] animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-white">
                  Review your order
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white">
                  {plan.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isYearly ? "Annual plan (save 20%)" : "Monthly plan · Cancel anytime"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPreparingCheckout}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Price Breakdown Card */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
            <NumberFlowGroup>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-slate-600">Base Price ({interval})</span>
                <NumberFlow
                  value={basePrice}
                  prefix="₹"
                  locales="en-IN"
                  className="text-sm font-bold text-slate-900 font-mono"
                />
              </div>

              {appliedCoupon && (
                <div className="flex items-baseline justify-between text-emerald-700">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Discount Applied ({appliedCoupon.code})
                  </span>
                  <span className="text-sm font-bold font-mono">
                    -<NumberFlow value={appliedCoupon.discountAmount} prefix="₹" locales="en-IN" />
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200/80 flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-black text-slate-900 block">Total Due Today</span>
                  <span className="text-[11px] text-slate-400 font-medium">All taxes & platform fees included</span>
                </div>
                <div className="text-right">
                  <NumberFlow
                    value={finalPrice}
                    prefix="₹"
                    locales="en-IN"
                    className="text-2xl sm:text-3xl font-black text-slate-900 font-mono"
                  />
                  <span className="text-[11px] text-slate-400 font-medium block">
                    {isYearly ? "billed annually" : "billed monthly"}
                  </span>
                </div>
              </div>
            </NumberFlowGroup>

            <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Renews on {renewalDateStr} • Cancel anytime</span>
            </div>
          </div>

          {/* Coupon Code Section */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Have a promotional discount code?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME20"
                className="flex-1 px-3.5 py-2.5 text-xs uppercase font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={isValidatingCoupon || !couponCode.trim()}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {isValidatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Apply</span>}
              </button>
            </div>
            {couponError && <p className="text-[11px] font-semibold text-red-600">{couponError}</p>}
            {appliedCoupon && (
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Promo code {appliedCoupon.code} applied!
              </p>
            )}
          </div>

          {/* Inclusions Highlights */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              What you unlock today:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                </div>
                <span className="font-semibold text-[11px]">
                  {plan.monthly_gems.toLocaleString("en-IN")} AI gems / mo
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-[11px]">
                  {plan.included_courses.length} Course{plan.included_courses.length > 1 ? "s" : ""} included
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-[11px]">
                  {plan.included_tools.length} Trading tools
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-[11px]">
                  {plan.simulator_access === "full" ? "Market Simulator" : "Essential tools"}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              disabled={isPreparingCheckout}
              onClick={() => onProceedToPayment(appliedCoupon?.code)}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 group"
            >
              {isPreparingCheckout ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to secure checkout...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Continue to Payment</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                Secure Razorpay checkout
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                Cancel anytime in Settings
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
