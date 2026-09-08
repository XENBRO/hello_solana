use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    Mint,
    TokenAccount,
    TokenInterface,
};
use crate::constants::DRC_MINT;
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
        token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(address = DRC_MINT)]
    pub drc_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handle_create_vault(
    _ctx: Context<CreateVault>,
) -> Result<()> {
    msg!("DRC vault created");
    Ok(())
}
