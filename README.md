# Lucid — DeFi Portfolio Explainer + AI Chat

Paste an Ethereum wallet, get a **plain-English report** of every DeFi position, an
**AI chat** grounded in that data, and **optimization suggestions** — risk, yield, and
idle assets. All financial math is computed deterministically; the LLM only translates
pre-computed numbers into language, never invents them.

**Live:** https://defi-explainer.vercel.app

---

## What it does

- **Plain-English reports** — lending, LPs, staking, borrows explained without jargon.
- **AI chat** — ask follow-ups ("what are my biggest risks?", "explain my health factor"); answers are grounded in your actual portfolio.
- **Optimization suggestions** — rate arbitrage, idle assets, concentration risk, impermanent-loss estimates.
- **Free + bring-your-own-key (BYOK)** — no subscription, no usage limits. You supply your own Anthropic / OpenAI key (encrypted at rest, tied to your wallet).

---

## How it works

```
Connect wallet ──► sign once (free, off-chain) ──► verify ownership
       │                                                  │
       ▼                                                  ▼
 paste / use any address                          encrypted API key
       │                                          (tied to your wallet)
       ▼                                                  │
  Zerion positions ─► risk engine (decimal.js) ─► JSON ───┘
                                                   │
                                                   ▼
                                      LLM (your key) → report + chat
```

### Design principles
1. **The LLM never touches numbers.** A deterministic risk engine (`lib/defi/risk-engine.ts`) computes health factors, IL, APYs, and concentration with `decimal.js`. The LLM receives pre-computed JSON and only writes prose.
2. **No financial advice.** Framed as "opportunities detected", with disclaimers on every report.
3. **Free, BYOK-only.** No platform keys, tiers, or limits.
4. **Wallet ownership auth.** A one-time off-chain signature proves you own the wallet, establishing a session. Your API key is **AES-256-GCM encrypted**, keyed by wallet address, and never returned to the browser (only a last-4 hint).

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui (dark glass theme) |
| Wallet | wagmi + viem + RainbowKit |
| Auth | One-time EIP-191 signature → stateless HMAC session cookie (no email/DB auth) |
| LLM | Vercel AI SDK — Anthropic + OpenAI (+ Local/Ollama in dev) |
| Data | Zerion (positions) · DeFiLlama (yields) · Aave RPC (health factors) |
| DB | Supabase Postgres (encrypted key store only) |
| Math | decimal.js (no native floats) |
| Validation | zod |

---

## Getting started

### Prerequisites
- Node.js 20+ and **pnpm**
- A **Supabase** project (free tier is fine)
- A **Zerion** API key — https://zerion.io
- An **Ethereum RPC** URL (Alchemy / Infura)
- A **WalletConnect** project ID — https://cloud.walletconnect.com
- An **Anthropic** or **OpenAI** API key (entered in-app, not in env)

### 1. Clone & install
```bash
git clone https://github.com/tenderdeve/defi-explainer.git
cd defi-explainer
pnpm install
```

### 2. Configure environment
Copy the example and fill it in:
```bash
cp .env.example .env.local
```

Generate the two secrets:
```bash
openssl rand -hex 32   # ENCRYPTION_SECRET — must be 32-byte hex (64 chars)
openssl rand -hex 32   # SESSION_SECRET
```

| Variable | Required | Description |
|---|---|---|
| `ENCRYPTION_SECRET` | ✅ | 32-byte hex; encrypts stored BYOK keys. **Never change after keys are saved.** |
| `SESSION_SECRET` | ✅ | HMAC secret for wallet ownership session cookies |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service-role key (server-only) |
| `ZERION_API_KEY` | ✅ | Portfolio positions |
| `ETHEREUM_RPC_URL` | ➖ | Aave health factors (degrades gracefully if absent) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ (prod) | WalletConnect; without it only the MetaMask extension works |
| `LOCAL_LLM_BASE_URL` / `LOCAL_LLM_MODEL` | ➖ | Optional local provider (Ollama), **dev only** |

> BYOK means **no** `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` in env — users add their own key in the app's Settings.

### 3. Apply the database schema
In the Supabase **SQL Editor**, run [`supabase/apply_to_existing_db.sql`](supabase/apply_to_existing_db.sql)
(or `supabase/migrations/001_initial_schema.sql` on a fresh project). Creates the
`user_api_keys` table keyed by `wallet_address`.

### 4. Run
```bash
pnpm dev
```
Open http://localhost:3000.

**First-run flow:** connect wallet → click **Verify ownership** (sign) → **Settings** → save your Anthropic/OpenAI key → analyze a wallet → chat.

> In development the **Local (Ollama)** provider is available; it is automatically disabled in production.

---

## Scripts

```bash
pnpm dev      # dev server (Turbopack)
pnpm build    # production build
pnpm start    # serve production build
pnpm lint     # ESLint
```

---

## Project structure

```
app/
  page.tsx              # landing (paste / connect wallet)
  dashboard/            # report + chat + suggestions
  settings/             # wallet verify + BYOK key management
  api/
    auth/{nonce,verify,session,logout}/   # wallet ownership session
    portfolio/          # orchestration: Zerion → risk engine → LLM report
    chat/               # streaming chat grounded in portfolio
    keys/               # BYOK key CRUD (encrypted)
components/             # UI (shadcn) + feature components
lib/
  auth/                 # session.ts (HMAC), use-wallet-session.ts
  billing/keys.ts       # encrypt/decrypt/validate, keyed by wallet
  defi/                 # zerion, defillama, risk-engine, suggestions, types
  llm/                  # provider + prompts
  web3/config.ts        # wagmi + RainbowKit
supabase/migrations/    # schema
```

---

## Deployment (Vercel)

1. Import the repo at [vercel.com](https://vercel.com) (auto-detects Next.js + pnpm).
2. Add the env vars from the table above (scope **Production**).
3. Apply the schema to your production Supabase project.
4. Deploy, then add your domain to **WalletConnect Cloud → Allowed Domains**.

Session cookies require HTTPS (Vercel provides it). The local LLM provider is auto-disabled in production.

---

## Security

- API keys are **AES-256-GCM encrypted** at rest and only ever decrypted server-side; the client receives a masked hint, never the key.
- Key access requires a **verified wallet ownership session** (one-time signature). The nonce is single-use (httpOnly cookie cleared on verify); replay over HTTPS is mitigated.
- No private keys or transactions are ever requested — only a free off-chain signature.
- Supabase access is server-side via the service role; the anon key is not used.

---

## Disclaimer

Lucid is for informational purposes only and **does not constitute financial advice**.
Always do your own research before making investment decisions.
