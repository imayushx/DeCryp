"use client";

import { motion } from "framer-motion";

interface RedFlagsProps {
  flags: string[];
}

export default function RedFlags({ flags }: RedFlagsProps) {
  if (flags.length === 0) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{
          background: "rgba(0,255,136,0.05)",
          border: "1px solid rgba(0,255,136,0.15)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-sm font-mono" style={{ color: "#00ff88" }}>No red flags detected</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {flags.map((flag, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-start gap-3 rounded-xl px-4 py-3 relative"
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.18)",
          }}
        >
          <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: "#ef4444" }} />
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5">
            <path d="M12 3L2 20h20L12 3z" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M12 9v5M12 17v.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-sm font-mono leading-relaxed" style={{ color: "#f87171" }}>{flag}</span>
        </motion.div>
      ))}
    </div>
  );
}
