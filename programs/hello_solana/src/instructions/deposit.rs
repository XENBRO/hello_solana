use crate::error::ErrorCode;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::LockPosition;

#[derive(Accounts)]
pub struct Deposit<'info> {
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

pub fn handle_deposit(
    ctx: Context<Deposit>,
    amount: u64,
) -> Result<()> {
    let clock = Clock::get()?;

    require!(
        ctx.accounts.lock_position.amount == 0,
        ErrorCode::PositionAlreadyFunded
    );

    require!(
        clock.unix_timestamp < ctx.accounts.lock_position.unlock_time,
        ErrorCode::LockAlreadyExpired
    );

    require!(
        amount > 0,
        ErrorCode::InvalidAmount
    );





    let transfer_accounts = Transfer {
        from: ctx.accounts.owner_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
    ctx.accounts.token_program.key(),
    transfer_accounts,
);

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

ctx.accounts.lock_position.lock_start = clock.unix_timestamp;

ctx.accounts.lock_position.unlock_time = clock
    .unix_timestamp
    .checked_add(lock_duration)
    .ok_or(ErrorCode::RewardCalculationOverflow)?;

    token::transfer(cpi_ctx, amount)?;

    ctx.accounts.lock_position.amount = ctx
        .accounts
        .lock_position
        .amount
        .checked_add(amount)
        .ok_or(ErrorCode::AmountOverflow)?;

    msg!("Deposited {} tokens into DRC vault", amount);

    Ok(())
}


