"use client";

import { useEffect, useCallback, useState } from "react";
import {
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Smartphone,
  Building2,
  Lock,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Check,
} from "lucide-react";
import NumberFlow from "@number-flow/react";

import { Portal } from "@/components/ui/portal";
import { useModalAnimation } from "@/components/ui/use-modal-animation";
import { useAuth } from "@/context/AuthContext";

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */
declare global {
  interface Window {
    Razorpay?: any;
  }
}

export type RazorpayCheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  sessionData: {
    sessionId?: string;
    subscriptionId?: string;
    orderId?: string;
    keyId?: string;
    amount?: number; // paise
    finalPrice: number; // rupees
    originalAmount?: number;
    discountAmount?: number;
    planName: string;
    planSlug: string;
    interval?: string;
    couponCode?: string | null;
    isMock?: boolean;
  } | null;
  onPaymentSuccess: (paymentData: {
    paymentId: string;
    subscriptionId: string;
    signature: string;
  }) => Promise<void>;
  onPaymentFailure?: (errorMessage: string) => void;
};

/* ──────────────────────────────────────────────────────────
   Dynamically load Razorpay SDK
   ────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────── */
export function RazorpayCheckoutModal({
  isOpen,
  onClose,
  sessionData,
  onPaymentSuccess,
  onPaymentFailure,
}: RazorpayCheckoutModalProps) {
  const { user } = useAuth();
  const { isRendered, isClosing, handleClose } = useModalAnimation(isOpen, onClose);
  const [status, setStatus] = useState<"loading" | "ready" | "processing" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isSdkTriggered, setIsSdkTriggered] = useState(false);
  const [activeTab, setActiveTab] = useState<"upi" | "card" | "netbanking">("upi");
  const [upiId, setUpiId] = useState("");
  const [selectedBank, setSelectedBank] = useState("HDFC");
  const [processingStep, setProcessingStep] = useState("Connecting to Razorpay secure gateway...");

  useEffect(() => {
    let mounted = true;
    loadRazorpayScript().then((ok) => {
      if (mounted) setScriptLoaded(ok);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsSdkTriggered(false);
      setStatus("loading");
      setErrorMessage(null);
    }
  }, [isOpen]);

  const razorpayKeyId =
    sessionData?.keyId ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    "rzp_test_TbApMw9NgjSFHY";
  const isMockMode = sessionData?.isMock ?? false;

  const triggerRazorpayCheckout = useCallback(() => {
    if (!sessionData) return;

    if (!window.Razorpay) {
      setStatus("error");
      setErrorMessage("Razorpay payment gateway failed to load. Please check your connection.");
      return;
    }

    const isOrder = !!sessionData.orderId || sessionData.subscriptionId?.startsWith("order_");
    const orderIdToUse = sessionData.orderId || (sessionData.subscriptionId?.startsWith("order_") ? sessionData.subscriptionId : undefined);
    const subIdToUse = sessionData.subscriptionId?.startsWith("sub_") && !sessionData.subscriptionId.startsWith("sub_mock_")
      ? sessionData.subscriptionId
      : undefined;

    const options: any = {
      key: razorpayKeyId,
      amount: sessionData.amount || sessionData.finalPrice * 100,
      currency: "INR",
      name: "ChartCoach",
      description: `${sessionData.planName} Plan — ${sessionData.interval === "yearly" ? "Annual" : "Monthly"} Subscription`,
      order_id: isOrder ? orderIdToUse : undefined,
      subscription_id: subIdToUse,
      prefill: {
        ...(user?.full_name ? { name: user.full_name } : {}),
        ...(user?.email ? { email: user.email } : {}),
      },
      notes: {
        session_id: sessionData.sessionId || "",
        plan_slug: sessionData.planSlug,
        interval: sessionData.interval || "monthly",
      },
      theme: {
        color: "#2563eb",
        backdrop_color: "rgba(15, 23, 42, 0.65)",
      },
      modal: {
        confirm_close: true,
        ondismiss: () => {
          setStatus("ready");
          setIsSdkTriggered(false);
        },
      },
      handler: async (response: any) => {
        setStatus("processing");
        try {
          await onPaymentSuccess({
            paymentId: response.razorpay_payment_id,
            subscriptionId: response.razorpay_subscription_id || response.razorpay_order_id,
            signature: response.razorpay_signature,
          });
          setStatus("success");
        } catch (err: any) {
          setStatus("error");
          setErrorMessage(err.message || "Payment verification failed.");
          if (onPaymentFailure) onPaymentFailure(err.message || "Verification failed");
        }
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setStatus("error");
        const msg = response?.error?.description || "Payment failed at bank gateway.";
        setErrorMessage(msg);
        if (onPaymentFailure) onPaymentFailure(msg);
      });
      rzp.open();
      setIsSdkTriggered(true);
      setStatus("ready");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Could not launch Razorpay window.");
    }
  }, [sessionData, razorpayKeyId, onPaymentSuccess, onPaymentFailure]);

  useEffect(() => {
    if (!isOpen || !sessionData) return;

    if (isMockMode) {
      setStatus("ready");
      return;
    }

    if (scriptLoaded && !isSdkTriggered) {
      setStatus("ready");
      const timer = setTimeout(() => {
        triggerRazorpayCheckout();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, sessionData, scriptLoaded, isMockMode, isSdkTriggered, triggerRazorpayCheckout]);

  async function handleMockPayment() {
    if (!sessionData) return;
    setStatus("processing");
    try {
      const mockPaymentId = `pay_mock_${Date.now()}`;
      const mockSubId = sessionData.subscriptionId || `sub_mock_${Date.now()}`;
      const mockSignature = "mock_sig_" + Math.random().toString(36).substring(7);

      await onPaymentSuccess({
        paymentId: mockPaymentId,
        subscriptionId: mockSubId,
        signature: mockSignature,
      });
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Mock payment failed.");
      if (onPaymentFailure) onPaymentFailure(err.message || "Payment failed");
    }
  }

  const handlePrimaryAction = isMockMode ? handleMockPayment : triggerRazorpayCheckout;
  const errorMsg = errorMessage;
  const setErrorMsg = setErrorMessage;
  const openRazorpayPopup = triggerRazorpayCheckout;

  if (!isRendered || !sessionData) return null;

  const finalAmount = sessionData.finalPrice;
  const isYearly = sessionData.interval === "yearly";

  return (
    <Portal>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget && status !== "processing") {
            handleClose();
          }
        }}
        className={`fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md ${
          isClosing ? "animate-backdrop-out" : "animate-backdrop-in"
        }`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden transition-all ${
            isClosing ? "animate-modal-exit" : "animate-modal-enter"
          }`}
        >
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0 shadow-xs">
              <Lock className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-white">Razorpay Secure Checkout</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {isMockMode ? "Sandbox" : "Official Gateway"}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium block">
                ChartCoach Financial Systems • 256-Bit SSL Encrypted
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={status === "processing"}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* ── Order Summary Card ── */}
          <div className="rounded-2xl p-4.5 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
                  {isYearly ? "Annual Subscription" : "Monthly Subscription"}
                </span>
                {sessionData.couponCode && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {sessionData.couponCode} applied
                  </span>
                )}
              </div>
              <h4 className="text-lg font-black text-slate-900 mt-0.5">
                ChartCoach {sessionData.planName}
              </h4>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Instant access to courses, market simulator & AI Coach
              </span>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                <NumberFlow
                  value={finalAmount}
                  prefix="₹"
                  locales="en-IN"
                  className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight"
                />
              </div>
              <span className="text-[11px] text-slate-400 font-medium block">
                {isYearly ? "billed annually" : "billed monthly"}
              </span>
            </div>
          </div>

          {/* ── Loading State ── */}
          {status === "loading" && (
            <div className="text-center space-y-4 py-8">
              <div className="relative mx-auto w-12 h-12">
                <div className="absolute inset-0 rounded-full border-3 border-blue-100 border-t-blue-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Connecting to Razorpay</h3>
                <p className="text-xs text-slate-500 mt-1">Initializing secure payment channel…</p>
              </div>
            </div>
          )}

          {/* ── Live Mode Ready UI ── */}
          {status === "ready" && !isMockMode && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    R
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      Razorpay Gateway Connected
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Key: <code className="font-mono font-bold text-blue-700">{razorpayKeyId.slice(0, 14)}...</code>
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Live Test Ready
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Click below to launch the official Razorpay payment window. You can complete payment using UPI, NetBanking, or Razorpay Test Cards.
              </p>

              {/* Primary Action Button to Open Razorpay Popup */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <ExternalLink className="w-4.5 h-4.5" />
                  <span>Open Razorpay Checkout — ₹{finalAmount.toLocaleString("en-IN")}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel and return to plans
                </button>
              </div>
            </div>
          )}

          {/* ── Mock Mode UI (Only if no keys configured) ── */}
          {status === "ready" && isMockMode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Offline Sandbox Mode</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  Instant Test Checkout
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab("upi")}
                    className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === "upi" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>UPI / QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("card")}
                    className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === "card" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("netbanking")}
                    className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === "netbanking" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>NetBanking</span>
                  </button>
                </div>

                {activeTab === "upi" && (
                  <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">Popular UPI Apps</span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                        Fastest Checkout
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {["Google Pay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                        <button
                          key={app}
                          type="button"
                          onClick={() => setUpiId(`trader@${app.toLowerCase().replace(/\s+/g, "")}`)}
                          className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 text-center transition-all cursor-pointer group"
                        >
                          <span className="text-[11px] font-bold text-slate-800 block group-hover:text-blue-600">
                            {app}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-2">
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Or enter UPI ID
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="yourname@okhdfcbank"
                          className="flex-1 px-3.5 py-2 text-xs font-mono font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setUpiId("verified.trader@okhdfcbank")}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shrink-0"
                        >
                          Auto-fill
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "card" && (
                  <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">Credit or Debit Card</span>
                      <span className="text-[10px] text-slate-400">Visa, Mastercard, RuPay</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3 shadow-sm">
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>TEST CARD</span>
                        <span className="font-mono text-xs font-bold text-blue-400">VISA</span>
                      </div>
                      <div className="font-mono text-sm tracking-widest font-bold">
                        •••• •••• •••• 4242
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>EXP: 12/28</span>
                        <span>CVV: •••</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "netbanking" && (
                  <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3 animate-fade-in">
                    <span className="font-bold text-slate-800 text-xs block">Select Your Bank</span>
                    <div className="grid grid-cols-2 gap-2">
                      {["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Bank", "Other 50+ Banks"].map((bank) => (
                        <button
                          key={bank}
                          type="button"
                          onClick={() => setSelectedBank(bank)}
                          className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                            selectedBank === bank
                              ? "border-blue-600 bg-blue-50/50 text-blue-700 font-bold"
                              : "border-slate-200 hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          <span>{bank}</span>
                          {selectedBank === bank && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <ShieldCheck className="w-4.5 h-4.5" />
                  <span>Simulate Payment — ₹{finalAmount.toLocaleString("en-IN")}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Processing State ── */}
          {status === "processing" && (
            <div className="text-center space-y-5 py-8 animate-fade-in">
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 rounded-full border-3 border-blue-100 border-t-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-900">Authorizing Payment</h3>
                <p className="text-xs font-medium text-slate-500 max-w-xs mx-auto">
                  {processingStep}
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Do not close or refresh this window</span>
              </div>
            </div>
          )}

          {/* ── Success State ── */}
          {status === "success" && (
            <div className="text-center space-y-5 py-6 animate-scale-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 ring-8 ring-emerald-50">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Payment Verified!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Your ChartCoach {sessionData.planName} membership has been activated successfully.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
              >
                Proceed to Unlocked Dashboard
              </button>
            </div>
          )}

          {/* ── Error State ── */}
          {status === "error" && (
            <div className="text-center space-y-5 py-6 animate-scale-in">
              <div className="w-16 h-16 rounded-3xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Checkout Unsuccessful</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">{errorMsg}</p>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setStatus("ready");
                    setErrorMsg("");
                    if (!isMockMode) openRazorpayPopup();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Trust Bar */}
        <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>End-to-End Encrypted</span>
          </span>
          <span className="font-semibold text-slate-500">
            Powered by Razorpay
          </span>
        </div>
      </div>
    </div>
  </Portal>
  );
}
