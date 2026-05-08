# GitHub Issues & Milestones — DeFi Portfolio Explainer

---

## Milestone 1: Project Foundation
> Scaffold, types, utilities. Everything else depends on this.

### Issue #1: Project scaffold + dependency installation
**Labels:** `setup`, `priority: critical`
**Estimate:** 1-2 hours

**Tasks:**
- [ ] Run `npx create-next-app@latest defi-explainer --typescript --tailwind --eslint --app`
- [ ] Install core deps: `ai`, `@ai-sdk/react`, `@ai-sdk/openai`, `@ai-sdk/anthropic`
- [ ] Install web3 deps: `@rainbow-me/rainbowkit`, `wagmi`, `viem`, `@tanstack/react-query`
- [ ] Install DeFi deps: `@aave/math-utils`, `@aave/contract-helpers`, `ethers@5`
- [ ] Install utility deps: `decimal.js`, `zod`, `@supabase/supabase-js`, `@supabase/ssr`
- [ ] Run `pnpm dlx shadcn@latest init`
- [ ] Add shadcn components: card, badge, button, input, scroll-area, tabs, separator, avatar, skeleton, alert, dialog, label, switch, progress
- [ ] Create `.env.local` with placeholder keys
- [ ] Create `.env.example` (same structure, no real keys)
- [ ] Verify `pnpm dev` starts without errors

**Acceptance criteria:** App boots on `localhost:3000` with default Next.js page. All deps installed. No TypeScript errors.

---

### Issue #2: Define canonical type system
**Labels:** `types`, `priority: critical`
**Depends on:** #1
**Estimate:** 2-3 hours

**Tasks:**
- [ ] Create `lib/defi/types.ts` with all type definitions:
  - `ZerionPosition`, `ZerionPortfolioResponse` (raw API response types)
  - `DefiLlamaPool` (yield data types)
  - `AaveUserReserve`, `AaveUserSummary` (lending protocol types)
  - `PositionCategory` enum: `lending_supply | lending_borrow | liquidity_pool | staking | wallet | reward | locked | other`
  - `NormalizedPosition` (our domain model, all values as `Decimal`)
  - `RiskLevel`: `low | medium | high | critical`
  - `HealthFactorAssessment`, `ConcentrationRisk`, `ImpermanentLossEstimate`, `IdleAsset`, `RateArbitrage`
  - `PortfolioRiskAssessment` (main output of risk engine)
  - `PortfolioReport`, `Suggestion`
  - `PortfolioRequest`, `PortfolioResponse`, `ChatRequest` (API types)
- [ ] Create `lib/llm/types.ts`: `LLMProvider`, `LLMConfig`
- [ ] Verify TypeScript compiles clean

**Acceptance criteria:** All types defined. No `any` types. Every module in later issues imports from these files.

---

### Issue #3: Utility functions — formatting + encryption
**Labels:** `utils`, `priority: high`
**Depends on:** #2
**Estimate:** 1-2 hours

**Tasks:**
- [ ] Create `lib/utils/format.ts`:
  - `formatUsd(value: Decimal | number): string` — e.g., `$1,234.56`, `$1.2M`
  - `formatPercent(value: Decimal | number, decimals?: number): string` — e.g., `+5.32%`, `-2.1%`
  - `truncateAddress(address: string): string` — e.g., `0x1234...5678`
  - `formatTokenAmount(value: Decimal, symbol: string): string`
  - `riskLevelToColor(level: RiskLevel): string` — Tailwind color class
  - `formatHealthFactor(hf: Decimal): string`
- [ ] Create `lib/utils/crypto.ts`:
  - `encryptKey(plaintext: string): string` — AES-256-GCM using `ENCRYPTION_SECRET` env var
  - `decryptKey(ciphertext: string): string` — reverse of above
  - Uses Node.js `crypto` module, returns base64-encoded `iv:ciphertext:authTag`

**Acceptance criteria:** Format functions produce correct output for edge cases ($0, negative values, very large numbers). Encrypt → decrypt round-trips correctly.

---

## Milestone 2: Authentication & Billing
> Supabase auth, usage tracking, BYOK key management. Needed before any LLM calls.

### Issue #4: Supabase project setup + database schema
**Labels:** `database`, `auth`, `priority: critical`
**Depends on:** #1
**Estimate:** 1-2 hours

**Tasks:**
- [ ] Create Supabase project (or use existing)
- [ ] Run SQL migrations to create tables:
  ```sql
  create table user_api_keys (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users not null,
    provider text not null check (provider in ('anthropic', 'openai')),
    encrypted_key text not null,
    key_hint text not null,
    is_valid boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(user_id, provider)
  );

  create table usage (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users not null,
    date date not null default current_date,
    reports_count int default 0,
    chat_messages_count int default 0,
    unique(user_id, date)
  );

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
- [ ] Enable RLS on all tables
- [ ] Add RLS policies: users can only read/write their own rows
- [ ] Enable email/magic link auth in Supabase dashboard
- [ ] Add Supabase env vars to `.env.local`

**Acceptance criteria:** Tables created with RLS. Auth flow works in Supabase dashboard. Env vars populated.

---

### Issue #5: Supabase client setup
**Labels:** `auth`, `priority: critical`
**Depends on:** #4
**Estimate:** 1 hour

**Tasks:**
- [ ] Create `lib/auth/supabase.ts`:
  - `createBrowserClient()` — for client components using `@supabase/ssr`
  - `createServerClient(cookieStore)` — for server-side route handlers
- [ ] Verify auth session can be read in API routes
- [ ] Verify auth session can be read in client components

**Acceptance criteria:** Can create authenticated Supabase sessions from both server and client contexts.

---

### Issue #6: Tier definitions + usage tracking
**Labels:** `billing`, `priority: high`
**Depends on:** #5
**Estimate:** 2-3 hours

**Tasks:**
- [ ] Create `lib/billing/tiers.ts`:
  - `TIER_LIMITS` constant:
    - `free: { reportsPerDay: 1, chatMessagesPerDay: 5, suggestionsPerReport: 3 }`
    - `pro: { reportsPerDay: Infinity, chatMessagesPerDay: Infinity, suggestionsPerReport: Infinity }`
    - `byok: { reportsPerDay: Infinity, chatMessagesPerDay: Infinity, suggestionsPerReport: Infinity }`
  - `getUserTier(userId): Promise<'free' | 'pro' | 'byok'>` — checks subscriptions table + user_api_keys table
- [ ] Create `lib/billing/usage.ts`:
  - `getUsage(userId: string, date?: string): Promise<{ reports_count, chat_messages_count }>`
  - `incrementUsage(userId: string, type: 'report' | 'chat'): Promise<void>` — upsert into usage table
  - `checkLimit(userId: string, type: 'report' | 'chat'): Promise<{ allowed: boolean, remaining: number, limit: number }>` — gets tier, gets usage, compares

**Acceptance criteria:** `checkLimit()` correctly returns `allowed: false` when free tier limits exceeded. BYOK users always get `allowed: true`.

---

### Issue #7: BYOK API key management
**Labels:** `billing`, `security`, `priority: high`
**Depends on:** #3, #5
**Estimate:** 3-4 hours

**Tasks:**
- [ ] Create `lib/billing/keys.ts`:
  - `saveUserKey(userId, provider, apiKey)`:
    1. Validate key format (starts with `sk-ant-` for Anthropic, `sk-` for OpenAI)
    2. Test key with minimal API call (list models or tiny completion)
    3. Encrypt with `encryptKey()`
    4. Store encrypted key + hint (last 4 chars) in `user_api_keys`
  - `getUserKey(userId, provider): Promise<string | null>` — fetch + decrypt
  - `deleteUserKey(userId, provider): Promise<void>`
  - `resolveApiKey(userId, provider): Promise<{ key: string, source: 'byok' | 'platform' }>`:
    1. Check if user has BYOK key → return it
    2. No BYOK → return platform key from env var
- [ ] Create `app/api/keys/route.ts`:
  - `GET` — list user's keys (provider + hint + is_valid only, never full key)
  - `POST { provider, apiKey }` — validate + encrypt + save
  - `DELETE { provider }` — remove key
- [ ] Create `app/api/usage/route.ts`:
  - `GET` — returns `{ reports: { used, limit }, chat: { used, limit }, tier, isByok }`

**Acceptance criteria:** Can save/retrieve/delete API keys. Keys encrypted in DB. resolveApiKey returns correct key based on BYOK status. API routes return proper responses. Key hints shown, never full keys.

---

## Milestone 3: DeFi Data Layer
> Fetch and normalize wallet positions from external APIs.

### Issue #8: Zerion API client — wallet position fetching
**Labels:** `data`, `defi`, `priority: critical`
**Depends on:** #2
**Estimate:** 3-4 hours

**Tasks:**
- [ ] Create `lib/defi/zerion.ts`:
  - `fetchWalletPositions(address: string): Promise<ZerionPosition[]>`
    - `GET https://api.zerion.io/v1/wallets/{address}/positions/?filter[positions]=no_filter&currency=usd&sort=-value`
    - Auth: `Authorization: Basic ${Buffer.from(ZERION_API_KEY + ':').toString('base64')}`
    - Handle pagination via `links.next`
    - Retry: exponential backoff, max 3 retries
    - Error handling: typed errors for 401, 404, 429
  - `normalizePositions(raw: ZerionPosition[]): NormalizedPosition[]`
    - Map `protocol_module` to `PositionCategory`
    - Convert all numeric values to `Decimal`
    - Extract token metadata (symbol, name, icon, address)
  - Address validation: reject if not matching `/^0x[a-fA-F0-9]{40}$/`
- [ ] Test with known addresses:
  - `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` (vitalik.eth)
  - An address with known DeFi positions

**Acceptance criteria:** Returns normalized positions for test wallets. Position categories correctly mapped. All numeric values are `Decimal` instances. Pagination works. Error cases handled.

---

### Issue #9: DeFiLlama API client — yield data
**Labels:** `data`, `defi`, `priority: high`
**Depends on:** #2
**Estimate:** 2-3 hours

**Tasks:**
- [ ] Create `lib/defi/defillama.ts`:
  - `fetchAllPools(): Promise<DefiLlamaPool[]>`
    - `GET https://yields.llama.fi/pools`
    - Filter to `chain === "Ethereum"` only
    - In-memory cache with 5-minute TTL (module-level variable)
  - `findBestYieldForToken(symbol: string, pools: DefiLlamaPool[]): { pool: DefiLlamaPool; apy: number } | null`
    - Match by symbol (case-insensitive)
    - Filter: `tvlUsd > 1_000_000` and `apy !== null`
    - Return highest APY pool
  - `findPoolForProtocolToken(protocol: string, symbol: string, pools: DefiLlamaPool[]): DefiLlamaPool | null`
    - Match by `project` slug and `symbol`
  - `getYieldComparison(currentProtocol, symbol, pools): { currentApy, bestApy, bestProtocol, bestPool }`

**Acceptance criteria:** Returns Ethereum pools. Cache prevents repeated API calls. Best yield for USDC, ETH, etc. matches defillama.com values. Protocol matching works for aave-v3, compound-v3, lido.

---

### Issue #10: Aave/Compound health factor queries
**Labels:** `data`, `defi`, `priority: high`
**Depends on:** #2
**Estimate:** 3-4 hours

**Tasks:**
- [ ] Create `lib/defi/subgraphs.ts`:
  - `fetchAaveUserData(address: string): Promise<AaveUserSummary | null>`
    - Use `@aave/contract-helpers` `UiPoolDataProvider` with Aave V3 Ethereum addresses
    - Feed into `@aave/math-utils` `formatUserSummary()` for health factor
    - Contract addresses:
      - UI_POOL_DATA_PROVIDER: `0x91c0eA31b49B69Ea18607702c5d4f6002F8df8Cf`
      - POOL_ADDRESSES_PROVIDER: `0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e`
    - Fallback: manual health factor calc if `@aave/math-utils` fails
  - `fetchCompoundUserData(address: string): Promise<CompoundUserSummary | null>`
    - Direct RPC calls via viem to Comet contracts
    - USDC Comet: `0xc3d688B66703497DAA19211EEdff47f25384cdc3`
    - ETH Comet: `0xA17581A9E3356d9A858b789D68B4d866e593aE94`
  - `fetchProtocolHealthData(address, protocols[]): Promise<Map<string, HealthFactorData>>`
    - Orchestrator: only queries protocols user actually has positions in
- [ ] Test with known Aave/Compound users

**Acceptance criteria:** Returns correct health factor for known Aave user. Handles wallets with no lending positions (returns null). RPC errors handled gracefully.

---

## Milestone 4: Risk Engine
> Deterministic financial analysis. No LLM. All math.

### Issue #11: Core risk engine — health factor + concentration + IL analysis
**Labels:** `core`, `defi`, `priority: critical`
**Depends on:** #8, #9, #10
**Estimate:** 4-6 hours

**Tasks:**
- [ ] Create `lib/defi/risk-engine.ts`:
  - `analyzePortfolio(positions, protocolHealth, pools): PortfolioRiskAssessment` — main orchestrator
  - `analyzeHealthFactors(positions, protocolHealth): HealthFactorAssessment[]`
    - Thresholds: >2.0=low, 1.5-2.0=medium, 1.0-1.5=high, ≤1.0=critical
    - Pre-compute explanation strings
  - `analyzeConcentration(positions, totalValue): ConcentrationRisk[]`
    - Group by token symbol, calc % of portfolio
    - Thresholds: <25%=low, 25-50%=medium, 50-75%=high, >75%=critical
    - Only return entries >20%
  - `estimateImpermanentLoss(positions): ImpermanentLossEstimate[]`
    - Filter to `liquidity_pool` positions
    - IL formula: `IL = 2 * sqrt(priceRatio) / (1 + priceRatio) - 1`
    - Thresholds: <2%=low, 2-5%=medium, 5-10%=high, >10%=critical
  - `detectIdleAssets(positions, pools): IdleAsset[]`
    - Wallet-type positions with value >$100 where yield >1% available
    - Calculate `potentialAnnualGainUsd`
  - `detectRateArbitrages(positions, pools): RateArbitrage[]`
    - Compare current protocol APY vs best available
    - Only flag if differential >50bps AND annual gain >$50
  - `calculateOverallRisk(healthFactors, concentration, il): { level, score }`
    - Weighted: health=40%, concentration=30%, IL=20%, diversity=10%
- [ ] All math uses `decimal.js` — no native floats
- [ ] Unit tests with mock data for each analyzer

**Acceptance criteria:** Given mock positions, produces correct risk levels. Edge cases handled (no lending positions → skip health factor, no LPs → skip IL). Overall risk score 0-100 is sensible.

---

### Issue #12: Suggestion generator
**Labels:** `core`, `priority: high`
**Depends on:** #11
**Estimate:** 2 hours

**Tasks:**
- [ ] Create `lib/defi/suggestions.ts`:
  - `generateSuggestions(assessment: PortfolioRiskAssessment): Suggestion[]`
  - Template-based titles and descriptions (deterministic, no LLM):
    - Rate arbitrage: "Move {symbol} from {current} to {best} for +{diff}% APY (~+${gain}/yr)"
    - Idle asset: "{symbol} (${value}) sitting idle. Best rate: {protocol} at {apy}%"
    - Concentration: "{percent}% portfolio in {symbol}. Consider diversifying."
    - Health factor: "{protocol} health factor {hf}. Add collateral or repay debt."
  - Sort by `potentialAnnualGainUsd` descending
  - Cap at 10 suggestions
  - Each suggestion includes `actionUrl` (link to protocol app)

**Acceptance criteria:** Suggestions correctly sorted by impact. Templates produce readable text. Action URLs point to correct protocol sites.

---

## Milestone 5: LLM Integration
> Claude + OpenAI switchable provider. Report generation. Chat grounding.

### Issue #13: LLM provider with BYOK support
**Labels:** `llm`, `priority: critical`
**Depends on:** #7
**Estimate:** 2 hours

**Tasks:**
- [ ] Create `lib/llm/provider.ts`:
  - `createProviderRegistry()` with anthropic + openai
  - `getModel(provider?: string, userApiKey?: string)`:
    - If `userApiKey` provided → create provider instance with user's key
    - Else → use platform key from env via registry
    - Default to Anthropic Claude Sonnet
  - Export registry for Vercel AI SDK compatibility

**Acceptance criteria:** `getModel('anthropic')` returns platform model. `getModel('anthropic', 'sk-ant-xxx')` returns model using user's key. Both produce valid responses.

---

### Issue #14: System prompts — report + chat
**Labels:** `llm`, `priority: critical`
**Depends on:** #2
**Estimate:** 2-3 hours

**Tasks:**
- [ ] Create `lib/llm/prompts.ts`:
  - `buildReportSystemPrompt(): string`
    - Rules: never compute numbers, never give financial advice, explain jargon, use pre-computed data only
    - Structure: Overview → Positions → Risks → Opportunities
    - Include disclaimer requirement
  - `buildReportUserPrompt(assessment, walletAddress): string`
    - Serialize `PortfolioRiskAssessment` to structured format
    - Include wallet address (truncated), totals, positions by category, risks, suggestions
  - `buildChatSystemPrompt(assessment, walletAddress): string`
    - Ground chat in portfolio data
    - Rules: only answer about this portfolio or general DeFi concepts
    - Never make up numbers
    - Keep responses concise (2-4 paragraphs max)
- [ ] Test prompts with sample assessment data — verify output quality

**Acceptance criteria:** Report prompt produces well-structured plain English. Chat prompt keeps responses grounded. No hallucinated numbers in LLM output.

---

## Milestone 6: API Routes
> Server-side endpoints tying everything together.

### Issue #15: Portfolio analysis endpoint
**Labels:** `api`, `priority: critical`
**Depends on:** #6, #7, #8, #9, #10, #11, #12, #13, #14
**Estimate:** 4-5 hours

**Tasks:**
- [ ] Create `app/api/portfolio/route.ts` (POST):
  1. Validate address with zod (must match Ethereum address regex)
  2. Get authenticated user from Supabase session
  3. `resolveApiKey(userId, provider)` — determine BYOK vs platform key
  4. If platform key: `checkLimit(userId, 'report')` → reject if over limit
  5. `fetchWalletPositions(address)` → `normalizePositions()`
  6. Detect which protocols user is in
  7. Parallel: `fetchProtocolHealthData()` + `fetchAllPools()`
  8. `analyzePortfolio(positions, healthData, pools)`
  9. `generateSuggestions(assessment)`
  10. `generateText({ model: getModel(provider, key), system: reportPrompt, prompt: assessmentPrompt })`
  11. If platform key: `incrementUsage(userId, 'report')`
  12. Return `PortfolioResponse`
- [ ] Error handling: Zerion fail → error. DeFiLlama fail → proceed without yields. Aave fail → proceed without HF. LLM fail → return raw assessment.
- [ ] Test end-to-end with real wallet address

**Acceptance criteria:** Full pipeline works: address in → report out. Graceful degradation for API failures. Usage tracked for platform key users. BYOK users bypass limits.

---

### Issue #16: Chat streaming endpoint
**Labels:** `api`, `priority: critical`
**Depends on:** #6, #7, #13, #14
**Estimate:** 2-3 hours

**Tasks:**
- [ ] Create `app/api/chat/route.ts` (POST):
  1. Parse `{ messages, portfolioContext, walletAddress }` from body
  2. Get authenticated user
  3. `resolveApiKey(userId, provider)`
  4. If platform key: `checkLimit(userId, 'chat')` → reject if over limit
  5. `streamText({ model: getModel(provider, key), system: buildChatSystemPrompt(portfolioContext, walletAddress), messages })`
  6. If platform key: `incrementUsage(userId, 'chat')`
  7. Return `result.toUIMessageStreamResponse()`
- [ ] Temperature: 0.3 (low for factual responses)
- [ ] Max tokens: 1024

**Acceptance criteria:** Chat streams responses. Responses grounded in portfolio context. Usage tracked. Limits enforced.

---

### Issue #17: API key + usage endpoints
**Labels:** `api`, `billing`, `priority: high`
**Depends on:** #7
**Estimate:** 1-2 hours

**Tasks:**
- [ ] Create `app/api/keys/route.ts`:
  - `GET` → list user's keys (provider, hint, is_valid only)
  - `POST { provider, apiKey }` → validate + encrypt + save
  - `DELETE { provider }` → remove key
- [ ] Create `app/api/usage/route.ts`:
  - `GET` → `{ reports: { used, limit }, chat: { used, limit }, tier, isByok }`
- [ ] All endpoints require authentication

**Acceptance criteria:** CRUD works for API keys. Usage endpoint returns correct numbers. Unauthenticated requests rejected.

---

## Milestone 7: Web3 + App Shell
> Wallet connection, providers, layout.

### Issue #18: Wagmi + RainbowKit configuration
**Labels:** `web3`, `priority: high`
**Depends on:** #1
**Estimate:** 1-2 hours

**Tasks:**
- [ ] Create `lib/web3/config.ts`:
  - `getDefaultConfig()` with mainnet only
  - WalletConnect project ID from env
  - SSR enabled
- [ ] Create `app/providers.tsx`:
  - `WagmiProvider` + `RainbowKitProvider` + `QueryClientProvider`
  - Import RainbowKit styles
  - Mark as `'use client'`
- [ ] Create `app/layout.tsx`:
  - Root layout wrapping children with `<Providers>`
  - Metadata: title, description
- [ ] Verify no hydration errors

**Acceptance criteria:** App renders. RainbowKit connect button works. Wallet connection successful on Ethereum mainnet.

---

## Milestone 8: UI Components
> All reusable components. Build bottom-up.

### Issue #19: Atomic components — RiskBadge + PositionCard
**Labels:** `ui`, `priority: high`
**Depends on:** #2, #3
**Estimate:** 2-3 hours

**Tasks:**
- [ ] Create `components/RiskBadge.tsx`:
  - Props: `{ level: RiskLevel, label?: string, size?: 'sm' | 'md' | 'lg' }`
  - Color mapping: low=green, medium=yellow, high=orange, critical=red
  - Uses shadcn `Badge`
- [ ] Create `components/PositionCard.tsx`:
  - Props: `{ position: NormalizedPosition, showProtocol?: boolean }`
  - Token icon (URL with fallback avatar), name, symbol
  - Value in USD, quantity in tokens
  - 1d change (green/red)
  - Protocol badge + position type label
- [ ] Visual test with mock data for all risk levels and position types

**Acceptance criteria:** All 4 risk levels render correctly with distinct colors. Position cards display all data fields. Responsive on mobile.

---

### Issue #20: Billing components — UsageBanner + UpgradePrompt + ApiKeyInput
**Labels:** `ui`, `billing`, `priority: high`
**Depends on:** #6, #7
**Estimate:** 3-4 hours

**Tasks:**
- [ ] Create `components/UsageBanner.tsx`:
  - Props: `{ usage: UsageStats }`
  - Shows progress bar: "2/5 chat messages used today"
  - Hidden for BYOK users
  - Warning color when >80% used
- [ ] Create `components/UpgradePrompt.tsx`:
  - Props: `{ feature: string }`
  - Dialog shown when limit hit
  - Two options: "Add your own API key" (link to settings) or "Upgrade to Pro"
  - Uses shadcn `Dialog`
- [ ] Create `components/ApiKeyInput.tsx`:
  - Props: `{ provider: 'anthropic' | 'openai', onSaved: () => void }`
  - Masked input field (type=password)
  - "Test Key" button → calls POST /api/keys with validation
  - Success: shows key hint ("...a1b2") + checkmark
  - Error: shows validation error message
  - "Remove Key" button for existing keys

**Acceptance criteria:** Usage banner shows correct progress. Upgrade dialog renders with both options. API key input validates, saves, and shows hints. Remove key works.

---

### Issue #21: WalletInput component
**Labels:** `ui`, `web3`, `priority: critical`
**Depends on:** #18
**Estimate:** 2-3 hours

**Tasks:**
- [ ] Create `components/WalletInput.tsx`:
  - Props: `{ onAddressSubmit: (address: string) => void, isLoading: boolean }`
  - Mode 1: Text input with paste button
    - Validate with viem's `isAddress()`
    - Show error for invalid addresses
  - Mode 2: RainbowKit `ConnectButton`
    - On wallet connect, auto-extract address via `useAccount()` and call `onAddressSubmit`
  - "OR" divider between modes
  - Submit button disabled during loading
  - Shows spinner during loading state

**Acceptance criteria:** Can paste valid address and submit. Can connect wallet and auto-submit. Invalid addresses rejected with error message. Loading state shown.

---

### Issue #22: PortfolioReport component
**Labels:** `ui`, `priority: critical`
**Depends on:** #19
**Estimate:** 3-4 hours

**Tasks:**
- [ ] Create `components/PortfolioReport.tsx`:
  - Props: `{ report: PortfolioReport, isLoading: boolean }`
  - Loading: animated skeleton cards
  - Header: truncated wallet address, total value, overall risk badge, 1d change
  - Report body: render `naturalLanguageReport` as formatted text (split paragraphs, bold sections)
  - Position table: grouped by category using shadcn `Tabs` (Lending, LPs, Staking, Wallet)
  - Each position row uses `PositionCard`
  - Disclaimer footer

**Acceptance criteria:** Report renders full natural language text. Positions grouped correctly by category. Tab switching works. Mobile responsive. Loading skeleton shown during fetch.

---

### Issue #23: SuggestionsPanel component
**Labels:** `ui`, `priority: high`
**Depends on:** #19
**Estimate:** 2-3 hours

**Tasks:**
- [ ] Create `components/SuggestionsPanel.tsx`:
  - Props: `{ suggestions: Suggestion[] }`
  - Empty state: "No optimization opportunities detected"
  - Each suggestion as card:
    - Category icon (yield, risk, idle — different icon per category)
    - Title (bold) + description
    - Impact badge (green for gains: "+$234/yr")
    - Risk level badge
    - Action link button → opens protocol URL in new tab
  - Filter tabs: All, Yield, Risk, Idle
  - Sorted by impact (highest first)

**Acceptance criteria:** Suggestions render with correct formatting. Category filtering works. Action links open correct protocol pages. Empty state shown when no suggestions.

---

### Issue #24: ChatInterface component
**Labels:** `ui`, `llm`, `priority: critical`
**Depends on:** #16, #20
**Estimate:** 3-4 hours

**Tasks:**
- [ ] Create `components/ChatInterface.tsx`:
  - Props: `{ portfolioContext: PortfolioRiskAssessment, walletAddress: string }`
  - Use `useChat` from `@ai-sdk/react`:
    ```typescript
    const { messages, input, handleInputChange, sendMessage, isLoading } = useChat({
      api: '/api/chat',
      body: { portfolioContext, walletAddress },
    });
    ```
  - Message list with auto-scroll to bottom
  - User messages right-aligned (blue), assistant messages left-aligned (gray)
  - Streaming text rendered in real-time
  - Suggested starter questions (clickable chips):
    - "What are my biggest risks?"
    - "How can I earn more yield?"
    - "Explain my Aave position"
    - "What is impermanent loss?"
  - Input with send button, disabled while streaming
  - Integrate `UsageBanner` (show remaining messages for free tier)
  - Show `UpgradePrompt` when limit hit (429 response)

**Acceptance criteria:** Chat sends/receives messages. Streaming works. Starter questions populate input. Usage banner shows remaining. Upgrade prompt appears on limit.

---

## Milestone 9: Pages + Integration
> Full pages composing all components. End-to-end flow.

### Issue #25: Landing page
**Labels:** `page`, `priority: critical`
**Depends on:** #18, #21
**Estimate:** 2-3 hours

**Tasks:**
- [ ] Create `app/page.tsx` (client component):
  - App title + tagline: "Understand your DeFi portfolio in plain English"
  - Feature highlights (3 bullet points: Report, Chat, Suggestions)
  - `WalletInput` component centered
  - Auth section: sign in with email/magic link (for usage tracking)
  - Allow 1 anonymous report (no auth required for first use)
  - On address submit: `router.push(/dashboard?address=${address})`
  - Footer with disclaimer + links

**Acceptance criteria:** Landing page renders. Address submission navigates to dashboard. Auth flow works (magic link). Anonymous first report works.

---

### Issue #26: Dashboard page — main app experience
**Labels:** `page`, `priority: critical`
**Depends on:** #15, #22, #23, #24
**Estimate:** 4-5 hours

**Tasks:**
- [ ] Create `app/dashboard/page.tsx` (client component):
  - Read `address` from URL search params via `useSearchParams()`
  - On mount: `POST /api/portfolio` with address
  - State: `portfolioReport`, `isLoading`, `error`, `activeTab`
  - Loading state: full-page skeleton
  - Error state: error card with retry button + "go back" link
  - Success layout:
    - **Desktop:** Report on left (60%), Chat + Suggestions stacked on right (40%)
    - **Mobile:** Tab navigation: Report | Chat | Suggestions
  - Pass `portfolioReport.riskAssessment` to `ChatInterface`
  - Pass `portfolioReport.suggestions` to `SuggestionsPanel`
  - Show `UsageBanner` at top
  - Header: wallet address + "Analyze another wallet" button

**Acceptance criteria:** Full end-to-end flow: paste address → loading → report + chat + suggestions. Desktop split layout. Mobile tab layout. Error retry works. UsageBanner displayed.

---

### Issue #27: Settings page
**Labels:** `page`, `billing`, `priority: high`
**Depends on:** #17, #20
**Estimate:** 3-4 hours

**Tasks:**
- [ ] Create `app/settings/page.tsx`:
  - **API Keys section:**
    - `ApiKeyInput` for Anthropic (Claude)
    - `ApiKeyInput` for OpenAI
    - Show saved key hints or "No key added"
    - Preferred provider selector (radio: Claude / OpenAI)
  - **Current Tier section:**
    - Display current tier (Free / Pro / BYOK)
    - Upgrade to Pro button (placeholder — Stripe integration later)
  - **Usage Dashboard section:**
    - Today's usage: reports used/limit, chat messages used/limit
    - Progress bars for each
    - "Resets daily at midnight UTC"
  - Requires authentication — redirect to landing if not signed in

**Acceptance criteria:** Can add/remove API keys. Tier displayed correctly. Usage stats shown. Unauthenticated users redirected.

---

### Issue #28: Middleware — auth session + validation + rate limiting
**Labels:** `infra`, `security`, `priority: high`
**Depends on:** #5
**Estimate:** 2 hours

**Tasks:**
- [ ] Create `middleware.ts`:
  - Supabase auth session refresh on every request
  - Validate `/api/portfolio` requests contain valid Ethereum address
  - Rate limiting: 10 requests per minute per IP (in-memory Map)
  - Protect `/settings` and `/dashboard` routes (redirect to `/` if not authenticated, except first anonymous report)
- [ ] Create `next.config.ts`:
  - Image remote patterns for token icons (zerion.io, s3.amazonaws.com)

**Acceptance criteria:** Auth sessions refresh. Invalid addresses rejected. Rate limiting works. Protected routes redirect. Token icons load.

---

## Milestone 10: Testing + Deploy
> End-to-end verification and production deployment.

### Issue #29: End-to-end testing
**Labels:** `testing`, `priority: high`
**Depends on:** #26, #27, #28
**Estimate:** 3-4 hours

**Tasks:**
- [ ] Test full flow with real wallet addresses:
  - Wallet with multiple DeFi positions (lending + LP + staking)
  - Wallet with only tokens (no DeFi)
  - Empty wallet (0 balance)
  - Invalid address format
- [ ] Test BYOK flow: add key → unlimited usage → remove key → back to free tier
- [ ] Test free tier limits: generate 1 report → second report blocked → upgrade prompt shown
- [ ] Test chat grounding: ask about positions → verify answers reference actual data
- [ ] Test error states: disconnect internet → graceful degradation
- [ ] Test mobile layout: tabs work, responsive design correct
- [ ] Test auth: sign in → session persists → sign out → protected routes redirect

**Acceptance criteria:** All test cases pass. No crashes. Error states handled gracefully. Mobile responsive.

---

### Issue #30: Production deployment to Vercel
**Labels:** `deploy`, `priority: high`
**Depends on:** #29
**Estimate:** 2-3 hours

**Tasks:**
- [ ] `pnpm build` succeeds with zero errors
- [ ] Create Vercel project, connect to GitHub repo
- [ ] Set all environment variables in Vercel dashboard
- [ ] Deploy to Vercel
- [ ] Verify production build:
  - Landing page loads
  - Wallet analysis works
  - Chat streaming works
  - Settings page works
  - Mobile layout correct
- [ ] Set up custom domain (if applicable)
- [ ] Verify Supabase connection works in production
- [ ] Test BYOK in production environment

**Acceptance criteria:** App live on Vercel. All features working. No console errors. Performance acceptable (<5s for report generation).

---

## Issue Dependency Graph

```
#1 (scaffold)
├── #2 (types) 
│   ├── #8 (zerion) ─────────────────────┐
│   ├── #9 (defillama) ──────────────────┤
│   ├── #10 (subgraphs) ────────────────┤
│   ├── #14 (prompts) ──────────────────┤
│   └── #19 (atomic components) ────────┤
├── #3 (utils) ──────────────────┐       │
│   └── #7 (BYOK keys) ─────────┤       │
├── #4 (supabase setup) ─────┐  │       │
│   └── #5 (supabase client) ┤  │       │
│       └── #6 (tiers+usage) ┤  │       │
│           └── #7 ──────────┤  │       │
│               └── #13 (LLM provider)  │
│                   └── #15 (portfolio API) ◄─── all data + engine
│                   └── #16 (chat API)  │
│                   └── #17 (keys API)  │
├── #11 (risk engine) ◄─── #8, #9, #10 │
│   └── #12 (suggestions) ─────────────┤
├── #18 (wagmi+rainbow) ───────────────┤
│   └── #21 (wallet input) ────────────┤
│       └── #25 (landing page)         │
├── #20 (billing components) ──────────┤
├── #22 (report component) ────────────┤
├── #23 (suggestions component) ───────┤
├── #24 (chat component) ─────────────┤
│   └── #26 (dashboard page) ◄─── all components + APIs
│       └── #29 (e2e testing)
│           └── #30 (deploy)
├── #27 (settings page)
└── #28 (middleware)
```

---

## Summary

| Milestone | Issues | Effort Estimate |
|-----------|--------|-----------------|
| 1. Project Foundation | #1, #2, #3 | 4-7 hours |
| 2. Auth & Billing | #4, #5, #6, #7 | 7-10 hours |
| 3. DeFi Data Layer | #8, #9, #10 | 8-11 hours |
| 4. Risk Engine | #11, #12 | 6-8 hours |
| 5. LLM Integration | #13, #14 | 4-5 hours |
| 6. API Routes | #15, #16, #17 | 7-10 hours |
| 7. Web3 + App Shell | #18 | 1-2 hours |
| 8. UI Components | #19, #20, #21, #22, #23, #24 | 16-21 hours |
| 9. Pages + Integration | #25, #26, #27, #28 | 11-15 hours |
| 10. Testing + Deploy | #29, #30 | 5-7 hours |
| **Total** | **30 issues** | **~69-96 hours** |

---

## Parallel Work Streams

These can be worked on simultaneously by multiple developers:

| Stream A (Backend) | Stream B (Frontend) | Stream C (Infra) |
|-------------------|-------------------|-----------------|
| #8 Zerion client | #19 Atomic components | #4 Supabase setup |
| #9 DeFiLlama client | #21 WalletInput | #5 Supabase client |
| #10 Aave/Compound | #20 Billing components | #6 Tiers + usage |
| #11 Risk engine | #22 Report component | #7 BYOK keys |
| #12 Suggestions | #23 Suggestions component | #18 Wagmi config |
| #13 LLM provider | #24 Chat component | #28 Middleware |
| #14 Prompts | #25 Landing page | |
| #15 Portfolio API | #27 Settings page | |
| #16 Chat API | | |
| #17 Keys API | | |

**Integration point:** Issue #26 (Dashboard) requires all streams to converge.
