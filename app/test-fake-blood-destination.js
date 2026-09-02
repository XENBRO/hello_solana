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

  const owner = payer.publicKey;

  const BLOOD_MINT = new PublicKey(
    "7VTckSLG46j9A294aiJHKWW5QXxrKaxQj1zwe96J69SF"
  );

  const FAKE_TOKEN_ACCOUNT = new PublicKey(
    "9aFPkcyArAjyfxYzgWPpzANi8WgV6Zfr66vHJVnqAzC8"
  );

  const TOKEN_PROGRAM_ID = new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
  );

  const [lockPosition] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("lock"),
        owner.toBuffer(),
      ],
      program.programId
    );

  const [bloodMintAuthority] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("blood_mint_authority"),
      ],
      program.programId
    );

  console.log("Owner:", owner.toBase58());
  console.log("Lock:", lockPosition.toBase58());
  console.log("BLOOD mint:", BLOOD_MINT.toBase58());
  console.log(
    "Fake destination:",
    FAKE_TOKEN_ACCOUNT.toBase58()
  );

  try {
    await program.methods
      .claimBlood()
      .accounts({
        lockPosition,
        bloodMint: BLOOD_MINT,
        bloodMintAuthority,
        ownerBloodAccount: FAKE_TOKEN_ACCOUNT,
        owner,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.error(
      "FAIL: Fake BLOOD destination was accepted!"
    );

    process.exit(1);
  } catch (err) {
    const account =
      err.error?.origin;

    const code =
      err.error?.errorCode?.code;

    console.log(
      "PASS: Fake BLOOD destination was rejected."
    );

    console.log(
      "Error Code:",
      code || "unknown"
    );

    console.log(
      "Origin:",
      account || "unknown"
    );

    console.log(
      "Program response:",
      err.message
    );

    // Important: NoBloodToClaim would mean
    // the destination constraint did NOT prove itself.
    if (code === "NoBloodToClaim") {
      console.error(
        "TEST INCONCLUSIVE: Reached reward check instead of destination constraint."
      );

      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
