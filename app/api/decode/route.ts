import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
import { fetchABI, fetchTransactionReceipt, fetchTransactionRaw, fetchTokenInfo, fetchEthPrice } from "@/lib/etherscan";
import { decodeCalldata, detectInputType } from "@/lib/decoder";
import { getProtocolName } from "@/lib/protocols";
import { analyzeBeforeSigning, decodeCompletedTransaction, analyzeContractDeployment } from "@/lib/ai";
import type { PreSignExplanation, PostSignExplanation, ContractDeploymentExplanation } from "@/lib/ai";

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
      // Fetch tx + receipt in parallel — receipt is needed to detect contract creation
      const [txRaw, receipt, ethPrice] = await Promise.all([
        fetchTransactionRaw(input.trim(), chain),
        fetchTransactionReceipt(input.trim(), chain),
        fetchEthPrice(),
      ]);

      if (!txRaw && !receipt) {
        return NextResponse.json(
          { error: "Transaction not found. Check the hash and the selected chain — make sure you picked the right network (ETH, Base, Polygon…)." },
          { status: 404 }
        );
      }

      // Debug log — visible in Vercel Functions tab
      console.log("TX fetch result:", JSON.stringify({
        from: txRaw?.from,
        to: txRaw?.to,
        value: txRaw?.value,
        inputLength: (txRaw?.input ?? txRaw?.data ?? "").length,
        receiptContractAddress: receipt?.contractAddress,
        receiptFrom: receipt?.from,
        receiptGasUsed: receipt?.gasUsed,
      }));

      // Detect contract creation: receipt.contractAddress is the definitive signal
      const isContractCreation =
        receipt?.contractAddress != null &&
        receipt.contractAddress !== "" &&
        receipt.contractAddress !== "0x";

      if (isContractCreation) {
        // Extract all fields with explicit fallbacks
        let deployerAddress: string | null =
          txRaw?.from ?? receipt?.from ?? null;

        const inputData: string = txRaw?.input ?? txRaw?.data ?? "0x";
        let bytecodeSize: number =
          inputData && inputData !== "0x"
            ? Math.floor((inputData.length - 2) / 2)
            : 0;

        const rawValue: string = txRaw?.value ?? "0x0";
        const valueInWei = BigInt(rawValue);
        const valueInEth = Number(valueInWei) / 1e18;
        const valueSpentEth = valueInEth.toFixed(6);
        const valueSpentUsd = (valueInEth * ethPrice).toFixed(2);

        let deployedAddress: string | null = receipt.contractAddress;

        const gasUsed: string | null = receipt?.gasUsed
          ? parseInt(receipt.gasUsed, 16).toLocaleString()
          : null;

        // Etherscan fallback — if deployer or bytecode still missing
        if (!deployerAddress || bytecodeSize === 0 || !deployedAddress) {
          console.log("Falling back to Etherscan API for missing deployment fields");
          const CHAIN_IDS: Record<string, number> = {
            ethereum: 1, base: 8453, polygon: 137, arbitrum: 42161, optimism: 10,
          };
          const chainId = CHAIN_IDS[chain] ?? 1;
          const apiKey = process.env.ETHERSCAN_API_KEY ?? "";

          if (!deployerAddress || bytecodeSize === 0) {
            try {
              const txUrl = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=proxy&action=eth_getTransactionByHash&txhash=${input.trim()}&apikey=${apiKey}`;
              const txRes = await fetch(txUrl, { cache: "no-store" });
              const txJson = await txRes.json();
              const ethTx = txJson?.result;
              if (ethTx) {
                deployerAddress = deployerAddress ?? ethTx.from ?? null;
                const inputFallback: string = ethTx.input ?? ethTx.data ?? "0x";
                if (bytecodeSize === 0 && inputFallback !== "0x") {
                  bytecodeSize = Math.floor((inputFallback.length - 2) / 2);
                }
              }
            } catch (err) {
              console.error("Etherscan tx fallback failed:", err);
            }
          }

          if (!deployedAddress) {
            try {
              const rcptUrl = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=proxy&action=eth_getTransactionReceipt&txhash=${input.trim()}&apikey=${apiKey}`;
              const rcptRes = await fetch(rcptUrl, { cache: "no-store" });
              const rcptJson = await rcptRes.json();
              deployedAddress = rcptJson?.result?.contractAddress ?? null;
            } catch (err) {
              console.error("Etherscan receipt fallback failed:", err);
            }
          }
        }

        console.log("Deployment resolved:", { deployerAddress, deployedAddress, bytecodeSize, valueSpentEth, gasUsed });

        // Pre-compute flags
        const preComputedFlags: string[] = [];
        if (valueInEth > 5) {
          preComputedFlags.push("Large ETH value sent at deployment — high attention warranted");
        } else if (valueInEth > 0.1) {
          preComputedFlags.push("Contract received ETH during deployment — verify this was intentional");
        }
        if (bytecodeSize > 0 && bytecodeSize < 100) {
          preComputedFlags.push("Very small contract — could be a minimal proxy, test contract, or honeypot shell");
        }

        let deploymentExplanation: ContractDeploymentExplanation;
        try {
          deploymentExplanation = await analyzeContractDeployment({
            txHash: input.trim(),
            chain,
            deployerAddress: deployerAddress ?? "unknown",
            deployedAddress,
            bytecodeSize,
            valueSpent: valueSpentEth,
            gasUsed,
            preComputedFlags,
          });
        } catch (err) {
          console.error("AI call failed (deployment):", err);
          const shortDeployer = deployerAddress
            ? `${deployerAddress.slice(0, 6)}...${deployerAddress.slice(-4)}`
            : "unknown address";
          deploymentExplanation = {
            action: `A new smart contract was deployed to ${chain}.`,
            what_happened: `A new smart contract was published to the ${chain} blockchain by ${shortDeployer}. The contract is ${bytecodeSize > 0 ? `${bytecodeSize} bytes` : "an unknown size"} in bytecode. Contract deployments publish executable code that anyone can interact with.`,
            deployer_context: deployerAddress
              ? `Deployed by ${deployerAddress}.`
              : "Deployer address could not be retrieved.",
            contract_size_context: bytecodeSize > 10000
              ? "Large contract — likely complex protocol logic with multiple functions."
              : bytecodeSize > 1000
              ? "Medium-sized contract — typical for tokens or simple DeFi contracts."
              : bytecodeSize > 0
              ? "Small contract — could be a minimal proxy, simple token, or test contract."
              : "Contract size unavailable from on-chain data.",
            eth_spent_context: valueInEth > 0
              ? `${valueSpentEth} ETH was sent during deployment — contracts that receive ETH at creation warrant extra scrutiny.`
              : "No ETH was sent during deployment — this is normal for most contracts.",
            risk_level: "MEDIUM",
            risk_reason: "Contract deployments should always be reviewed — verify the source code on Etherscan before interacting.",
            red_flags: preComputedFlags,
            one_liner: `New contract deployed to ${chain} by ${shortDeployer}.`,
          };
        }

        return NextResponse.json({
          mode: "contract-deployment",
          warning: null,
          decoded: {
            method: "Contract Deployment",
            params: { deployer: deployerAddress, deployedContract: deployedAddress },
            protocol: null,
            contractVerified: false,
            valueEth: valueSpentEth,
            valueUsd: valueSpentUsd,
          },
          explanation: { mode: "contract-deployment", ...deploymentExplanation },
          raw: {
            calldata: inputData.slice(0, 200),
            to: deployedAddress ?? "pending",
            chain,
          },
          deployment: {
            deployerAddress: deployerAddress ?? "unknown",
            deployedAddress,
            bytecodeSize,
            valueSpentEth,
            valueSpentUsd,
            gasUsed,
            txHash: input.trim(),
          },
        });
      }

      // Not a contract creation — reuse txRaw already fetched above
      if (!txRaw) {
        return NextResponse.json(
          { error: "Transaction not found. Check the hash and the selected chain — make sure you picked the right network (ETH, Base, Polygon…)." },
          { status: 404 }
        );
      }
      to = txRaw.to ?? null;
      from = txRaw.from ?? null;
      calldata = txRaw.input ?? txRaw.data ?? "0x";
      valueHex = txRaw.value ?? "0x0";
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
