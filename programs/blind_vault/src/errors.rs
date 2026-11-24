use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("Vault is halted due to a risk circuit breaker.")]
    VaultIsHalted,
    #[msg("Trade size exceeds the 20% single-trade position cap.")]
    ExceedsMaxPositionCap,
    #[msg("Destination token mint is not on the vault allowlist.")]
    UnapprovedMint,
    #[msg("Rolling 24-hour loss exceeded 5%. Circuit breaker activated; vault is halted.")]
    DailyDrawdownHalted,
    #[msg("Execution nonce does not match sequential counter.")]
    InvalidTradeNonce,
    #[msg("Signer is not the owner of this depositor position.")]
    UnauthorizedDepositor,
    #[msg("Withdrawal requested more shares than owned.")]
    InsufficientShares,
    #[msg("Hardware Intel TDX Access Denied: Unauthorized strategy inspection.")]
    AclAccessDenied,
    #[msg("Invalid calculation or arithmetic overflow.")]
    MathOverflow,
}
