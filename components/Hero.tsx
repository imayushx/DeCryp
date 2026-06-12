"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CHAINS = [
  { value: "ethereum", label: "ETH" },
  { value: "base", label: "BASE" },
  { value: "polygon", label: "MATIC" },
  { value: "arbitrum", label: "ARB" },
  { value: "optimism", label: "OP" },
];

export type DetectedType = "txhash" | "address" | "calldata" | "empty";

function detectType(raw: string): DetectedType {
  const s = raw.trim();
  if (!s) return "empty";
  if (/^0x[0-9a-fA-F]{64}$/.test(s)) return "txhash";
  if (/^0x[0-9a-fA-F]{40}$/.test(s)) return "address";
  return "calldata";
}

const TYPE_META: Record<DetectedType, {
  badge: string;
  badgeColor: string;
  badgeBg: string;
  button: string;
  helper: string;
  placeholder: string;
}> = {
  txhash: {
    badge: "TX HASH",
    badgeColor: "#00d4ff",
    badgeBg: "rgba(0,212,255,0.1)",
    button: "Decode Transaction",
    helper: "Detected a transaction hash — we'll decode exactly what happened on-chain.",
    placeholder: "",
  },
  address: {
    badge: "CONTRACT / WALLET",
    badgeColor: "#a78bfa",
    badgeBg: "rgba(167,139,250,0.1)",
    button: "Inspect Contract",
    helper: "Detected a contract address — we'll identify the protocol and assess trustworthiness.",
    placeholder: "",
  },
  calldata: {
    badge: "CALLDATA",
    badgeColor: "#00ff88",
    badgeBg: "rgba(0,255,136,0.08)",
    button: "Is This Safe?",
    helper: "Detected raw calldata — we'll decode what this will do before you sign.",
    placeholder: "",
  },
  empty: {
    badge: "",
    badgeColor: "",
    badgeBg: "",
    button: "Decode",
    helper: "No wallet needed. Nothing is stored or sent anywhere.",
    placeholder: "Paste a transaction hash, contract address, or calldata hex...",
  },
};

export interface HeroProps {
  onDecode: (input: string, chain: string, detectedType: DetectedType) => void;
  onDemo: () => void;
  loading: boolean;
}

export default function Hero({ onDecode, onDemo, loading }: HeroProps) {
  const [input, setInput] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [focused, setFocused] = useState(false);

  const detected = useMemo(() => detectType(input), [input]);
  const meta = TYPE_META[detected];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && detected !== "empty") {
      onDecode(input.trim(), chain, detected);
    }
  };

  const canSubmit = !loading && detected !== "empty" && input.trim().length > 0;

  // Enter submits (the input is a textarea, so without this Enter just adds a
  // newline and nothing happens). Shift+Enter still inserts a newline for
  // multi-line calldata.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) onDecode(input.trim(), chain, detected);
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
          <span className="font-display font-bold text-[15px] tracking-tight" style={{ color: "#f1f0f5" }}>DeCryp</span>
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
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#00ff88", boxShadow: "0 0 8px #00ff88" }} />
          <p className="text-[11px] font-mono tracking-[0.2em] uppercase" style={{ color: "var(--text-tertiary)" }}>
            On-chain Transaction Intelligence
          </p>
        </div>
        <h1 className="font-display text-5xl sm:text-[64px] font-bold leading-[1.05] tracking-tight mb-5 max-w-[720px]" style={{ textWrap: "balance" }}>
          <span style={{ color: "#f1f0f5" }}>Know what you&apos;re</span>
          <br />
          <span className="text-glow-green" style={{ color: "#00ff88" }}>
            signing.
          </span>
        </h1>
        <p className="text-base max-w-[420px] mx-auto leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Paste anything — tx hash, contract address, or calldata. DeCryp figures out the rest.
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
          className="rounded-2xl overflow-hidden transition-all duration-300"
          style={{
            background: "rgba(13,13,20,0.85)",
            backdropFilter: "blur(24px)",
            border: focused
              ? "1px solid rgba(0,255,136,0.35)"
              : "1px solid rgba(255,255,255,0.07)",
            boxShadow: focused
              ? "0 0 0 3px rgba(0,255,136,0.06), 0 0 64px rgba(0,255,136,0.09)"
              : "0 8px 40px rgba(0,0,0,0.4)",
          }}
        >
          {/* Terminal title bar */}
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444", opacity: 0.6 }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b", opacity: 0.6 }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#00ff88", opacity: 0.6 }} />
            <span className="ml-3 text-[10px] font-mono tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              decryp — universal decoder
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: loading ? "#f59e0b" : "#00ff88", boxShadow: `0 0 6px ${loading ? "#f59e0b" : "#00ff88"}` }}
              />
              <span className="text-[9px] font-mono tracking-widest" style={{ color: loading ? "#f59e0b" : "#00ff88" }}>
                {loading ? "BUSY" : "READY"}
              </span>
            </div>
          </div>

          {/* Detection badge row */}
          <div className="px-4 pt-3 pb-0 flex items-center gap-2 min-h-[28px]">
            <AnimatePresence mode="wait">
              {detected !== "empty" && (
                <motion.div
                  key={detected}
                  initial={{ opacity: 0, scale: 0.85, x: -6 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.85, x: -4 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md"
                  style={{ background: meta.badgeBg, border: `1px solid ${meta.badgeColor}30` }}
                >
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: meta.badgeColor }}
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.6 }}
                  />
                  <span
                    className="text-[9px] font-mono tracking-widest font-semibold"
                    style={{ color: meta.badgeColor }}
                  >
                    {meta.badge}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {detected !== "empty" && !loading && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: 0.15 }}
                  className="ml-auto text-[9px] font-mono tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  ↵ Enter to decode
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Textarea */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={TYPE_META.empty.placeholder}
            rows={3}
            className="w-full bg-transparent px-4 pt-2 pb-3 font-mono text-sm resize-none focus:outline-none leading-relaxed"
            style={{ color: "#f1f0f5", caretColor: "#00ff88" }}
          />

          {/* Bottom bar */}
          <div
            className="px-3 pb-2 pt-1 flex items-center gap-2 flex-wrap"
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
                      ? { background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88" }
                      : { background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "var(--text-tertiary)" }
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: canSubmit
                  ? "linear-gradient(135deg, #00ff88, #00d4ff)"
                  : "rgba(255,255,255,0.06)",
                color: canSubmit ? "#060608" : "var(--text-tertiary)",
                boxShadow: canSubmit ? "0 0 20px rgba(0,255,136,0.25)" : "none",
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
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={meta.button}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      {meta.button}
                    </motion.span>
                  </AnimatePresence>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Helper + try example */}
        <div className="flex items-start justify-between mt-3 px-1 gap-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={detected}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-[11px] font-mono leading-relaxed"
              style={{ color: "var(--text-tertiary)", maxWidth: "380px" }}
            >
              {meta.helper}
            </motion.p>
          </AnimatePresence>
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
      </motion.form>

      {/* Feature strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="flex items-start justify-center gap-8 sm:gap-12 mt-20 mb-10 flex-wrap"
      >
        {[
          {
            label: "Any Input",
            sub: "Hash · Address · Calldata",
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2" stroke="#00d4ff" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M8 12h8" stroke="#00d4ff" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ),
          },
          {
            label: "Risk Score",
            sub: "LOW → DANGER, instantly",
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l8 4v5c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V7l8-4z" stroke="#00ff88" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke="#00ff88" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
          },
          {
            label: "Plain English",
            sub: "No jargon, no confusion",
            icon: (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M21 12a8 8 0 01-8 8H4l1.5-3A8 8 0 1121 12z" stroke="#a78bfa" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M9 11h6M9 14h3" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ),
          },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 text-center">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-0.5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {item.icon}
            </div>
            <span className="text-xs font-semibold" style={{ color: "#f1f0f5" }}>{item.label}</span>
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>{item.sub}</span>
          </div>
        ))}
      </motion.div>

      {/* Protocol marquee */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.8 }}
        className="w-full marquee-mask overflow-hidden"
        aria-hidden="true"
      >
        <div className="marquee-track items-center gap-0 py-2">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center shrink-0">
              {["UNISWAP", "AAVE", "LIDO", "OPENSEA", "CURVE", "ENS", "1INCH", "COMPOUND", "MAKER", "SUSHI", "BLUR", "SAFE"].map((p) => (
                <span key={`${copy}-${p}`} className="flex items-center shrink-0">
                  <span className="text-[10px] font-mono tracking-[0.22em]" style={{ color: "var(--text-tertiary)" }}>{p}</span>
                  <span className="mx-5 text-[8px]" style={{ color: "rgba(0,255,136,0.3)" }}>◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="w-full flex items-center justify-between mt-12 pt-5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
          © {new Date().getFullYear()} DeCryp
        </span>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            ETH · BASE · MATIC · ARB · OP
          </span>
          <a
            href="https://github.com/imayushx/DeCryp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono transition-colors duration-200 hover:text-[#00ff88]"
            style={{ color: "var(--text-secondary)" }}
          >
            GitHub ↗
          </a>
        </div>
      </motion.footer>
    </div>
  );
}
