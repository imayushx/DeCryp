"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Hero from "@/components/Hero";
import ResultCard from "@/components/ResultCard";
import LoadingTerminal from "@/components/LoadingTerminal";
import type { AIExplanation } from "@/lib/ai";

interface DecodeResult {
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

  async function decode(input: string, chain: string, demo = false) {
    setState("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, chain, demo }),
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

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {(state === "idle" || state === "loading" || state === "error") && (
            <motion.div
              key="hero-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Hero
                onDecode={(input, chain) => decode(input, chain, false)}
                onDemo={() => decode("", "ethereum", true)}
                loading={state === "loading"}
              />

              {state === "loading" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6"
                >
                  <LoadingTerminal />
                </motion.div>
              )}

              {state === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 rounded-xl border border-[#ff333340] bg-[#ff333310] px-6 py-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-[#ff3333] text-lg">✗</span>
                    <div>
                      <p className="text-[#ff3333] font-mono font-semibold text-sm">Decode Failed</p>
                      <p className="text-[#ff333399] font-mono text-xs mt-1">{errorMsg}</p>
                    </div>
                  </div>
                  <button
                    onClick={reset}
                    className="mt-4 text-xs font-mono text-[#888888] hover:text-[#f0f0f0] transition-colors"
                  >
                    ← Try again
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {state === "result" && result && (
            <motion.div
              key="result-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-12"
            >
              <ResultCard
                decoded={result.decoded}
                explanation={result.explanation}
                raw={result.raw}
                onReset={reset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
