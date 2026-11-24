# Phase 0 Research & Technical Decisions: Blind Vault Tier 1 Core Arena

**Feature**: [001-tier1-core-arena](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/spec.md)  
**Date**: 2026-11-20  
**Status**: Completed  

---

## Toolchain & Environment Audit

Before designing the architecture, local system CLI toolchains were inspected in WSL (Ubuntu) on 2026-11-20:

| Tool | Installed Version | Target Requirement | Status / Action |
|------|-------------------|--------------------|-----------------|
| `rustc` | `1.99.0` | `>= 1.89` | **Compatible** |
| `cargo` | `1.99.0` | `>= 1.89` | **Compatible** |
| `solana-cli` | `3.1.10 (Agave)` | `>= 3.1.x` | **Compatible** |
| `anchor-cli` | `1.1.2` | `Anchor 1.0.x / 1.1.x` | **Compatible** (Anchor 1.0 compiler rules apply) |
| `node` | `v24.20.0` | `>= 20.x` | **Compatible** |
| `npm` | `11.19.0` | `>= 9.x` | **Compatible** |
| `pnpm` | *Not found* | Optional package manager | **Mismatched / Missing**: Use `npm` / `npx` or install via `npm i -g pnpm` |

---

## Technical Decisions

### Decision 1: Anchor 1.0 + MagicBlock Intel TDX PER on Solana Devnet

- **Decision**: Build the on-chain smart contract using Solana Anchor 1.0 (v1.2.2/1.1.2 compatible) with `ephemeral-rollups-sdk = { version = "0.17.3", features = ["anchor", "access-control"] }`.
- **Rationale**:
  - MagicBlock provides a public Intel TDX Trusted Execution Environment on Solana Devnet (`https://devnet-tee.magicblock.app`) that is 100% free for development without any credit card or manual KYB.
  - SDK version `0.17.3` matches the devnet TEE validator (`MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo`), unlike unpinned 0.20 which targets the devnet-us validator 2.0 without TEE attestation.
  - Anchor 1.0 compiler rules strictly prohibit combining `anchor` with `anchor-compat` or `backward-compat`; delegation instructions require untyped `AccountInfo` parameters and `CpiContext::new` with explicit `Pubkey`.
- **Alternatives Considered**:
  - *Phala Cloud dstack*: Requires credit card verification to claim compute credits (violates Constitution Principle I: Zero-Card Policy).
  - *Nito Confidential Compute*: Requires funded account and private cloud TEE allocation (violates Principle I).
  - *Plain Solana L1 without TEE*: Fails core product promise because strategy buy/sell thresholds would be publicly visible in on-chain account state.

---

### Decision 2: Hybrid Account Topology & Permanent L1 Custody

- **Decision**: Partition state so that ONLY the `SealedStrategy` PDA is delegated to the Intel TDX Ephemeral Rollup; `VaultState`, `DepositorPosition`, and `DemoSwapPool` remain permanently anchored on Solana Layer 1.
- **Rationale**:
  - Guarantees non-custodial safety: the enclave cannot siphon depositor funds, freeze withdrawals, or modify risk caps.
  - Enforces unconditional depositor exit: `withdraw` instructions execute on Solana L1 checking only `signer == depositor_position.owner`, completely bypassing the enclave and remaining open even if the vault is halted or the enclave goes offline.
  - Enforces the L1 Risk Firewall: `execute_bounded_trade` verifies that the trade complies with the 20% single-trade cap and approved target mint before any token transfer occurs.
- **Alternatives Considered**:
  - *Delegating Entire VaultState to PER*: Rejected because an enclave compromise or node downtime would freeze user deposits and break sovereign custody.
  - *Off-chain Strategy Server*: Rejected because it lacks cryptographic hardware attestation and permits operator front-running.

---

### Decision 3: Deterministic AMM DemoSwapPool with Labelled Breaker Simulation

- **Decision**: Deploy a dedicated, self-contained constant-product ($x \cdot y = k$) SPL token swap pool on Solana Devnet with a clearly labeled `simulate_market_move` instruction that applies a deterministic price impact.
- **Rationale**:
  - Public Devnet DEX pools (e.g., Orca or Raydium Devnet deployments) suffer from frequent drain, missing liquidity, or breaking program upgrades outside our control.
  - Providing a dedicated pool ensures zero-dependency testing.
  - `simulate_market_move` allows judges and automated LiteSVM tests to trigger a -6% pool price drop in one transaction, tripping the 5% rolling 24-hour loss limit deterministically.
- **Alternatives Considered**:
  - *Mocking price feeds via an off-chain oracle*: Rejected because judges cannot verify the real AMM swap interaction on Solana Explorer.
  - *Relying on external Devnet Raydium/Orca pools*: Rejected due to high flakiness and unmaintained token pairs on Devnet.

---

### Decision 4: Zero-Wallet Guest Onboarding via Serverless Co-Signing Relayer

- **Decision**: Generate an ephemeral Ed25519 keypair in the browser (`@solana/kit` `generateKeyPairSigner()`) stored in `localStorage`, and route transactions through a Next.js App Router route (`/api/sponsor-tx`) that co-signs as fee-payer.
- **Rationale**:
  - Eliminates the wallet barrier: Hackathon judges can test all features in under 10 seconds without installing Phantom or requesting faucet SOL.
  - The relayer enforces strict security invariants: only allows transactions whose instructions target the `blind_vault` program ID, and enforces per-IP rate limits (e.g., max 10 requests per minute).
  - Relayer airdrops/mints 1,000 custom Demo-USDC to the guest session upon first deposit.
- **Alternatives Considered**:
  - *Requiring Phantom / Solflare wallet connection*: Rejected because it introduces a 2–3 minute setup friction wall and Devnet faucet dependency.
  - *Unrestricted open gas relayer*: Rejected because malicious actors could drain the sponsor keypair on arbitrary Devnet transactions.

---

### Decision 5: News Scraping & Catalyst Scoring Pipeline

- **Decision**: Implement `/api/signal` using a 15-minute Supabase Postgres cache (`scraped_signals`), Firecrawl API in Markdown mode (`formats: ["markdown"]`), and Google AI Studio `gemini-3.8-flash` for 0–100 catalyst scoring with Groq free-tier fallback on HTTP 429.
- **Rationale**:
  - Firecrawl is an official Dev3Pack hackathon sponsor offering free credits, returning clean markdown without scraping noise.
  - Google AI Studio provides free-tier API access for `gemini-3.8-flash` with fast (<1s) inference.
  - Groq free tier serves as an automatic backup if Gemini hits free-tier rate limits.
  - 15-minute database caching prevents credit waste when multiple judges test the same sample news URLs.
  - The resulting 0–100 score and its SHA-256 hash are fed into `evaluate_signal_private` inside the enclave.
- **Alternatives Considered**:
  - *OpenAI API*: Strictly prohibited by Constitution Principle I ($0 / zero-card policy).
  - *Client-side scraping*: Blocked by browser CORS and bot mitigation on news sites.

---

### Decision 6: Telemetry Broadcast & Free-Tier Keepalive

- **Decision**: Use Supabase free tier for `arena_events` real-time broadcasting via PostgreSQL changes and WebSocket presence. Deploy a Vercel cron route `/api/keepalive` firing daily.
- **Rationale**:
  - Provides instantaneous (<2s) UI updates across all open spectator terminals when an attack is rejected or a trade executes.
  - Supabase is an official Dev3Pack sponsor. The daily cron keepalive query prevents Supabase free-tier project pausing after 7 days of inactivity.
- **Alternatives Considered**:
  - *Custom WebSocket server*: Requires dedicated server hosting (violates zero-maintenance / zero-cost serverless model).
  - *Polling Solana RPC*: Causes RPC rate-limit exhaustion and high latency.

---

### Decision 7: Verification Strategy via In-Process LiteSVM

- **Decision**: Build an extensive in-process test suite (`tests/blind_vault.spec.ts`) using `litesvm` before deploying the Anchor program to Solana Devnet.
- **Rationale**:
  - LiteSVM runs Solana programs in-memory at native speed (sub-millisecond per transaction), allowing rapid regression testing and deterministic simulation of clock timestamps for 24-hour loss breaker testing.
  - Proves every exploit rejection path:
    1. Unauthorized strategy read -> Access Denied.
    2. Operator withdrawal of depositor position -> Anchor constraint error (`has_one = owner`).
    3. Trade size > 20% NAV -> Custom error `ExceedsMaxPositionCap`.
    4. Destination mint != approved target mint -> Custom error `UnapprovedMint`.
    5. Trade while halted -> Custom error `VaultIsHalted`.
    6. -6% price drop -> Triggers `DailyDrawdownHalted` and sets `is_halted = true`.
    7. Emergency depositor exit while halted -> Succeeded with 100% funds returned.
- **Alternatives Considered**:
  - *Testing exclusively on Solana Devnet*: Rejected because Devnet block times and rate limits slow down test loops and introduce non-deterministic network failures.
