use anchor_lang::prelude::*;

#[account]
pub struct VaultState {
    pub vault_id: u64,
    pub strategist: Pubkey,
    pub quote_mint: Pubkey,
    pub approved_target_mint: Pubkey,
    pub quote_vault: Pubkey,
    pub target_vault: Pubkey,
    pub total_shares: u64,
    pub max_position_bps: u16,      // 2000 = 20%
    pub daily_loss_limit_bps: u16,  // 500 = 5%
    pub window_start_ts: i64,
    pub window_high_water_nav: u64,
    pub is_halted: bool,
    pub trade_nonce: u64,
    pub bump: u8,
}

impl VaultState {
    pub const LEN: usize = 8 + // discriminator
        8 +  // vault_id
        32 + // strategist
        32 + // quote_mint
        32 + // approved_target_mint
        32 + // quote_vault
        32 + // target_vault
        8 +  // total_shares
        2 +  // max_position_bps
        2 +  // daily_loss_limit_bps
        8 +  // window_start_ts
        8 +  // window_high_water_nav
        1 +  // is_halted
        8 +  // trade_nonce
        1;   // bump
}

#[account]
pub struct DepositorPosition {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub shares: u64,
    pub deposited_at: i64,
    pub bump: u8,
}

impl DepositorPosition {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1;
}

#[account]
pub struct DemoSwapPool {
    pub quote_mint: Pubkey,
    pub base_mint: Pubkey,
    pub pool_quote_vault: Pubkey,
    pub pool_base_vault: Pubkey,
    pub fee_bps: u16,
    pub bump: u8,
}

impl DemoSwapPool {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 2 + 1;
}

#[account]
pub struct SealedStrategy {
    pub vault: Pubkey,
    pub buy_trigger_score: u8,
    pub sell_trigger_score: u8,
    pub target_allocation_bps: u16,
    pub last_signal_hash: [u8; 32],
    pub pending_order_side: u8, // 0 = None, 1 = Buy, 2 = Sell
    pub pending_order_amount: u64,
    pub pending_nonce: u64,
    pub is_private: bool,
    pub bump: u8,
}

impl SealedStrategy {
    pub const LEN: usize = 8 + 32 + 1 + 1 + 2 + 32 + 1 + 8 + 8 + 1 + 1;
}
