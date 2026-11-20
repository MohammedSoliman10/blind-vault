use anchor_lang::prelude::*;

declare_id!("BLiNDvAuLt1111111111111111111111111111111111");

#[program]
pub mod blind_vault {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
