const fs = require("fs");
const anchor = require("@anchor-lang/core");
const {
  Connection,
  Keypair,
  PublicKey,
} = require("@solana/web3.js");

async function main() {
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  // Current authority wallet
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

  const programId = new PublicKey(
    "HsFWY9X4VUW5gi1eGwtcUjZ136eTNK2h49RnZKhTPXSV"
  );

  const newAuthority = new PublicKey(
    "4pPrqq1kN8hZw98BdGvB4QKU8LFwazTM9mgrpCC6Dwqp"
  );

  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter")],
    programId
  );

  console.log("Current signer:", payer.publicKey.toBase58());
  console.log("Counter PDA:", counterPda.toBase58());
  console.log("New authority:", newAuthority.toBase58());

  const before =
    await program.account.counter.fetch(counterPda);

  console.log(
    "Authority BEFORE:",
    before.authority.toBase58()
  );

  const signature = await program.methods
    .setAuthority(newAuthority)
    .accounts({
      counter: counterPda,
      authority: payer.publicKey,
    })
    .rpc();

  console.log("\nTransaction:");
  console.log(signature);

  const after =
    await program.account.counter.fetch(counterPda);

  console.log(
    "\nAuthority AFTER:",
    after.authority.toBase58()
  );

  console.log("\nSUCCESS: Counter authority transferred.");
}

main().catch((err) => {
  console.error("\nERROR:");
  console.error(err);
  process.exit(1);
});
