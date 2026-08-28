use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::reward_math::{
    calculate_blood_reward,
    multiplier_for_lock_duration,
    BPS_DENOMINATOR,
    SECONDS_PER_DAY,
};

#[derive(Accounts)]
pub struct PreviewBloodReward {}

pub fn handle_preview_blood_reward(
    _ctx: Context<PreviewBloodReward>,
    amount: u64,
    lock_duration_seconds: i64,
) -> Result<()> {
    let multiplier_bps =
        multiplier_for_lock_duration(lock_duration_seconds)
            .ok_or(ErrorCode::InvalidLockTier)?;

    let full_days = (lock_duration_seconds as u64)
        .checked_div(SECONDS_PER_DAY as u64)
        .ok_or(ErrorCode::RewardCalculationOverflow)?;

    let reward = calculate_blood_reward(
        amount,
        full_days,
        multiplier_bps,
    )
    .ok_or(ErrorCode::RewardCalculationOverflow)?;

    msg!("BLOOD_PREVIEW_AMOUNT_RAW: {}", amount);
    msg!("BLOOD_PREVIEW_DURATION: {}", lock_duration_seconds);
    msg!("BLOOD_PREVIEW_MULTIPLIER_BPS: {}", multiplier_bps);
    msg!("BLOOD_PREVIEW_BPS_DENOMINATOR: {}", BPS_DENOMINATOR);
    msg!("BLOOD_PREVIEW_REWARD_RAW: {}", reward);

    Ok(())
}
