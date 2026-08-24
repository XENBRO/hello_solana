use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

use crate::error::ErrorCode;
use crate::state::LockPosition;

#[derive(Accounts)]
pub struct ClaimBlood<'info> {
    #[account(
        mut,
        seeds = [b"lock", owner.key().as_ref()],
        bump = lock_position.bump,
        has_one = owner,
    )]
    pub lock_position: Account<'info, LockPosition>,

    #[account(
        mut,
        address = pubkey!("7VTckSLG46j9A294aiJHKWW5QXxrKaxQj1zwe96J69SF"),
    )]
    pub blood_mint: Account<'info, Mint>,

    /// CHECK: PDA used only as mint authority signer
    #[account(
        seeds = [b"blood_mint_authority"],
        bump,
    )]
    pub blood_mint_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = owner_blood_account.owner == owner.key(),
        constraint = owner_blood_account.mint == blood_mint.key(),
    )]
    pub owner_blood_account: Account<'info, TokenAccount>,

    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_claim_blood(
    ctx: Context<ClaimBlood>,
) -> Result<()> {
    let amount = ctx.accounts.lock_position.blood_earned;

    require!(
        amount > 0,
        ErrorCode::NoBloodToClaim
    );

    let bump = ctx.bumps.blood_mint_authority;

    let signer_seeds: &[&[u8]] = &[
        b"blood_mint_authority",
        &[bump],
    ];

    let signer = [signer_seeds];

    let mint_accounts = MintTo {
        mint: ctx.accounts.blood_mint.to_account_info(),
        to: ctx.accounts.owner_blood_account.to_account_info(),
        authority: ctx.accounts.blood_mint_authority.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        mint_accounts,
        &signer,
    );

    token::mint_to(cpi_ctx, amount)?;

    ctx.accounts.lock_position.blood_earned = 0;

    msg!("Claimed {} BLOOD base units", amount);

    Ok(())
}
