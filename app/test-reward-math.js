const DAY = 86_400n;
const RATE_BPS = 100n;
const BPS = 10_000n;

const tiers = {
  30: 10_000n,   // 1.00x
  90: 12_500n,   // 1.25x
  180: 15_000n,  // 1.50x
  365: 20_000n,  // 2.00x
};

function rewardRaw(amountRaw, days) {
  const multiplier = tiers[days];

  if (!multiplier) {
    throw new Error(`Invalid tier: ${days}`);
  }

  return (
    amountRaw *
    BigInt(days) *
    RATE_BPS *
    multiplier
  ) / BPS / BPS;
}

function tokens(n) {
  return BigInt(n) * 1_000_000_000n;
}

for (const days of [30, 90, 180, 365]) {
  const raw = rewardRaw(tokens(100), days);

  console.log(
    `${days} days:`,
    Number(raw) / 1_000_000_000,
    "BLOOD"
  );
}
