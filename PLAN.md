# DeFi Portfolio Explainer + AI Chat — Implementation Plan

## Context

Building a Next.js app where users paste an Ethereum wallet address (or connect wallet) and get:
1. **Plain English report** of all DeFi positions with risk assessment
2. **Chat interface** for follow-up questions grounded in portfolio data
3. **Suggestions** for portfolio optimization (rate arbitrage, idle assets, concentration risk)

Based on research from `~/Desktop/web3-ai-research.md` — Idea #1 (AI DeFi Explainer). Gap validated: no product currently offers "paste wallet → get plain English summary."

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ (App Router) |
| UI | Tailwind + shadcn/ui |
| Chain | Ethereum only (MVP) |
| LLM | Claude + OpenAI (switchable via Vercel AI SDK) |
| Chat | Vercel AI SDK (`ai` package) streaming |
| Wallet | wagmi + viem + RainbowKit |
| Data (positions) | Zerion API (single-call portfolio) |
| Data (yields) | DeFiLlama API (protocol APYs) |
| Data (health factors) | Aave/Compound via @aave/math-utils + RPC |
| Math | decimal.js (no native floats for financial calc) |
| Validation | zod |
| DB | Supabase (Postgres) — user accounts, usage tracking, API key storage |
| Auth | Supabase Auth (email/magic link) — needed for usage tracking |

---

## API Key & Billing Model

### How It Works

Users can either:
1. **Use our API key (default)** — free tier with limits, paid plans for more
2. **Bring their own key (BYOK)** — unlimited usage, user enters their Claude/OpenAI key

### Tiers

| Tier | Cost | Reports | Chat Messages | Suggestions | LLM Key |
|------|------|---------|---------------|-------------|---------|
| **Free** | $0 | 1 report/day | 5 messages/day | 3 suggestions/report | Our key |
| **Pro** | $9/mo | Unlimited | Unlimited | Unlimited | Our key |
| **BYOK** | $0 | Unlimited | Unlimited | Unlimited | User's own key |

### Implementation

- **Storage:** User's API keys encrypted (AES-256) in Supabase, decrypted server-side only
- **Usage tracking:** `usage` table in Supabase — `user_id, date, reports_count, chat_messages_count`
- **Rate check:** Before each LLM call, check usage against tier limits
- **Key flow:**
  ```
  Request → Check if user has BYOK key stored
    ├── YES → Decrypt key, use it for LLM call (no usage limit)
    └── NO → Check usage against tier limits
        ├── Within limits → Use our platform key
        └── Over limits → Return 429 with upgrade prompt
  ```
- **Settings page:** User can add/remove/update their API keys (Claude + OpenAI)
- **Key validation:** Test user's key with a minimal API call before saving
- **Security:** Keys encrypted at rest, decrypted only in server-side API routes, never sent to client

### New Files Needed

| File | Purpose |
|------|---------|
| `lib/auth/supabase.ts` | Supabase client (server + browser) |
| `lib/billing/usage.ts` | Track + check usage limits |
| `lib/billing/keys.ts` | Encrypt/decrypt/validate user API keys |
| `lib/billing/tiers.ts` | Tier definitions and limit constants |
| `app/api/keys/route.ts` | CRUD for user API keys |
| `app/api/usage/route.ts` | Get current usage stats |
| `app/settings/page.tsx` | Settings page: API keys, tier info, usage dashboard |
| `components/UsageBanner.tsx` | Shows remaining free tier usage |
| `components/UpgradePrompt.tsx` | Shown when limits hit |
| `components/ApiKeyInput.tsx` | Secure input for BYOK keys |

### Database Tables (Supabase)

```sql
-- Users (managed by Supabase Auth)

-- API Keys (encrypted)
create table user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  provider text not null check (provider in ('anthropic', 'openai')),
  encrypted_key text not null,
  key_hint text not null,  -- last 4 chars for display: "...a1b2"
  is_valid boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

-- Usage Tracking
create table usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null default current_date,
  reports_count int default 0,
  chat_messages_count int default 0,
  unique(user_id, date)
);

-- Subscriptions (for Pro tier)
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);
```

---

## Architecture

```
User Input (wallet address)
    ↓
Zerion API → raw positions (single call, all protocols)
    ↓
Enrichment (parallel):
  ├── DeFiLlama → current APYs/yields for rate comparison
  └── Aave/Compound RPC → health factors for lending positions
    ↓
Risk Engine (deterministic TypeScript math):
  ├── Health factor analysis (lending)
  ├── Impermanent loss estimation (LPs)
  ├── Concentration risk (% allocation)
  ├── Idle asset detection (wallet tokens earning 0%)
  └── Rate arbitrage (current APY vs best available)
    ↓
Structured Risk Assessment (JSON) — all numbers pre-computed
    ↓
API Key Router:
  ├── User has BYOK key? → Use their key (unlimited)
  └── No BYOK? → Check usage limits
      ├── Within free/pro limits → Use platform key
      └── Over limits → 429 + upgrade prompt
    ↓
LLM Translation Layer (Claude or OpenAI):
  - Receives pre-computed facts only
  - Generates plain English report
  - Handles chat follow-ups grounded in portfolio data
    ↓
Frontend: Report + Chat + Suggestions
```

**Core principle:** LLM NEVER touches numbers. Risk engine computes everything. LLM only translates JSON → natural language.

---

## Project Structure

```
defi-explainer/
├── app/
│   ├── layout.tsx                        # Root layout with Providers
│   ├── page.tsx                          # Landing: paste wallet or connect
│   ├── globals.css                       # Tailwind globals
│   ├── providers.tsx                     # wagmi + RainbowKit + QueryClient
│   ├── api/
│   │   ├── portfolio/route.ts            # Fetch + analyze + generate report
│   │   ├── chat/route.ts                 # Streaming chat (Vercel AI SDK)
│   │   └── suggestions/route.ts          # Portfolio optimization suggestions
│   └── dashboard/
│       └── page.tsx                      # Report + Chat + Suggestions UI
├── lib/
│   ├── llm/
│   │   ├── provider.ts                   # Claude/OpenAI switcher via registry
│   │   ├── prompts.ts                    # System prompts (report + chat)
│   │   └── types.ts                      # LLMProvider, LLMConfig
│   ├── defi/
│   │   ├── types.ts                      # ALL type definitions (canonical)
│   │   ├── zerion.ts                     # Zerion API client + normalizer
│   │   ├── defillama.ts                  # DeFiLlama API + yield comparison
│   │   ├── subgraphs.ts                  # Aave/Compound health factor via RPC
│   │   ├── risk-engine.ts                # Deterministic risk calculations
│   │   └── suggestions.ts               # Transform risks → actionable suggestions
│   ├── auth/
│   │   └── supabase.ts                   # Supabase client (server + browser)
│   ├── billing/
│   │   ├── tiers.ts                      # Tier definitions + limit constants
│   │   ├── usage.ts                      # Track + check usage against limits
│   │   └── keys.ts                       # Encrypt/decrypt/validate user API keys
│   ├── web3/
│   │   └── config.ts                     # wagmi + RainbowKit config
│   └── utils/
│       ├── format.ts                     # Currency, %, address formatting
│       └── crypto.ts                     # AES-256 encrypt/decrypt helpers
├── components/
│   ├── WalletInput.tsx                   # Paste address OR connect wallet
│   ├── PortfolioReport.tsx               # Plain English report display
│   ├── ChatInterface.tsx                 # Chat UI with useChat
│   ├── SuggestionsPanel.tsx              # Optimization cards
│   ├── RiskBadge.tsx                     # Risk indicator
│   ├── PositionCard.tsx                  # Individual position display
│   ├── UsageBanner.tsx                   # Shows remaining free usage
│   ├── UpgradePrompt.tsx                 # Shown when limits hit
│   └── ApiKeyInput.tsx                   # Secure BYOK key input + validation
├── app/
│   ├── ...
│   ├── api/
│   │   ├── portfolio/route.ts
│   │   ├── chat/route.ts
│   │   ├── suggestions/route.ts
│   │   ├── keys/route.ts                # CRUD for user API keys
│   │   └── usage/route.ts               # Get current usage stats
│   ├── settings/
│   │   └── page.tsx                      # API keys + tier + usage dashboard
│   └── ...
├── middleware.ts                          # Auth + address validation + rate limiting
├── .env.local                            # API keys (never committed)
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Build Order (35 steps, sequenced by dependencies)

### Phase 0: Scaffold (Step 1)

| Step | Action |
|------|--------|
| 1 | `npx create-next-app@latest defi-explainer` + install all deps + shadcn init + `.env.local` + Supabase project setup |

Dependencies:
```
ai, @ai-sdk/react, @ai-sdk/openai, @ai-sdk/anthropic,
@rainbow-me/rainbowkit, wagmi, viem, @tanstack/react-query,
@aave/math-utils, @aave/contract-helpers, ethers@5,
decimal.js, zod,
@supabase/supabase-js, @supabase/ssr
```

shadcn components: `card, badge, button, input, scroll-area, tabs, separator, avatar, skeleton, alert, dialog, label, switch, progress`

### Phase 1: Types + Utils (Steps 2-5)

| Step | File | Purpose |
|------|------|---------|
| 2 | `lib/defi/types.ts` | Canonical type system — ZerionPosition, NormalizedPosition, PortfolioRiskAssessment, Suggestion, all risk types |
| 3 | `lib/llm/types.ts` | LLMProvider, LLMConfig |
| 4 | `lib/utils/format.ts` | formatUsd, formatPercent, truncateAddress, riskLevelToColor |
| 5 | `lib/utils/crypto.ts` | `encryptKey()`, `decryptKey()` — AES-256-GCM encrypt/decrypt for BYOK keys using `ENCRYPTION_SECRET` env var |

### Phase 2: Auth + Billing (Steps 6-9)

| Step | File | Key Functions |
|------|------|---------------|
| 6 | `lib/auth/supabase.ts` | `createServerClient()`, `createBrowserClient()` — Supabase client for server + client |
| 7 | `lib/billing/tiers.ts` | Tier definitions: `FREE = { reports: 1, chatMessages: 5, suggestions: 3 }`, `PRO = { reports: Infinity, ... }`, `BYOK = { ... Infinity }` |
| 8 | `lib/billing/usage.ts` | `getUsage(userId, date)`, `incrementUsage(userId, type)`, `checkLimit(userId, type)` → returns `{ allowed: boolean, remaining: number, limit: number }` |
| 9 | `lib/billing/keys.ts` | `saveUserKey(userId, provider, apiKey)` — validates key with test call, encrypts, stores. `getUserKey(userId, provider)` — fetches + decrypts. `deleteUserKey(userId, provider)`. `resolveApiKey(userId, provider)` — returns user's key if BYOK, else platform key + checks limits |

### Phase 3: Data Layer (Steps 10-12)

| Step | File | Key Functions | Validation |
|------|------|---------------|------------|
| 10 | `lib/defi/zerion.ts` | `fetchWalletPositions()`, `normalizePositions()` | Test with vitalik.eth address |
| 11 | `lib/defi/defillama.ts` | `fetchAllPools()`, `findBestYieldForToken()`, `getYieldComparison()` | Verify APY matches defillama.com |
| 12 | `lib/defi/subgraphs.ts` | `fetchAaveUserData()` via @aave/math-utils + RPC | Test health factor for known Aave user |

Zerion API: `GET https://api.zerion.io/v1/wallets/{address}/positions/` with Basic auth.
DeFiLlama: `GET https://yields.llama.fi/pools` — filter to Ethereum, cache 5 min.
Aave: UiPoolDataProvider + formatUserSummary from @aave/math-utils.

### Phase 4: Risk Engine (Steps 13-14)

| Step | File | Key Functions |
|------|------|---------------|
| 13 | `lib/defi/risk-engine.ts` | `analyzePortfolio()`, `analyzeHealthFactors()`, `analyzeConcentration()`, `estimateImpermanentLoss()`, `detectIdleAssets()`, `detectRateArbitrages()`, `calculateOverallRisk()` |
| 14 | `lib/defi/suggestions.ts` | `generateSuggestions()` — transforms risk findings into actionable Suggestion[] |

Risk thresholds:
- Health factor: >2.0=low, 1.5-2.0=medium, 1.0-1.5=high, ≤1.0=critical
- Concentration: <25%=low, 25-50%=medium, 50-75%=high, >75%=critical
- IL: <2%=low, 2-5%=medium, 5-10%=high, >10%=critical
- Rate arbitrage: only flag if differential >50bps AND annual gain >$50

All math uses decimal.js. No native JS floats for financial calculations.

### Phase 5: LLM Layer (Steps 15-16)

| Step | File | Key Contents |
|------|------|-------------|
| 15 | `lib/llm/provider.ts` | `createProviderRegistry()` with anthropic + openai, `getModel(provider, apiKey?)` — accepts optional user key for BYOK |
| 16 | `lib/llm/prompts.ts` | `buildReportSystemPrompt()`, `buildReportUserPrompt()`, `buildChatSystemPrompt()` |

System prompt enforces: no financial advice, no invented numbers, explain jargon, use pre-computed data only.

Provider now supports BYOK:
```typescript
export function getModel(provider?: string, userApiKey?: string) {
  const p = provider || process.env.LLM_PROVIDER || 'anthropic';
  if (p === 'anthropic') {
    return userApiKey
      ? createAnthropic({ apiKey: userApiKey })('claude-sonnet-4-5')
      : registry.languageModel('anthropic:claude-sonnet-4-5');
  }
  return userApiKey
    ? createOpenAI({ apiKey: userApiKey })('gpt-4o')
    : registry.languageModel('openai:gpt-4o');
}
```

### Phase 6: API Routes (Steps 17-21)

| Step | File | Method | Flow |
|------|------|--------|------|
| 17 | `app/api/portfolio/route.ts` | POST | auth check → resolveApiKey() → (if platform key: checkLimit + incrementUsage) → Zerion → normalize → parallel(subgraphs, defillama) → risk engine → suggestions → LLM report → response |
| 18 | `app/api/chat/route.ts` | POST | auth check → resolveApiKey() → limit check → streamText with grounded system prompt |
| 19 | `app/api/suggestions/route.ts` | POST | assessment → generateSuggestions() |
| 20 | `app/api/keys/route.ts` | GET/POST/DELETE | GET: list user's keys (hints only). POST: validate + encrypt + save key. DELETE: remove key |
| 21 | `app/api/usage/route.ts` | GET | Returns `{ reports: { used, limit }, chat: { used, limit }, tier, isbyok }` |

Portfolio + chat routes now include key routing:
```
1. Get authenticated user from Supabase session
2. resolveApiKey(userId, preferredProvider)
   → Has BYOK key? Use it, skip limits
   → No BYOK? Check usage limits
     → Over limit? Return 429 + { upgrade: true, remaining: 0 }
     → Under limit? Use platform key, increment usage
3. getModel(provider, resolvedKey)
4. Proceed with LLM call
```

### Phase 7: Web3 + Providers (Steps 22-24)

| Step | File |
|------|------|
| 22 | `lib/web3/config.ts` — wagmi config with mainnet only |
| 23 | `app/providers.tsx` — WagmiProvider + RainbowKitProvider + QueryClientProvider + Supabase session |
| 24 | `app/layout.tsx` — root layout wrapping children with Providers |

### Phase 8: Components (Steps 25-32)

| Step | File | Props |
|------|------|-------|
| 25 | `components/RiskBadge.tsx` | `{ level: RiskLevel, label?: string }` |
| 26 | `components/PositionCard.tsx` | `{ position: NormalizedPosition }` |
| 27 | `components/UsageBanner.tsx` | `{ usage: UsageStats }` — "2/5 chat messages used today" progress bar. Hidden for BYOK users |
| 28 | `components/UpgradePrompt.tsx` | `{ feature: string }` — dialog shown when limit hit: "Add your own API key for unlimited access, or upgrade to Pro" |
| 29 | `components/ApiKeyInput.tsx` | `{ provider, onSaved }` — masked input, "Test Key" button (calls validation endpoint), save. Shows key hint after save ("...a1b2") |
| 30 | `components/WalletInput.tsx` | `{ onAddressSubmit, isLoading }` — paste OR connect wallet |
| 31 | `app/page.tsx` | Landing page with WalletInput + auth (sign in with email/magic link) |
| 32 | `components/PortfolioReport.tsx`, `SuggestionsPanel.tsx`, `ChatInterface.tsx` | Same as before but ChatInterface shows UsageBanner + UpgradePrompt when limits approached/hit |

### Phase 9: Pages + Polish (Steps 33-35)

| Step | File |
|------|------|
| 33 | `app/settings/page.tsx` — API key management (add/remove Claude + OpenAI keys), current tier display, usage dashboard (today's usage + daily chart), upgrade to Pro button |
| 34 | `app/dashboard/page.tsx` — reads address from URL params, fetches portfolio, renders Report + Chat + Suggestions. Desktop: 60/40 split. Mobile: tabs. Shows UsageBanner. |
| 35 | `middleware.ts` — Supabase auth session refresh + address validation + rate limiting |

---

## Error Handling

| Failure | Behavior |
|---------|----------|
| Zerion API down | Return error, show retry button |
| DeFiLlama down | Proceed without yield data, skip rate arbitrage suggestions |
| Aave RPC down | Proceed without health factor, mark as "unavailable" |
| LLM API down | Return structured data without NL report (show raw cards) |
| Invalid address | Reject at client + middleware |
| Empty wallet | Show "no positions found" message |
| User's BYOK key invalid | Return 401, show "Your API key is invalid or expired" + link to settings |
| Free tier limit hit | Return 429, show UpgradePrompt with BYOK option |
| User not authenticated | Redirect to landing page with sign-in prompt (allow 1 anonymous report) |

---

## Security

- Platform API keys server-side only (no `NEXT_PUBLIC_` prefix for LLM/Zerion keys)
- User BYOK keys encrypted with AES-256-GCM at rest, decrypted only in server-side route handlers
- `ENCRYPTION_SECRET` env var for key encryption — 32-byte random, never committed
- Address validation via zod + viem's `isAddress()`
- Read-only — no transactions, no signatures, no private keys
- Rate limiting in middleware
- No financial advice framing — "opportunities detected" not "you should"
- Disclaimer on every report
- Supabase RLS (Row Level Security) on all tables — users can only access own data
- BYOK keys never logged, never sent to client (only key hints: "...a1b2")

### .env.local

```
# LLM (platform keys — used for free/pro tier)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
LLM_PROVIDER=anthropic

# Encryption (for user BYOK keys at rest)
ENCRYPTION_SECRET=<32-byte-hex-random>

# DeFi Data
ZERION_API_KEY=zk_...
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Wallet Connect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_wc_project_id

# Stripe (for Pro tier payments — Phase 2)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

---

## Verification Plan

1. **Scaffold:** `pnpm dev` starts without errors
2. **Auth:** Sign up with email → magic link → session created in Supabase
3. **Data layer:** Fetch positions for `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` (vitalik.eth), verify normalized output
4. **Risk engine:** Unit test with mock positions → verify correct risk levels
5. **LLM:** Generate report for test wallet → verify no hallucinated numbers
6. **Chat:** Ask "what are my biggest risks?" → verify response references actual portfolio data
7. **BYOK:** Add own API key in settings → verify unlimited usage, key encrypted in DB
8. **Free tier:** Use platform key → verify limits enforced (1 report/day, 5 chat messages)
9. **Upgrade prompt:** Hit limit → verify UpgradePrompt shown with BYOK option
10. **Suggestions:** Verify suggestions sorted by impact, links to correct protocols
11. **E2E:** Paste address on landing → report + chat + suggestions all render correctly
12. **Mobile:** Verify responsive layout (tabs on mobile, split on desktop)
13. **Error states:** Disconnect internet → verify graceful degradation
14. **Deploy:** Push to Vercel, verify production build works
