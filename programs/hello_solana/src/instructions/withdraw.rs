
use crate::reward_math::{
    calculate_blood_reward,
    multiplier_for_lock_duration,
    SECONDS_PER_DAY,
};

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::error::ErrorCode;
use crate::state::LockPosition;
use crate::constants::DRC_MINT;
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
        constraint = vault.mint == DRC_MINT,
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

// Calculate BLOOD reward using the canonical lock tier
// and shared production reward math.

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


let multiplier_bps =
    multiplier_for_lock_duration(lock_duration)
        .ok_or(ErrorCode::InvalidLockTier)?;

let full_days = (lock_duration as u64)
    .checked_div(SECONDS_PER_DAY as u64)
    .ok_or(ErrorCode::RewardCalculationOverflow)?;

let blood_reward = calculate_blood_reward(
    amount,
    full_days,
    multiplier_bps,
)
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
