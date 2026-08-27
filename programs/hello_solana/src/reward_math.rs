pub const BLOOD_RATE_BPS_PER_DAY: u64 = 100;
pub const BPS_DENOMINATOR: u64 = 10_000;

pub const SECONDS_PER_DAY: i64 = 86_400;

pub const LOCK_30_DAYS: i64 = 30 * SECONDS_PER_DAY;
pub const LOCK_90_DAYS: i64 = 90 * SECONDS_PER_DAY;
pub const LOCK_180_DAYS: i64 = 180 * SECONDS_PER_DAY;
pub const LOCK_365_DAYS: i64 = 365 * SECONDS_PER_DAY;

pub fn multiplier_for_lock_duration(
    lock_duration_seconds: i64,
) -> Option<u64> {
    match lock_duration_seconds {
        LOCK_30_DAYS => Some(10_000),
        LOCK_90_DAYS => Some(12_500),
        LOCK_180_DAYS => Some(15_000),
        LOCK_365_DAYS => Some(20_000),
        _ => None,
    }
}

pub fn calculate_blood_reward(
    amount: u64,
    full_days: u64,
    multiplier_bps: u64,
) -> Option<u64> {
    let reward = (amount as u128)
        .checked_mul(full_days as u128)?
        .checked_mul(BLOOD_RATE_BPS_PER_DAY as u128)?
        .checked_mul(multiplier_bps as u128)?
        .checked_div(BPS_DENOMINATOR as u128)?
        .checked_div(BPS_DENOMINATOR as u128)?;

    u64::try_from(reward).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    const ONE_DRC: u64 = 1_000_000_000;

    #[test]
    fn reward_30_days() {
        let reward =
            calculate_blood_reward(100 * ONE_DRC, 30, 10_000).unwrap();

        assert_eq!(reward, 30 * ONE_DRC);
    }

    #[test]
    fn reward_90_days() {
        let reward =
            calculate_blood_reward(100 * ONE_DRC, 90, 12_500).unwrap();

        assert_eq!(reward, 112_500_000_000);
    }

    #[test]
    fn reward_180_days() {
        let reward =
            calculate_blood_reward(100 * ONE_DRC, 180, 15_000).unwrap();

        assert_eq!(reward, 270 * ONE_DRC);
    }

    #[test]
    fn reward_365_days() {
        let reward =
            calculate_blood_reward(100 * ONE_DRC, 365, 20_000).unwrap();

        assert_eq!(reward, 730 * ONE_DRC);
    }

    #[test]
    fn zero_amount_produces_zero_reward() {
        assert_eq!(
            calculate_blood_reward(0, 365, 20_000),
            Some(0)
        );
    }

    #[test]
    fn overflow_is_rejected() {
        assert_eq!(
            calculate_blood_reward(u64::MAX, u64::MAX, u64::MAX),
            None
        );
    }

    #[test]
    fn selects_30_day_multiplier() {
        assert_eq!(
            multiplier_for_lock_duration(LOCK_30_DAYS),
            Some(10_000)
        );
    }

    #[test]
    fn selects_90_day_multiplier() {
        assert_eq!(
            multiplier_for_lock_duration(LOCK_90_DAYS),
            Some(12_500)
        );
    }

    #[test]
    fn selects_180_day_multiplier() {
        assert_eq!(
            multiplier_for_lock_duration(LOCK_180_DAYS),
            Some(15_000)
        );
    }

    #[test]
    fn selects_365_day_multiplier() {
        assert_eq!(
            multiplier_for_lock_duration(LOCK_365_DAYS),
            Some(20_000)
        );
    }

    #[test]
    fn rejects_invalid_lock_duration() {
        assert_eq!(
            multiplier_for_lock_duration(43 * SECONDS_PER_DAY),
            None
        );
        assert_eq!(multiplier_for_lock_duration(999_999), None);
        assert_eq!(multiplier_for_lock_duration(60), None);
        assert_eq!(multiplier_for_lock_duration(0), None);
        assert_eq!(multiplier_for_lock_duration(-1), None);
    }
}
