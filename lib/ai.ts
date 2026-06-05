export interface AIExplanation {
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

const SYSTEM_PROMPT = `You are DeCryp, a crypto safety tool. Analyze the transaction and return ONLY this JSON object, nothing else before or after it:
{"action":"1 sentence what is happening","in_plain_english":"2-3 sentences for a beginner","what_you_lose":"what leaves the wallet","what_you_get":"what enters the wallet or null","gas_cost":"estimated USD cost","risk_level":"LOW|MEDIUM|HIGH|DANGER","risk_reason":"1 sentence why","contract_trust":"VERIFIED|UNVERIFIED|SUSPICIOUS","red_flags":["specific warnings or empty array"],"should_sign":false,"one_liner":"most important fact, max 12 words"}

Risk rules (be accurate, not paranoid):
- LOW: known verified protocol (Uniswap, Aave, Compound, OpenSea, Lido), routine operation
- MEDIUM: verified contract, unfamiliar protocol, or value >$1000
- HIGH: unverified contract, unknown method, or suspicious parameters
- DANGER: unverified + high value, unlimited approvals to unknown spenders, or clear scam patterns
- should_sign=true only for LOW or MEDIUM with known protocol`;

function extractJSON(raw: string): AIExplanation {
  // 1. Strip DeepSeek <think>...</think> reasoning block (may be multiline)
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Strip markdown fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  // 3. Try direct parse first
  try {
    return JSON.parse(text) as AIExplanation;
  } catch {
    // 4. Find the outermost {...} block and parse that
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1)) as AIExplanation;
      } catch {
        // fall through
      }
    }
    throw new Error(`Could not extract JSON from AI response. Raw: ${raw.slice(0, 300)}`);
  }
}

export async function explainTransaction(params: {
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
}): Promise<AIExplanation> {
  const userPrompt = `Protocol: ${params.protocolName ?? "Unknown"}
Contract: ${params.contractAddress}
Verified: ${params.contractVerified}
Method: ${params.methodName}
Params: ${JSON.stringify(params.decodedParams)}
Chain: ${params.chain}
Value: ${params.valueEth} ETH ($${params.valueUsd} USD)
Token: ${params.tokenSymbol ? `${params.tokenSymbol} (${params.tokenName})` : "none"}`;

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
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 400,
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
  const rawContent: string = data.choices?.[0]?.message?.content ?? "";

  const parsed = extractJSON(rawContent);
  return parsed;
}
