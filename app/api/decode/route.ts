import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import { fetchABI, fetchTransaction, fetchTokenInfo, fetchEthPrice } from "@/lib/etherscan";
import { decodeCalldata, detectInputType } from "@/lib/decoder";
import { getProtocolName } from "@/lib/protocols";
import { explainTransaction } from "@/lib/ai";

// Hardcoded demo result for "Try Example" button
const DEMO_RESULT = {
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
    action: "Swap 1,000 USDC for approximately 0.38 ETH on Uniswap V3.",
    in_plain_english:
      "You are trading 1,000 USDC (a dollar-pegged coin) for roughly 0.38 ETH (Ethereum's native currency) through Uniswap, a popular decentralized exchange. The exchange rate is automatically set by a smart contract based on current market prices. You will receive at least 0.38 ETH — if the price moves too much before your trade goes through, it cancels automatically to protect you.",
    what_you_lose: "1,000 USDC + ~$3–8 in gas fees",
    what_you_get: "~0.38 ETH (minimum guaranteed)",
    gas_cost: "~$4.50",
    risk_level: "LOW",
    risk_reason: "Uniswap V3 is a battle-tested, fully verified protocol used by millions of people daily.",
    contract_trust: "VERIFIED",
    red_flags: [],
    should_sign: true,
    one_liner: "Trading 1,000 USDC for ETH on Uniswap — looks safe.",
  },
  raw: {
    calldata: "0x414bf389...",
    to: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    chain: "ethereum",
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, chain = "ethereum", demo } = body as {
      input: string;
      chain: string;
      demo?: boolean;
    };

    if (demo) {
      return NextResponse.json(DEMO_RESULT);
    }

    if (!input || typeof input !== "string") {
      return NextResponse.json({ error: "input is required" }, { status: 400 });
    }

    const inputType = detectInputType(input.trim());

    let to: string | null = null;
    let from: string | null = null;
    let calldata = "0x";
    let valueHex = "0x0";

    if (inputType === "txhash") {
      const tx = await fetchTransaction(input.trim(), chain);
      if (!tx) {
        return NextResponse.json({ error: "Transaction not found. Check the hash and chain." }, { status: 404 });
      }
      to = tx.to;
      from = tx.from;
      calldata = tx.input ?? "0x";
      valueHex = tx.value ?? "0x0";
    } else if (inputType === "address") {
      to = input.trim();
    } else {
      // raw calldata without a known target — treat as decode-only
      calldata = input.trim();
    }

    if (!to) {
      return NextResponse.json({ error: "Could not determine contract address." }, { status: 400 });
    }

    // Plain ETH transfer — no calldata, no contract to decode
    const isPlainTransfer = calldata === "0x" || calldata === "" || calldata === "0x0";

    const [abiResult, ethPrice, tokenInfo] = await Promise.all([
      isPlainTransfer ? Promise.resolve({ abi: null, verified: true }) : fetchABI(to, chain),
      fetchEthPrice(),
      isPlainTransfer ? Promise.resolve(null) : fetchTokenInfo(to, chain),
    ]);

    let decoded: { method: string; params: Record<string, unknown>; valueEth: string; valueUsd: string; rawCalldata: string };

    if (isPlainTransfer) {
      const ethAmt = parseInt(valueHex, 16) / 1e18;
      decoded = {
        method: "ETH Transfer",
        params: { recipient: to, ...(from ? { sender: from } : {}) },
        valueEth: ethAmt.toFixed(6),
        valueUsd: (ethAmt * ethPrice).toFixed(2),
        rawCalldata: "0x",
      };
    } else {
      decoded = decodeCalldata(calldata, abiResult.abi ?? "[]", valueHex, ethPrice, to, from);
    }

    const protocolName = isPlainTransfer ? "Direct Transfer" : getProtocolName(to);

    let explanation;
    try {
      explanation = await explainTransaction({
        protocolName,
        contractAddress: to,
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
      });
    } catch (aiErr) {
      console.error("AI call failed:", aiErr);
      // Return partial result with a fallback explanation
      explanation = {
        action: "Transaction decoded but AI explanation unavailable.",
        in_plain_english:
          "We decoded the transaction data but couldn't generate a plain English explanation right now. Review the raw details below carefully.",
        what_you_lose: decoded.valueEth !== "0" ? `${decoded.valueEth} ETH ($${decoded.valueUsd})` : "Gas fees only",
        what_you_get: null,
        gas_cost: "Unknown",
        risk_level: "MEDIUM" as const,
        risk_reason: "Could not fully analyze this transaction. Treat with caution.",
        contract_trust: abiResult.verified ? ("VERIFIED" as const) : ("UNVERIFIED" as const),
        red_flags: abiResult.verified ? [] : ["Contract is not verified on Etherscan"],
        should_sign: false,
        one_liner: "AI unavailable — review raw transaction details manually.",
      };
    }

    return NextResponse.json({
      decoded: {
        method: decoded.method,
        params: decoded.params,
        protocol: protocolName,
        contractVerified: abiResult.verified,
        valueEth: decoded.valueEth,
        valueUsd: decoded.valueUsd,
      },
      explanation,
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
