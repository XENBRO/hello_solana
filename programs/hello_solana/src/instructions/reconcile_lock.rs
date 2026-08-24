use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::error::ErrorCode;
use crate::state::LockPosition;

#[derive(Accounts)]
pub struct ReconcileLock<'info> {
    #[account(
        mut,
        seeds = [b"lock", owner.key().as_ref()],
        bump = lock_position.bump,
        has_one = owner,
    )]
    pub lock_position: Account<'info, LockPosition>,

    #[account(
        seeds = [b"vault", owner.key().as_ref()],
        bump,
        constraint = vault.owner == lock_position.key(),
    )]
    pub vault: Account<'info, TokenAccount>,

    pub owner: Signer<'info>,
}

pub fn handle_reconcile_lock(
    ctx: Context<ReconcileLock>,
) -> Result<()> {
    require!(
        ctx.accounts.vault.amount == 0,
        ErrorCode::VaultNotEmpty
    );

    ctx.accounts.lock_position.amount = 0;

    msg!("Lock position reconciled to empty vault");

    Ok(())
}
