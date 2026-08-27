use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Only the counter authority can update this counter")]
    Unauthorized,
    #[msg("Counter has reached the maximum value")]
    CounterOverflow,


#[msg("Deposit amount must be greater than zero")]
InvalidAmount,

#[msg("Lock position amount overflow")]
AmountOverflow,

#[msg("Lock period has not expired")]
LockNotExpired,

#[msg("Requested withdrawal exceeds locked amount")]
InsufficientLockedAmount,

#[msg("Reward calculation overflow")]
RewardCalculationOverflow,

#[msg("Lock duration must be greater than zero")]
InvalidLockDuration,

#[msg("Cannot start a new lock while DRC is still locked")]
PositionStillLocked,

#[msg("No BLOOD rewards available to claim")]
NoBloodToClaim,

#[msg("This lock position already contains DRC")]
PositionAlreadyFunded,

#[msg("This lock cycle has already expired; relock before depositing")]
LockAlreadyExpired,

#[msg("Cannot reconcile while the DRC vault still contains tokens")]
VaultNotEmpty,

#[msg("Lock duration must be 30, 90, 180, or 365 days")]
InvalidLockTier,

}
