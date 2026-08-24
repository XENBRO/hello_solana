pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("HsFWY9X4VUW5gi1eGwtcUjZ136eTNK2h49RnZKhTPXSV");

#[program]
pub mod hello_solana {

pub fn withdraw(
    ctx: Context<Withdraw>,
    amount: u64,
) -> Result<()> {
    crate::instructions::withdraw::handle_withdraw(
        ctx,
        amount,
    )
}

pub fn reconcile_lock(
    ctx: Context<ReconcileLock>,
) -> Result<()> {
    crate::instructions::reconcile_lock::handle_reconcile_lock(ctx)
}



pub fn claim_blood(
    ctx: Context<ClaimBlood>,
) -> Result<()> {
    crate::instructions::claim_blood::handle_claim_blood(ctx)
}


pub fn relock(
    ctx: Context<Relock>,
    lock_duration_seconds: i64,
) -> Result<()> {
    crate::instructions::relock::handle_relock(
        ctx,
        lock_duration_seconds,
    )
}

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        crate::instructions::initialize::handle_initialize(ctx)
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        crate::instructions::increment::handle_increment(ctx)
    }

    pub fn reset(ctx: Context<Reset>) -> Result<()> {
        crate::instructions::reset::handle_reset(ctx)
    }

    pub fn set_authority(
        ctx: Context<SetAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        crate::instructions::set_authority::handle_set_authority(
            ctx,
            new_authority,
        )
    }

    pub fn deposit(
    ctx: Context<Deposit>,
    amount: u64,
) -> Result<()> {
    crate::instructions::deposit::handle_deposit(
        ctx,
        amount,
    )
}

    pub fn create_lock(
        ctx: Context<CreateLock>,
        lock_duration_seconds: i64,
    ) -> Result<()> {
        crate::instructions::create_lock::handle_create_lock(
            ctx,
            lock_duration_seconds,
        )
    }

    pub fn create_vault(
        ctx: Context<CreateVault>,
    ) -> Result<()> {
        crate::instructions::create_vault::handle_create_vault(ctx)
    }
}
