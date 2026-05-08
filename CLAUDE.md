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
- Git identity: `tenderdeve <manmits350@gmail.com>` (local config set)
- Commit messages: conventional commits format
- Branch naming: `feat/`, `fix/`, `chore/` prefixes
- PRs are manually merged by maintainer — never auto-merge

## PR Review Workflow

**Contributor: minoto32** — PRs from this user should be reviewed thoroughly.

### How to Review PRs

1. Use the `pr-reviewer` agent (`.claude/agents/pr-reviewer.md`) with a fresh context
2. Review against PLAN.md architecture, GITHUB-ISSUES.md acceptance criteria
3. Check all items in the review checklist (architecture, DeFi math, security, billing, code quality)
4. Post review via `gh pr review` with approve/request-changes/comment
5. Maintainer (tenderdeve) manually merges after review passes

### Review Checklist (Quick Reference)

- [ ] LLM never touches financial numbers directly
- [ ] All financial math uses `decimal.js`
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
- [ ] PR references the issue it closes

### Making Changes on PRs

When fixes are needed on a PR from minoto32:
1. Checkout the PR branch: `gh pr checkout <number>`
2. Make changes under tenderdeve identity
3. Commit and push
4. Maintainer reviews and merges manually
