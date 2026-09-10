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

  const phantomOwner = payer.publicKey;
  

  const [lockPosition] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("lock"),
      phantomOwner.toBuffer(),
    ],
    program.programId
  );

  console.log("Lock owner:", phantomOwner.toBase58());
  console.log("Lock PDA:", lockPosition.toBase58());

  // 30-day X1 mainnet lock
  const lockDurationSeconds = new anchor.BN(2592000);

  const tx = await program.methods
    .createLock(lockDurationSeconds)
    .accounts({
      lockPosition,
      owner: payer.publicKey,
    })
    .rpc();

  console.log("Transaction:", tx);

  const lock = await program.account.lockPosition.fetch(
    lockPosition
  );

  console.log("Stored owner:", lock.owner.toBase58());
  console.log("Amount:", lock.amount.toString());
  console.log("Lock start:", lock.lockStart.toString());
  console.log("Unlock time:", lock.unlockTime.toString());
  console.log("Blood earned:", lock.bloodEarned.toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
