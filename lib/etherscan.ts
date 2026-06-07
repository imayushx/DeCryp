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
    if (json.result) {
      return {
        to: json.result.to ?? null,
        from: json.result.from ?? null,
        input: json.result.input ?? null,
        value: json.result.value ?? "0x0",
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
} | null> {
  const chainId = CHAIN_IDS[chain] ?? 1;
  const apiKey = process.env.ETHERSCAN_API_KEY ?? "";
  const url = `${ETHERSCAN_BASE}?chainid=${chainId}&module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store", signal: timeout() });
    const json = await res.json();
    if (json.result) {
      return {
        contractAddress: json.result.contractAddress ?? null,
        gasUsed: json.result.gasUsed ?? null,
      };
    }
    return null;
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
