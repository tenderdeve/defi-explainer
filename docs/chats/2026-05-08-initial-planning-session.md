# Chat: Initial Planning Session

**Date:** 2026-05-08
**Related Issues:** All (project inception)

## Context
First planning session for the DeFi Portfolio Explainer project. Started from web3-ai-research.md Idea #1 analysis.

## Key Decisions

1. **Target Idea: AI DeFi Position Explainer** — Chosen from 6 ideas in research doc. Highest opportunity (no existing product does "paste wallet → plain English"), 63% of Americans interested but find web3 too complex.

2. **MVP Scope: Report + Chat + Suggestions** — Not report-only (too simple) and not full execution (too complex). Chat adds follow-up value, suggestions show optimization opportunities.

3. **Ethereum Only** — Simplest MVP. Covers largest DeFi TVL. Add chains later.

4. **Both Claude + OpenAI (switchable)** — User wants provider flexibility via Vercel AI SDK.

5. **BYOK Billing Model** — Users bring own API key for unlimited usage. Free tier (1 report/day, 5 chats) on platform key. Pro tier ($9/mo) deferred — no Stripe at MVP.

6. **LLM Never Touches Numbers** — Core architecture principle. Risk engine is deterministic (decimal.js). LLM only translates pre-computed JSON to natural language. Prevents hallucination on financial data.

7. **Zerion API as Primary Data Source** — Single-call portfolio coverage. Beats DeBank (per-chain), Moralis (per-chain), DeFiLlama (protocol-level only). 2K free requests/month for MVP.

8. **Graceful Degradation** — Only Zerion is critical. DeFiLlama down → skip yields. Aave down → skip health factor. LLM down → show raw data.

## Notable Insights

- 10 fresh implementation ideas brainstormed beyond standard "paste wallet" approach: Browser extension overlay, Bull vs Bear AI debate, DeFi Time Machine, Wallet Roast (viral), Audio briefings, Social comparison, RPG visualization, Pre-transaction explainer, MetaMask Snap, Full autopilot.

- Recommended combo for maximum impact: **Wallet Roast** (viral acquisition) → **Browser Extension** (core product) → **Time Machine** (retention). These are saved in `~/Desktop/defi-explainer-fresh-ideas.md` for future phases.

- Biggest risk: thin moat. Any existing tracker (DeBank, Zapper) could add LLM layer. Defensibility comes from: explanation quality tuning, historical context tracking, alert system stickiness, community-driven explanations.

## Action Items
- [x] Created PLAN.md (35-step implementation plan)
- [x] Created GITHUB-ISSUES.md (30 issues, 10 milestones)
- [x] Set up project scaffold (Next.js + all deps)
- [x] Created 4 custom agents (issue-creator, pr-reviewer, research, ui-design)
- [x] Created memory files for project persistence
- [ ] Create GitHub repo and push initial commit
- [ ] Run issue-creator agent to populate GitHub issues
- [ ] Start implementation (Phase 1: types + utils)
