"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Hero from "@/components/Hero";
import type { DetectedType } from "@/components/Hero";
import ResultCard from "@/components/ResultCard";
import LoadingTerminal from "@/components/LoadingTerminal";
import AnimatedShaderBackground from "@/components/ui/animated-shader-background";
import type { AIExplanation } from "@/lib/ai";

type Mode = "pre-sign" | "post-sign" | "contract-deployment";

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
  deployment?: {
    deployerAddress: string;
    deployedAddress: string | null;
    bytecodeSize: number;
    valueSpentEth: string;
    valueSpentUsd: string;
    gasUsed: string | null;
    txHash: string;
  };
  error?: string;
}

type AppState = "idle" | "loading" | "result" | "error";

function deriveMode(detectedType: DetectedType): "pre-sign" | "post-sign" {
  if (detectedType === "txhash") return "post-sign";
  return "pre-sign";
}

interface HomeClientProps {
  initialTx?: string;
  initialChain?: string;
  isDemo?: boolean;
}

export default function HomeClient({ initialTx, initialChain, isDemo }: HomeClientProps) {
  const [state, setState] = useState<AppState>("idle");
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const didAutoRun = useRef(false);

  async function decode(input: string, chain: string, detectedType: DetectedType, demo = false) {
    setState("loading");
    setResult(null);
    setErrorMsg("");

    const mode = demo ? "pre-sign" : deriveMode(detectedType);

    // Write shareable URL — only for real inputs, not demo
    if (!demo && input.trim()) {
      const params = new URLSearchParams();
      params.set("tx", input.trim());
      params.set("chain", chain);
      window.history.replaceState(null, "", `?${params.toString()}`);
    }

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
    // Clear URL params when user resets
    window.history.replaceState(null, "", "/");
  }

  function inspectAddress(address: string, chain: string) {
    decode(address, chain, "address", false);
  }

  // Auto-decode on mount from URL params or demo flag
  useEffect(() => {
    if (didAutoRun.current) return;
    didAutoRun.current = true;

    if (isDemo) {
      decode("", "ethereum", "empty", true);
      return;
    }

    if (initialTx) {
      const detectedType: DetectedType =
        /^0x[0-9a-fA-F]{64}$/.test(initialTx) ? "txhash"
        : /^0x[0-9a-fA-F]{40}$/.test(initialTx) ? "address"
        : "calldata";
      decode(initialTx, initialChain ?? "ethereum", detectedType, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

              <div className="relative z-10 px-4 pb-20">
                <div className="max-w-[640px] mx-auto">
                  <Hero
                    onDecode={(input, chain, detectedType) => decode(input, chain, detectedType, false)}
                    onDemo={() => decode("", "ethereum", "empty", true)}
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
            className="relative px-4 pt-12 pb-20"
          >
            {/* Ambient glow so the result view keeps the hero's atmosphere */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              <div
                className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
                style={{ background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,255,136,0.05) 0%, transparent 70%)" }}
              />
              <div
                className="absolute top-1/3 -left-60 w-[600px] h-[600px]"
                style={{ background: "radial-gradient(circle, rgba(0,212,255,0.035) 0%, transparent 70%)" }}
              />
              <div
                className="absolute bottom-0 -right-60 w-[600px] h-[600px]"
                style={{ background: "radial-gradient(circle, rgba(168,85,247,0.03) 0%, transparent 70%)" }}
              />
            </div>
            <div className="relative max-w-[640px] mx-auto">
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
                deployment={result.deployment}
                onReset={reset}
                onInspect={inspectAddress}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
