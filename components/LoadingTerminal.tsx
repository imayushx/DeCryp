"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { text: "Searching 5 networks for your transaction", detail: "scan" },
  { text: "Found it — reading the raw data", detail: "rpc" },
  { text: "Translating machine code into actions", detail: "decode" },
  { text: "Checking the contract's track record", detail: "trust" },
  { text: "Writing your plain-English summary", detail: "ai" },
];

export default function LoadingTerminal() {
  const [currentStep, setCurrentStep] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const activeText = STEPS[currentStep]?.text ?? "";

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STEPS.length - 1) { setCharCount(0); return prev + 1; }
        return prev;
      });
    }, 1100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setCharCount(0);
    const id = setInterval(() => {
      setCharCount((c) => {
        if (c >= activeText.length) { clearInterval(id); return c; }
        return c + 1;
      });
    }, 26);
    return () => clearInterval(id);
  }, [currentStep, activeText]);

  const pct = Math.round((currentStep / STEPS.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-[640px] mx-auto mt-6 rounded-2xl overflow-hidden font-mono"
      style={{
        background: "rgba(10,10,15,0.9)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 0 48px rgba(0,255,136,0.06)",
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-5 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444", opacity: 0.6 }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b", opacity: 0.6 }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#00ff88", opacity: 0.6 }} />
        <span className="ml-4 text-[11px] tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          decryp — analyzing transaction
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#00ff88", boxShadow: "0 0 6px #00ff88" }}
          />
          <span className="text-[10px]" style={{ color: "#00ff88" }}>RUNNING</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5 space-y-2 min-h-[150px]">
        {STEPS.slice(0, currentStep).map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 text-xs"
          >
            <span style={{ color: "rgba(0,255,136,0.5)" }}>✓</span>
            <span style={{ color: "var(--text-tertiary)" }}>{step.text}</span>
            <span className="ml-auto text-[10px]" style={{ color: "rgba(0,255,136,0.3)" }}>{step.detail}</span>
          </motion.div>
        ))}

        {currentStep < STEPS.length && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 text-xs"
          >
            <span style={{ color: "#00ff88" }}>›</span>
            <span style={{ color: "#f1f0f5" }}>
              {activeText.slice(0, charCount)}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.55 }}
                className="inline-block w-[5px] h-[12px] ml-0.5 align-text-bottom"
                style={{ background: "#00ff88" }}
              />
            </span>
            <AnimatePresence>
              {charCount >= activeText.length && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="ml-auto text-[10px]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {STEPS[currentStep]?.detail}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Progress */}
      <div className="px-5 pb-5">
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Progress</span>
          <span className="text-[10px]" style={{ color: "#00ff88" }}>{pct}%</span>
        </div>
        <div className="w-full h-px rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #00ff88, #00d4ff)" }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
