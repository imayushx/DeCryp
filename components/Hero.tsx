"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CHAINS = [
  { value: "ethereum", label: "ETH" },
  { value: "base", label: "BASE" },
  { value: "polygon", label: "MATIC" },
  { value: "arbitrum", label: "ARB" },
  { value: "optimism", label: "OP" },
];

type TabMode = "pre-sign" | "post-sign";

const TABS: { mode: TabMode; label: string }[] = [
  { mode: "pre-sign", label: "Check Before Signing" },
  { mode: "post-sign", label: "Decode Past Transaction" },
];

const TAB_CONFIG: Record<TabMode, {
  placeholder: string;
  helper: string;
  button: string;
  cards: { label: string; sub: string }[];
}> = {
  "pre-sign": {
    placeholder: "Paste calldata from your wallet popup, a contract address, or hex data you're about to sign...",
    helper: "Find this in your wallet's transaction details before you confirm. MetaMask shows it under 'Hex Data'.",
    button: "Is This Safe?",
    cards: [
      { label: "Before You Sign", sub: "Know if it's safe before you commit" },
      { label: "Risk Score", sub: "LOW → DANGER, instantly" },
      { label: "Red Flag Detection", sub: "Catches scams & unverified contracts" },
    ],
  },
  "post-sign": {
    placeholder: "Paste a completed transaction hash (0x...) to understand what already happened...",
    helper: "Find this on Etherscan, in your wallet's activity history, or in any block explorer.",
    button: "Decode Transaction",
    cards: [
      { label: "Understand the Past", sub: "See exactly what happened" },
      { label: "Plain English", sub: "No jargon, no confusion" },
      { label: "Red Flag Detection", sub: "Know if you were scammed after the fact" },
    ],
  },
};

interface HeroProps {
  onDecode: (input: string, chain: string, mode: TabMode) => void;
  onDemo: () => void;
  loading: boolean;
}

export default function Hero({ onDecode, onDemo, loading }: HeroProps) {
  const [activeTab, setActiveTab] = useState<TabMode>("pre-sign");
  const [input, setInput] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [focused, setFocused] = useState(false);

  const cfg = TAB_CONFIG[activeTab];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) onDecode(input.trim(), chain, activeTab);
  };

  const switchTab = (mode: TabMode) => {
    if (mode !== activeTab) {
      setActiveTab(mode);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full flex items-center justify-between py-5 px-1"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.18)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="#00ff88" strokeWidth="1.8"/>
              <path d="M8 11V7a4 4 0 018 0v4" stroke="#00ff88" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-semibold text-[15px] tracking-tight" style={{ color: "#f1f0f5" }}>DeCryp</span>
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded tracking-widest"
            style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88" }}
          >
            BETA
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" style={{ boxShadow: "0 0 6px #00ff88" }} />
          <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>No wallet · Free</span>
        </div>
      </motion.nav>

      {/* Hero heading */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mt-20 mb-10 px-2"
      >
        <p className="text-[11px] font-mono tracking-[0.2em] uppercase mb-6" style={{ color: "var(--text-tertiary)" }}>
          Transaction Intelligence
        </p>
        <h1 className="text-5xl sm:text-[64px] font-bold leading-[1.05] tracking-tight mb-5 max-w-[720px]">
          <span style={{ color: "#f1f0f5" }}>Know what you&apos;re</span>
          <br />
          <span style={{
            background: "linear-gradient(135deg, #00ff88 0%, #00d4ff 60%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            signing.
          </span>
        </h1>
        <p className="text-base max-w-[420px] mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Analyze any transaction before you sign it — or decode past transactions to understand what happened.
        </p>
      </motion.div>

      {/* Input panel */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={handleSubmit}
        className="w-full max-w-[640px]"
      >
        {/* Tab switcher */}
        <div className="flex mb-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.mode;
            return (
              <button
                key={tab.mode}
                type="button"
                onClick={() => switchTab(tab.mode)}
                className="relative px-4 py-3 text-sm font-medium transition-colors duration-200 focus:outline-none"
                style={{ color: active ? "#f1f0f5" : "var(--text-tertiary)" }}
              >
                {tab.label}
                {active && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t"
                    style={{ background: "#00ff88" }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Input box */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="rounded-b-2xl rounded-tr-2xl transition-all duration-300 mt-3"
              style={{
                background: "rgba(15,15,23,0.8)",
                backdropFilter: "blur(24px)",
                border: focused
                  ? "1px solid rgba(0,255,136,0.35)"
                  : "1px solid rgba(255,255,255,0.07)",
                boxShadow: focused
                  ? "0 0 0 3px rgba(0,255,136,0.06), 0 0 48px rgba(0,255,136,0.07)"
                  : "0 8px 40px rgba(0,0,0,0.4)",
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={cfg.placeholder}
                rows={3}
                className="w-full bg-transparent rounded-t-2xl px-4 py-4 font-mono text-sm resize-none focus:outline-none leading-relaxed"
                style={{ color: "#f1f0f5", caretColor: "#00ff88" }}
              />

              {/* Bottom bar: chain pills + CTA */}
              <div
                className="px-3 pb-2 pt-1 flex items-center gap-2"
                style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
              >
                {/* Chain pills — only for pre-sign */}
                {activeTab === "pre-sign" && (
                  <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                    {CHAINS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setChain(c.value)}
                        className="text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all duration-200"
                        style={
                          chain === c.value
                            ? { background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88" }
                            : { background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "var(--text-tertiary)" }
                        }
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
                {activeTab === "post-sign" && <div className="flex-1" />}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: !loading && input.trim()
                      ? "linear-gradient(135deg, #00ff88, #00d4ff)"
                      : "rgba(255,255,255,0.06)",
                    color: !loading && input.trim() ? "#060608" : "var(--text-tertiary)",
                    boxShadow: !loading && input.trim() ? "0 0 20px rgba(0,255,136,0.25)" : "none",
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 60" />
                      </svg>
                      Analyzing
                    </>
                  ) : (
                    <>
                      {cfg.button}
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Helper text + try example */}
            <div className="flex items-start justify-between mt-3 px-1 gap-4">
              <p className="text-[11px] font-mono leading-relaxed" style={{ color: "var(--text-tertiary)", maxWidth: "380px" }}>
                {cfg.helper}
              </p>
              <button
                type="button"
                onClick={onDemo}
                className="shrink-0 flex items-center gap-1.5 text-[11px] font-mono transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                  <path d="M5 3l14 9-14 9V3z" fill="currentColor"/>
                </svg>
                Try Example
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.form>

      {/* Feature strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="flex items-center gap-10 mt-20 mb-4"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-10"
          >
            {cfg.cards.map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-1 text-center">
                <span className="text-xs font-semibold" style={{ color: "#f1f0f5" }}>{item.label}</span>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>{item.sub}</span>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
