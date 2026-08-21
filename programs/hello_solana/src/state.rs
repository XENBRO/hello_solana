use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Counter {
    pub count: u64,
    pub authority: Pubkey,
}

#[account]
pub struct LockPosition {
    pub owner: Pubkey,
    pub amount: u64,
    pub lock_start: i64,
    pub unlock_time: i64,
    pub blood_earned: u64,
    pub bump: u8,
}

impl LockPosition {
    pub const LEN: usize =
        8 +  // discriminator
        32 + // owner
        8 +  // amount
        8 +  // lock_start
        8 +  // unlock_time
        8 +  // blood_earned
        1;   // bump
}
