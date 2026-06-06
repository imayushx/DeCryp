# DeCryp

**Decode any crypto transaction before you sign it.**

DeCryp translates raw blockchain transactions into plain English — with a risk score, red flag detection, and a clear recommendation — so you know exactly what you're signing before you commit.

🌐 **Live at [de-cryp.vercel.app](https://de-cryp.vercel.app)**

---

## What It Does

Crypto wallets show you raw hexadecimal data when you're about to sign a transaction. Nobody can read that. Scammers rely on it.

DeCryp fixes that.

Paste any of the following:

| Input | Example |
|-------|---------|
| Transaction hash | `0x8f23c...` |
| Contract address | `0xE592427A...` |
| Raw calldata / hex data | `0x414bf389000...` |

DeCryp fetches the ABI from Etherscan, decodes the calldata with Viem, and sends it to an AI model that explains what's happening in plain English — including what leaves your wallet, what you get back, the gas cost, and whether you should sign it.

---

## Two Modes

### Check Before Signing
Paste calldata from your wallet popup (MetaMask shows it under "Hex Data"). Get:
- Risk level: **LOW / MEDIUM / HIGH / DANGER**
- Plain English explanation of what will happen
- What you're sending and receiving
- Red flags (unverified contracts, unlimited approvals, known scam patterns)
- A clear recommendation: **Safe to Sign** or **Do Not Sign**
- Decision buttons: **I'll Sign It** / **I'll Cancel**

### Decode Past Transaction
Paste a completed transaction hash from Etherscan or your wallet history. Get:
- Past-tense explanation of what happened
- What was sent and received
- Gas paid
- Red flags if you were scammed after the fact

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| 3D Background | Three.js (WebGL GLSL shader) |
| ABI decoding | Viem |
| Blockchain data | Etherscan v2 unified API |
| AI analysis | NVIDIA NIM — `meta/llama-3.3-70b-instruct` |
| Fonts | Space Grotesk + IBM Plex Mono |
| Deployment | Vercel |

---

## Supported Chains

- Ethereum
- Base
- Polygon
- Arbitrum
- Optimism

All chains use the Etherscan v2 unified API with a single API key (`chainid=` parameter).

---

## Running Locally

### 1. Clone

```bash
git clone https://github.com/imayushx/DeCryp.git
cd DeCryp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root:

```env
NVIDIA_API_KEY=your_nvidia_nim_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**Getting API keys:**
- **NVIDIA NIM** — Sign up at [build.nvidia.com](https://build.nvidia.com). Free tier available.
- **Etherscan** — Sign up at [etherscan.io/apis](https://etherscan.io/apis). The v2 key covers all supported chains.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
DeCryp/
├── app/
│   ├── api/decode/route.ts   # Main API endpoint — decodes + calls AI
│   ├── globals.css           # OLED dark theme, glassmorphism utilities
│   ├── layout.tsx            # Root layout, font loading
│   └── page.tsx              # Client shell, state machine
├── components/
│   ├── Hero.tsx              # Two-tab input (pre-sign / post-sign)
│   ├── ResultCard.tsx        # Mode-aware result display
│   ├── LoadingTerminal.tsx   # Decode progress animation
│   ├── RedFlags.tsx          # Warning rows
│   └── ui/
│       └── animated-shader-background.tsx  # WebGL aurora shader
├── lib/
│   ├── ai.ts                 # NVIDIA NIM calls, two prompt modes
│   ├── decoder.ts            # Viem calldata decoding
│   ├── etherscan.ts          # Etherscan v2 API helpers
│   └── protocols.ts          # Known protocol address registry
```

---

## How the AI Analysis Works

1. The API route detects whether the input is a tx hash, address, or raw calldata
2. For tx hashes: fetches the full transaction from Etherscan (input data, value, to/from)
3. Fetches the contract ABI from Etherscan — if verified, decodes with Viem; if not, flags as unverified
4. Identifies the protocol (Uniswap, Aave, OpenSea, etc.) from a known address registry
5. Sends a structured prompt to `meta/llama-3.3-70b-instruct` via NVIDIA NIM
6. **Pre-sign mode**: present-tense safety analysis with `risk_level` and `should_sign`
7. **Post-sign mode**: past-tense decode, no verdict, just facts

The AI prompt is kept tight (~450 tokens max output) so responses come back in 3–9 seconds.

---

## Deploying to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/imayushx/DeCryp)

Add the two environment variables in your Vercel project settings:

```
NVIDIA_API_KEY
ETHERSCAN_API_KEY
```

The API route uses `export const maxDuration = 60` to stay within Vercel's function timeout limits.

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first.

Areas that could use help:
- More chains (BNB Chain, Avalanche, zkSync)
- Better calldata decoding for proxy contracts (EIP-1967)
- Token price integration for accurate USD values
- Mobile UI polish

---

## License

MIT — see [LICENSE](LICENSE).

---

Built by [@imayushx](https://github.com/imayushx)
