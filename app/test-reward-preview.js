const fs = require("fs");
const anchor = require("@anchor-lang/core");
const {
  Connection,
  Keypair,
} = require("@solana/web3.js");

const DAY = 86_400;
const ONE_DRC = 1_000_000_000;

async function main() {
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const secret = JSON.parse(
    fs.readFileSync(
      "/home/rolly/.config/solana/id.json",
      "utf8"
    )
  );

  const payer = Keypair.fromSecretKey(
    Uint8Array.from(secret)
  );

  const idl = JSON.parse(
    fs.readFileSync(
      "target/idl/hello_solana.json",
      "utf8"
    )
  );

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(payer),
    { commitment: "confirmed" }
  );

  anchor.setProvider(provider);

  const program = new anchor.Program(idl, provider);

  const cases = [
    ["30 days", 30 * DAY, 750_000_000],
    ["90 days", 90 * DAY, 2_812_500_000],
    ["180 days", 180 * DAY, 6_750_000_000],
    ["365 days", 365 * DAY, 18_250_000_000],
  ];

  console.log("\n🩸 ON-CHAIN BLOOD REWARD PREVIEW\n");

  for (const [name, duration, expected] of cases) {
    console.log(`Testing ${name}...`);

    const sim = await program.methods
      .previewBloodReward(
        new anchor.BN(100 * ONE_DRC),
        new anchor.BN(duration)
      )
      .simulate();

    const rewardLog = sim.raw.find((line) =>
      line.includes("BLOOD_PREVIEW_REWARD_RAW:")
    );

    if (!rewardLog) {
      throw new Error(
        `Missing reward log for ${name}`
      );
    }

    const match = rewardLog.match(
      /BLOOD_PREVIEW_REWARD_RAW:\s*(\d+)/
    );

    if (!match) {
      throw new Error(
        `Could not parse reward for ${name}`
      );
    }

    const actual = Number(match[1]);

    console.log("Expected raw:", expected);
    console.log("Actual raw:  ", actual);

    if (actual !== expected) {
      throw new Error(
        `${name} reward mismatch`
      );
    }

    console.log(`PASS: ${name}\n`);
  }

  console.log("======================================");
  console.log("🩸 ON-CHAIN REWARD ECONOMICS: PASS");
  console.log("======================================");
}

main().catch((err) => {
  console.error("\n❌ REWARD PREVIEW TEST FAILED\n");
  console.error(err);
  process.exit(1);
});
