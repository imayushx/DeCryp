"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const CHAINS = [
  { value: "ethereum", label: "ETH", full: "Ethereum" },
  { value: "base", label: "BASE", full: "Base" },
  { value: "polygon", label: "MATIC", full: "Polygon" },
  { value: "arbitrum", label: "ARB", full: "Arbitrum" },
  { value: "optimism", label: "OP", full: "Optimism" },
];

interface HeroProps {
  onDecode: (input: string, chain: string) => void;
  onDemo: () => void;
  loading: boolean;
}

export default function Hero({ onDecode, onDemo, loading }: HeroProps) {
  const [input, setInput] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) onDecode(input.trim(), chain);
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
        className="text-center mt-20 mb-12 px-2"
      >
        <p
          className="text-[11px] font-mono tracking-[0.2em] uppercase mb-6"
          style={{ color: "var(--text-tertiary)" }}
        >
          Transaction Intelligence
        </p>
        <h1 className="text-5xl sm:text-[64px] font-bold leading-[1.05] tracking-tight mb-5 max-w-[720px]">
          <span style={{ color: "#f1f0f5" }}>Know what you&apos;re</span>
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #00ff88 0%, #00d4ff 60%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            signing.
          </span>
        </h1>
        <p className="text-base max-w-[420px] mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Paste a tx hash, contract, or calldata. Get a plain English breakdown with risk score in seconds.
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
        <div
          className="rounded-2xl p-1 transition-all duration-300"
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
            placeholder="0x... paste a tx hash, contract address, or raw calldata"
            rows={3}
            className="w-full bg-transparent rounded-xl px-4 py-4 font-mono text-sm resize-none focus:outline-none leading-relaxed"
            style={{
              color: "#f1f0f5",
              caretColor: "#00ff88",
            }}
          />
          <div
            className="px-3 pb-2 pt-1 flex items-center gap-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
          >
            {/* Chain pills */}
            <div className="flex items-center gap-1.5 flex-1 flex-wrap">
              {CHAINS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setChain(c.value)}
                  className="text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all duration-200"
                  style={
                    chain === c.value
                      ? {
                          background: "rgba(0,255,136,0.12)",
                          border: "1px solid rgba(0,255,136,0.3)",
                          color: "#00ff88",
                        }
                      : {
                          background: "transparent",
                          border: "1px solid rgba(255,255,255,0.07)",
                          color: "var(--text-tertiary)",
                        }
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Decode button */}
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
                  Decoding
                </>
              ) : (
                <>
                  Decode
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sub-row */}
        <div className="flex items-center justify-between mt-3 px-1">
          <p className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            Supports Ethereum · Base · Polygon · Arbitrum · Optimism
          </p>
          <button
            type="button"
            onClick={onDemo}
            className="flex items-center gap-1.5 text-[11px] font-mono transition-colors group"
            style={{ color: "var(--text-secondary)" }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
              <path d="M5 3l14 9-14 9V3z" fill="currentColor"/>
            </svg>
            Try Example
          </button>
        </div>
      </motion.form>

      {/* Feature strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="flex items-center gap-8 mt-20 mb-4"
      >
        {[
          { label: "Plain English", sub: "No jargon" },
          { label: "Risk Score", sub: "LOW → DANGER" },
          { label: "Red Flags", sub: "Scam patterns" },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-1 text-center">
            <span className="text-xs font-semibold" style={{ color: "#f1f0f5" }}>{item.label}</span>
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>{item.sub}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
