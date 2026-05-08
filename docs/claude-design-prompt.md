# Claude Design Prompt — DeFi Portfolio Explainer

Copy and paste the section below into Claude Design.

---

## Prompt

Design a complete UI for a DeFi Portfolio Explainer web app. This is a Next.js app that helps crypto beginners understand their DeFi positions in plain English. The design should feel modern, clean, and trustworthy — like a financial tool, not a crypto degen app.

### Brand Identity
- **Name:** DeFi Explainer (working title — suggest a better name if you have one)
- **Tagline:** "Understand your DeFi portfolio in plain English"
- **Personality:** Trustworthy, clear, educational, approachable. Think "friendly financial advisor" not "crypto bro."
- **Color palette:** Clean whites/grays for base. Risk-level colors: green (safe), yellow (watch), orange (action needed), red (urgent). Accent color for CTAs — suggest something that feels trustworthy but not boring.
- **Typography:** Clean sans-serif. Monospace for numbers/addresses. Large readable type for financial figures.
- **No dark mode in v1** — light theme only.

### Pages to Design

#### 1. Landing Page (`/`)
The entry point. Two ways to start:
- **Paste a wallet address** (text input with "0x..." placeholder)
- **Connect wallet** (MetaMask, WalletConnect button)
- Below the input: 3 feature cards explaining what you get (Report, Chat, Suggestions)
- Top-right: Sign in link (email magic link auth)
- Footer: "Not financial advice" disclaimer
- Should feel inviting to crypto beginners. No jargon on this page.

#### 2. Dashboard Page (`/dashboard`) — Desktop
The main experience after submitting a wallet. Split layout:

**Left side (60%):** Portfolio Report
- Header: truncated wallet address (0x1234...5678), total portfolio value ($14,230), overall risk badge (Low/Medium/High/Critical), 24h change
- Plain English report text (AI-generated, 3-5 paragraphs explaining the portfolio)
- Below report: Position cards grouped by tabs — Lending | LPs | Staking | Wallet
- Each position card shows: token icon, name, protocol badge, USD value, quantity, APY, 1d change, risk badge

**Right side (40%):** Chat + Suggestions stacked
- Top: AI Chat interface
  - Suggested question chips at top ("What are my biggest risks?", "How can I earn more?", "Explain my Aave position", "What is impermanent loss?")
  - Message bubbles: user right-aligned (blue), AI left-aligned (gray)
  - Input bar with send button at bottom
  - Usage banner at very bottom: "3/5 messages today" with progress bar + "Add API key for unlimited" link
- Bottom: Suggestions panel
  - Cards showing optimization opportunities
  - Each card: category icon, title, description, potential impact in green (+$340/yr), risk badge, "Open Protocol" button
  - Filter chips: All | Yield | Risk | Idle

#### 3. Dashboard Page (`/dashboard`) — Mobile
Same content as desktop but with tab navigation:
- Top bar: wallet address + total value
- Tab bar: Report | Chat | Suggestions
- Active tab content fills the screen
- Each tab is the full-width version of its desktop counterpart

#### 4. Settings Page (`/settings`)
- **API Keys section:** Two input rows (Claude/Anthropic, OpenAI). Each has: masked key display if saved ("...a1b2"), "Test & Save" button, "Remove" button. Radio selector for preferred provider.
- **Plan section:** Shows current tier (Free). "Upgrade to Pro — $9/mo" button (grayed out / coming soon). Or if BYOK keys are added: "BYOK — Unlimited" badge.
- **Usage section:** Today's usage with progress bars — Reports (1/1 used), Chat messages (3/5 used). "Resets daily at midnight UTC" note.

#### 5. Upgrade Prompt (Modal/Dialog)
Shown when user hits free tier limits:
- Title: "You've used your free report for today"
- Two options presented as cards:
  1. "Bring Your Own API Key" — free, unlimited, add in settings. Primary CTA.
  2. "Upgrade to Pro — $9/mo" — coming soon badge.
- Dismiss button

#### 6. Loading State
While portfolio is being analyzed (3-8 seconds):
- Skeleton cards where report will be
- Animated progress indicator
- Status text that updates: "Fetching positions..." → "Analyzing risks..." → "Generating report..."

### Component Details

**Position Card:**
```
[Token Icon] ETH Staking (Lido)          [RISK: LOW]
             2.1 ETH ($6,720)
             +3.2% APY   ▲ +$42 (24h)
```

**Suggestion Card:**
```
[💡 Icon] Rate Arbitrage                 [MEDIUM]

Move USDC from Aave (3.2%) to Morpho Blue (5.4%)
for +2.2% APY

Potential: +$340/year

[Learn More]  [Open Morpho Blue →]
```

**Risk Badge variants:**
- Low: green, rounded pill
- Medium: yellow
- High: orange
- Critical: red, slightly larger, maybe pulsing

**Usage Banner (bottom of chat):**
```
[████████░░] 4/5 messages today    [Add API key → unlimited]
```
Green <60%, yellow 60-80%, red >80%. Hidden for unlimited users.

### Design Constraints
- Use shadcn/ui component patterns (cards, badges, dialogs, tabs, inputs, buttons, progress bars)
- Tailwind CSS styling approach
- Must work on mobile (320px) through desktop (1440px+)
- Financial numbers always right-aligned in tables
- Currency: 2 decimal places for USD. Up to 6 for token amounts.
- Addresses always truncated with copy button
- Risk colors must be accessible for colorblind users — use icons + text labels, not color alone
- All token icons are 32x32 rounded, with first-letter fallback avatar
- Disclaimer footer on every page

### UX Principles
1. **Clarity over decoration.** DeFi is confusing — UI reduces cognitive load.
2. **Numbers are sacred.** Financial data must be prominent, correctly formatted, never truncated.
3. **Progressive disclosure.** Summary first, details on demand.
4. **Mobile-first.** 60%+ of crypto users are on mobile.
5. **No jargon without explanation.** If a term is used (health factor, impermanent loss), there should be a way to learn what it means.

### What I Need
- Full designs for all 6 items above (landing, desktop dashboard, mobile dashboard, settings, upgrade modal, loading state)
- A cohesive design system (colors, typography, spacing, component styles)
- Logo/wordmark concept
- Icon set for suggestion categories (yield, risk, idle assets, health)
- Responsive breakpoints demonstrated
- Light theme only (no dark mode for v1)
