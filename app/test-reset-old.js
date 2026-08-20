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

  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter")],
    programId
  );

  console.log("Old wallet:", payer.publicKey.toBase58());

  console.log("Attempting reset with OLD authority...");

  const sig = await program.methods
    .reset()
    .accounts({
      counter: counterPda,
      authority: payer.publicKey,
    })
    .rpc();

  console.log("Unexpected success:", sig);
}

main().catch((err) => {
  console.error("\nEXPECTED FAILURE:");
  console.error(err);
});
