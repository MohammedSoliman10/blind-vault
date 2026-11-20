# On-Chain Program Contract: `blind_vault`

**Program ID**: To be generated during build / deployment (e.g., `BLiNDvAuLt1111111111111111111111111111111111`)  
**Framework**: Anchor 1.0 (v1.2.2 / v1.1.2) + `ephemeral-rollups-sdk = "0.17.3"`  

---

## 8 Program Instructions

### 1. `initialize_vault`
- **Context**: Executed on Solana L1.
- **Accounts**:
  - `vault` (mut, init, seeds: `[b"vault", vault_id.to_le_bytes()]`, payer: `strategist`)
  - `quote_mint` (SPL mint)
  - `approved_target_mint` (SPL mint)
  - `quote_vault` (init, seeds: `[b"quote_vault", vault.key()]`, token::mint = quote_mint, token::authority = vault)
  - `target_vault` (init, seeds: `[b"target_vault", vault.key()]`, token::mint = approved_target_mint, token::authority = vault)
  - `strategist` (mut, signer)
  - `system_program`, `token_program`, `rent`
- **Args**:
  - `vault_id: u64`
  - `max_position_bps: u16` (2000 = 20%)
  - `daily_loss_limit_bps: u16` (500 = 5%)

### 2. `delegate_strategy`
- **Context**: Solana L1 -> Intel TDX PER.
- **Attributes**: `#[delegate]` macro from `ephemeral-rollups-sdk`.
- **Accounts**:
  - `vault` (ref)
  - `strategy` (mut, seeds: `[b"strategy", vault.key()]`)
  - `strategist` (signer)
  - Untyped delegation accounts (MagicBlock Delegation Program `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh`)

### 3. `init_and_seal_strategy`
- **Context**: Executed inside MagicBlock Intel TDX PER (`https://devnet-tee.magicblock.app`).
- **Function**: Calls `CreateEphemeralPermissionCpi` and `UpdateEphemeralPermissionCpi` to lock reading rights exclusively to `[strategist]`.
- **Accounts**:
  - `strategy` (mut)
  - `strategist` (signer)
  - MagicBlock Permission Program (`ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1`)
- **Args**:
  - `buy_trigger_score: u8` (e.g., 75)
  - `sell_trigger_score: u8` (e.g., 30)
  - `target_allocation_bps: u16` (e.g., 1500)

### 4. `evaluate_signal_private`
- **Context**: Executed inside Intel TDX PER (0 gas SOL).
- **Attributes**: `#[commit]` macro to commit pending order and signal hash back to L1.
- **Function**: Takes external catalyst score (0–100) and SHA-256 hash. If score >= buy_trigger_score, sets `pending_order_side = 1 (Buy)` and calculates order amount; if score <= sell_trigger_score, sets `pending_order_side = 2 (Sell)`. Emits state commit to base layer.
- **Accounts**:
  - `strategy` (mut)
  - `strategist` (signer)
- **Args**:
  - `catalyst_score: u8`
  - `signal_hash: [u8; 32]`

### 5. `deposit`
- **Context**: Executed on Solana L1.
- **Accounts**:
  - `vault` (mut)
  - `depositor_position` (mut, init_if_needed, seeds: `[b"depositor", vault.key(), depositor.key()]`, payer: `depositor`)
  - `depositor_token_account` (mut)
  - `quote_vault` (mut)
  - `depositor` (signer)
  - `token_program`, `system_program`
- **Args**:
  - `amount: u64`
- **Logic**: Transfers quote tokens to `quote_vault`. Mints pro-rata shares: `new_shares = amount` (if total_shares == 0) or `(amount * total_shares) / current_nav`.

### 6. `execute_bounded_trade`
- **Context**: Solana L1 Risk Firewall.
- **Accounts**:
  - `vault` (mut)
  - `strategy` (ref, committed from PER)
  - `quote_vault` (mut)
  - `target_vault` (mut)
  - `demo_pool` (mut)
  - `pool_quote_vault` (mut)
  - `pool_base_vault` (mut)
  - `strategist` (signer)
  - `token_program`
- **Validation Checks**:
  1. `require!(!vault.is_halted, CustomError::VaultIsHalted);`
  2. `require_keys_eq!(demo_pool.base_mint, vault.approved_target_mint, CustomError::UnapprovedMint);`
  3. `require!(strategy.pending_order_amount <= (vault_nav * vault.max_position_bps as u64) / 10_000, CustomError::ExceedsMaxPositionCap);`
  4. Nonce check: `require_eq!(strategy.pending_nonce, vault.trade_nonce + 1, CustomError::InvalidTradeNonce);`
  5. 24h Drawdown check: Compute current NAV. If current NAV <= window_high_water_nav * (10_000 - daily_loss_limit_bps) / 10_000:
     - Set `vault.is_halted = true`
     - Revert with `CustomError::DailyDrawdownHalted`

### 7. `withdraw`
- **Context**: Solana L1 permanent escape hatch.
- **Accounts**:
  - `vault` (mut)
  - `depositor_position` (mut, has_one = owner @ CustomError::UnauthorizedDepositor)
  - `quote_vault` (mut)
  - `depositor_token_account` (mut)
  - `owner` (signer)
  - `token_program`
- **Args**:
  - `shares_to_burn: u64`
- **Invariant**: Bypasses `is_halted` completely. Always executes if `shares_to_burn <= depositor_position.shares`. No operator withdraw instruction exists.

### 8. `undelegate_strategy`
- **Context**: PER -> Solana L1.
- **Function**: Executes `commit_and_undelegate_accounts` returning full control to L1.
- **Accounts**:
  - `vault` (ref)
  - `strategy` (mut)
  - `strategist` (signer)

---

## Custom Error Codes

| Code | Name | Message |
|------|------|---------|
| `6001` | `VaultIsHalted` | "Vault is halted due to a risk circuit breaker." |
| `6002` | `ExceedsMaxPositionCap` | "Trade size exceeds the 20% single-trade position cap." |
| `6003` | `UnapprovedMint` | "Destination token mint is not on the vault allowlist." |
| `6004` | `DailyDrawdownHalted` | "Rolling 24-hour loss exceeded 5%. Circuit breaker activated; vault is halted." |
| `6005` | `InvalidTradeNonce` | "Execution nonce does not match sequential counter." |
| `6006` | `UnauthorizedDepositor` | "Signer is not the owner of this depositor position." |
| `6007` | `InsufficientShares` | "Withdrawal requested more shares than owned." |
| `6008` | `AclAccessDenied` | "Hardware Intel TDX Access Denied: Unauthorized strategy inspection." |
