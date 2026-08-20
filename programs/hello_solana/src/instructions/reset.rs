use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::Counter};

#[derive(Accounts)]
pub struct Reset<'info> {
    #[account(mut)]
    pub counter: Account<'info, Counter>,

    pub authority: Signer<'info>,
}

pub fn handle_reset(ctx: Context<Reset>) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.counter.authority,
        ctx.accounts.authority.key(),
        ErrorCode::Unauthorized,
    );

    ctx.accounts.counter.count = 0;

    msg!("Counter reset to 0");

    Ok(())
}
