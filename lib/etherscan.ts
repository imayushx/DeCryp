const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
};

// Priority order doubles as tie-break when something exists on multiple chains
export const SUPPORTED_CHAINS = ["ethereum", "base", "arbitrum", "polygon", "optimism"] as const;

// Free public RPCs used only for chain detection probes — keeps the bursts of
// 5 parallel lookups off the Etherscan key's rate limit
const PUBLIC_RPC: Record<string, string> = {
  ethereum: "https://ethereum-rpc.publicnode.com",
  base: "https://base-rpc.publicnode.com",
  polygon: "https://polygon-bor-rpc.publicnode.com",
  arbitrum: "https://arbitrum-one-rpc.publicnode.com",
  optimism: "https://optimism-rpc.publicnode.com",
};

async function rpcCall(chain: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(PUBLIC_RPC[chain], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signal: (AbortSignal as any).timeout(6000),
  });
  const json = await res.json();
  return json.result ?? null;
}

/**
 * Finds which chain a transaction lives on by probing all supported networks
 * in parallel. Falls back to the Etherscan proxy per chain if the public RPC
 * probe errors. Returns null when no network knows the hash.
 */
export async function findTransactionChain(txHash: string): Promise<string | null> {
  const probes = SUPPORTED_CHAINS.map(async (chain) => {
    try {
      const tx = await rpcCall(chain, "eth_getTransactionByHash", [txHash]);
      if (tx && typeof tx === "object") return chain;
    } catch {
      // RPC unreachable — try Etherscan for this chain instead
      const fallback = await fetchTransactionRaw(txHash, chain);
      if (fallback) return chain;
    }
    return null;
  });
  const results = await Promise.all(probes);
  return results.find((c): c is (typeof SUPPORTED_CHAINS)[number] => c !== null) ?? null;
}

/**
 * RPC fallbacks for very fresh transactions — public nodes see them seconds
 * before Etherscan's indexer does, so a tx found during chain detection must
 * still be fetchable even when Etherscan returns nothing.
 */
export async function rpcGetTransactionRaw(txHash: string, chain: string): Promise<Record<string, string> | null> {
  try {
    const result = await rpcCall(chain, "eth_getTransactionByHash", [txHash]);
    return result && typeof result === "object" ? (result as Record<string, string>) : null;
  } catch {
    return null;
  }
}

export async function rpcGetTransactionReceipt(txHash: string, chain: string): Promise<{
  contractAddress: string | null;
  gasUsed: string | null;
  from: string | null;
  blockNumber: string | null;
} | null> {
  try {
    const result = await rpcCall(chain, "eth_getTransactionReceipt", [txHash]);
    if (result && typeof result === "object") {
      const r = result as Record<string, string>;
      return {
        contractAddress: r.contractAddress ?? null,
        gasUsed: r.gasUsed ?? null,
        from: r.from ?? null,
        blockNumber: r.blockNumber ?? null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Finds which chain an address has deployed contract code on. EOAs (regular
 * wallets) have no code anywhere, in which case this returns null and callers
 * should treat the address as a wallet on Ethereum.
 */
export async function findAddressChain(address: string): Promise<string | null> {
  const probes = SUPPORTED_CHAINS.map(async (chain) => {
    try {
      const code = await rpcCall(chain, "eth_getCode", [address, "latest"]);
      if (typeof code === "string" && code !== "0x" && code !== "") return chain;
    } catch {
      // probe failure on one chain is non-fatal for detection
    }
    return null;
  });
  const results = await Promise.all(probes);
  return results.find((c): c is (typeof SUPPORTED_CHAINS)[number] => c !== null) ?? null;
}

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
