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

  const TOKEN_PROGRAM_ID = new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
  );

  const fakeTokenAccount = new PublicKey(
    "9aFPkcyArAjyfxYzgWPpzANi8WgV6Zfr66vHJVnqAzC8"
  );

  const [lockPosition] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("lock"),
        owner.toBuffer(),
      ],
      program.programId
    );

  const [vault] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        owner.toBuffer(),
      ],
      program.programId
    );

  console.log("Owner:", owner.toBase58());
  console.log("Lock:", lockPosition.toBase58());
  console.log("Vault:", vault.toBase58());
  console.log(
    "Fake token account:",
    fakeTokenAccount.toBase58()
  );

  const amount = new anchor.BN("1000000000");

  try {
    await program.methods
      .deposit(amount)
      .accounts({
        lockPosition,
        vault,
        ownerTokenAccount: fakeTokenAccount,
        owner,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.error(
      "FAIL: Fake DRC deposit was accepted!"
    );

    process.exit(1);
  } catch (err) {
    console.log(
      "PASS: Fake DRC deposit was rejected."
    );

    console.log(
      "Program response:",
      err.message
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
