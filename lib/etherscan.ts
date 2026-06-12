const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
};

const ETHERSCAN_BASE = "https://api.etherscan.io/v2/api";
const TIMEOUT_MS = 10000;

function timeout() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (AbortSignal as any).timeout(TIMEOUT_MS);
}

// Etherscan proxy endpoints put error strings in `result` when the API key is
// missing or rate-limited (e.g. "Max calls per sec rate limit reached").
// Treating those as a transaction object yields all-null fields downstream, so
// only accept real objects.
function asResultObject(result: unknown): Record<string, string> | null {
  if (result && typeof result === "object" && !Array.isArray(result)) {
    return result as Record<string, string>;
  }
  return null;
}

export async function fetchABI(address: string, chain: string): Promise<{ abi: string | null; verified: boolean }> {
  const chainId = CHAIN_IDS[chain] ?? 1;
  const apiKey = process.env.ETHERSCAN_API_KEY ?? "";
  const url = `${ETHERSCAN_BASE}?chainid=${chainId}&module=contract&action=getabi&address=${address}&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store", signal: timeout() });
    const json = await res.json();
    if (json.status === "1" && json.result) {
      return { abi: json.result, verified: true };
    }
    return { abi: null, verified: false };
  } catch {
    return { abi: null, verified: false };
  }
}

export async function fetchTransaction(txHash: string, chain: string): Promise<{
  to: string | null;
  from: string | null;
  input: string | null;
  value: string | null;
} | null> {
  const chainId = CHAIN_IDS[chain] ?? 1;
  const apiKey = process.env.ETHERSCAN_API_KEY ?? "";
  const url = `${ETHERSCAN_BASE}?chainid=${chainId}&module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store", signal: timeout() });
    const json = await res.json();
    const tx = asResultObject(json.result);
    if (tx) {
      return {
        to: tx.to ?? null,
        from: tx.from ?? null,
        input: tx.input ?? null,
        value: tx.value ?? "0x0",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchTokenInfo(address: string, chain: string): Promise<{
  name: string | null;
  symbol: string | null;
  decimals: string | null;
} | null> {
  const chainId = CHAIN_IDS[chain] ?? 1;
  const apiKey = process.env.ETHERSCAN_API_KEY ?? "";
  const url = `${ETHERSCAN_BASE}?chainid=${chainId}&module=token&action=tokeninfo&contractaddress=${address}&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store", signal: timeout() });
    const json = await res.json();
    if (json.status === "1" && json.result?.[0]) {
      const info = json.result[0];
      return {
        name: info.tokenName ?? null,
        symbol: info.symbol ?? null,
        decimals: info.divisor ?? null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchTransactionReceipt(txHash: string, chain: string): Promise<{
  contractAddress: string | null;
  gasUsed: string | null;
  from: string | null;
  blockNumber: string | null;
} | null> {
  const chainId = CHAIN_IDS[chain] ?? 1;
  const apiKey = process.env.ETHERSCAN_API_KEY ?? "";
  const url = `${ETHERSCAN_BASE}?chainid=${chainId}&module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store", signal: timeout() });
    const json = await res.json();
    const receipt = asResultObject(json.result);
    if (receipt) {
      return {
        contractAddress: receipt.contractAddress ?? null,
        gasUsed: receipt.gasUsed ?? null,
        from: receipt.from ?? null,
        blockNumber: receipt.blockNumber ?? null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// Raw fetch — returns the full result object so callers can access input/data/value/from/to
export async function fetchTransactionRaw(txHash: string, chain: string): Promise<Record<string, string> | null> {
  const chainId = CHAIN_IDS[chain] ?? 1;
  const apiKey = process.env.ETHERSCAN_API_KEY ?? "";
  const url = `${ETHERSCAN_BASE}?chainid=${chainId}&module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store", signal: timeout() });
    const json = await res.json();
    return asResultObject(json.result);
  } catch {
    return null;
  }
}

export async function fetchEthPrice(): Promise<number> {
  const apiKey = process.env.ETHERSCAN_API_KEY ?? "";
  const url = `${ETHERSCAN_BASE}?chainid=1&module=stats&action=ethprice&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store", signal: timeout() });
    const json = await res.json();
    if (json.status === "1" && json.result?.ethusd) {
      return parseFloat(json.result.ethusd);
    }
  } catch {
    // fallback below
  }
  return 2500;
}
