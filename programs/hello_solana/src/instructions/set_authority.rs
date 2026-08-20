use anchor_lang::prelude::*;

use crate::{constants::COUNTER_SEED, error::ErrorCode, state::Counter};

#[derive(Accounts)]
pub struct SetAuthority<'info> {
    #[account(mut, seeds = [COUNTER_SEED], bump)]
    pub counter: Account<'info, Counter>,

    pub authority: Signer<'info>,
}

pub fn handle_set_authority(
    ctx: Context<SetAuthority>,
    new_authority: Pubkey,
) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.counter.authority,
        ctx.accounts.authority.key(),
        ErrorCode::Unauthorized,
    );

    ctx.accounts.counter.authority = new_authority;

    msg!("Counter authority updated");

    Ok(())
}
