"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RiskBadge from "./RiskBadge";
import RedFlags from "./RedFlags";
import type { AIExplanation } from "@/lib/ai";

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

interface ResultCardProps {
  decoded: DecodedData;
  explanation: AIExplanation;
  raw: RawData;
  onReset: () => void;
}

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
      style={{
        border: "1px solid rgba(255,255,255,0.07)",
        color: copied ? "#00ff88" : "var(--text-tertiary)",
        background: "transparent",
      }}
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
      style={{
        background: "rgba(15,15,23,0.7)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)",
      }}
    >
      {children}
    </motion.div>
  );
}

export default function ResultCard({ decoded, explanation, raw, onReset }: ResultCardProps) {
  const [rawOpen, setRawOpen] = useState(false);
  const riskLevel = explanation.risk_level as "LOW" | "MEDIUM" | "HIGH" | "DANGER";

  const riskColor =
    riskLevel === "LOW" ? "#00ff88"
    : riskLevel === "MEDIUM" ? "#f59e0b"
    : "#ef4444";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-[640px] mx-auto space-y-3"
    >
      {/* Risk badge */}
      <RiskBadge level={riskLevel} reason={explanation.risk_reason} />

      {/* One-liner hero */}
      <Panel delay={0.08}>
        <div className="px-7 py-7 relative text-center overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${riskColor}06 0%, transparent 70%)`,
            }}
          />
          <p className="relative text-2xl font-bold leading-snug tracking-tight" style={{ color: "#f1f0f5" }}>
            {explanation.one_liner}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor }} />
            <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
              {explanation.should_sign ? "Recommended to sign" : "Not recommended to sign"}
            </span>
          </div>
        </div>
      </Panel>

      {/* What's happening */}
      <Panel delay={0.14}>
        <div className="px-6 py-5">
          <Label>What&apos;s Happening</Label>
          <p className="font-semibold text-[15px] mb-2 leading-snug" style={{ color: "#f1f0f5" }}>
            {explanation.action}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {explanation.in_plain_english}
          </p>
        </div>
      </Panel>

      {/* Send / Receive — tension panel */}
      <div className="grid grid-cols-2 gap-3">
        {/* Sending */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="rounded-2xl px-5 py-4 relative overflow-hidden"
          style={{
            background: "rgba(239,68,68,0.05)",
            border: "1px solid rgba(239,68,68,0.16)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)" }} />
          <Label>You Send</Label>
          <p className="font-semibold text-sm leading-snug" style={{ color: "#f87171" }}>
            {explanation.what_you_lose}
          </p>
        </motion.div>

        {/* Receiving */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.4 }}
          className="rounded-2xl px-5 py-4 relative overflow-hidden"
          style={{
            background: explanation.what_you_get ? "rgba(0,255,136,0.04)" : "rgba(255,255,255,0.02)",
            border: explanation.what_you_get ? "1px solid rgba(0,255,136,0.14)" : "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {explanation.what_you_get && (
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.35), transparent)" }} />
          )}
          <Label>You Get</Label>
          {explanation.what_you_get ? (
            <p className="font-semibold text-sm leading-snug" style={{ color: "#00ff88" }}>
              {explanation.what_you_get}
            </p>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Nothing</p>
          )}
        </motion.div>
      </div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.4 }}
        className="grid grid-cols-3 gap-3"
      >
        {/* Gas */}
        <div
          className="rounded-2xl px-4 py-4"
          style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.14)" }}
        >
          <Label>Gas Est.</Label>
          <p className="font-semibold text-sm font-mono" style={{ color: "#f59e0b" }}>{explanation.gas_cost}</p>
        </div>

        {/* Contract trust */}
        <div
          className="rounded-2xl px-4 py-4"
          style={{
            background: decoded.contractVerified ? "rgba(0,255,136,0.04)" : "rgba(239,68,68,0.04)",
            border: decoded.contractVerified ? "1px solid rgba(0,255,136,0.14)" : "1px solid rgba(239,68,68,0.14)",
          }}
        >
          <Label>Contract</Label>
          <p className="font-semibold text-xs font-mono" style={{ color: decoded.contractVerified ? "#00ff88" : "#ef4444" }}>
            {decoded.contractVerified ? "VERIFIED" : "UNVERIFIED"}
          </p>
        </div>

        {/* Protocol */}
        <div
          className="rounded-2xl px-4 py-4"
          style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)" }}
        >
          <Label>Protocol</Label>
          <p className="font-semibold text-xs font-mono truncate" style={{ color: "#00d4ff" }}>
            {decoded.protocol ?? "Unknown"}
          </p>
        </div>
      </motion.div>

      {/* Red flags */}
      <Panel delay={0.32}>
        <div className="px-6 py-5">
          <Label>Red Flags</Label>
          <RedFlags flags={explanation.red_flags} />
        </div>
      </Panel>

      {/* Raw details — collapsible */}
      <Panel delay={0.36}>
        <button
          onClick={() => setRawOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <span className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--text-tertiary)" }}>
            Raw Details
          </span>
          <motion.svg
            animate={{ rotate: rawOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            width="13" height="13" viewBox="0 0 24 24" fill="none"
          >
            <path d="M6 9l6 6 6-6" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </motion.svg>
        </button>

        <AnimatePresence>
          {rawOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div
                className="px-6 pb-5 pt-4 space-y-4"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div>
                  <Label>Contract</Label>
                  <div className="flex items-center gap-2">
                    <code
                      className="flex-1 text-xs font-mono px-3 py-2 rounded-xl truncate"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}
                    >
                      {truncate(raw.to)}
                    </code>
                    <CopyButton value={raw.to} />
                  </div>
                </div>

                <div>
                  <Label>Method</Label>
                  <code
                    className="block text-xs font-mono px-3 py-2 rounded-xl"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", color: "#00ff88" }}
                  >
                    {decoded.method}()
                  </code>
                </div>

                <div>
                  <Label>Chain</Label>
                  <code
                    className="block text-xs font-mono px-3 py-2 rounded-xl capitalize"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}
                  >
                    {raw.chain}
                  </code>
                </div>

                {Object.keys(decoded.params).length > 0 && (
                  <div>
                    <Label>Decoded Parameters</Label>
                    <pre
                      className="text-xs font-mono px-3 py-3 rounded-xl overflow-x-auto whitespace-pre-wrap break-all leading-relaxed"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}
                    >
                      {JSON.stringify(decoded.params, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <Label>Calldata</Label>
                  <div className="flex items-start gap-2">
                    <code
                      className="flex-1 text-xs font-mono px-3 py-2 rounded-xl break-all leading-relaxed"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", color: "var(--text-tertiary)" }}
                    >
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

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.44 }}
        className="flex gap-3 pt-1"
      >
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-mono text-sm transition-all duration-200 group"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(0,255,136,0.3)";
            e.currentTarget.style.color = "#00ff88";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Decode Another
        </button>
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              navigator.clipboard.writeText(window.location.href).catch(() => {});
            }
          }}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-mono text-sm transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "var(--text-tertiary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
            e.currentTarget.style.color = "var(--text-tertiary)";
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Share
        </button>
      </motion.div>
    </motion.div>
  );
}
