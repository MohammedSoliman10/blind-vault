# Implementation Plan: Blind Vault Tier 1 Core Arena

**Branch**: `001-tier1-core-arena` | **Date**: 2026-11-20 | **Spec**: [specs/001-tier1-core-arena/spec.md](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/spec.md)

**Input**: Feature specification from `/specs/001-tier1-core-arena/spec.md`

---

## Summary

Build the Tier 1 MVP for **Blind Vault (MagicBlock Intel TDX Edition)**: a verifiable, sealed-strategy automated trading vault on Solana Devnet where private trading logic runs securely inside a hardware Intel TDX Trusted Execution Environment (MagicBlock Private Ephemeral Rollup) while public risk limits (20% position cap, token allowlist, rolling 24h 5% daily loss circuit breaker) and non-custodial depositor exit rights remain permanently anchored on Solana Layer 1. The frontend features an interactive, dark precision risk-console arena booting into an active zero-wallet Guest Session with 1,000 Demo-USDC and sponsored transactions, 4 red "Try to Rug It" attack buttons, live news-to-trade evaluation, and a real-time docked proof tape with clickable Solana Explorer links.

---

## Technical Context

### Toolchain & Version Audit
- **Rustc / Cargo**: `1.99.0` (Meets requirement `>= 1.89`).
- **Solana CLI**: `solana-cli 3.1.10 (Agave)` (Meets requirement `>= 3.1.x`).
- **Anchor CLI**: `anchor-cli 1.1.2` (Anchor 1.0 line; compiler rules enforce no `anchor-compat`, untyped delegation accounts, and `CpiContext::new` with explicit `Pubkey`).
- **Node.js / npm**: `v24.20.0` / `11.19.0` (Meets requirement `>= 20.x`).
- **pnpm**: *Missing on host system*; plan uses `npm` / `npx` or `npm i -g pnpm`.

### Primary Dependencies & Infrastructure
- **On-Chain Framework**: Anchor 1.0 (v1.2.2 / v1.1.2)
- **PER SDK Pin**: `ephemeral-rollups-sdk = { version = "0.17.3", features = ["anchor", "access-control"] }`
- **MagicBlock Devnet Endpoints**:
  - TEE Validator RPC: `https://devnet-tee.magicblock.app` (`MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo`)
  - Magic Router: `https://devnet-router.magicblock.app`
  - Delegation Program: `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh`
  - Permission Program: `ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1`
- **Frontend / Fullstack**: Next.js 15 (App Router), Tailwind CSS, `@solana/kit`, `@solana/kit-plugin-wallet`
- **Testing**: LiteSVM (`tests/blind_vault.spec.ts`)
- **Backend APIs / Hosting**: Vercel Hobby, Supabase Free Tier (Postgres + Realtime), Firecrawl API (free tier / sponsor), Google AI Studio (`gemini-3.8-flash` free tier) with Groq free fallback.

### Constraints & Target Performance
- **Zero Cost / Zero Card**: 100% free development stack.
- **Onboarding Speed**: `< 10s` to active Guest Session with sponsored Devnet SOL and 1,000 Demo USDC.
- **Core Moment Latency**: `< 30s` from initial page load to completed attack rejection.
- **Attack Response Latency**: `< 10s` per adversarial transaction with decoded error reasons.

---

## Constitution Check

*GATE: All principles evaluated and confirmed passing.*

1. **Strict $0 / Zero-Card Policy**: **PASS**. Phala Cloud, Nito, MoneyGram, LI.FI, Helius Historical, and paid OpenAI APIs are strictly excluded. All services (MagicBlock PER Devnet, Vercel, Supabase, Google AI Studio, Firecrawl) are 100% card-free.
2. **Solana-Only & Open-Source Integrity**: **PASS**. Deploys exclusively to Solana Devnet; repository is MIT-licensed with clean atomic commits and a `BUILD_LOG.md` maintaining strict pre-hackathon vs. weekend demarcation.
3. **Custody & Security Invariants**: **PASS**. Only `SealedStrategy` is delegated to PER. `VaultState`, SPL tokens, and risk caps remain permanently on Solana L1. `withdraw` is depositor-only (`has_one = owner`) and permanently open even during vault halts. Relayer enforces Program ID allowlisting and rate limits.
4. **Demo & Scope Discipline**: **PASS**. Zero-wallet Guest Session boots immediately with 1,000 Demo-USDC. 4 red attack buttons prove security in under 30s. Tier 2 stretch features (ERC-8004, x402, Seeker) are strictly deferred.
5. **Verification Discipline**: **PASS**. In-process LiteSVM test suite proves every valid flow and every exploit rejection path before Devnet deployment.
6. **Obsidian Knowledge Base Sync**: **PASS**. Architecture matches [/mnt/e/obsidian.md/SOLLY/Dev3pack Hackathon](file:///mnt/e/obsidian.md/SOLLY/Dev3pack%20Hackathon) notes and decisions.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-tier1-core-arena/
├── plan.md              # Master Implementation Plan (this document)
├── research.md          # Phase 0 Research & Technical Decisions
├── data-model.md        # Phase 1 Data Model & Account Structures
├── quickstart.md        # Phase 1 Quickstart & Validation Guide
├── contracts/           # Phase 1 Interface Contracts
│   ├── program-api.md   # 8 Anchor Instructions & Error Codes
│   ├── backend-routes.md# Next.js App Router API Routes
│   └── realtime-events.md# Supabase Realtime Telemetry Payloads
└── tasks.md             # Phase 2 Work Breakdown (via /speckit-tasks)
```

### Source Code Layout

```text
blind-vault/
├── programs/
│   └── blind_vault/
│       ├── Cargo.toml                  # Anchor 1.0 + ephemeral-rollups-sdk 0.17.3
│       └── src/
│           ├── lib.rs                  # 8 instructions, Anchor entrypoints, error codes
│           ├── state.rs                # VaultState, DepositorPosition, DemoSwapPool, SealedStrategy
│           └── errors.rs               # CustomError definitions
├── tests/
│   └── blind_vault.spec.ts             # LiteSVM test suite for all exploit rejections
├── app/
│   ├── layout.tsx                      # Root layout, theme provider
│   ├── page.tsx                        # Single-Page Arena Terminal (X-Ray, Attacks, News, Tape)
│   ├── globals.css                     # Dark risk-console styling
│   └── api/
│       ├── sponsor-tx/route.ts         # Guest fee-payer relayer + allowlist + rate limiter
│       ├── signal/route.ts             # Firecrawl scrape + Gemini 3.8 Flash scoring + cache
│       └── keepalive/route.ts          # Vercel cron keepalive for Supabase free tier
├── lib/
│   ├── solana/
│   │   ├── guest-wallet.ts             # Keypair generation & localStorage persistence
│   │   ├── client.ts                   # Codama-generated program client & connection
│   │   └── transactions.ts             # Transaction assembly & relayer submission
│   ├── magicblock/
│   │   └── tee-client.ts               # verifyTeeRpcIntegrity & getAuthToken handler
│   └── supabase/
│       ├── client.ts                   # Supabase client initialization
│       └── realtime.ts                 # Arena events subscription & presence channel
├── components/
│   ├── Header.tsx                      # Brand, Guest Session badge, Demo USDC, Connect Wallet
│   ├── XRayPanel.tsx                   # Split-screen Private Enclave vs Public Vault
│   ├── AttackGauntlet.tsx              # 4 red "Try to Rug It" buttons + status feedback
│   ├── NewsTrigger.tsx                 # News URL scraper, catalyst score, bounded trade trigger
│   └── ProofTape.tsx                   # Docked real-time event log with Explorer links
├── Anchor.toml                         # Devnet cluster configuration & program ID mapping
├── package.json                        # Dependencies (@solana/kit, supabase, etc.)
└── tsconfig.json
```

---

## Complexity Tracking

| Mechanism / Component | Why Needed | Simpler Alternative Rejected Because |
|-----------------------|------------|--------------------------------------|
| **MagicBlock PER Delegation** | Keeps quantitative trading trigger logic confidential from competitors and front-runners. | Public L1 storage reveals secret alpha immediately on-chain. |
| **Solana L1 Risk Firewall** | Guarantees non-custodial depositor protection and prevents rogue AI or compromised operator rugs. | Leaving execution logic solely inside the enclave allows an operator to drain user funds without L1 validation. |
| **Serverless Fee Relayer** | Enables instant zero-wallet Guest Mode without requiring Phantom or faucet SOL. | Mandatory wallet connection introduces a 2–3 minute drop-off friction wall for judges. |
| **Dedicated DemoSwapPool** | Deterministic AMM with `simulate_market_move` enables testing the -6% loss circuit breaker reliably. | Devnet public DEX pools are frequently drained, broken, or lack reliable liquidity. |

---

## Phase 0 & Phase 1 Execution Artifacts

- **Phase 0 Research**: [specs/001-tier1-core-arena/research.md](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/research.md)
  - Toolchain audit, Anchor 1.0 compiler rules, MagicBlock PER SDK v0.17.3 pin, deterministic AMM decisions, zero-cost API pipeline.
- **Phase 1 Data Model**: [specs/001-tier1-core-arena/data-model.md](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/data-model.md)
  - 4 On-chain Account PDAs (`VaultState`, `DepositorPosition`, `DemoSwapPool`, `SealedStrategy`), Supabase Postgres tables (`scraped_signals`, `arena_events`), state transition diagram.
- **Phase 1 Contracts**:
  - [specs/001-tier1-core-arena/contracts/program-api.md](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/contracts/program-api.md): 8 Anchor instructions, account schemas, and 8 custom error codes.
  - [specs/001-tier1-core-arena/contracts/backend-routes.md](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/contracts/backend-routes.md): Next.js App Router route schemas (`/api/sponsor-tx`, `/api/signal`, `/api/keepalive`).
  - [specs/001-tier1-core-arena/contracts/realtime-events.md](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/contracts/realtime-events.md): Real-time broadcast telemetry event contracts.
- **Phase 1 Quickstart**: [specs/001-tier1-core-arena/quickstart.md](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/quickstart.md)
  - Step-by-step local LiteSVM validation commands, Devnet deployment instructions, and 30-second core moment walkthrough.
