const fs = require("fs");
const anchor = require("@anchor-lang/core");
const {
  Connection,
  Keypair,
  PublicKey,
} = require("@solana/web3.js");

async function main() {
  const connection = new Connection(
    "https://rpc.mainnet.x1.xyz",
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

  const wallet = new anchor.Wallet(payer);

  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
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

  // 30-day X1 mainnet lock
  const duration = new anchor.BN(2592000);

  console.log("Owner:", owner.toBase58());
  console.log("Lock PDA:", lockPosition.toBase58());

  const before =
    await program.account.lockPosition.fetch(lockPosition);

  console.log(
    "blood_earned before:",
    before.bloodEarned.toString()
  );

  const tx = await program.methods
    .relock(duration)
    .accounts({
      lockPosition,
      owner,
    })
    .rpc();

  console.log("Relock transaction:", tx);

  const after =
    await program.account.lockPosition.fetch(lockPosition);

  console.log("Lock start:", after.lockStart.toString());
  console.log("Unlock time:", after.unlockTime.toString());

  console.log("SUCCESS: lock restarted for 30 days.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
