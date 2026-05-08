# DeFi Portfolio Explainer + AI Chat

## Project Overview

AI-powered DeFi portfolio explainer that translates complex DeFi positions into plain English. Users paste an Ethereum wallet address and get a human-readable report, chat interface for follow-ups, and optimization suggestions.

## Stack

- **Framework:** Next.js 14+ (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **LLM:** Claude + OpenAI (switchable via Vercel AI SDK)
- **Web3:** wagmi + viem + RainbowKit
- **Data:** Zerion API (positions) + DeFiLlama (yields) + Aave RPC (health factors)
- **Auth/DB:** Supabase (Auth + Postgres)
- **Math:** decimal.js (all financial calculations)

## Architecture Principles

1. **LLM never touches numbers.** Risk engine computes everything deterministically. LLM only translates pre-computed JSON to natural language.
2. **No financial advice.** Frame as "opportunities detected" not "you should." Disclaimers on every report.
3. **BYOK-first billing.** Users can bring their own API key for unlimited free usage, or use platform key with limits.
4. **Security:** User API keys encrypted with AES-256-GCM at rest. Platform keys server-side only. Supabase RLS on all tables.

## Key Files

- `lib/defi/types.ts` — Canonical type system (all other files import from here)
- `lib/defi/risk-engine.ts` — Deterministic financial calculations (core business logic)
- `lib/defi/zerion.ts` — Primary data source (Zerion API client)
- `lib/billing/keys.ts` — BYOK key management (encrypt/decrypt/validate)
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

See `PLAN.md` → Security → .env.local section for full list. Key ones:
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` — Platform LLM keys
- `ZERION_API_KEY` — DeFi data
- `ENCRYPTION_SECRET` — AES-256 key for encrypting user BYOK keys
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase
- `ETHEREUM_RPC_URL` — For Aave health factor queries

## Conventions

- All financial math uses `decimal.js`, never native JS floats
- Types defined in `lib/defi/types.ts` — single source of truth
- API routes validate with zod schemas
- Ethereum addresses validated with viem's `isAddress()`
- Error handling: graceful degradation (if DeFiLlama down, skip yield comparison; if Aave RPC down, skip health factor)

## Knowledge Persistence

All project knowledge must be saved for future reference:

| Type | Location | Format | When |
|------|----------|--------|------|
| Research | `docs/research/` | `YYYY-MM-DD-topic.md` | Any research output, API investigation, competitive analysis |
| Chats | `docs/chats/` | `YYYY-MM-DD-topic.md` | Significant planning/design conversations |
| Decisions | `docs/decisions/` | `YYYY-MM-DD-decision.md` | Architecture decisions with context + reasoning |

Pre-project research lives at:
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
- Commit messages: conventional commits format
- Branch naming: `feat/`, `fix/`, `chore/` prefixes
