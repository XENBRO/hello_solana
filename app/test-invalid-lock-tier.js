const fs = require("fs");
const anchor = require("@anchor-lang/core");

const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} = require("@solana/web3.js");

async function main() {
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const secretKey = Uint8Array.from(
    JSON.parse(
      fs.readFileSync(
        "/home/rolly/.config/solana/id.json",
        "utf8"
      )
    )
  );

  const payer = Keypair.fromSecretKey(secretKey);

  const idl = JSON.parse(
    fs.readFileSync(
      "target/idl/hello_solana.json",
      "utf8"
    )
  );

  // Temporary attacker/test wallet
  const testOwner = Keypair.generate();

  console.log(
    "Main wallet:",
    payer.publicKey.toBase58()
  );

  console.log(
    "Temporary test wallet:",
    testOwner.publicKey.toBase58()
  );

  // Fund temporary wallet with 0.01 SOL.
  const fundTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: testOwner.publicKey,
      lamports: Math.floor(0.01 * LAMPORTS_PER_SOL),
    })
  );

  await sendAndConfirmTransaction(
    connection,
    fundTx,
    [payer],
    { commitment: "confirmed" }
  );

  console.log("Temporary wallet funded.");

  const wallet = new anchor.Wallet(testOwner);

  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );

  anchor.setProvider(provider);

  const program = new anchor.Program(
    idl,
    provider
  );

  const [lockPosition] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("lock"),
        testOwner.publicKey.toBuffer(),
      ],
      program.programId
    );

  console.log(
    "Test Lock PDA:",
    lockPosition.toBase58()
  );

  // Intentionally invalid:
  // 60 seconds is NOT one of the production tiers.
  const invalidDuration = new anchor.BN(60);

  try {
    await program.methods
      .createLock(invalidDuration)
      .accounts({
        lockPosition,
        owner: testOwner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.error(
      "FAIL: Invalid 60-second lock tier was accepted!"
    );

    process.exitCode = 1;
  } catch (err) {
    if (
      err.error?.errorCode?.code ===
      "InvalidLockTier"
    ) {
      console.log(
        "PASS: Invalid lock tier was rejected."
      );

      console.log(
        "Error Code:",
        err.error.errorCode.code
      );

      console.log(
        "Error Message:",
        err.error.errorMessage
      );
    } else {
      console.error(
        "TEST INCONCLUSIVE: Transaction failed, but not with InvalidLockTier."
      );

      console.error(err);
      process.exitCode = 1;
    }
  }

  // Recover remaining SOL from temporary wallet.
  const balance = await connection.getBalance(
    testOwner.publicKey,
    "confirmed"
  );

  if (balance > 10000) {
    const feeReserve = 5000;

    const refundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: testOwner.publicKey,
        toPubkey: payer.publicKey,
        lamports: balance - feeReserve,
      })
    );

    await sendAndConfirmTransaction(
      connection,
      refundTx,
      [testOwner],
      { commitment: "confirmed" }
    );

    console.log(
      "Recovered remaining test SOL."
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
