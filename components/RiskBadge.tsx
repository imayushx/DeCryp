"use client";

import { motion } from "framer-motion";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "DANGER";

const CONFIG: Record<RiskLevel, {
  color: string;
  bg: string;
  border: string;
  glow: string;
  label: string;
  verdict: string;
}> = {
  LOW: {
    color: "#00ff88",
    bg: "rgba(0,255,136,0.05)",
    border: "rgba(0,255,136,0.2)",
    glow: "rgba(0,255,136,0.12)",
    label: "LOW RISK",
    verdict: "SAFE TO SIGN",
  },
  MEDIUM: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.05)",
    border: "rgba(245,158,11,0.2)",
    glow: "rgba(245,158,11,0.1)",
    label: "MEDIUM RISK",
    verdict: "PROCEED WITH CAUTION",
  },
  HIGH: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.06)",
    border: "rgba(239,68,68,0.22)",
    glow: "rgba(239,68,68,0.12)",
    label: "HIGH RISK",
    verdict: "DO NOT SIGN",
  },
  DANGER: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.09)",
    border: "rgba(239,68,68,0.35)",
    glow: "rgba(239,68,68,0.18)",
    label: "CRITICAL RISK",
    verdict: "DANGER — DO NOT SIGN",
  },
};

interface RiskBadgeProps {
  level: RiskLevel;
  reason: string;
}

export default function RiskBadge({ level, reason }: RiskBadgeProps) {
  const c = CONFIG[level] ?? CONFIG.MEDIUM;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full rounded-2xl overflow-hidden relative"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: `0 0 40px ${c.glow}`,
      }}
    >
      {/* Top glow bar */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${c.color}60, transparent)` }}
      />

      <div className="flex items-start gap-5 px-6 py-5">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${c.color}14`, border: `1px solid ${c.border}` }}
        >
          {level === "LOW" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke={c.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : level === "MEDIUM" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L2 20h20L12 3z" stroke={c.color} strokeWidth="2" strokeLinejoin="round"/>
              <path d="M12 9v5M12 17v.5" stroke={c.color} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke={c.color} strokeWidth="2"/>
              <path d="M15 9l-6 6M9 9l6 6" stroke={c.color} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Verdict + level row */}
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <span className="font-bold text-sm tracking-wide" style={{ color: c.color }}>
              {c.verdict}
            </span>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded tracking-widest"
              style={{
                background: `${c.color}10`,
                border: `1px solid ${c.border}`,
                color: c.color,
              }}
            >
              {c.label}
            </span>
            {/* Live pulse */}
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.3, 0.8] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: c.color }}
              />
            </div>
          </div>
          {/* Reason */}
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {reason}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
