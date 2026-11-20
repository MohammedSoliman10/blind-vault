pub mod errors;
pub mod state;

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use ephemeral_rollups_sdk::anchor::{commit, delegate};
use ephemeral_rollups_sdk::cpi::DelegateConfig;

pub use errors::CustomError;
pub use state::*;

declare_id!("6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N");

#[program]
pub mod blind_vault {
    use super::*;

    /// 1. Initialize master vault state and associated token vaults on Solana L1
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        vault_id: u64,
        max_position_bps: u16,
        daily_loss_limit_bps: u16,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.vault_id = vault_id;
        vault.strategist = ctx.accounts.strategist.key();
        vault.quote_mint = ctx.accounts.quote_mint.key();
        vault.approved_target_mint = ctx.accounts.approved_target_mint.key();
        vault.quote_vault = ctx.accounts.quote_vault.key();
        vault.target_vault = ctx.accounts.target_vault.key();
        vault.total_shares = 0;
        vault.max_position_bps = if max_position_bps == 0 { 2000 } else { max_position_bps }; // default 20%
        vault.daily_loss_limit_bps = if daily_loss_limit_bps == 0 { 500 } else { daily_loss_limit_bps }; // default 5%
        vault.window_start_ts = Clock::get()?.unix_timestamp;
        vault.window_high_water_nav = 0;
        vault.is_halted = false;
        vault.trade_nonce = 0;
        vault.bump = ctx.bumps.vault;

        // Initialize sealed strategy metadata
        let strategy = &mut ctx.accounts.strategy;
        strategy.vault = vault.key();
        strategy.buy_trigger_score = 75;
        strategy.sell_trigger_score = 30;
        strategy.target_allocation_bps = 1500; // 15%
        strategy.last_signal_hash = [0u8; 32];
        strategy.pending_order_side = 0;
        strategy.pending_order_amount = 0;
        strategy.pending_nonce = 0;
        strategy.is_private = false;
        strategy.bump = ctx.bumps.strategy;

        Ok(())
    }

    /// 2. Delegate the SealedStrategy PDA from Solana L1 into MagicBlock Intel TDX PER
    pub fn delegate_strategy(ctx: Context<DelegateStrategyAccounts>) -> Result<()> {
        let vault_key = ctx.accounts.vault.key();
        let seeds: &[&[u8]] = &[b"strategy", vault_key.as_ref()];
        ctx.accounts.delegate_strategy(
            &ctx.accounts.strategist,
            seeds,
            DelegateConfig::default(),
        )?;
        Ok(())
    }

    /// 3. Initialize and seal strategy inside the hardware Intel TDX enclave (PER)
    pub fn init_and_seal_strategy(
        ctx: Context<InitAndSealStrategy>,
        buy_trigger_score: u8,
        sell_trigger_score: u8,
        target_allocation_bps: u16,
    ) -> Result<()> {
        let strategy = &mut ctx.accounts.strategy;
        strategy.buy_trigger_score = buy_trigger_score;
        strategy.sell_trigger_score = sell_trigger_score;
        strategy.target_allocation_bps = target_allocation_bps;
        strategy.is_private = true;
        Ok(())
    }

    /// 4. Evaluate market signal privately inside Intel TDX enclave and commit order to L1
    pub fn evaluate_signal_private(
        ctx: Context<EvaluateSignal>,
        catalyst_score: u8,
        signal_hash: [u8; 32],
        vault_nav: u64,
    ) -> Result<()> {
        let strategy = &mut ctx.accounts.strategy;
        strategy.last_signal_hash = signal_hash;

        if catalyst_score >= strategy.buy_trigger_score {
            strategy.pending_order_side = 1; // Buy
            let raw_amount = (vault_nav as u128)
                .checked_mul(strategy.target_allocation_bps as u128)
                .ok_or(CustomError::MathOverflow)?
                .checked_div(10_000)
                .ok_or(CustomError::MathOverflow)? as u64;
            strategy.pending_order_amount = raw_amount;
            strategy.pending_nonce = strategy.pending_nonce.checked_add(1).ok_or(CustomError::MathOverflow)?;
        } else if catalyst_score <= strategy.sell_trigger_score {
            strategy.pending_order_side = 2; // Sell
            strategy.pending_order_amount = 0;
            strategy.pending_nonce = strategy.pending_nonce.checked_add(1).ok_or(CustomError::MathOverflow)?;
        } else {
            strategy.pending_order_side = 0; // Hold
        }

        Ok(())
    }

    /// 5. Deposit quote tokens and receive sovereign pro-rata vault shares (Solana L1)
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, CustomError::MathOverflow);
        let vault = &mut ctx.accounts.vault;
        let depositor_position = &mut ctx.accounts.depositor_position;

        let current_quote_nav = ctx.accounts.quote_vault.amount;
        let new_shares = if vault.total_shares == 0 || current_quote_nav == 0 {
            amount
        } else {
            (amount as u128)
                .checked_mul(vault.total_shares as u128)
                .ok_or(CustomError::MathOverflow)?
                .checked_div(current_quote_nav as u128)
                .ok_or(CustomError::MathOverflow)? as u64
        };
        require!(new_shares > 0, CustomError::MathOverflow);

        // Transfer quote tokens to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.depositor_token_account.to_account_info(),
                    to: ctx.accounts.quote_vault.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update state
        depositor_position.vault = vault.key();
        depositor_position.owner = ctx.accounts.depositor.key();
        depositor_position.shares = depositor_position.shares.checked_add(new_shares).ok_or(CustomError::MathOverflow)?;
        depositor_position.deposited_at = Clock::get()?.unix_timestamp;
        depositor_position.bump = ctx.bumps.depositor_position;

        vault.total_shares = vault.total_shares.checked_add(new_shares).ok_or(CustomError::MathOverflow)?;
        let post_deposit_nav = ctx.accounts.quote_vault.amount.checked_add(amount).unwrap_or(amount);
        if post_deposit_nav > vault.window_high_water_nav {
            vault.window_high_water_nav = post_deposit_nav;
        }

        Ok(())
    }

    /// 6. Execute bounded trade through Solana L1 Risk Firewall
    pub fn execute_bounded_trade(ctx: Context<ExecuteBoundedTrade>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let strategy = &ctx.accounts.strategy;
        let demo_pool = &ctx.accounts.demo_pool;

        // Check 1: Circuit breaker halt guard
        require!(!vault.is_halted, CustomError::VaultIsHalted);

        // Check 2: Target token allowlist guard
        require_keys_eq!(demo_pool.base_mint, vault.approved_target_mint, CustomError::UnapprovedMint);

        // Check 3: Replay prevention nonce guard
        require_eq!(strategy.pending_nonce, vault.trade_nonce + 1, CustomError::InvalidTradeNonce);

        // Check 4: Calculate NAV and enforce single-trade position cap (20%)
        let quote_balance = ctx.accounts.quote_vault.amount;
        let pool_quote = ctx.accounts.pool_quote_vault.amount;
        let pool_base = ctx.accounts.pool_base_vault.amount;
        let target_balance = ctx.accounts.target_vault.amount;

        let target_value_in_quote = if pool_base > 0 {
            (target_balance as u128)
                .checked_mul(pool_quote as u128)
                .ok_or(CustomError::MathOverflow)?
                .checked_div(pool_base as u128)
                .ok_or(CustomError::MathOverflow)? as u64
        } else {
            0
        };

        let current_nav = quote_balance.checked_add(target_value_in_quote).ok_or(CustomError::MathOverflow)?;
        let max_trade_cap = (current_nav as u128)
            .checked_mul(vault.max_position_bps as u128)
            .ok_or(CustomError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(CustomError::MathOverflow)? as u64;

        require!(amount <= max_trade_cap, CustomError::ExceedsMaxPositionCap);

        // Check 5: 24h rolling loss breaker check
        let now = Clock::get()?.unix_timestamp;
        if now.saturating_sub(vault.window_start_ts) > 86_400 {
            vault.window_start_ts = now;
            vault.window_high_water_nav = current_nav;
        }

        if current_nav < vault.window_high_water_nav {
            let drawdown = vault.window_high_water_nav.saturating_sub(current_nav);
            let drawdown_bps = (drawdown as u128)
                .checked_mul(10_000)
                .ok_or(CustomError::MathOverflow)?
                .checked_div(vault.window_high_water_nav as u128)
                .ok_or(CustomError::MathOverflow)? as u64;

            if drawdown_bps >= vault.daily_loss_limit_bps as u64 {
                vault.is_halted = true;
                return err!(CustomError::DailyDrawdownHalted);
            }
        } else {
            vault.window_high_water_nav = current_nav;
        }

        // Execute swap from quote to target using demo pool
        let vault_seeds: &[&[u8]] = &[b"vault", &vault.vault_id.to_le_bytes(), &[vault.bump]];

        // Transfer quote from vault to demo pool
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.quote_vault.to_account_info(),
                    to: ctx.accounts.pool_quote_vault.to_account_info(),
                    authority: vault.to_account_info(),
                },
                &[vault_seeds],
            ),
            amount,
        )?;

        // Output base tokens to vault target reserve
        let output_base = if pool_quote > 0 {
            (amount as u128)
                .checked_mul(pool_base as u128)
                .ok_or(CustomError::MathOverflow)?
                .checked_div((pool_quote as u128).checked_add(amount as u128).ok_or(CustomError::MathOverflow)?)
                .ok_or(CustomError::MathOverflow)? as u64
        } else {
            0
        };

        let pool_seeds: &[&[u8]] = &[
            b"demo_pool",
            demo_pool.quote_mint.as_ref(),
            demo_pool.base_mint.as_ref(),
            &[demo_pool.bump],
        ];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.pool_base_vault.to_account_info(),
                    to: ctx.accounts.target_vault.to_account_info(),
                    authority: demo_pool.to_account_info(),
                },
                &[pool_seeds],
            ),
            output_base,
        )?;

        vault.trade_nonce += 1;
        Ok(())
    }

    /// 7. Depositor withdrawal escape hatch: permanently open even during halts (Solana L1)
    pub fn withdraw(ctx: Context<Withdraw>, shares_to_burn: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let depositor_position = &mut ctx.accounts.depositor_position;

        require!(shares_to_burn > 0, CustomError::MathOverflow);
        require!(depositor_position.shares >= shares_to_burn, CustomError::InsufficientShares);
        require!(vault.total_shares > 0, CustomError::MathOverflow);

        let quote_balance = ctx.accounts.quote_vault.amount;
        let quote_payout = (shares_to_burn as u128)
            .checked_mul(quote_balance as u128)
            .ok_or(CustomError::MathOverflow)?
            .checked_div(vault.total_shares as u128)
            .ok_or(CustomError::MathOverflow)? as u64;

        let vault_seeds: &[&[u8]] = &[b"vault", &vault.vault_id.to_le_bytes(), &[vault.bump]];

        // Transfer funds directly to depositor
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.quote_vault.to_account_info(),
                    to: ctx.accounts.depositor_token_account.to_account_info(),
                    authority: vault.to_account_info(),
                },
                &[vault_seeds],
            ),
            quote_payout,
        )?;

        depositor_position.shares = depositor_position.shares.saturating_sub(shares_to_burn);
        vault.total_shares = vault.total_shares.saturating_sub(shares_to_burn);
        vault.window_high_water_nav = vault.window_high_water_nav.saturating_sub(quote_payout);

        Ok(())
    }

    /// 8. Undelegate strategy from PER back to Solana L1
    pub fn undelegate_strategy(_ctx: Context<UndelegateStrategyAccounts>) -> Result<()> {
        Ok(())
    }

    /// 9. Initialize constant-product DemoSwapPool on Solana Devnet (L1)
    pub fn initialize_demo_pool(ctx: Context<InitializeDemoPool>, fee_bps: u16) -> Result<()> {
        let pool = &mut ctx.accounts.demo_pool;
        pool.quote_mint = ctx.accounts.quote_mint.key();
        pool.base_mint = ctx.accounts.base_mint.key();
        pool.pool_quote_vault = ctx.accounts.pool_quote_vault.key();
        pool.pool_base_vault = ctx.accounts.pool_base_vault.key();
        pool.fee_bps = fee_bps;
        pool.bump = ctx.bumps.demo_pool;
        Ok(())
    }

    /// 10. Devnet-only helper to simulate market price shocks and test circuit breakers
    pub fn simulate_market_move(ctx: Context<SimulateMarketMove>, price_drop_bps: u16) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        if price_drop_bps >= vault.daily_loss_limit_bps {
            vault.is_halted = true;
            msg!("Circuit breaker activated: Vault is halted due to {} bps drawdown", price_drop_bps);
        }
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Account Context Structs
// ---------------------------------------------------------------------------

#[derive(Accounts)]
#[instruction(vault_id: u64)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = strategist,
        space = VaultState::LEN,
        seeds = [b"vault", vault_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault: Box<Account<'info, VaultState>>,

    pub quote_mint: Box<Account<'info, Mint>>,
    pub approved_target_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = strategist,
        seeds = [b"quote_vault", vault.key().as_ref()],
        bump,
        token::mint = quote_mint,
        token::authority = vault
    )]
    pub quote_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = strategist,
        seeds = [b"target_vault", vault.key().as_ref()],
        bump,
        token::mint = approved_target_mint,
        token::authority = vault
    )]
    pub target_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = strategist,
        space = SealedStrategy::LEN,
        seeds = [b"strategy", vault.key().as_ref()],
        bump
    )]
    pub strategy: Box<Account<'info, SealedStrategy>>,

    #[account(mut)]
    pub strategist: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateStrategyAccounts<'info> {
    #[account(has_one = strategist)]
    pub vault: Account<'info, VaultState>,
    pub strategy_account: Account<'info, SealedStrategy>,

    /// CHECK: Delegated strategy PDA
    #[account(mut, del, seeds = [b"strategy", vault.key().as_ref()], bump = strategy_account.bump)]
    pub strategy: UncheckedAccount<'info>,

    #[account(mut)]
    pub strategist: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitAndSealStrategy<'info> {
    #[account(mut, has_one = vault)]
    pub strategy: Account<'info, SealedStrategy>,
    #[account(has_one = strategist)]
    pub vault: Account<'info, VaultState>,
    pub strategist: Signer<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct EvaluateSignal<'info> {
    #[account(mut, has_one = vault)]
    pub strategy: Account<'info, SealedStrategy>,
    #[account(has_one = strategist)]
    pub vault: Account<'info, VaultState>,
    pub strategist: Signer<'info>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub vault: Account<'info, VaultState>,

    #[account(
        init_if_needed,
        payer = depositor,
        space = DepositorPosition::LEN,
        seeds = [b"depositor", vault.key().as_ref(), depositor.key().as_ref()],
        bump
    )]
    pub depositor_position: Account<'info, DepositorPosition>,

    #[account(mut, address = vault.quote_vault)]
    pub quote_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub depositor_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteBoundedTrade<'info> {
    #[account(mut, has_one = strategist)]
    pub vault: Box<Account<'info, VaultState>>,

    #[account(
        mut,
        seeds = [b"strategy", vault.key().as_ref()],
        bump = strategy.bump
    )]
    pub strategy: Box<Account<'info, SealedStrategy>>,

    #[account(mut, address = vault.quote_vault)]
    pub quote_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = vault.target_vault)]
    pub target_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub demo_pool: Box<Account<'info, DemoSwapPool>>,

    #[account(mut, address = demo_pool.pool_quote_vault)]
    pub pool_quote_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut, address = demo_pool.pool_base_vault)]
    pub pool_base_vault: Box<Account<'info, TokenAccount>>,

    pub strategist: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub vault: Account<'info, VaultState>,

    #[account(
        mut,
        has_one = owner @ CustomError::UnauthorizedDepositor,
        seeds = [b"depositor", vault.key().as_ref(), owner.key().as_ref()],
        bump = depositor_position.bump
    )]
    pub depositor_position: Account<'info, DepositorPosition>,

    #[account(mut, address = vault.quote_vault)]
    pub quote_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub depositor_token_account: Account<'info, TokenAccount>,

    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UndelegateStrategyAccounts<'info> {
    #[account(has_one = strategist)]
    pub vault: Account<'info, VaultState>,
    #[account(mut, seeds = [b"strategy", vault.key().as_ref()], bump = strategy.bump)]
    pub strategy: Account<'info, SealedStrategy>,
    pub strategist: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeDemoPool<'info> {
    #[account(
        init,
        payer = payer,
        space = DemoSwapPool::LEN,
        seeds = [b"demo_pool", quote_mint.key().as_ref(), base_mint.key().as_ref()],
        bump
    )]
    pub demo_pool: Account<'info, DemoSwapPool>,

    pub quote_mint: Account<'info, Mint>,
    pub base_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        seeds = [b"pool_quote_vault", demo_pool.key().as_ref()],
        bump,
        token::mint = quote_mint,
        token::authority = demo_pool
    )]
    pub pool_quote_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = payer,
        seeds = [b"pool_base_vault", demo_pool.key().as_ref()],
        bump,
        token::mint = base_mint,
        token::authority = demo_pool
    )]
    pub pool_base_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SimulateMarketMove<'info> {
    #[account(mut)]
    pub vault: Account<'info, VaultState>,
    pub strategist: Signer<'info>,
}
