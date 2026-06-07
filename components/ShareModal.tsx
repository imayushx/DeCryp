"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ShareModalProps {
  targetRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

type ModalState = "capturing" | "ready" | "error";

export default function ShareModal({ targetRef, onClose }: ShareModalProps) {
  const [modalState, setModalState] = useState<ModalState>("capturing");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function"
    );
  }, []);

  useEffect(() => {
    if (!targetRef.current) {
      setModalState("error");
      return;
    }

    let cancelled = false;

    async function capture() {
      try {
        const html2canvas = (await import("html2canvas")).default;
        const el = targetRef.current!;

        const canvas = await html2canvas(el, {
          backgroundColor: "#060608",
          scale: 2,
          useCORS: true,
          logging: false,
          // Clip to visible content only
          width: el.scrollWidth,
          height: el.scrollHeight,
        });

        if (cancelled) return;

        canvasRef.current = canvas;
        const url = canvas.toDataURL("image/png");
        setImageUrl(url);

        canvas.toBlob((blob) => {
          if (blob && !cancelled) setImageBlob(blob);
        }, "image/png");

        setModalState("ready");
      } catch {
        if (!cancelled) setModalState("error");
      }
    }

    capture();
    return () => { cancelled = true; };
  }, [targetRef]);

  function handleDownload() {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "decryp-result.png";
    a.click();
  }

  async function handleNativeShare() {
    if (!imageBlob) return;
    const file = new File([imageBlob], "decryp-result.png", { type: "image/png" });
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "DeCryp — Transaction Decoded",
          text: "Decoded with DeCryp: de-cryp.vercel.app",
        });
      }
    } catch {
      // user cancelled share — not an error
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText("https://de-cryp.vercel.app").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="share-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
        onClick={handleBackdrop}
      >
        <motion.div
          key="share-panel"
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px] rounded-2xl overflow-hidden"
          style={{ background: "#0a0a0f", border: "1px solid rgba(255,255,255,0.09)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="18" cy="5" r="3" stroke="#00ff88" strokeWidth="2"/>
                <circle cx="6" cy="12" r="3" stroke="#00ff88" strokeWidth="2"/>
                <circle cx="18" cy="19" r="3" stroke="#00ff88" strokeWidth="2"/>
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="#00ff88" strokeWidth="2"/>
              </svg>
              <span className="text-sm font-semibold" style={{ color: "#f1f0f5" }}>Share Result</span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-tertiary)" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Screenshot preview */}
          <div className="px-5 pt-4 pb-3">
            <div
              className="w-full rounded-xl overflow-hidden relative"
              style={{
                background: "#060608",
                border: "1px solid rgba(255,255,255,0.06)",
                minHeight: "180px",
              }}
            >
              {modalState === "capturing" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-6 h-6 rounded-full"
                    style={{ border: "2px solid rgba(0,255,136,0.15)", borderTopColor: "#00ff88" }}
                  />
                  <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>Capturing screenshot…</span>
                </div>
              )}

              {modalState === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>Screenshot unavailable</span>
                </div>
              )}

              {modalState === "ready" && imageUrl && (
                <motion.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  src={imageUrl}
                  alt="Result screenshot"
                  className="w-full h-auto block"
                  style={{ maxHeight: "320px", objectFit: "cover", objectPosition: "top" }}
                />
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-5 pb-5 space-y-2">
            {/* Native share — mobile */}
            {canNativeShare && modalState === "ready" && (
              <button
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
                style={{ background: "linear-gradient(135deg, #00ff88, #00d4ff)", color: "#060608" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Send via…
              </button>
            )}

            {/* Download image */}
            <button
              onClick={handleDownload}
              disabled={modalState !== "ready"}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl font-mono text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "rgba(0,255,136,0.07)", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88" }}
              onMouseEnter={(e) => { if (modalState === "ready") e.currentTarget.style.background = "rgba(0,255,136,0.13)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,255,136,0.07)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v13M5 16l7 7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 21h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Download Image
            </button>

            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl font-mono text-sm transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: copied ? "#00ff88" : "var(--text-secondary)" }}
              onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#f1f0f5"; } }}
              onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Link Copied
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Copy Link
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
