# Phase 1 Data Model & Account Structures: Blind Vault Tier 1 Core Arena

**Feature**: [001-tier1-core-arena](file:///home/mohammed_soliman/hackathons/dev3pack/blind-vault/specs/001-tier1-core-arena/spec.md)  
**Date**: 2026-11-20  
**Status**: Completed  

---

## On-Chain Program Accounts (Solana Anchor 1.0)

### 1. `VaultState` (Solana L1 Permanent PDA)
- **Seeds**: `[b"vault", vault_id.to_le_bytes()]`
- **Owner**: `blind_vault` Program ID
- **Description**: Master state account managing vault parameters, risk limits, liquidity custody pointers, and circuit breaker status.
- **Fields**:
  | Field | Type | Size (bytes) | Description |
  |-------|------|--------------|-------------|
  | `discriminator` | `[u8; 8]` | 8 | Anchor account discriminator |
  | `vault_id` | `u64` | 8 | Unique numerical vault identifier |
  | `strategist` | `Pubkey` | 32 | Authority permitted to trigger strategy evaluations and bounded trades |
  | `quote_mint` | `Pubkey` | 32 | SPL mint for vault accounting and deposits (Custom Demo-USDC) |
  | `approved_target_mint` | `Pubkey` | 32 | Only approved token mint permitted for swaps |
  | `quote_vault` | `Pubkey` | 32 | SPL token account holding vault quote liquidity |
  | `target_vault` | `Pubkey` | 32 | SPL token account holding target token inventory |
  | `total_shares` | `u64` | 8 | Total minted depositor share units |
  | `max_position_bps` | `u16` | 2 | Maximum allowable single trade size in basis points (2000 = 20%) |
  | `daily_loss_limit_bps` | `u16` | 2 | Rolling 24h loss ceiling in basis points before tripping circuit breaker (500 = 5%) |
  | `window_start_ts` | `i64` | 8 | Unix timestamp of the current rolling 24-hour evaluation window |
  | `window_high_water_nav` | `u64` | 8 | Peak NAV observed during the current 24-hour window |
  | `is_halted` | `bool` | 1 | Circuit breaker state: `true` blocks all further trading |
  | `trade_nonce` | `u64` | 8 | Monotonically increasing execution nonce preventing trade replay |
  | `bump` | `u8` | 1 | PDA seed bump |
- **Total Space**: `8 + 8 + 32 + 32 + 32 + 32 + 32 + 8 + 2 + 2 + 8 + 8 + 1 + 8 + 1 = 214 bytes`.

---

### 2. `DepositorPosition` (Solana L1 Permanent PDA)
- **Seeds**: `[b"depositor", vault.key().as_ref(), owner.key().as_ref()]`
- **Owner**: `blind_vault` Program ID
- **Description**: Sovereign custody account representing a specific user's share ownership within the vault.
- **Fields**:
  | Field | Type | Size (bytes) | Description |
  |-------|------|--------------|-------------|
  | `discriminator` | `[u8; 8]` | 8 | Anchor account discriminator |
  | `vault` | `Pubkey` | 32 | Parent vault address |
  | `owner` | `Pubkey` | 32 | Depositor wallet address (enforced via `has_one = owner`) |
  | `shares` | `u64` | 8 | Share balance owned by this depositor |
  | `deposited_at` | `i64` | 8 | Unix timestamp of first/most recent deposit |
  | `bump` | `u8` | 1 | PDA seed bump |
- **Total Space**: `8 + 32 + 32 + 8 + 8 + 1 = 89 bytes`.

---

### 3. `DemoSwapPool` (Solana L1 Permanent PDA)
- **Seeds**: `[b"demo_pool", quote_mint.as_ref(), base_mint.as_ref()]`
- **Owner**: `blind_vault` Program ID
- **Description**: Constant-product ($x \cdot y = k$) AMM pool deployed on Devnet providing deterministic swap execution and simulated market movement.
- **Fields**:
  | Field | Type | Size (bytes) | Description |
  |-------|------|--------------|-------------|
  | `discriminator` | `[u8; 8]` | 8 | Anchor account discriminator |
  | `quote_mint` | `Pubkey` | 32 | Demo-USDC mint |
  | `base_mint` | `Pubkey` | 32 | Approved Target Token mint |
  | `pool_quote_vault` | `Pubkey` | 32 | Pool SPL token reserve for quote mint |
  | `pool_base_vault` | `Pubkey` | 32 | Pool SPL token reserve for base mint |
  | `fee_bps` | `u16` | 2 | Trading fee in basis points (e.g., 30 = 0.3%) |
  | `bump` | `u8` | 1 | PDA seed bump |
- **Total Space**: `8 + 32 + 32 + 32 + 32 + 2 + 1 = 139 bytes`.

---

### 4. `SealedStrategy` (Delegated to MagicBlock Intel TDX PER)
- **Seeds**: `[b"strategy", vault.key().as_ref()]`
- **Owner**: `blind_vault` Program ID (delegated to MagicBlock Delegation Program: `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh`)
- **Access Control**: Governed by MagicBlock Permission Program (`ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1`). Read permissions restricted strictly to `[strategist]`.
- **Description**: Private enclave account storing proprietary strategy thresholds, signal history, and pending order commits.
- **Fields**:
  | Field | Type | Size (bytes) | Description |
  |-------|------|--------------|-------------|
  | `discriminator` | `[u8; 8]` | 8 | Anchor account discriminator |
  | `vault` | `Pubkey` | 32 | Parent vault address |
  | `buy_trigger_score` | `u8` | 1 | Catalyst score threshold above which buy orders trigger (e.g., 75) |
  | `sell_trigger_score` | `u8` | 1 | Catalyst score threshold below which sell orders trigger (e.g., 30) |
  | `target_allocation_bps` | `u16` | 2 | Desired allocation percentage in basis points (capped by L1 max_position_bps) |
  | `last_signal_hash` | `[u8; 32]` | 32 | SHA-256 hash of the most recently evaluated news catalyst |
  | `pending_order_side` | `u8` | 1 | 0 = None, 1 = Buy, 2 = Sell |
  | `pending_order_amount` | `u64` | 8 | Amount committed by the enclave to be executed on L1 |
  | `pending_nonce` | `u64` | 8 | Nonce matching L1 trade_nonce + 1 |
  | `is_private` | `bool` | 1 | Flag indicating active TDX ACL sealing |
  | `bump` | `u8` | 1 | PDA seed bump |
- **Total Space**: `8 + 32 + 1 + 1 + 2 + 32 + 1 + 8 + 8 + 1 + 1 = 95 bytes`.

---

## Off-Chain Database Schemas (Supabase Postgres)

### Table: `scraped_signals`
Stores scraped news content and catalyst evaluation scores to prevent redundant credit usage.
```sql
CREATE TABLE scraped_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  url_hash TEXT NOT NULL UNIQUE, -- SHA-256 of normalized URL
  title TEXT,
  extracted_markdown TEXT NOT NULL,
  catalyst_score SMALLINT NOT NULL CHECK (catalyst_score >= 0 AND catalyst_score <= 100),
  signal_hash CHAR(64) NOT NULL, -- SHA-256 of score + article content
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes')
);

CREATE INDEX idx_scraped_signals_hash ON scraped_signals(url_hash);
CREATE INDEX idx_scraped_signals_expires ON scraped_signals(expires_at);
```

### Table: `arena_events`
Stores live transaction telemetry and broadcast events streamed to spectator terminals.
```sql
CREATE TABLE arena_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL, -- 'ATTACK_PEEK', 'ATTACK_WITHDRAW', 'ATTACK_OVERSIZED', 'ATTACK_DRAWDOWN', 'TRADE_EXECUTED', 'DEPOSIT', 'EMERGENCY_EXIT'
  status VARCHAR(20) NOT NULL, -- 'SUCCESS', 'BLOCKED'
  actor_pubkey VARCHAR(44) NOT NULL,
  vault_pubkey VARCHAR(44) NOT NULL,
  tx_signature VARCHAR(88), -- null if blocked by enclave ACL before tx emit
  error_code VARCHAR(50), -- e.g., 'ConstraintHasOne', 'ExceedsMaxPositionCap', 'AclAccessDenied'
  error_message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_arena_events_vault ON arena_events(vault_pubkey, created_at DESC);
-- Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE arena_events;
```

---

## State Transition Invariants

```
                [INITIALIZE_VAULT]
                        |
                        v
                 +--------------+
                 |    Active    |
                 +--------------+
                   |          ^
  [execute_bounded_trade]     |  (Daily window roll / manual unhalt)
  [deposit / withdraw]        |
                   |          |
                   v          |
     [Drawdown >= 5% or Attack 4]
                   |
                   v
                 +--------------+
                 |    Halted    |  <-- [execute_bounded_trade BLOCKED]
                 +--------------+  <-- [Emergency Depositor Exit ALWAYS PERMITTED]
```

1. **Trade Rejection Invariant**: When `is_halted == true`, `execute_bounded_trade` MUST fail immediately with `CustomError::VaultIsHalted`.
2. **Permanent Exit Invariant**: `withdraw` MUST succeed whenever `depositor_position.shares > 0` and `signer == depositor_position.owner`, regardless of `is_halted`.
3. **Position Cap Invariant**: In `execute_bounded_trade`, `trade_amount <= (vault_nav * max_position_bps) / 10_000` is enforced on-chain.
4. **Token Allowlist Invariant**: Target token MUST equal `vault_state.approved_target_mint`.
