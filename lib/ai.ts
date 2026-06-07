// Pre-sign: analyzing a transaction before the user commits to it
export interface PreSignExplanation {
  action: string;
  in_plain_english: string;
  what_you_lose: string;
  what_you_get: string | null;
  gas_cost: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "DANGER";
  risk_reason: string;
  contract_trust: "VERIFIED" | "UNVERIFIED" | "SUSPICIOUS";
  red_flags: string[];
  should_sign: boolean;
  one_liner: string;
}

// Post-sign: decoding a completed transaction
export interface PostSignExplanation {
  action: string;
  in_plain_english: string;
  what_was_sent: string;
  what_was_received: string | null;
  gas_paid: string;
  contract_trust: "VERIFIED" | "UNVERIFIED" | "SUSPICIOUS";
  red_flags: string[];
  one_liner: string;
}

// Contract deployment: someone published a new smart contract
export interface ContractDeploymentExplanation {
  action: string;
  what_happened: string;
  deployer_context: string;
  contract_size_context: string;
  eth_spent_context: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "DANGER";
  risk_reason: string;
  red_flags: string[];
  one_liner: string;
}

export type AIExplanation =
  | ({ mode: "pre-sign" } & PreSignExplanation)
  | ({ mode: "post-sign" } & PostSignExplanation)
  | ({ mode: "contract-deployment" } & ContractDeploymentExplanation);

const PRE_SIGN_SYSTEM = `You are DeCryp, a crypto transaction safety assistant. A user is about to sign a blockchain transaction and wants to know if it is safe. Your job is to protect them.

Be direct, clear, and protective. Write like you're warning a friend who doesn't know crypto. Use present tense — this hasn't happened yet.

Return ONLY valid JSON, nothing before or after it:
{"action":"one sentence: what will literally happen","in_plain_english":"2-3 sentences for someone who has never used crypto. Present tense. What is about to happen?","what_you_lose":"exactly what leaves the wallet","what_you_get":"exactly what enters the wallet or null","gas_cost":"estimated gas in USD","risk_level":"LOW|MEDIUM|HIGH|DANGER","risk_reason":"one sentence explaining the risk rating","contract_trust":"VERIFIED|UNVERIFIED|SUSPICIOUS","red_flags":["specific warnings as strings, empty if none"],"should_sign":false,"one_liner":"most important thing to know, max 12 words, present tense"}

Risk rules (be accurate, not paranoid):
- LOW: known verified protocol (Uniswap, Aave, Compound, OpenSea, Lido), routine operation
- MEDIUM: verified contract, unfamiliar protocol, or value >$1000
- HIGH: unverified contract, unknown method, or suspicious parameters
- DANGER: unverified + high value, unlimited approvals to unknown spenders, or clear scam patterns
- should_sign=true only for LOW or MEDIUM with known protocol`;

const POST_SIGN_SYSTEM = `You are DeCryp, a crypto transaction decoder. A user wants to understand a transaction that already happened. Explain it clearly in plain English. Use past tense. Do not say whether they should or shouldn't have signed it — it's done. Focus on what actually occurred.

Return ONLY valid JSON, nothing before or after it:
{"action":"one sentence: what literally happened","in_plain_english":"2-3 sentences explaining what occurred, past tense, for a non-crypto user","what_was_sent":"exactly what left the wallet","what_was_received":"exactly what entered the wallet or null if nothing","gas_paid":"gas cost that was paid in USD","contract_trust":"VERIFIED|UNVERIFIED|SUSPICIOUS","red_flags":["anything suspicious about this completed transaction, empty array if none"],"one_liner":"past tense summary, max 12 words, e.g. Swapped $500 USDC for 0.18 ETH on Uniswap"}`;

function stripAndParse<T>(raw: string): T {
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1)) as T;
      } catch {
        // fall through
      }
    }
    throw new Error(`Could not extract JSON from AI response. Raw: ${raw.slice(0, 300)}`);
  }
}

interface TransactionContext {
  protocolName: string | null;
  contractAddress: string;
  contractVerified: boolean;
  methodName: string;
  decodedParams: Record<string, unknown>;
  chain: string;
  valueEth: string;
  valueUsd: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  rawCalldata: string;
  isPlainTransfer?: boolean;
  isAddressLookup?: boolean;
}

function buildUserPrompt(ctx: TransactionContext, mode: "pre-sign" | "post-sign"): string {
  if (ctx.isAddressLookup) {
    return `The user pasted a contract address to inspect — no specific transaction or calldata was provided. Describe what this contract does and whether it is trustworthy.
Contract: ${ctx.contractAddress}
Protocol: ${ctx.protocolName ?? "Unknown"}
Verified on Etherscan: ${ctx.contractVerified}
Chain: ${ctx.chain}
Token: ${ctx.tokenSymbol ? `${ctx.tokenSymbol} (${ctx.tokenName})` : "none"}
Note: Since no calldata was provided, use action="Contract inspection", what_you_lose="Nothing (no transaction)", what_you_get=null, gas_cost="N/A", risk_level based on verification status and protocol recognition. If verified and known, LOW. If unverified, HIGH.`;
  }

  if (ctx.isPlainTransfer) {
    const verb = mode === "pre-sign" ? "is about to send" : "sent";
    return `This is a plain ETH transfer — no smart contract involved. The wallet ${verb} ETH directly to another address.
Recipient: ${ctx.contractAddress}
Chain: ${ctx.chain}
Value: ${ctx.valueEth} ETH ($${ctx.valueUsd} USD)
${mode === "pre-sign" ? "Note: Plain wallet-to-wallet ETH sends are always LOW risk." : "Note: Plain ETH transfers are routine."}`;
  }

  return `Protocol: ${ctx.protocolName ?? "Unknown"}
Contract: ${ctx.contractAddress}
Verified: ${ctx.contractVerified}
Method: ${ctx.methodName}
Params: ${JSON.stringify(ctx.decodedParams)}
Chain: ${ctx.chain}
Value: ${ctx.valueEth} ETH ($${ctx.valueUsd} USD)
Token: ${ctx.tokenSymbol ? `${ctx.tokenSymbol} (${ctx.tokenName})` : "none"}`;
}

async function callNvidia(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY not set");

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "meta/llama-3.3-70b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 450,
    }),
    cache: "no-store",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signal: (AbortSignal as any).timeout(55000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`NVIDIA API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function analyzeBeforeSigning(ctx: TransactionContext): Promise<PreSignExplanation> {
  const raw = await callNvidia(PRE_SIGN_SYSTEM, buildUserPrompt(ctx, "pre-sign"));
  return stripAndParse<PreSignExplanation>(raw);
}

export async function decodeCompletedTransaction(ctx: TransactionContext): Promise<PostSignExplanation> {
  const raw = await callNvidia(POST_SIGN_SYSTEM, buildUserPrompt(ctx, "post-sign"));
  return stripAndParse<PostSignExplanation>(raw);
}

const DEPLOYMENT_SYSTEM = `You are DeCryp, a blockchain transaction decoder. A user is looking at a contract deployment transaction — someone published a new smart contract to the blockchain. Explain what this means in plain English. Use past tense. Do not give a should_sign verdict. This already happened.

Return ONLY valid JSON, nothing before or after it:
{"action":"one sentence: a new smart contract was deployed","what_happened":"2-3 sentences explaining contract deployment to someone who has never heard of it. What does it mean to deploy a contract? What did this specific deployment do?","deployer_context":"one sentence about the deployer address — known entity or unknown wallet?","contract_size_context":"one sentence interpreting bytecode size — is this tiny or complex? What does that suggest?","eth_spent_context":"one sentence about ETH sent during deployment — normal contracts cost gas only, contracts that also received ETH at deployment warrant attention","risk_level":"LOW|MEDIUM|HIGH|DANGER","risk_reason":"one sentence: why this risk level","red_flags":["specific warnings, empty array if nothing suspicious"],"one_liner":"max 12 words, past tense, what happened"}`;

export interface DeploymentContext {
  txHash: string;
  chain: string;
  deployerAddress: string;
  deployedAddress: string | null;
  bytecodeSize: number;
  valueSpent: string;
  gasUsed: string | null;
  preComputedFlags: string[];
}

export async function analyzeContractDeployment(ctx: DeploymentContext): Promise<ContractDeploymentExplanation> {
  const flagsLine = ctx.preComputedFlags.length > 0
    ? `Pre-computed flags: ${ctx.preComputedFlags.join("; ")}`
    : "Pre-computed flags: none";

  const userPrompt = `Decode this contract deployment transaction:

Transaction Hash: ${ctx.txHash}
Chain: ${ctx.chain}
Deployer Wallet: ${ctx.deployerAddress}
Newly Deployed Contract: ${ctx.deployedAddress ?? "unknown (receipt unavailable)"}
Bytecode Size: ${ctx.bytecodeSize} bytes
ETH Sent During Deployment: ${ctx.valueSpent} ETH
Gas Used: ${ctx.gasUsed ?? "unknown"}
${flagsLine}

Explain what happened and flag anything unusual.`;

  const raw = await callNvidia(DEPLOYMENT_SYSTEM, userPrompt);
  return stripAndParse<ContractDeploymentExplanation>(raw);
}
