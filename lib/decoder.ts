import { decodeFunctionData, parseAbi, formatEther, type Abi } from "viem";

export interface DecodedTransaction {
  method: string;
  params: Record<string, unknown>;
  valueEth: string;
  valueUsd: string;
  rawCalldata: string;
  to: string;
  from: string | null;
}

export function decodeCalldata(
  calldata: string,
  abiJson: string,
  valueHex: string,
  ethPrice: number,
  to: string,
  from: string | null
): DecodedTransaction {
  let method = "unknown";
  let params: Record<string, unknown> = {};

  if (calldata && calldata !== "0x" && abiJson) {
    try {
      const abi = JSON.parse(abiJson) as Abi;
      const decoded = decodeFunctionData({ abi, data: calldata as `0x${string}` });

      method = decoded.functionName;

      // Convert args array to named params using ABI
      const funcAbi = abi.find(
        (item) => item.type === "function" && "name" in item && item.name === decoded.functionName
      );

      if (funcAbi && "inputs" in funcAbi && funcAbi.inputs) {
        funcAbi.inputs.forEach((input, i) => {
          const val = decoded.args?.[i];
          params[input.name || `arg${i}`] = serializeValue(val);
        });
      } else if (decoded.args) {
        decoded.args.forEach((arg, i) => {
          params[`arg${i}`] = serializeValue(arg);
        });
      }
    } catch {
      // If ABI decode fails, try to extract 4-byte selector
      if (calldata.length >= 10) {
        method = `0x${calldata.slice(2, 10)}`;
      }
    }
  } else if (calldata === "0x" || !calldata) {
    method = "transfer"; // native ETH transfer
  }

  const valueWei = BigInt(valueHex || "0x0");
  const valueEth = formatEther(valueWei);
  const valueUsd = (parseFloat(valueEth) * ethPrice).toFixed(2);

  return {
    method,
    params,
    valueEth,
    valueUsd,
    rawCalldata: calldata || "0x",
    to,
    from,
  };
}

function serializeValue(val: unknown): unknown {
  if (typeof val === "bigint") return val.toString();
  if (Array.isArray(val)) return val.map(serializeValue);
  if (typeof val === "object" && val !== null) {
    return Object.fromEntries(
      Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, serializeValue(v)])
    );
  }
  return val;
}

export function detectInputType(input: string): "txhash" | "address" | "calldata" {
  const trimmed = input.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) return "txhash";
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return "address";
  return "calldata";
}
