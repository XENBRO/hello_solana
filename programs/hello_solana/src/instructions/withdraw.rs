use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::error::ErrorCode;
use crate::state::LockPosition;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"lock", owner.key().as_ref()],
        bump = lock_position.bump,
        has_one = owner,
    )]
    pub lock_position: Account<'info, LockPosition>,

    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump,
        constraint = vault.owner == lock_position.key(),
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key(),
        constraint = owner_token_account.mint == vault.mint,
    )]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handle_withdraw(
    ctx: Context<Withdraw>,
    amount: u64,
) -> Result<()> {
    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp >= ctx.accounts.lock_position.unlock_time,
        ErrorCode::LockNotExpired
    );

    require!(
        amount > 0,
        ErrorCode::InvalidAmount
    );

    require!(
        amount <= ctx.accounts.lock_position.amount,
        ErrorCode::InsufficientLockedAmount
    );

    let owner_key = ctx.accounts.owner.key();

    let bump = ctx.accounts.lock_position.bump;

    let signer_seeds: &[&[u8]] = &[
        b"lock",
        owner_key.as_ref(),
        &[bump],
    ];

    let transfer_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.owner_token_account.to_account_info(),
        authority: ctx.accounts.lock_position.to_account_info(),
    };

    let signer = [signer_seeds];

let cpi_ctx = CpiContext::new_with_signer(
    ctx.accounts.token_program.key(),
    transfer_accounts,
    &signer,
);
    

    token::transfer(cpi_ctx, amount)?;

// BLOOD reward v1:
// 1 BLOOD per 1 DRC for each full day locked.
//
// All calculations use token base units.
// Since DRC and BLOOD will both use 9 decimals,
// 1 DRC base unit rewards 1 BLOOD base unit per full day.

let lock_duration = ctx
    .accounts
    .lock_position
    .unlock_time
    .checked_sub(ctx.accounts.lock_position.lock_start)
    .ok_or(ErrorCode::RewardCalculationOverflow)?;

require!(
    lock_duration > 0,
    ErrorCode::InvalidLockDuration
);

// BLOOD reward v2:
// 1% BLOOD per DRC for each FULL day locked.

const SECONDS_PER_DAY: u64 = 60;
const BLOOD_RATE_BPS_PER_DAY: u64 = 100; // 1%
const BPS_DENOMINATOR: u64 = 10_000;

let full_days = (lock_duration as u64)
    .checked_div(SECONDS_PER_DAY)
    .ok_or(ErrorCode::RewardCalculationOverflow)?;

let blood_reward = amount
    .checked_mul(full_days)
    .and_then(|v| v.checked_mul(BLOOD_RATE_BPS_PER_DAY))
    .and_then(|v| v.checked_div(BPS_DENOMINATOR))
    .ok_or(ErrorCode::RewardCalculationOverflow)?;



ctx.accounts.lock_position.blood_earned = ctx
    .accounts
    .lock_position
    .blood_earned
    .checked_add(blood_reward)
    .ok_or(ErrorCode::RewardCalculationOverflow)?;

msg!("BLOOD earned: {}", blood_reward);

ctx.accounts.lock_position.amount = ctx
    .accounts
    .lock_position
    .amount
    .checked_sub(amount)
    .ok_or(ErrorCode::InsufficientLockedAmount)?;

msg!("Withdrew {} tokens from DRC vault", amount);

Ok(())



}
