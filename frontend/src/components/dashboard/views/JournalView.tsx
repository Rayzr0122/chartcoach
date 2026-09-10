"use client";

import { useState } from "react";
import { User } from "@/lib/api";

export type EmotionTag = "Calm" | "Confident" | "Anxious" | "FOMO" | "Revenge";

export type JournalTrade = {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  isWin: boolean;
  emotion: EmotionTag;
  setup: string;
  notes: string;
  date: string;
  time: string;
};

type JournalViewProps = {
  user: User;
};

const EMOTION_COLORS: Record<EmotionTag, { bg: string; text: string; border: string; icon: string }> = {
  Calm: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: "🧘" },
  Confident: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: "🎯" },
  Anxious: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: "😰" },
  FOMO: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", icon: "🚀" },
  Revenge: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: "😡" },
};

export default function JournalView({ user }: JournalViewProps) {
  const storageKey = `chartcoach_journal_${user.email}`;

  const [trades, setTrades] = useState<JournalTrade[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    // Default seed trades to show the feature richness
    return [
      {
        id: "seed-1",
        symbol: "NIFTY 50",
        side: "LONG",
        entryPrice: 22400,
        exitPrice: 22480,
        pnl: 4000,
        isWin: true,
        emotion: "Calm",
        setup: "Hammer Bounce at 20 EMA Support",
        notes: "Waited patiently for 5m candle close above EMA. Took 1:2 R:R.",
        date: "Today",
        time: "10:15 AM",
      },
      {
        id: "seed-2",
        symbol: "BankNIFTY",
        side: "SHORT",
        entryPrice: 47800,
        exitPrice: 47620,
        pnl: 4500,
        isWin: true,
        emotion: "Confident",
        setup: "Evening Star Rejection at Resistance",
        notes: "Heavy institutional sell volume confirmed the reversal.",
        date: "Today",
        time: "11:40 AM",
      },
      {
        id: "seed-3",
        symbol: "NIFTY 50",
        side: "LONG",
        entryPrice: 22520,
        exitPrice: 22490,
        pnl: -1500,
        isWin: false,
        emotion: "FOMO",
        setup: "Chased 3rd green candle breakout",
        notes: "Entered without waiting for pullback. Got stopped out at support.",
        date: "Yesterday",
        time: "02:15 PM",
      },
    ];
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [filterEmotion, setFilterEmotion] = useState<string>("All");

  // Form State
  const [formSymbol, setFormSymbol] = useState("NIFTY 50");
  const [formSide, setFormSide] = useState<"LONG" | "SHORT">("LONG");
  const [formEntry, setFormEntry] = useState("");
  const [formExit, setFormExit] = useState("");
  const [formPnL, setFormPnL] = useState("");
  const [formEmotion, setFormEmotion] = useState<EmotionTag>("Calm");
  const [formSetup, setFormSetup] = useState("Support/Resistance Bounce");
  const [formNotes, setFormNotes] = useState("");

  function saveTradesToStorage(newTrades: JournalTrade[]) {
    setTrades(newTrades);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newTrades));
      } catch {
        // Ignore
      }
    }
  }

  function handleAddTrade(e: React.FormEvent) {
    e.preventDefault();
    const pnlNum = parseFloat(formPnL) || 0;
    const newTrade: JournalTrade = {
      id: Date.now().toString(),
      symbol: formSymbol.trim() || "NIFTY 50",
      side: formSide,
      entryPrice: parseFloat(formEntry) || 0,
      exitPrice: parseFloat(formExit) || 0,
      pnl: pnlNum,
      isWin: pnlNum > 0,
      emotion: formEmotion,
      setup: formSetup.trim() || "Price Action",
      notes: formNotes.trim(),
      date: "Today",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = [newTrade, ...trades];
    saveTradesToStorage(updated);
    setShowAddModal(false);

    // Reset Form
    setFormEntry("");
    setFormExit("");
    setFormPnL("");
    setFormNotes("");
  }

  function handleDeleteTrade(id: string) {
    const updated = trades.filter((t) => t.id !== id);
    saveTradesToStorage(updated);
  }

  // Analytics
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.isWin);
  const losses = trades.filter((t) => !t.isWin);
  const winRate = totalTrades > 0 ? Math.round((wins.length / totalTrades) * 100) : 0;
  const totalPnL = trades.reduce((acc, t) => acc + t.pnl, 0);

  // Behavioral correlation
  const calmTrades = trades.filter((t) => t.emotion === "Calm" || t.emotion === "Confident");
  const calmWins = calmTrades.filter((t) => t.isWin).length;
  const calmWinRate = calmTrades.length > 0 ? Math.round((calmWins / calmTrades.length) * 100) : 0;

  const emotionalTrades = trades.filter((t) => t.emotion === "FOMO" || t.emotion === "Revenge" || t.emotion === "Anxious");
  const emotionalWins = emotionalTrades.filter((t) => t.isWin).length;
  const emotionalWinRate = emotionalTrades.length > 0 ? Math.round((emotionalWins / emotionalTrades.length) * 100) : 0;

  // Filtered List
  const filteredTrades = trades.filter((t) => {
    if (filterEmotion === "All") return true;
    return t.emotion === filterEmotion;
  });

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ─── HEADER & METRIC SUMMARY ─── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Logged Trades
          </span>
          <span className="text-2xl font-extrabold text-slate-900">{totalTrades}</span>
          <span className="text-xs text-slate-400 block mt-0.5">{wins.length}W - {losses.length}L</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Overall Win Rate
          </span>
          <span className="text-2xl font-extrabold text-blue-600">{winRate}%</span>
          <span className="text-xs text-slate-400 block mt-0.5">Historical execution</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Net P&L
          </span>
          <span className={`text-2xl font-extrabold ${totalPnL >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {totalPnL >= 0 ? `+₹${totalPnL.toLocaleString()}` : `-₹${Math.abs(totalPnL).toLocaleString()}`}
          </span>
          <span className="text-xs text-slate-400 block mt-0.5">Simulated balance</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Calm vs FOMO Edge
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-emerald-600">{calmWinRate}%</span>
            <span className="text-xs text-slate-400">vs {emotionalWinRate}%</span>
          </div>
          <span className="text-xs text-slate-500 block mt-0.5">+{(calmWinRate - emotionalWinRate)}% edge when calm</span>
        </div>
      </section>

      {/* ─── AI BEHAVIORAL PSYCHOLOGY INSIGHT ─── */}
      <section className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 text-xl font-bold">
            🧠
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
              AI Behavioral Insights Engine
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
              Your Win Rate is {calmWinRate}% when Calm vs {emotionalWinRate}% when in FOMO / Revenge
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Data proves that your technical edge disappears when entering impulsively. Before taking any trade, tag your mindset. If you feel FOMO or anger, take a mandatory 15-minute breather.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-500/20 shrink-0 cursor-pointer flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Log New Trade</span>
        </button>
      </section>

      {/* ─── FILTER ROW & JOURNAL TABLE ─── */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
              Filter Emotion:
            </span>
            {["All", "Calm", "Confident", "Anxious", "FOMO", "Revenge"].map((emo) => (
              <button
                key={emo}
                type="button"
                onClick={() => setFilterEmotion(emo)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  filterEmotion === emo
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {emo}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-mono">
            {filteredTrades.length} trades found
          </span>
        </div>

        {/* Trade Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Date / Time</th>
                <th className="py-2.5 px-3">Symbol & Side</th>
                <th className="py-2.5 px-3">Entry / Exit</th>
                <th className="py-2.5 px-3">Setup Rationale</th>
                <th className="py-2.5 px-3">Emotional Mindset</th>
                <th className="py-2.5 px-3 text-right">Net P&L</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No trades match your filter. Click &quot;Log New Trade&quot; to add one.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const emoStyle = EMOTION_COLORS[t.emotion] || EMOTION_COLORS.Calm;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-slate-500 font-mono">
                        <div>{t.date}</div>
                        <div className="text-[10px] text-slate-400">{t.time}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{t.symbol}</div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            t.side === "LONG"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {t.side}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600">
                        <div>Entry: ₹{t.entryPrice.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400">Exit: ₹{t.exitPrice.toLocaleString()}</div>
                      </td>

                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-medium text-slate-800 truncate">{t.setup}</div>
                        {t.notes && <div className="text-[11px] text-slate-400 truncate">{t.notes}</div>}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${emoStyle.bg} ${emoStyle.text} ${emoStyle.border}`}
                        >
                          <span>{emoStyle.icon}</span>
                          <span>{t.emotion}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-sm">
                        <span className={t.pnl >= 0 ? "text-emerald-600" : "text-rose-600"}>
                          {t.pnl >= 0 ? `+₹${t.pnl.toLocaleString()}` : `-₹${Math.abs(t.pnl).toLocaleString()}`}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteTrade(t.id)}
                          className="p-1 rounded text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Trade"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── MODAL: LOG NEW TRADE ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-overlay-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fade-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Log Simulated Trade</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddTrade} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Asset / Symbol</label>
                  <input
                    type="text"
                    value={formSymbol}
                    onChange={(e) => setFormSymbol(e.target.value)}
                    placeholder="e.g. NIFTY 50"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Trade Direction</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormSide("LONG")}
                      className={`py-2 rounded-xl font-bold cursor-pointer transition-all ${
                        formSide === "LONG"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormSide("SHORT")}
                      className={`py-2 rounded-xl font-bold cursor-pointer transition-all ${
                        formSide === "SHORT"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      SHORT
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Entry Price (₹)</label>
                  <input
                    type="number"
                    value={formEntry}
                    onChange={(e) => setFormEntry(e.target.value)}
                    placeholder="22400"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Exit Price (₹)</label>
                  <input
                    type="number"
                    value={formExit}
                    onChange={(e) => setFormExit(e.target.value)}
                    placeholder="22480"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Net P&L (₹)</label>
                  <input
                    type="number"
                    value={formPnL}
                    onChange={(e) => setFormPnL(e.target.value)}
                    placeholder="+3500 or -1200"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  How were you feeling when entering? (Psychology Tag)
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(["Calm", "Confident", "Anxious", "FOMO", "Revenge"] as EmotionTag[]).map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => setFormEmotion(emo)}
                      className={`p-2 rounded-xl text-center border font-bold transition-all cursor-pointer ${
                        formEmotion === emo
                          ? "border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-base mb-0.5">{EMOTION_COLORS[emo].icon}</div>
                      <div className="text-[10px]">{emo}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Setup / Pattern Rationale</label>
                <input
                  type="text"
                  value={formSetup}
                  onChange={(e) => setFormSetup(e.target.value)}
                  placeholder="e.g. Bullish Engulfing at 20 EMA Support"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Lessons Learned</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="What went well? Did you follow your risk rules?"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Save Trade Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
