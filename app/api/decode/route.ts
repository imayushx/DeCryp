import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import { fetchABI, fetchTransaction, fetchTokenInfo, fetchEthPrice } from "@/lib/etherscan";
import { decodeCalldata, detectInputType } from "@/lib/decoder";
import { getProtocolName } from "@/lib/protocols";
import { analyzeBeforeSigning, decodeCompletedTransaction } from "@/lib/ai";
import type { PreSignExplanation, PostSignExplanation } from "@/lib/ai";

// Demo result for "Try Example" — pre-sign mode, Uniswap V3 swap
const DEMO_RESULT = {
  mode: "pre-sign" as const,
  decoded: {
    method: "exactInputSingle",
    params: {
      tokenIn: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      tokenOut: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      fee: "3000",
      recipient: "0x742d35Cc6634C0532925a3b8D4C9C6e5b3e5aA3",
      deadline: "1735689600",
      amountIn: "1000000000",
      amountOutMinimum: "380000000000000000",
      sqrtPriceLimitX96: "0",
    },
    protocol: "Uniswap V3 Router",
    contractVerified: true,
    valueEth: "0.0",
    valueUsd: "0.00",
  },
  explanation: {
    mode: "pre-sign" as const,
    action: "Swap 1,000 USDC for approximately 0.38 ETH on Uniswap V3.",
    in_plain_english:
      "You are trading 1,000 USDC (a dollar-pegged coin) for roughly 0.38 ETH through Uniswap, a popular decentralized exchange. The rate is set automatically by a smart contract. You will receive at least 0.38 ETH — if the price moves too much before your trade goes through, it cancels automatically to protect you.",
    what_you_lose: "1,000 USDC + ~$3–8 in gas fees",
    what_you_get: "~0.38 ETH (minimum guaranteed)",
    gas_cost: "~$4.50",
    risk_level: "LOW" as const,
    risk_reason: "Uniswap V3 is a battle-tested, fully verified protocol used by millions of people daily.",
    contract_trust: "VERIFIED" as const,
    red_flags: [],
    should_sign: true,
    one_liner: "Swapping 1,000 USDC for ETH on Uniswap — looks safe.",
  } as PreSignExplanation,
  raw: {
    calldata: "0x414bf389...",
    to: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    chain: "ethereum",
  },
};

type Mode = "pre-sign" | "post-sign";

function preSignFallback(
  decoded: { valueEth: string; valueUsd: string },
  verified: boolean
): PreSignExplanation {
  return {
    action: "Transaction decoded but AI explanation unavailable.",
    in_plain_english:
      "We decoded the transaction data but couldn't generate a plain English explanation right now. Review the raw details below carefully.",
    what_you_lose:
      decoded.valueEth !== "0" ? `${decoded.valueEth} ETH ($${decoded.valueUsd})` : "Gas fees only",
    what_you_get: null,
    gas_cost: "Unknown",
    risk_level: "MEDIUM",
    risk_reason: "Could not fully analyze this transaction. Treat with caution.",
    contract_trust: verified ? "VERIFIED" : "UNVERIFIED",
    red_flags: verified ? [] : ["Contract is not verified on Etherscan"],
    should_sign: false,
    one_liner: "AI unavailable — review raw transaction details manually.",
  };
}

function postSignFallback(
  decoded: { valueEth: string; valueUsd: string },
  verified: boolean
): PostSignExplanation {
  return {
    action: "Transaction decoded but AI explanation unavailable.",
    in_plain_english:
      "We decoded the transaction data but couldn't generate a plain English explanation right now. Check the raw details below.",
    what_was_sent:
      decoded.valueEth !== "0" ? `${decoded.valueEth} ETH ($${decoded.valueUsd})` : "Gas fees only",
    what_was_received: null,
    gas_paid: "Unknown",
    contract_trust: verified ? "VERIFIED" : "UNVERIFIED",
    red_flags: verified ? [] : ["Contract is not verified on Etherscan"],
    one_liner: "AI unavailable — check the raw transaction details.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, chain = "ethereum", demo, mode = "pre-sign" } = body as {
      input: string;
      chain: string;
      demo?: boolean;
      mode?: Mode;
    };

    if (demo) {
      return NextResponse.json(DEMO_RESULT);
    }

    if (!input || typeof input !== "string") {
      return NextResponse.json({ error: "input is required" }, { status: 400 });
    }

    const inputType = detectInputType(input.trim());

    // Mode-specific input validation
    if (mode === "post-sign" && inputType !== "txhash") {
      return NextResponse.json(
        {
          error:
            "Please paste a valid transaction hash (starts with 0x, 66 characters). Find it on Etherscan or in your wallet's activity history.",
        },
        { status: 400 }
      );
    }

    const warning: string | null = null;

    let to: string | null = null;
    let from: string | null = null;
    let calldata = "0x";
    let valueHex = "0x0";

    if (inputType === "txhash") {
      const tx = await fetchTransaction(input.trim(), chain);
      if (!tx) {
        return NextResponse.json(
          { error: "Transaction not found. Check the hash and the selected chain — make sure you picked the right network (ETH, Base, Polygon…)." },
          { status: 404 }
        );
      }
      to = tx.to;
      from = tx.from;
      calldata = tx.input ?? "0x";
      valueHex = tx.value ?? "0x0";

      // Contract creation — to is null
      if (!to) {
        return NextResponse.json(
          { error: "This transaction created a contract. Contract deployment transactions can't be decoded this way — paste the deployed contract address instead." },
          { status: 400 }
        );
      }
    } else if (inputType === "address") {
      // Address-only: fetch contract ABI and show what this contract does
      to = input.trim();
      calldata = "0x"; // no specific call — we'll describe the contract
    } else {
      // Raw calldata without a to address — we can still try to decode it
      calldata = input.trim();
    }

    // For raw calldata without an address we can't fetch ABI — but still analyze
    if (!to && inputType === "calldata") {
      // Synthesize a minimal analysis without a contract address
      to = "0x0000000000000000000000000000000000000000";
    }

    // isPlainTransfer: either explicit ETH send (tx with no input) OR address-only lookup
    const isPlainTransfer =
      (calldata === "0x" || calldata === "" || calldata === "0x0") &&
      inputType !== "address";

    const [abiResult, ethPrice, tokenInfo] = await Promise.all([
      isPlainTransfer ? Promise.resolve({ abi: null, verified: true }) : fetchABI(to!, chain),
      fetchEthPrice(),
      isPlainTransfer ? Promise.resolve(null) : fetchTokenInfo(to!, chain),
    ]);

    let decoded: {
      method: string;
      params: Record<string, unknown>;
      valueEth: string;
      valueUsd: string;
      rawCalldata: string;
    };

    if (inputType === "address") {
      // Address-only lookup — describe the contract itself
      decoded = {
        method: "Contract Lookup",
        params: { address: to, ...(tokenInfo ? { token: tokenInfo.symbol, name: tokenInfo.name } : {}) },
        valueEth: "0.000000",
        valueUsd: "0.00",
        rawCalldata: "0x",
      };
    } else if (isPlainTransfer) {
      const ethAmt = parseInt(valueHex, 16) / 1e18;
      decoded = {
        method: "ETH Transfer",
        params: { recipient: to, ...(from ? { sender: from } : {}) },
        valueEth: ethAmt.toFixed(6),
        valueUsd: (ethAmt * ethPrice).toFixed(2),
        rawCalldata: "0x",
      };
    } else {
      decoded = decodeCalldata(calldata, abiResult.abi ?? "[]", valueHex, ethPrice, to!, from);
    }

    const protocolName =
      inputType === "address"
        ? (getProtocolName(to!) ?? (abiResult.verified ? "Verified Contract" : "Unverified Contract"))
        : isPlainTransfer
        ? "Direct Transfer"
        : getProtocolName(to!);

    const ctx = {
      protocolName,
      contractAddress: to!,
      contractVerified: abiResult.verified,
      methodName: decoded.method,
      decodedParams: decoded.params,
      chain,
      valueEth: decoded.valueEth,
      valueUsd: decoded.valueUsd,
      tokenSymbol: tokenInfo?.symbol ?? null,
      tokenName: tokenInfo?.name ?? null,
      rawCalldata: decoded.rawCalldata,
      isPlainTransfer,
      isAddressLookup: inputType === "address",
    };

    let explanation: PreSignExplanation | PostSignExplanation;

    if (mode === "post-sign") {
      try {
        explanation = await decodeCompletedTransaction(ctx);
      } catch (err) {
        console.error("AI call failed (post-sign):", err);
        explanation = postSignFallback(decoded, abiResult.verified);
      }
    } else {
      try {
        explanation = await analyzeBeforeSigning(ctx);
      } catch (err) {
        console.error("AI call failed (pre-sign):", err);
        explanation = preSignFallback(decoded, abiResult.verified);
      }
    }

    return NextResponse.json({
      mode,
      warning,
      decoded: {
        method: decoded.method,
        params: decoded.params,
        protocol: protocolName,
        contractVerified: abiResult.verified,
        valueEth: decoded.valueEth,
        valueUsd: decoded.valueUsd,
      },
      explanation: { mode, ...explanation },
      raw: {
        calldata: decoded.rawCalldata,
        to,
        chain,
      },
    });
  } catch (err: unknown) {
    console.error("/api/decode error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
