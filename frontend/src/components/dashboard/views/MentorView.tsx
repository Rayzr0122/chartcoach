"use client";

import { useState, useRef, useEffect } from "react";
import { User } from "@/lib/api";

type CoachMode = "tutor" | "psychology" | "risk";

type Message = {
  id: string;
  sender: "user" | "mentor";
  text: string;
  time: string;
  mode?: CoachMode;
};

type MentorViewProps = {
  user: User;
};

const STARTER_PROMPTS: Record<CoachMode, string[]> = {
  tutor: [
    "Explain Support & Resistance like I am a beginner.",
    "What is the difference between a Hammer and a Bullish Engulfing candle?",
    "How does a Liquidity Sweep trap retail breakout traders?",
    "Why do moving averages lag and how should I use price action instead?",
  ],
  psychology: [
    "How do I stop myself from revenge trading after a loss?",
    "I get anxious when holding a winning trade. How do I fix this?",
    "How to overcome FOMO when the market explodes without me?",
    "What is the best 5-minute pre-market routine to stay calm?",
  ],
  risk: [
    "How do I calculate position size so I never risk more than 1%?",
    "Why is a 1:2.5 Risk-to-Reward ratio better than high win-rate?",
    "When should I move my stop loss to breakeven without getting stopped early?",
    "How many losses in a row should trigger a mandatory trading break?",
  ],
};

const SMART_RESPONSES: Record<string, string> = {
  "support & resistance": `**Support & Resistance in Plain English:**

Think of price like a bouncy rubber ball inside a 2-story building:
* **Support is the floor:** When the ball drops and hits the floor, buyers step in and bounce it back up.
* **Resistance is the ceiling:** When the ball flies up and hits the ceiling, sellers reject it back down.

**The Golden Rules for Beginners:**
1. **Zones, not lines:** Don't draw thin razor lines. Treat them as cushion zones of 5–15 points.
2. **Role Reversal:** When price breaks through a ceiling (Resistance) with high volume, that old ceiling becomes the new floor (Support) on a pullback.
3. **The 3rd Touch Rule:** The first 2 bounces establish the level. The 3rd touch often offers the cleanest trade setup.`,

  "hammer and a bullish engulfing": `**Hammer vs. Bullish Engulfing:**

Both are powerful bullish reversal signals, but they tell slightly different stories:

### 1. The Hammer (1-Candle Rejection)
* **What it looks like:** Small body at the top, long lower wick (at least 2x the body), little to no upper wick.
* **The Story:** Sellers pushed price down aggressively, but buyers overpowered them and pushed price all the way back up before the candle closed.
* **Where to trade it:** Must appear at a confirmed Support level or downward trend exhaustion.

### 2. The Bullish Engulfing (2-Candle Momentum Shift)
* **What it looks like:** A small red candle immediately followed by a large green candle whose body completely covers (engulfs) the previous red candle.
* **The Story:** Sellers were in control, but on the very next candle, buyers launched a total takeover with massive volume.

**Rule of Thumb:**
* Use the **Hammer** to catch bottom bounces with tight stop-losses.
* Use the **Engulfing** for confirmation of a strong trend change.`,

  "revenge trading": `**How to Stop Revenge Trading Permanently:**

Revenge trading happens when your brain experiences a loss as an attack on your ego, triggering a fight-or-flight adrenaline surge to "win your money back immediately."

**Here is the 3-Step Circuit Breaker System:**

1. **The 2-Loss Rule:**
   If you take 2 consecutive losses in a single day, shut down your trading terminal for a mandatory 60 minutes. Walk outside, drink water, or stretch.

2. **Normalize Losses as Operating Expenses:**
   Think of losses like the electric bill for a grocery store. Every profitable trading business has operating expenses. A loss is just an expense, not a personal failure.

3. **Log the Emotion in Your Journal:**
   Before placing any trade after a loss, ask yourself: *"Am I taking this because the chart setup is clean, or because I'm angry about the last trade?"* If the answer is anger, step away.`,

  "position size": `**The 1% Position Sizing Formula:**

Never trade based on arbitrary share quantities (e.g. "I always buy 100 shares"). Use this 3-step formula every single time:

$$\\text{Position Size (Shares)} = \\frac{\\text{Maximum Risk per Trade (₹)}}{\\text{Entry Price} - \\text{Stop Loss Price}}$$

### Real Example:
* **Your Total Capital:** ₹1,00,000
* **1% Maximum Risk:** ₹1,000
* **Stock Entry Price:** ₹500
* **Stop Loss Level:** ₹480 (₹20 risk per share)

$$\\text{Quantity} = \\frac{₹1,000}{₹20} = 50 \\text{ shares}$$

**Why this works:**
If the trade goes wrong and hits your stop loss at ₹480, you lose exactly ₹1,000 (1% of your account). You can endure 10 losses in a row and still have 90% of your capital intact!`,

  "fomo": `**Overcoming FOMO (Fear of Missing Out):**

When you see a stock rocket 5% without you, your instinct is to panic-buy at the top. This is the exact moment retail traders get dumped on by institutions.

**Remember these 3 Truths:**
1. **The Market is an endless conveyor belt:** Missed a train? Another one arrives in 15 minutes. High probability setups happen every day.
2. **Chasing has the worst Risk-to-Reward:** When you buy after 4 green candles, your stop loss has to be huge, but your upside is tiny.
3. **Wait for the Retest:** 80% of strong breakouts pull back to retest the breakout level. Let price come to you—never chase price.`,

  default: `Here is a clear, actionable breakdown:

1. **Focus on Market Structure:** Always determine whether the market is making Higher Highs (Uptrend) or Lower Lows (Downtrend) before entering.
2. **Define Your Risk First:** Before you look at potential profits, pinpoint your exact Stop Loss price where your idea is proven wrong.
3. **Patience is an Edge:** Professional traders spend 90% of their day waiting for their specific setup and only 10% executing.

Would you like a practical chart example or a step-by-step checklist for this concept?`,
};

export default function MentorView({ user }: MentorViewProps) {
  const [activeMode, setActiveMode] = useState<CoachMode>("tutor");
  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "mentor",
      text: `Hello ${user.full_name?.split(" ")[0] || "Trader"}! I am your personal trading mentor. 

Ask me anything about candlestick patterns, market structure, risk calculation, or trading psychology. I explain everything in plain, simple English without confusing jargon.`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mode: "tutor",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSend(queryText?: string) {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery("");
    setIsTyping(true);

    // Simulate smart plain-english response
    setTimeout(() => {
      const lower = textToSend.toLowerCase();
      let reply = SMART_RESPONSES.default;

      if (lower.includes("support") || lower.includes("resistance")) {
        reply = SMART_RESPONSES["support & resistance"];
      } else if (lower.includes("hammer") || lower.includes("engulfing")) {
        reply = SMART_RESPONSES["hammer and a bullish engulfing"];
      } else if (lower.includes("revenge") || lower.includes("loss")) {
        reply = SMART_RESPONSES["revenge trading"];
      } else if (lower.includes("position") || lower.includes("size") || lower.includes("1%")) {
        reply = SMART_RESPONSES["position size"];
      } else if (lower.includes("fomo") || lower.includes("miss")) {
        reply = SMART_RESPONSES["fomo"];
      }

      const mentorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "mentor",
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mode: activeMode,
      };

      setMessages((prev) => [...prev, mentorMsg]);
      setIsTyping(false);
    }, 750);
  }

  function handleClearChat() {
    setMessages([
      {
        id: "welcome-cleared",
        sender: "mentor",
        text: `Conversation reset. Choose a mode or ask a new question below!`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mode: activeMode,
      },
    ]);
  }

  return (
    <div className="space-y-5 animate-fade-up">
      {/* ─── SPECIALIST MODE SELECTOR BAR ─── */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
            Coach Mode:
          </span>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveMode("tutor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === "tutor"
                  ? "bg-white text-blue-700 shadow-xs border border-blue-100 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🎓</span>
              <span>Concept Tutor</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("psychology")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === "psychology"
                  ? "bg-white text-emerald-700 shadow-xs border border-emerald-100 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🧠</span>
              <span>Mindset & FOMO</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("risk")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === "risk"
                  ? "bg-white text-amber-700 shadow-xs border border-amber-100 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🛡️</span>
              <span>Risk & Sizing</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClearChat}
          className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 self-end sm:self-auto cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          <span>Clear Chat</span>
        </button>
      </section>

      {/* ─── QUICK PROMPTS CHIPS ─── */}
      <section className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
          Suggested:
        </span>
        {STARTER_PROMPTS[activeMode].map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(prompt)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-200/90 hover:border-blue-200 text-xs text-slate-700 hover:text-blue-700 font-medium whitespace-nowrap transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>💬</span>
            <span>{prompt}</span>
          </button>
        ))}
      </section>

      {/* ─── CHAT CONVERSATION CONTAINER ─── */}
      <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col h-[580px] overflow-hidden">
        {/* Messages Log */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 max-w-3xl ${
                msg.sender === "user" ? "ml-auto flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === "user"
                    ? "bg-gradient-to-tr from-slate-800 to-slate-600 text-white"
                    : "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20"
                }`}
              >
                {msg.sender === "user"
                  ? user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()
                  : "🤖"}
              </div>

              {/* Message Bubble */}
              <div
                className={`rounded-2xl p-4 text-xs sm:text-[13px] leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white rounded-tr-xs"
                    : "bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs space-y-2 whitespace-pre-line"
                }`}
              >
                <div className="prose prose-sm max-w-none text-current">
                  {msg.text}
                </div>

                <div
                  className={`text-[10px] font-mono mt-1 ${
                    msg.sender === "user" ? "text-blue-100 text-right" : "text-slate-400"
                  }`}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pl-11">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </span>
              <span>Mentor is crafting an explanation...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Bottom Input Field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3.5 border-t border-slate-200/80 bg-slate-50/50 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask anything (e.g. 'How to spot a fake breakout?')..."
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isTyping}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Send</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </section>
    </div>
  );
}
