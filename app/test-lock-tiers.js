const fs = require("fs");
const anchor = require("@anchor-lang/core");
const {
  Connection,
  Keypair,
  PublicKey,
} = require("@solana/web3.js");

const DAY = 86_400;

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

  const owner = payer.publicKey;

  const [lockPosition] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("lock"),
        owner.toBuffer(),
      ],
      program.programId
    );

  async function testTier(name, seconds, shouldPass) {
    console.log(`\nTesting ${name}...`);

    try {
      const tx = await program.methods
        .relock(new anchor.BN(seconds))
        .accounts({
          lockPosition,
          owner,
        })
        .rpc();

      console.log("ACCEPTED");
      console.log("TX:", tx);

      if (!shouldPass) {
        throw new Error(
          `${name} should have been rejected`
        );
      }

      console.log(`PASS: ${name} correctly accepted`);
    } catch (err) {
      if (shouldPass) {
        console.error(`FAIL: ${name} should be accepted`);
        throw err;
      }

      const code =
        err?.error?.errorCode?.code || "";

      console.log(
        "Rejected with:",
        code || err.message
      );

      if (code !== "InvalidLockTier") {
        throw new Error(
          `${name} failed for the wrong reason: ${code || err.message}`
        );
      }

      console.log(`PASS: ${name} correctly rejected`);
    }
  }

  console.log("\n🩸 PRODUCTION LOCK-TIER TEST\n");

  await testTier("60 seconds", 60, false);

  await testTier(
    "30 days",
    30 * DAY,
    true
  );

  await testTier(
    "43 days",
    43 * DAY,
    false
  );

  await testTier(
    "90 days",
    90 * DAY,
    true
  );

  await testTier(
    "180 days",
    180 * DAY,
    true
  );

  await testTier(
    "365 days",
    365 * DAY,
    true
  );

  console.log(
    "\n======================================"
  );
  console.log("🩸 LOCK-TIER ENFORCEMENT: PASS");
  console.log(
    "======================================\n"
  );
}

main().catch((err) => {
  console.error("\n❌ LOCK-TIER TEST FAILED\n");
  console.error(err);
  process.exit(1);
});
