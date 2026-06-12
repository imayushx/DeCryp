import type { Metadata } from "next";
import HomeClient from "./page-client";

interface PageProps {
  searchParams: Promise<{ tx?: string; chain?: string; demo?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const tx = params.tx;
  const chain = params.chain ?? "ethereum";

  if (tx) {
    const shortTx = `${tx.slice(0, 6)}...${tx.slice(-4)}`;
    const chainLabel = chain.charAt(0).toUpperCase() + chain.slice(1);
    return {
      title: `DeCryp — Decoded: ${shortTx}`,
      description: `AI-decoded blockchain transaction on ${chainLabel}. See exactly what happened in plain English.`,
      openGraph: {
        title: "DeCryp — Transaction Decoded",
        description: `${shortTx} on ${chainLabel} — decoded into plain English with risk analysis.`,
        url: `https://de-cryp.vercel.app/?tx=${tx}&chain=${chain}`,
        siteName: "DeCryp",
        type: "website",
      },
      twitter: {
        card: "summary",
        title: "DeCryp — Transaction Decoded",
        description: `${shortTx} decoded into plain English. Risk score included.`,
      },
    };
  }

  return {
    title: "DeCryp — Decode Any Crypto Transaction in Plain English",
    description:
      "Paste any transaction hash or contract address. DeCryp explains exactly what you're signing before you do it.",
    openGraph: {
      title: "DeCryp — Decode Any Crypto Transaction in Plain English",
      description:
        "Paste any transaction hash or contract address. DeCryp explains exactly what you're signing before you do it.",
      url: "https://de-cryp.vercel.app",
      siteName: "DeCryp",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: "DeCryp — Decode Any Crypto Transaction in Plain English",
      description:
        "Paste any transaction hash or contract address. Get plain English explanation with risk score.",
    },
  };
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <HomeClient
      initialTx={params.tx}
      initialChain={params.chain}
      isDemo={params.demo === "1"}
    />
  );
}
