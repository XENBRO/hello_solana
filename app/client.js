const fs = require("fs");
const anchor = require("@anchor-lang/core");
const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} = require("@solana/web3.js");

async function main() {
  // Connect to Solana Devnet
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  // Load your development wallet
  const secretKey = Uint8Array.from(
    JSON.parse(
      fs.readFileSync(
        "/home/rolly/.config/solana/id.json",
        "utf8"
      )
    )
  );

  const payer = Keypair.fromSecretKey(secretKey);

  // Load the Anchor IDL
  const idl = JSON.parse(
    fs.readFileSync("../target/idl/hello_solana.json", "utf8")
  );

  const wallet = new anchor.Wallet(payer);

  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );

  anchor.setProvider(provider);

  const program = new anchor.Program(idl, provider);

  const programId = new PublicKey(
    "HsFWY9X4VUW5gi1eGwtcUjZ136eTNK2h49RnZKhTPXSV"
  );

  // Derive the Counter PDA using COUNTER_SEED = b"counter"
  const [counterPda, bump] =
    PublicKey.findProgramAddressSync(
      [Buffer.from("counter")],
      programId
    );

  console.log("Wallet:", payer.publicKey.toBase58());
  console.log("Program:", programId.toBase58());
  console.log("Counter PDA:", counterPda.toBase58());
  console.log("PDA bump:", bump);

  // Check whether the counter has already been initialized
  let accountInfo = await connection.getAccountInfo(counterPda);

  if (!accountInfo) {
    console.log("\nCounter does not exist yet.");
    console.log("Initializing counter...");

    const signature = await program.methods
      .initialize()
      .accounts({
        payer: payer.publicKey,
        counter: counterPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize transaction:");
    console.log(signature);
  } else {
    console.log("\nCounter already initialized.");
  }

  // Read counter state
  let counterAccount =
    await program.account.counter.fetch(counterPda);

  console.log(
    "Current counter value:",
    counterAccount.count.toString()
  );

  console.log(
    "Counter authority:",
    counterAccount.authority.toBase58()
  );

  
// Prevent unnecessary transaction when max is reached
if (Number(counterAccount.count.toString()) >= 10) {
    console.log("\nCounter has reached MAX_COUNT = 10.");
    return;
}
  // Increment
  console.log("\nIncrementing counter...");

  const incrementSignature = await program.methods
    .increment()
    .accounts({
      counter: counterPda,
      authority: payer.publicKey,
    })
    .rpc();

  console.log("Increment transaction:");
  console.log(incrementSignature);

  // Fetch again from Devnet
  counterAccount =
    await program.account.counter.fetch(counterPda);

  console.log(
    "\nNew counter value:",
    counterAccount.count.toString()
  );

  console.log("\nSUCCESS: Devnet counter updated!");
}

main().catch((err) => {
  console.error("\nERROR:");
  console.error(err);
  process.exit(1);
});
