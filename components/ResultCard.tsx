"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RedFlags from "./RedFlags";
import ShareModal from "./ShareModal";
import type { AIExplanation, PreSignExplanation, PostSignExplanation, ContractDeploymentExplanation } from "@/lib/ai";

interface DecodedData {
  method: string;
  params: Record<string, unknown>;
  protocol: string | null;
  contractVerified: boolean;
  valueEth: string;
  valueUsd: string;
}

interface RawData {
  calldata: string;
  to: string;
  chain: string;
}

interface DeploymentData {
  deployerAddress: string;
  deployedAddress: string | null;
  bytecodeSize: number;
  valueSpentEth: string;
  valueSpentUsd: string;
  gasUsed: string | null;
  txHash: string;
}

interface ResultCardProps {
  decoded: DecodedData;
  explanation: AIExplanation;
  raw: RawData;
  deployment?: DeploymentData;
  onReset: () => void;
  onInspect: (address: string, chain: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(str: string, head = 10, tail = 8) {
  if (str.length <= head + tail + 3) return str;
  return `${str.slice(0, head)}...${str.slice(-tail)}`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg transition-all"
      style={{ border: "1px solid rgba(255,255,255,0.07)", color: copied ? "#00ff88" : "var(--text-tertiary)" }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono uppercase tracking-[0.14em] mb-2" style={{ color: "var(--text-tertiary)" }}>
      {children}
    </p>
  );
}

function Panel({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl ${className}`}
      style={{ background: "rgba(15,15,23,0.7)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(16px)" }}
    >
      {children}
    </motion.div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl px-4 py-4 relative overflow-hidden" style={{ background: `${color}06`, border: `1px solid ${color}18` }}>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
      <Label>{label}</Label>
      <p className="font-semibold text-sm font-mono leading-snug" style={{ color }}>{value}</p>
    </div>
  );
}

// ─── Risk badge (pre-sign) ────────────────────────────────────────────────────

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "DANGER";

const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string; border: string; glow: string; verdict: string; label: string }> = {
  LOW:    { color: "#00ff88", bg: "rgba(0,255,136,0.05)",   border: "rgba(0,255,136,0.2)",  glow: "rgba(0,255,136,0.12)",  verdict: "✓  Safe to Sign",            label: "LOW RISK" },
  MEDIUM: { color: "#f59e0b", bg: "rgba(245,158,11,0.05)",  border: "rgba(245,158,11,0.2)", glow: "rgba(245,158,11,0.10)", verdict: "⚠  Proceed Carefully",        label: "MEDIUM RISK" },
  HIGH:   { color: "#ef4444", bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.22)", glow: "rgba(239,68,68,0.12)",  verdict: "✗  Do Not Sign",             label: "HIGH RISK" },
  DANGER: { color: "#ef4444", bg: "rgba(239,68,68,0.09)",   border: "rgba(239,68,68,0.35)", glow: "rgba(239,68,68,0.18)",  verdict: "🚨 Stop — Looks Like a Scam", label: "CRITICAL RISK" },
};

function PreSignBadge({ exp }: { exp: PreSignExplanation }) {
  const c = RISK_CONFIG[exp.risk_level] ?? RISK_CONFIG.MEDIUM;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full rounded-2xl overflow-hidden relative"
      style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: `0 0 40px ${c.glow}` }}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${c.color}60, transparent)` }} />
      <div className="px-4 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <p className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>Should You Sign This?</p>
      </div>
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.color}14`, border: `1px solid ${c.border}` }}>
          {exp.risk_level === "LOW" ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={c.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : exp.risk_level === "MEDIUM" ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M12 3L2 20h20L12 3z" stroke={c.color} strokeWidth="2" strokeLinejoin="round"/><path d="M12 9v5M12 17v.5" stroke={c.color} strokeWidth="2" strokeLinecap="round"/></svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke={c.color} strokeWidth="2"/><path d="M15 9l-6 6M9 9l6 6" stroke={c.color} strokeWidth="2" strokeLinecap="round"/></svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1.5">
            <span className="font-bold text-sm" style={{ color: c.color }}>{c.verdict}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded tracking-widest" style={{ background: `${c.color}10`, border: `1px solid ${c.border}`, color: c.color }}>{c.label}</span>
            <div className="ml-auto">
              <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.3, 0.8] }} transition={{ repeat: Infinity, duration: 2.5 }} className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{exp.risk_reason}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Post-sign badge ──────────────────────────────────────────────────────────

function PostSignBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full rounded-2xl overflow-hidden relative"
      style={{ background: "rgba(74,158,255,0.05)", border: "1px solid rgba(74,158,255,0.2)", boxShadow: "0 0 32px rgba(74,158,255,0.08)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(74,158,255,0.5), transparent)" }} />
      <div className="px-4 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <p className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>What This Transaction Did</p>
      </div>
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(74,158,255,0.1)", border: "1px solid rgba(74,158,255,0.2)" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#4a9eff" strokeWidth="2"/>
            <path d="M12 7v5l3 3" stroke="#4a9eff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm" style={{ color: "#4a9eff" }}>COMPLETED</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded tracking-widest" style={{ background: "rgba(74,158,255,0.1)", border: "1px solid rgba(74,158,255,0.2)", color: "#4a9eff" }}>PAST TRANSACTION</span>
          </div>
          <p className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>This transaction is already complete. This is a record of what happened.</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Contract deployment badge ────────────────────────────────────────────────

function DeploymentBadge({ riskLevel }: { riskLevel: ContractDeploymentExplanation["risk_level"] }) {
  const riskColor =
    riskLevel === "LOW" ? "#00ff88" : riskLevel === "MEDIUM" ? "#f59e0b" : "#ef4444";
  const riskLabel =
    riskLevel === "LOW" ? "LOW RISK" : riskLevel === "MEDIUM" ? "MEDIUM RISK" : riskLevel === "HIGH" ? "HIGH RISK" : "CRITICAL RISK";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full rounded-2xl overflow-hidden relative"
      style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.22)", boxShadow: "0 0 32px rgba(168,85,247,0.08)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent)" }} />
      <div className="px-4 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <p className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--text-tertiary)" }}>Contract Deployed</p>
      </div>
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="16" height="16" rx="3" stroke="#a855f7" strokeWidth="2"/>
            <path d="M8 12h8M12 8v8" stroke="#a855f7" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-sm" style={{ color: "#a855f7" }}>CONTRACT DEPLOYED</span>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded tracking-widest"
              style={{ background: `${riskColor}10`, border: `1px solid ${riskColor}30`, color: riskColor }}
            >
              {riskLabel}
            </span>
          </div>
          <p className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>A new smart contract was published to the blockchain.</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Raw details ──────────────────────────────────────────────────────────────

function RawDetails({ decoded, raw, open, onToggle }: {
  decoded: DecodedData;
  raw: RawData;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Panel delay={0.38}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-6 py-4 text-left">
        <span className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--text-tertiary)" }}>Raw Details</span>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </motion.svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 pt-4 space-y-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <Label>Contract</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono px-3 py-2 rounded-xl truncate" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
                    {truncate(raw.to)}
                  </code>
                  <CopyButton value={raw.to} />
                </div>
              </div>
              <div>
                <Label>Method</Label>
                <code className="block text-xs font-mono px-3 py-2 rounded-xl" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", color: "#00ff88" }}>
                  {decoded.method}()
                </code>
              </div>
              <div>
                <Label>Chain</Label>
                <code className="block text-xs font-mono px-3 py-2 rounded-xl capitalize" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
                  {raw.chain}
                </code>
              </div>
              {Object.keys(decoded.params).length > 0 && (
                <div>
                  <Label>Decoded Parameters</Label>
                  <pre className="text-xs font-mono px-3 py-3 rounded-xl overflow-x-auto whitespace-pre-wrap break-all leading-relaxed" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
                    {JSON.stringify(decoded.params, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <Label>Calldata</Label>
                <div className="flex items-start gap-2">
                  <code className="flex-1 text-xs font-mono px-3 py-2 rounded-xl break-all leading-relaxed" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", color: "var(--text-tertiary)" }}>
                    {raw.calldata.slice(0, 100)}{raw.calldata.length > 100 && "…"}
                  </code>
                  <CopyButton value={raw.calldata} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}

// ─── Shared URL copy button — appears in every result type ───────────────────

function ShareLinkButton() {
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "https://de-cryp.vercel.app";
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-mono text-sm transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${copied ? "rgba(0,255,136,0.3)" : "rgba(31,31,31,1)"}`,
        color: copied ? "#00ff88" : "#888888",
      }}
      onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#ffffff"; } }}
      onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.borderColor = "rgba(31,31,31,1)"; e.currentTarget.style.color = "#888888"; } }}
    >
      {copied ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Share Result
        </>
      )}
    </button>
  );
}

// ─── Action buttons ───────────────────────────────────────────────────────────

function PreSignActions({ onReset }: { onReset: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.48 }} className="space-y-2 pt-1">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-mono text-sm font-semibold transition-all duration-200"
          style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.25)", color: "#00ff88" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,255,136,0.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,255,136,0.06)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          I&apos;ll Sign It
        </button>
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-mono text-sm font-semibold transition-all duration-200"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
          I&apos;ll Cancel
        </button>
      </div>
      <ShareLinkButton />
    </motion.div>
  );
}

function PostSignActions({ onReset, onShare }: { onReset: () => void; onShare: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.48 }} className="space-y-2 pt-1">
      <ShareLinkButton />
      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-mono text-sm transition-all duration-200"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,255,136,0.3)"; e.currentTarget.style.color = "#00ff88"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Decode Another
        </button>
        <button
          onClick={onShare}
          className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-mono text-sm transition-all duration-200"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,255,136,0.25)"; e.currentTarget.style.color = "#00ff88"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
          title="Screenshot & share"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2"/>
            <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

// ─── Deployment address cell ──────────────────────────────────────────────────

function AddressCell({ label, address, chain }: { label: string; address: string | null; chain: string }) {
  const explorerBase =
    chain === "base" ? "https://basescan.org/address"
    : chain === "polygon" ? "https://polygonscan.com/address"
    : chain === "arbitrum" ? "https://arbiscan.io/address"
    : chain === "optimism" ? "https://optimistic.etherscan.io/address"
    : "https://etherscan.io/address";

  return (
    <div className="rounded-xl px-4 py-4" style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.12)" }}>
      <Label>{label}</Label>
      {address ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <code className="text-xs font-mono" style={{ color: "#c4b5fd" }}>{truncate(address, 8, 6)}</code>
          <CopyButton value={address} />
          <a
            href={`${explorerBase}/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono px-2 py-1 rounded-lg transition-all"
            style={{ border: "1px solid rgba(255,255,255,0.07)", color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#a855f7"; e.currentTarget.style.borderColor = "rgba(168,85,247,0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
          >
            ↗ explorer
          </a>
        </div>
      ) : (
        <p className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>unavailable</p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResultCard({ decoded, explanation, raw, deployment, onReset, onInspect }: ResultCardProps) {
  const [rawOpen, setRawOpen] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const mode = explanation.mode;

  // ── Contract deployment ────────────────────────────────────────────────────
  if (mode === "contract-deployment" && deployment) {
    const exp = explanation as ContractDeploymentExplanation & { mode: "contract-deployment" };
    const hasEthValue = parseFloat(deployment.valueSpentEth) > 0;
    const explorerTxBase =
      raw.chain === "base" ? "https://basescan.org/tx"
      : raw.chain === "polygon" ? "https://polygonscan.com/tx"
      : raw.chain === "arbitrum" ? "https://arbiscan.io/tx"
      : raw.chain === "optimism" ? "https://optimistic.etherscan.io/tx"
      : "https://etherscan.io/tx";

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="w-full max-w-[640px] mx-auto space-y-3">
        <DeploymentBadge riskLevel={exp.risk_level} />

        {/* One-liner */}
        <Panel delay={0.08}>
          <div className="px-7 py-7 relative text-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(168,85,247,0.06) 0%, transparent 70%)" }} />
            <p className="relative font-display text-2xl font-bold leading-snug tracking-tight" style={{ color: "#f1f0f5", textWrap: "balance" }}>{exp.one_liner}</p>
          </div>
        </Panel>

        {/* What happened */}
        <Panel delay={0.14}>
          <div className="px-6 py-5">
            <Label>What Happened</Label>
            <p className="font-semibold text-[15px] mb-2 leading-snug" style={{ color: "#f1f0f5" }}>{exp.action}</p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{exp.what_happened}</p>
          </div>
        </Panel>

        {/* 2×2 deployment summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="grid grid-cols-2 gap-3"
        >
          <AddressCell label="Deployed By" address={deployment.deployerAddress} chain={raw.chain} />
          <AddressCell label="Contract Address" address={deployment.deployedAddress} chain={raw.chain} />
          <div className="rounded-xl px-4 py-4" style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.12)" }}>
            <Label>Contract Size</Label>
            <p className="text-sm font-mono font-semibold" style={{ color: "#c4b5fd" }}>{deployment.bytecodeSize.toLocaleString()} bytes</p>
            <p className="text-[11px] mt-1 leading-snug" style={{ color: "var(--text-tertiary)" }}>{exp.contract_size_context}</p>
          </div>
          <div
            className="rounded-xl px-4 py-4"
            style={{
              background: hasEthValue ? "rgba(245,158,11,0.05)" : "rgba(168,85,247,0.04)",
              border: hasEthValue ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(168,85,247,0.12)",
            }}
          >
            <Label>ETH at Deploy</Label>
            <p className="text-sm font-mono font-semibold" style={{ color: hasEthValue ? "#f59e0b" : "#c4b5fd" }}>
              {parseFloat(deployment.valueSpentEth) === 0 ? "0 ETH" : `${deployment.valueSpentEth} ETH`}
            </p>
            <p className="text-[11px] mt-1 leading-snug" style={{ color: "var(--text-tertiary)" }}>{exp.eth_spent_context}</p>
          </div>
        </motion.div>

        {/* Deployer context */}
        <Panel delay={0.26}>
          <div className="px-6 py-5 space-y-4">
            <div>
              <Label>Deployer</Label>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{exp.deployer_context}</p>
            </div>
            {deployment.gasUsed && (
              <div>
                <Label>Gas Used</Label>
                <p className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{deployment.gasUsed} units</p>
              </div>
            )}
          </div>
        </Panel>

        {/* Red flags */}
        <Panel delay={0.32}>
          <div className="px-6 py-5">
            <Label>Red Flags</Label>
            <RedFlags flags={exp.red_flags} />
          </div>
        </Panel>

        {/* Bottom actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.42 }}
          className="space-y-2"
        >
          <ShareLinkButton />
          <div className="grid grid-cols-2 gap-3">
            {deployment.deployedAddress && (
              <button
                onClick={() => onInspect(deployment.deployedAddress!, raw.chain)}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-mono text-sm font-semibold transition-all duration-200"
                style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(168,85,247,0.14)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(168,85,247,0.07)"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Inspect Contract →
              </button>
            )}
            <a
              href={`${explorerTxBase}/${deployment.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-mono text-sm transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)"; e.currentTarget.style.color = "#f1f0f5"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              View on Explorer
            </a>
            {!deployment.deployedAddress && (
              <button
                onClick={onReset}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-mono text-sm transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,255,136,0.3)"; e.currentTarget.style.color = "#00ff88"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Decode Another
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ── Pre-sign ───────────────────────────────────────────────────────────────
  if (mode === "pre-sign") {
    const exp = explanation as PreSignExplanation & { mode: "pre-sign" };
    const riskColor =
      exp.risk_level === "LOW" ? "#00ff88" : exp.risk_level === "MEDIUM" ? "#f59e0b" : "#ef4444";

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="w-full max-w-[640px] mx-auto space-y-3">
        <PreSignBadge exp={exp} />

        <Panel delay={0.08}>
          <div className="px-7 py-7 relative text-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${riskColor}06 0%, transparent 70%)` }} />
            <p className="relative font-display text-2xl font-bold leading-snug tracking-tight" style={{ color: "#f1f0f5", textWrap: "balance" }}>{exp.one_liner}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor }} />
              <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                {exp.should_sign ? "Recommended to sign" : "Not recommended to sign"}
              </span>
            </div>
          </div>
        </Panel>

        <Panel delay={0.14}>
          <div className="px-6 py-5">
            <Label>What&apos;s Happening</Label>
            <p className="font-semibold text-[15px] mb-2 leading-snug" style={{ color: "#f1f0f5" }}>{exp.action}</p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{exp.in_plain_english}</p>
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }} className="rounded-2xl px-5 py-4 relative overflow-hidden" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.16)" }}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)" }} />
            <Label>You Send</Label>
            <p className="font-semibold text-sm leading-snug" style={{ color: "#f87171" }}>{exp.what_you_lose}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.4 }} className="rounded-2xl px-5 py-4 relative overflow-hidden" style={{ background: exp.what_you_get ? "rgba(0,255,136,0.04)" : "rgba(255,255,255,0.02)", border: exp.what_you_get ? "1px solid rgba(0,255,136,0.14)" : "1px solid rgba(255,255,255,0.06)" }}>
            {exp.what_you_get && <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.35), transparent)" }} />}
            <Label>You Get</Label>
            {exp.what_you_get
              ? <p className="font-semibold text-sm leading-snug" style={{ color: "#00ff88" }}>{exp.what_you_get}</p>
              : <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Nothing</p>
            }
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }} className="grid grid-cols-3 gap-3">
          <StatCell label="Gas Est." value={exp.gas_cost} color="#f59e0b" />
          <StatCell label="Contract" value={decoded.contractVerified ? "VERIFIED" : "UNVERIFIED"} color={decoded.contractVerified ? "#00ff88" : "#ef4444"} />
          <StatCell label="Protocol" value={decoded.protocol ?? "Unknown"} color="#00d4ff" />
        </motion.div>

        <Panel delay={0.32}>
          <div className="px-6 py-5">
            <Label>Red Flags</Label>
            <RedFlags flags={exp.red_flags} />
          </div>
        </Panel>

        <RawDetails decoded={decoded} raw={raw} open={rawOpen} onToggle={() => setRawOpen(v => !v)} />

        <Panel delay={0.44}>
          <div className="px-6 py-5">
            <Label>Your Decision</Label>
            <PreSignActions onReset={onReset} />
          </div>
        </Panel>
      </motion.div>
    );
  }

  // ── Post-sign ──────────────────────────────────────────────────────────────
  const exp = explanation as PostSignExplanation & { mode: "post-sign" };

  return (
    <motion.div ref={cardRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="w-full max-w-[640px] mx-auto space-y-3">
      <PostSignBadge />

      <Panel delay={0.08}>
        <div className="px-7 py-7 relative text-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(74,158,255,0.05) 0%, transparent 70%)" }} />
          <p className="relative font-display text-2xl font-bold leading-snug tracking-tight" style={{ color: "#f1f0f5", textWrap: "balance" }}>{exp.one_liner}</p>
        </div>
      </Panel>

      <Panel delay={0.14}>
        <div className="px-6 py-5">
          <Label>What Happened</Label>
          <p className="font-semibold text-[15px] mb-2 leading-snug" style={{ color: "#f1f0f5" }}>{exp.action}</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{exp.in_plain_english}</p>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }} className="rounded-2xl px-5 py-4 relative overflow-hidden" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.16)" }}>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)" }} />
          <Label>Was Sent</Label>
          <p className="font-semibold text-sm leading-snug" style={{ color: "#f87171" }}>{exp.what_was_sent}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.4 }} className="rounded-2xl px-5 py-4 relative overflow-hidden" style={{ background: exp.what_was_received ? "rgba(0,255,136,0.04)" : "rgba(255,255,255,0.02)", border: exp.what_was_received ? "1px solid rgba(0,255,136,0.14)" : "1px solid rgba(255,255,255,0.06)" }}>
          {exp.what_was_received && <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.35), transparent)" }} />}
          <Label>Was Received</Label>
          {exp.what_was_received
            ? <p className="font-semibold text-sm leading-snug" style={{ color: "#00ff88" }}>{exp.what_was_received}</p>
            : <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Nothing</p>
          }
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }} className="grid grid-cols-3 gap-3">
        <StatCell label="Gas Paid" value={exp.gas_paid} color="#f59e0b" />
        <StatCell label="Contract" value={decoded.contractVerified ? "VERIFIED" : "UNVERIFIED"} color={decoded.contractVerified ? "#00ff88" : "#ef4444"} />
        <StatCell label="Protocol" value={decoded.protocol ?? "Unknown"} color="#00d4ff" />
      </motion.div>

      <Panel delay={0.32}>
        <div className="px-6 py-5">
          <Label>Red Flags</Label>
          <RedFlags flags={exp.red_flags} />
        </div>
      </Panel>

      <RawDetails decoded={decoded} raw={raw} open={rawOpen} onToggle={() => setRawOpen(v => !v)} />
      <PostSignActions onReset={onReset} onShare={() => setShowShare(true)} />

      {showShare && (
        <ShareModal targetRef={cardRef} onClose={() => setShowShare(false)} />
      )}
    </motion.div>
  );
}
