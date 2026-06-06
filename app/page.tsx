"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Hero from "@/components/Hero";
import ResultCard from "@/components/ResultCard";
import LoadingTerminal from "@/components/LoadingTerminal";
import AnimatedShaderBackground from "@/components/ui/animated-shader-background";
import type { AIExplanation } from "@/lib/ai";

type Mode = "pre-sign" | "post-sign";

interface DecodeResult {
  mode: Mode;
  warning?: string | null;
  decoded: {
    method: string;
    params: Record<string, unknown>;
    protocol: string | null;
    contractVerified: boolean;
    valueEth: string;
    valueUsd: string;
  };
  explanation: AIExplanation;
  raw: {
    calldata: string;
    to: string;
    chain: string;
  };
  error?: string;
}

type AppState = "idle" | "loading" | "result" | "error";

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function decode(input: string, chain: string, mode: Mode, demo = false) {
    setState("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, chain, mode, demo }),
      });

      const data = await res.json() as DecodeResult;

      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? "Something went wrong.");
        setState("error");
        return;
      }

      setResult(data);
      setState("result");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error. Please try again.";
      setErrorMsg(msg);
      setState("error");
    }
  }

  function reset() {
    setState("idle");
    setResult(null);
    setErrorMsg("");
  }

  const showShader = state === "idle" || state === "loading" || state === "error";

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <AnimatePresence mode="wait">
        {showShader && (
          <motion.div
            key="hero-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="relative min-h-screen flex flex-col">
              {/* Shader background */}
              <div className="absolute inset-0 overflow-hidden">
                <AnimatedShaderBackground />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(6,6,8,0.7) 70%, var(--bg) 100%)" }}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse 120% 100% at 50% 0%, transparent 30%, rgba(6,6,8,0.55) 100%)" }}
                />
              </div>

              {/* Content */}
              <div className="relative z-10 px-4 pb-20">
                <div className="max-w-[640px] mx-auto">
                  <Hero
                    onDecode={(input, chain, mode) => decode(input, chain, mode, false)}
                    onDemo={() => decode("", "ethereum", "pre-sign", true)}
                    loading={state === "loading"}
                  />

                  {state === "loading" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
                      <LoadingTerminal />
                    </motion.div>
                  )}

                  {state === "error" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 rounded-xl px-6 py-4"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-base mt-0.5" style={{ color: "#ef4444" }}>✗</span>
                        <div>
                          <p className="font-mono font-semibold text-sm" style={{ color: "#ef4444" }}>Decode Failed</p>
                          <p className="font-mono text-xs mt-1" style={{ color: "rgba(239,68,68,0.7)" }}>{errorMsg}</p>
                        </div>
                      </div>
                      <button
                        onClick={reset}
                        className="mt-4 text-xs font-mono transition-colors"
                        style={{ color: "var(--text-tertiary)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; }}
                      >
                        ← Try again
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {state === "result" && result && (
          <motion.div
            key="result-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="px-4 pt-12 pb-20"
          >
            <div className="max-w-[640px] mx-auto">
              {/* Warning banner — e.g. tx hash pasted in pre-sign mode */}
              {result.warning && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 rounded-xl px-5 py-3 flex items-start gap-3"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}
                >
                  <span className="text-sm mt-0.5" style={{ color: "#f59e0b" }}>⚠</span>
                  <p className="text-xs font-mono leading-relaxed" style={{ color: "rgba(245,158,11,0.9)" }}>
                    {result.warning}
                  </p>
                </motion.div>
              )}

              <ResultCard
                decoded={result.decoded}
                explanation={result.explanation}
                raw={result.raw}
                onReset={reset}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
