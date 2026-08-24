const fs = require("fs");
const anchor = require("@anchor-lang/core");

const {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
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

  const drcMint = new PublicKey(
    "AZok25SLqhV9QNXiS6fUgdBtMzQZkqmQPGF46akX61iS"
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

  const [vault] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        owner.toBuffer(),
      ],
      program.programId
    );

  console.log("Owner:", owner.toBase58());
  console.log("Lock PDA:", lockPosition.toBase58());
  console.log("Vault PDA:", vault.toBase58());
  console.log("Test DRC mint:", drcMint.toBase58());

  const tx = await program.methods
    .createVault()
    .accounts({
      lockPosition,
      vault,
      drcMint,
      owner,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Transaction:", tx);

  const vaultInfo =
    await connection.getTokenAccountBalance(vault);

  console.log("Vault balance:", vaultInfo.value.uiAmountString);

  console.log("SUCCESS: DRC vault created.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
