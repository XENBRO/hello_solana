use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::LockPosition;

#[derive(Accounts)]
pub struct Relock<'info> {
    #[account(
        mut,
        seeds = [b"lock", owner.key().as_ref()],
        bump = lock_position.bump,
        has_one = owner,
    )]
    pub lock_position: Account<'info, LockPosition>,

    pub owner: Signer<'info>,
}

pub fn handle_relock(
    ctx: Context<Relock>,
    lock_duration_seconds: i64,
) -> Result<()> {
    require!(
        ctx.accounts.lock_position.amount == 0,
        ErrorCode::PositionStillLocked
    );

    require!(
        lock_duration_seconds > 0,
        ErrorCode::InvalidLockDuration
    );

    let clock = Clock::get()?;

    ctx.accounts.lock_position.lock_start = clock.unix_timestamp;

    ctx.accounts.lock_position.unlock_time = clock
        .unix_timestamp
        .checked_add(lock_duration_seconds)
        .ok_or(ErrorCode::RewardCalculationOverflow)?;

    msg!("Lock cycle restarted");
    msg!(
        "New unlock time: {}",
        ctx.accounts.lock_position.unlock_time
    );

    Ok(())
}
