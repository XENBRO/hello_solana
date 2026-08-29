use anchor_lang::prelude::*;

use crate::state::LockPosition;
use crate::error::ErrorCode;
use crate::reward_math::multiplier_for_lock_duration;

#[derive(Accounts)]
pub struct CreateLock<'info> {
    #[account(
        init,
        payer = owner,
        space = LockPosition::LEN,
        seeds = [b"lock", owner.key().as_ref()],
        bump
    )]
    pub lock_position: Account<'info, LockPosition>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_create_lock(
    ctx: Context<CreateLock>,
    lock_duration_seconds: i64,
) -> Result<()> {
    require!(
        multiplier_for_lock_duration(lock_duration_seconds).is_some(),
        ErrorCode::InvalidLockTier
    );

    let clock = Clock::get()?;

    let lock_position = &mut ctx.accounts.lock_position;

    lock_position.owner = ctx.accounts.owner.key();
    lock_position.amount = 0;
    lock_position.lock_start = clock.unix_timestamp;

    lock_position.unlock_time = clock
        .unix_timestamp
        .checked_add(lock_duration_seconds)
        .ok_or(ErrorCode::RewardCalculationOverflow)?;

    lock_position.blood_earned = 0;
    lock_position.bump = ctx.bumps.lock_position;

    msg!("Lock position created");
    msg!("Owner: {}", lock_position.owner);
    msg!("Unlock time: {}", lock_position.unlock_time);

    Ok(())
}
