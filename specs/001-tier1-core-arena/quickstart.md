# Phase 1 Quickstart & Validation Guide: Blind Vault Tier 1 Core Arena

**Feature**: [001-tier1-core-arena](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/spec.md)  
**Date**: 2026-11-20  
**Status**: Ready for Implementation  

---

## Prerequisites & Environment Setup

Verify toolchains and environment variables before building or testing:

### 1. Required Toolchains
- Rust: `rustc >= 1.89` (System verified: `1.99.0`)
- Solana CLI: `solana-cli >= 3.1.x` (System verified: `3.1.10`)
- Anchor CLI: `anchor-cli >= 1.0.x` (System verified: `1.1.2`)
- Node.js: `node >= 20.x` (System verified: `v24.20.0`)
- Package manager: `npm` or `pnpm` (use `npm` or run `npm i -g pnpm`)

### 2. Required Environment Variables (`.env.local`)
```bash
# Solana Devnet RPC
NEXT_PUBLIC_SOLANA_RPC_URL="https://devnet.helius-rpc.com/?api-key=YOUR_FREE_HELIUS_KEY"

# MagicBlock PER Endpoints (Free Devnet)
NEXT_PUBLIC_MAGICBLOCK_TEE_RPC="https://devnet-tee.magicblock.app"
NEXT_PUBLIC_MAGICBLOCK_ROUTER="https://devnet-router.magicblock.app"

# Devnet Sponsor Keypair (Fee-Payer Relayer)
DEVNET_SPONSOR_KEYPAIR="[12,45,67,...]"

# Free APIs (Zero-Card Policy)
FIRECRAWL_API_KEY="fc_YOUR_FREE_KEY"
GEMINI_API_KEY="AIzaSy_YOUR_FREE_GOOGLE_AI_STUDIO_KEY"
GROQ_API_KEY="gsk_YOUR_FREE_BACKUP_KEY"

# Supabase Free Tier
NEXT_PUBLIC_SUPABASE_URL="https://xyzcompany.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
CRON_SECRET="blindvault_cron_keepalive_secret"
```

---

## Local In-Process Verification (LiteSVM)

Run the automated exploit rejection test suite before deploying to Devnet:

```bash
# Run the complete LiteSVM test gauntlet
npm test
# OR
cargo test-sbf
```

### Expected LiteSVM Test Results:
1. `test_initialize_vault`: PASS — Creates L1 `VaultState`, initializes token vaults and sets risk caps.
2. `test_delegate_and_seal_strategy`: PASS — Verifies PER delegation and Intel TDX ACL sealing.
3. `test_attack_1_unauthorized_strategy_peek`: PASS — Asserts read access is rejected for non-strategist pubkeys.
4. `test_deposit_and_shares`: PASS — Mints pro-rata shares for deposit amount.
5. `test_attack_2_operator_withdraw_rejection`: PASS — Asserts transaction reverts with `UnauthorizedDepositor` (`has_one = owner`).
6. `test_attack_3_oversized_swap_rejection`: PASS — Asserts trade > 20% NAV reverts with `ExceedsMaxPositionCap`.
7. `test_attack_3_unapproved_mint_rejection`: PASS — Asserts unapproved token swap reverts with `UnapprovedMint`.
8. `test_attack_4_drawdown_circuit_breaker`: PASS — Simulates -6% price shock, asserts `DailyDrawdownHalted`, and sets `is_halted = true`.
9. `test_trade_blocked_when_halted`: PASS — Asserts trades fail when `is_halted == true`.
10. `test_emergency_exit_during_halt`: PASS — Asserts depositor can withdraw 100% of remaining funds while vault is halted.

---

## Solana Devnet Deployment

When local LiteSVM tests pass 100%:

```bash
# 1. Build the Anchor program with pinned ephemeral-rollups-sdk 0.17.3
anchor build

# 2. Deploy to Solana Devnet
anchor program deploy --provider.cluster devnet target/deploy/blind_vault.so

# 3. Generate TypeScript SDK using Codama
npm run codama:generate
```

---

## End-to-End Core Moment Verification Walkthrough (<30s)

1. **Boot Guest Session**: Launch the web app at `http://localhost:3000`.
   - *Verification*: Guest pill displays in header with `1,000 Demo USDC` balance and `Sponsored` gas status in `<10s`.
2. **Inspect X-Ray**:
   - *Verification*: Left panel shows `Private Enclave (Intel TDX Sealed)`. Right panel displays `20% Max Trade Cap`, `5% Daily Loss Ceiling`, and `Status: Active`.
3. **Execute Attack 1 (Peek Strategy)**: Click the red "Peek Secret Strategy" button.
   - *Verification*: Enclave returns authenticated hardware `Access Denied`. Proof tape logs the blocked attempt.
4. **Execute Attack 2 (Operator Steal)**: Click "Operator Attempts Depositor Withdrawal".
   - *Verification*: Transaction reverts on Solana Devnet with `UnauthorizedDepositor`. Solana Explorer link opens showing program error.
5. **Execute Attack 3 (Oversized Swap)**: Click "Swap 90% Into Unapproved Token".
   - *Verification*: Transaction reverts on Devnet with `ExceedsMaxPositionCap` and `UnapprovedMint`.
6. **Execute Attack 4 (Crash Market -6%)**: Click "Crash Market -6% to Trip Loss Breaker".
   - *Verification*: Vault flips to `Halted`. Proof tape logs `DailyDrawdownHalted`.
7. **Emergency Exit**: Click "Emergency Depositor Exit".
   - *Verification*: 100% of remaining demo capital is returned to the guest wallet in `<10s`.
