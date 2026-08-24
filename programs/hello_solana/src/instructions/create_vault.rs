use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state::LockPosition;

#[derive(Accounts)]
pub struct CreateVault<'info> {
    #[account(
        seeds = [b"lock", owner.key().as_ref()],
        bump = lock_position.bump,
        has_one = owner,
    )]
    pub lock_position: Account<'info, LockPosition>,

    #[account(
        init,
        payer = owner,
        seeds = [b"vault", owner.key().as_ref()],
        bump,
        token::mint = drc_mint,
        token::authority = lock_position,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub drc_mint: Account<'info, Mint>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_create_vault(
    _ctx: Context<CreateVault>,
) -> Result<()> {
    msg!("DRC vault created");
    Ok(())
}
