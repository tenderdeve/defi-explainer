# DeFi Portfolio Explainer + AI Chat

## Project Overview

AI-powered DeFi portfolio explainer. Translate complex DeFi positions to plain English. User paste Ethereum wallet address, get human-readable report, chat interface for follow-ups, optimization suggestions.

## Stack

- **Framework:** Next.js 14+ (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **LLM:** Claude + OpenAI (switchable via Vercel AI SDK)
- **Web3:** wagmi + viem + RainbowKit
- **Data:** Zerion API (positions) + DeFiLlama (yields) + Aave RPC (health factors)
- **Auth:** Wallet ownership via one-time EIP-191 signature → stateless HMAC session cookie (no Supabase Auth, no email login)
- **DB:** Supabase Postgres (encrypted key store only; server-side service role, no RLS)
- **Math:** decimal.js (all financial calculations)

## Architecture Principles

1. **LLM never touches numbers.** Risk engine compute everything deterministic. LLM only translate pre-computed JSON to natural language.
2. **No financial advice.** Frame as "opportunities detected" not "you should." Disclaimers on every report.
3. **Free, BYOK-only.** No platform LLM keys, no tiers, no usage limits, no subscription. User supplies own Anthropic/OpenAI/Local key.
4. **Security:** User API keys encrypted with AES-256-GCM at rest, keyed by wallet address. Key access requires a verified ownership session (one-time signature). Decrypted key never returned to client (last-4 hint only).

## Key Files

- `lib/defi/types.ts` — Canonical type system (all other files import from here)
- `lib/defi/risk-engine.ts` — Deterministic financial calculations (core business logic)
- `lib/defi/zerion.ts` — Primary data source (Zerion API client)
- `lib/billing/keys.ts` — BYOK key management (encrypt/decrypt/validate), keyed by wallet address
- `lib/auth/session.ts` — HMAC nonce + ownership session cookie (`getSessionAddress`)
- `app/api/portfolio/route.ts` — Main orchestration endpoint
- `PLAN.md` — Full implementation plan with 35 build steps

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # ESLint
pnpm typecheck    # TypeScript check (if configured)
```

## Environment Variables

See `.env.example` for the full list. Key ones:
- `ENCRYPTION_SECRET` — AES-256 key (32-byte hex) for encrypting user BYOK keys
- `SESSION_SECRET` — HMAC secret for wallet ownership session cookies
- `ZERION_API_KEY` — DeFi data
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase Postgres (key store)
- `ETHEREUM_RPC_URL` — For Aave health factor queries
- `LOCAL_LLM_BASE_URL` / `LOCAL_LLM_MODEL` — optional local provider endpoint

> Note: BYOK-only — no platform `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`. Users supply their own key per provider in Settings. No Supabase Auth / anon key.

## Conventions

- All financial math use `decimal.js`, never native JS floats
- Types defined in `lib/defi/types.ts` — single source of truth
- API routes validate with zod schemas
- Ethereum addresses validated with viem's `isAddress()`
- Error handling: graceful degradation (DeFiLlama down → skip yield comparison; Aave RPC down → skip health factor)

## Knowledge Persistence

All project knowledge must save for future reference:

| Type | Location | Format | When |
|------|----------|--------|------|
| Research | `docs/research/` | `YYYY-MM-DD-topic.md` | Any research output, API investigation, competitive analysis |
| Chats | `docs/chats/` | `YYYY-MM-DD-topic.md` | Significant planning/design conversations |
| Decisions | `docs/decisions/` | `YYYY-MM-DD-decision.md` | Architecture decisions with context + reasoning |

Pre-project research at:
- `~/Desktop/web3-ai-research.md` — Web3 x AI landscape
- `~/Desktop/defi-explainer-fresh-ideas.md` — 10 alternative implementation ideas

## Project Agents

Custom agents in `.claude/agents/`:

| Agent | Use When |
|-------|----------|
| `issue-creator` | Creating GitHub issues from GITHUB-ISSUES.md |
| `pr-reviewer` | Reviewing PRs for architecture, security, DeFi math |
| `research` | Investigating DeFi protocols, APIs, competitors |
| `ui-design` | Designing components, reviewing UX, creating mockups |

## Git

- Org: tenderdeve
- Git identity: `tenderdeve <manmits350@gmail.com>` (local config set)
- Commit messages: conventional commits format
- Branch naming: `feat/`, `fix/`, `chore/` prefixes
- PRs manually merged by maintainer — never auto-merge

## PR Review Workflow

**Contributor: minoto32** — PRs from this user review thoroughly.

### How to Review PRs

1. Use `pr-reviewer` agent (`.claude/agents/pr-reviewer.md`) with fresh context
2. Review against PLAN.md architecture, GITHUB-ISSUES.md acceptance criteria
3. Check all items in review checklist (architecture, DeFi math, security, billing, code quality)
4. Post review via `gh pr review` with approve/request-changes/comment
5. Maintainer (tenderdeve) manually merge after review pass

### Review Checklist (Quick Reference)

- [ ] LLM never touches financial numbers directly
- [ ] All financial math use `decimal.js`
- [ ] Types imported from `lib/defi/types.ts`
- [ ] API keys never exposed to client
- [ ] Health factor thresholds correct
- [ ] IL formula correct
- [ ] BYOK key routing works (resolveApiKey)
- [ ] Usage limits checked BEFORE LLM call
- [ ] No `any` types
- [ ] Graceful degradation for API failures
- [ ] No financial advice language
- [ ] Mobile responsive
- [ ] PR references issue it closes

### Making Changes on PRs

Fixes needed on PR from minoto32:
1. Checkout PR branch: `gh pr checkout <number>`
2. Make changes under tenderdeve identity
3. Commit and push
4. Maintainer reviews and merges manually