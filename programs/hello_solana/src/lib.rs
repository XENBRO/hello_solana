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

pub fn create_lock(
    ctx: Context<CreateLock>,
    lock_duration_seconds: i64,
) -> Result<()> {
    crate::instructions::create_lock::handle_create_lock(
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

}



