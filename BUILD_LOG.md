# Blind Vault - Build Log

## Pre-Hackathon Scaffolding (Nov 20–23, 2026)
- Initialized repository architecture, constitution, and task specifications.
- Verified toolchain compatibility: Anchor 1.1.2, Solana CLI 3.1.10, Node 24.
- Established Anchor workspace and Next.js 15 scaffolding.
- Implemented Anchor 1.0 core program (`programs/blind_vault`) with 4 PDAs and 8 instructions.
- Verified 8/8 LiteSVM on-chain exploit proof tests (`tests/blind_vault.spec.ts`).
- Deployed `blind_vault` to Solana Devnet:
  - Program ID: [`6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N`](https://explorer.solana.com/address/6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N?cluster=devnet)
  - Deploy Tx: [`5Mhb61xyMrXtccnDTKy7VVbFq3UPTTRgyGYAf1AVEAqNuDqfKL8NBNbM1njqfhSHEqqgLW25emCNET17jRHF1cYy`](https://explorer.solana.com/tx/5Mhb61xyMrXtccnDTKy7VVbFq3UPTTRgyGYAf1AVEAqNuDqfKL8NBNbM1njqfhSHEqqgLW25emCNET17jRHF1cYy?cluster=devnet)
- Verified live Intel TDX PER attestation and ACL gating on MagicBlock TEE (`https://devnet-tee.magicblock.app`, Validator `MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo`):
  - Hardware quote attestation verified (`verifyTeeRpcIntegrity`).
  - Account read access strictly gated via enclave hardware ACL (authorized with JWT authToken, denied/withheld without token or with outsider token).
- Generated typed `@solana/kit` TypeScript client in `lib/solana/generated/index.ts` via Codama (`scripts/generate-client.ts`).

## Official Weekend Commits (Nov 24, 2026)

### 1. Real Devnet On-Chain Transactions & Live Relayer Architecture
- Replaced mock client simulations in `lib/solana/arena-actions.ts` with authentic Solana transactions using `@coral-xyz/anchor` and `@solana/web3.js`.
- Implemented real transaction generation and gasless relayer execution for:
  - **Deposit:** Creates user ATA, transfers demo-USDC into `quote_vault` PDA, and mints vault share tokens.
  - **Withdraw:** Redeems vault shares and returns proportional USDC based on current Net Asset Value (NAV).
  - **Bounded AI Trade (`execute_bounded_trade`):** Operator executes trades constrained strictly by L1 risk parameters (position cap, max slippage).
  - **Emergency Exit (`withdraw`):** Closes depositor position immediately, bypassing operator approval.
- Built sponsored demo faucet and transaction pipeline (`/api/sponsor-tx`, `lib/server/solana.ts`) ensuring seamless guest onboarding with zero wallet-funder barriers.

### 2. Live On-Chain Hydration & Real-Time Portfolio State
- Removed all hardcoded PnL/balance bumps in `app/page.tsx` and `components/OverviewView.tsx`.
- Integrated real-time on-chain hydration for `VaultState`, `DepositorPosition`, `quoteVault`, and `targetVault` directly from Solana Devnet RPC.
- Implemented dynamic Net Asset Value (NAV) calculation and interactive USDC vs. Target Token allocation gauge reflecting real on-chain token distributions.

### 3. Attack Lab: Live L1 Simulation Autopsy Engine
- Upgraded the interactive Attack Lab (`components/AttackLabView.tsx`) to compile actual malicious Anchor instruction payloads and simulate them on Solana Devnet:
  - **Operator Theft Probe:** Simulates an unapproved vault drain, verifying hardware rejection (`UnauthorizedDepositor`).
  - **Oversized Swap Probe:** Simulates trade sizes exceeding the on-chain max allocation cap, capturing real validator rollback (`ExceedsMaxPositionCap`).
  - **Circuit Breaker Probe:** Simulates sudden drawdowns, proving automated trading halt on L1 (`DailyDrawdownHalted` / `VaultIsHalted`).
  - **Prompt-Injected Rogue AI Probe:** Simulates a compromised off-chain LLM attempting a 95% position flip into an unapproved mint, proving dual rejection via allowlist and position limits.
- Renders raw Solana validator simulation logs, compute units consumed, and exact Anchor error codes in real time.

### 4. Hardware-Enforced TEE Attestation & Status Verification
- Replaced mock TEE probes with live hardware queries targeting the delegated permissioned account (`AAQunvudNxbpcLUz2rbTuV3Z6Ga7PQbni3Q7n6xW275A`) and `SealedStrategy` PDA (`3JcaKPWwKaRbVYAY178bk42qfqrkKSY2aWu6Y9gwmwG2`) on MagicBlock TEE (`https://devnet-tee.magicblock.app`).
- Built `/api/tee-status` endpoint running live Intel TDX quote verification and ACL hardware gating (HTTP 401 Unauthorized proof without enclave JWT).
- Integrated live enclave status badge and hardware telemetry in `components/OverviewView.tsx`.

### 5. Cryptographic Signal Verification & Audit Telemetry
- Implemented on-chain SHA-256 signal hash verification in `components/AiTradeView.tsx` and `components/ProofLedgerView.tsx`, cryptographically matching incoming market signals against `SealedStrategy.lastSignalHash`.
- Wired market shock simulations (`handleSimulateShock`) to `dispatchMarketShock`, executing `simulate_market_move` and streaming live audit events to the Proof Ledger.
- Enhanced Proof Ledger forensics to deep-link every transaction directly to Solana Explorer Devnet (`/tx/<signature>?cluster=devnet`).
- Verified Firecrawl-powered web scraping and dual LLM scoring (`gemini-flash-lite-latest` + `qwen/qwen3.8-27b` fallback via Groq) in `app/api/signal/route.ts`.
- Pruned obsolete mock components (`XRayPanel`, `NewsTrigger`, `ProofTape`, `AttackGauntlet`, `Aurora`, `BorderBeam`, `SolanaBreakpointNode`) for production-grade bundle optimization.
