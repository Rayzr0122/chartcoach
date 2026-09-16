"use client";

import { useState, useEffect } from "react";
import {
  Check,
  ArrowRight,
  X,
  ShieldCheck,
  Tag,
  Loader2,
  Lock,
  Crown,
  Sparkles,
} from "lucide-react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { Portal } from "@/components/ui/portal";
import { useModalAnimation } from "@/components/ui/use-modal-animation";
import {
  validateCoupon,
  createSubscriptionCheckout,
  verifySubscriptionPayment,
  SubscriptionPlan,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type BillingCheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan;
  initialInterval?: "monthly" | "yearly";
  leftImageSrc?: string;
  onSuccess: (data: {
    planName: string;
    planSlug: string;
    monthlyGems: number;
    coursesCount: number;
    toolsCount: number;
  }) => void;
  onError?: (err: string) => void;
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      if ((existing as HTMLScriptElement).dataset.loaded === "true" || window.Razorpay) {
        return resolve(true);
      }
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve(true);
    };
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function BillingCheckoutModal({
  isOpen,
  onClose,
  plan,
  initialInterval = "monthly",
  leftImageSrc = "/assets/packages/upgrade-chartcoachpro.png",
  onSuccess,
  onError,
}: BillingCheckoutModalProps) {
  const { user, refreshUser } = useAuth();
  const [interval, setInterval] = useState<"monthly" | "yearly">(initialInterval);
  const [isAnnualAnimActive, setIsAnnualAnimActive] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalPrice: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const { isRendered, isClosing, handleClose } = useModalAnimation(isOpen, onClose);

  useEffect(() => {
    setInterval(initialInterval);
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponError(null);
    setStatusNotice(null);
  }, [isOpen, initialInterval, plan]);

  if (!isRendered) return null;

  const isYearly = interval === "yearly";
  const yearlyPrice = plan.price_yearly || Math.round(plan.price * 12 * 0.8);
  const basePrice = isYearly ? yearlyPrice : plan.price;
  const finalPrice = appliedCoupon ? appliedCoupon.finalPrice : basePrice;

  // Renewal date computation
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

  async function handleStartPayment() {
    setIsProcessingPayment(true);
    setStatusNotice(null);

    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady || !window.Razorpay) {
        throw new Error("Razorpay payment gateway could not be loaded. Please check your connection.");
      }

      // 1. Create order/checkout session
      const session = await createSubscriptionCheckout(
        plan.slug,
        interval,
        appliedCoupon?.code
      );

      const razorpayKey = session.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_TbApMw9NgjSFHY";
      const sessionAny = session as any;
      const isOrder = !!sessionAny.orderId || session.subscriptionId?.startsWith("order_");
      const orderIdToUse = sessionAny.orderId || (session.subscriptionId?.startsWith("order_") ? session.subscriptionId : undefined);
      const subIdToUse = session.subscriptionId?.startsWith("sub_") && !session.subscriptionId.startsWith("sub_mock_")
        ? session.subscriptionId
        : undefined;

      const options: any = {
        key: razorpayKey,
        amount: session.amount || session.finalPrice * 100,
        currency: "INR",
        name: "ChartCoach",
        description: `${plan.name} Plan — ${isYearly ? "Annual" : "Monthly"} Subscription`,
        order_id: isOrder ? orderIdToUse : undefined,
        subscription_id: subIdToUse,
        prefill: {
          ...(user?.full_name ? { name: user.full_name } : {}),
          ...(user?.email ? { email: user.email } : {}),
        },
        notes: {
          session_id: session.sessionId || "",
          plan_slug: plan.slug,
          interval: interval,
        },
        theme: {
          color: "#2563eb",
          backdrop_color: "rgba(15, 23, 42, 0.65)",
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setIsProcessingPayment(false);
            setStatusNotice("Payment was dismissed. You can try again whenever you're ready.");
          },
        },
        handler: async (response: any) => {
          try {
            setStatusNotice("Verifying payment confirmation...");
            await verifySubscriptionPayment({
              plan: plan.slug,
              interval: interval,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id || response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              coupon_code: appliedCoupon?.code,
              session_id: session.sessionId,
            });

            await refreshUser();
            handleClose();
            onSuccess({
              planName: plan.name,
              planSlug: plan.slug,
              monthlyGems: plan.monthly_gems,
              coursesCount: plan.included_courses.length,
              toolsCount: plan.included_tools.length,
            });
          } catch (err: any) {
            setIsProcessingPayment(false);
            const msg = err.message || "Payment verification failed.";
            setStatusNotice(msg);
            if (onError) onError(msg);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (failRes: any) => {
        setIsProcessingPayment(false);
        const errMsg = failRes?.error?.description || "Payment was declined by your bank or UPI app.";
        setStatusNotice(errMsg);
        if (onError) onError(errMsg);
      });

      rzp.open();
    } catch (err: any) {
      setIsProcessingPayment(false);
      const msg = err.message || "Could not connect to payment gateway.";
      setStatusNotice(msg);
      if (onError) onError(msg);
    }
  }

  return (
    <Portal>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget && !isProcessingPayment) {
            handleClose();
          }
        }}
        className={`fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md overflow-y-auto ${
          isClosing ? "animate-backdrop-out" : "animate-backdrop-in"
        }`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-5xl bg-white rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-200/90 overflow-hidden my-auto flex flex-col md:flex-row items-stretch ${
            isClosing ? "animate-modal-exit" : "animate-modal-enter"
          }`}
        >
          {/* ── Left Column: Flex Illustration Graphic ── */}
          <div className="w-full md:w-[50%] lg:w-[52%] relative bg-slate-900 overflow-hidden min-h-[300px] sm:min-h-[380px] md:min-h-[640px] flex flex-col justify-between shrink-0">
            {/* Background Illustration Image */}
            <img
              src={leftImageSrc}
              alt={plan.name}
              className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none"
            />

            {/* Top-Left Brand Overlay Badge */}
            <div className="relative z-10 p-5 sm:p-6 flex items-center gap-2 pointer-events-none">
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full shadow-xs border border-white/60">
                <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-black text-slate-900 text-xs tracking-tight">
                  ChartCoach <span className="text-blue-600">{plan.name}</span>
                </span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 bg-white/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/60 hidden sm:inline-block">
                LEARN • PRACTICE • TRADE SMARTER
              </span>
            </div>
          </div>

          {/* ── Right Column: Interactive Checkout Form ── */}
          <div className="w-full md:w-[50%] lg:w-[48%] flex flex-col justify-between p-5 sm:p-7 md:p-8 bg-white space-y-4 sm:space-y-5">
            {/* Top Header Row */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 leading-tight">
                    Secure Checkout
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Your payment is encrypted and safe
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessingPayment}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Choose Billing Frequency */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-black text-[11px] flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                    Choose Billing Frequency
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Save more with annual billing
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {/* Monthly Card */}
                <div
                  onClick={() => {
                    setInterval("monthly");
                    setAppliedCoupon(null);
                  }}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    interval === "monthly"
                      ? "border-blue-600 bg-blue-50/40 shadow-xs"
                      : "border-slate-200/90 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        interval === "monthly" ? "border-blue-600" : "border-slate-300"
                      }`}
                    >
                      {interval === "monthly" && (
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <span className="text-xs font-black text-slate-900">Monthly</span>
                  </div>
                  <div>
                    <NumberFlow
                      value={plan.price}
                      prefix="₹"
                      locales="en-IN"
                      className="text-base sm:text-lg font-black text-slate-900 font-mono"
                    />
                    <span className="text-[11px] text-slate-400 font-medium ml-1">/mo</span>
                  </div>
                </div>

                {/* Annual Card */}
                <div
                  onClick={() => {
                    setInterval("yearly");
                    setAppliedCoupon(null);
                    setIsAnnualAnimActive(true);
                    setTimeout(() => setIsAnnualAnimActive(false), 900);
                  }}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                    interval === "yearly"
                      ? `border-blue-600 bg-blue-50/40 shadow-xs ${isAnnualAnimActive ? "ring-2 ring-emerald-400/80 animate-annual-glow" : ""}`
                      : "border-slate-200/90 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          interval === "yearly" ? "border-blue-600" : "border-slate-300"
                        }`}
                      >
                        {interval === "yearly" && (
                          <div className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <span className="text-xs font-black text-slate-900">Annual</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-700 shrink-0 flex items-center gap-1 transition-transform ${
                        interval === "yearly" && isAnnualAnimActive ? "animate-celebration ring-1 ring-emerald-400/80" : ""
                      }`}
                    >
                      <Sparkles className={`w-2.5 h-2.5 ${isAnnualAnimActive ? "animate-spin text-amber-500" : ""}`} />
                      <span>Save 20%</span>
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <NumberFlow
                        value={yearlyPrice}
                        prefix="₹"
                        locales="en-IN"
                        className="text-base sm:text-lg font-black text-slate-900 font-mono"
                      />
                      <span className="text-[11px] text-slate-400 font-medium">/yr</span>
                      <span className="text-[11px] text-slate-400 line-through ml-1">
                        <NumberFlow value={plan.price * 12} prefix="₹" locales="en-IN" />
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Billed once a year (<NumberFlow value={Math.round(yearlyPrice / 12)} prefix="₹" locales="en-IN" />/mo)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Order Summary */}
            <div className="space-y-2.5 pt-3.5 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-black text-[11px] flex items-center justify-center shrink-0">
                    2
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                    Order Summary
                  </h4>
                </div>
                <span className="text-xs font-bold text-blue-600">
                  {isYearly ? "Annual Plan" : "Monthly Plan"}
                </span>
              </div>

              {/* Price Breakdown */}
              <NumberFlowGroup>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Base Subscription</span>
                    <NumberFlow
                      value={basePrice}
                      prefix="₹"
                      locales="en-IN"
                      className="font-bold text-slate-900 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium flex items-center gap-1">
                      <span>Taxes & Gateway Fees</span>
                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-100 text-slate-400 text-[9px] font-bold">
                        i
                      </span>
                    </span>
                    <span className="font-bold text-emerald-600">Included (₹0)</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex items-center justify-between text-emerald-600 font-bold">
                      <span>Coupon Discount ({appliedCoupon.code})</span>
                      <span>
                        -<NumberFlow value={appliedCoupon.discountAmount} prefix="₹" locales="en-IN" />
                      </span>
                    </div>
                  )}
                </div>

                {/* Promo Code Input */}
                <div>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                        <span className="font-bold">Code {appliedCoupon.code} applied!</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAppliedCoupon(null)}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 underline font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                        <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleApplyCoupon();
                            }
                          }}
                          placeholder="Enter promo code"
                          className="w-full bg-transparent text-xs font-mono font-bold uppercase placeholder:text-slate-400 placeholder:normal-case focus:outline-hidden"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || isValidatingCoupon}
                        className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 shrink-0"
                      >
                        {isValidatingCoupon ? "..." : "Apply"}
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-[11px] text-red-600 font-medium mt-1">{couponError}</p>
                  )}
                </div>

                {/* Total Due Today Box */}
                <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-3 sm:p-3.5 text-center space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Due Today
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                    <NumberFlow
                      value={finalPrice}
                      prefix="₹"
                      locales="en-IN"
                      className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight"
                    />
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                    Renews on {renewalDateStr} • Cancel anytime
                  </p>
                </div>
              </NumberFlowGroup>
            </div>

            {/* Step 3: Checkout CTA & Terms Footer */}
            <div className="space-y-2.5 pt-1">
              {statusNotice && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium text-center">
                  {statusNotice}
                </div>
              )}

              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleStartPayment}
                className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-sm sm:text-base shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 group"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connecting to Razorpay...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span className="flex items-center gap-1">
                      <span>Pay</span>
                      <NumberFlow value={finalPrice} prefix="₹" locales="en-IN" />
                      <span>with Razorpay</span>
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <p className="text-[10px] sm:text-[11px] text-slate-400 text-center font-medium">
                By proceeding, you agree to our{" "}
                <span className="text-slate-600 hover:underline cursor-pointer">Terms of Service</span>{" "}
                and{" "}
                <span className="text-slate-600 hover:underline cursor-pointer">Privacy Policy</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
