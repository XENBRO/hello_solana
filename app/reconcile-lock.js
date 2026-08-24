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

  const payer = Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        fs.readFileSync(
          "/home/rolly/.config/solana/id.json",
          "utf8"
        )
      )
    )
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
      [Buffer.from("lock"), owner.toBuffer()],
      program.programId
    );

  const [vault] =
    PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

  const before =
    await program.account.lockPosition.fetch(lockPosition);

  const vaultBefore =
    await connection.getTokenAccountBalance(vault);

  console.log(
    "Lock amount BEFORE:",
    before.amount.toString()
  );

  console.log(
    "Vault balance BEFORE:",
    vaultBefore.value.uiAmountString
  );

  const tx = await program.methods
    .reconcileLock()
    .accounts({
      lockPosition,
      vault,
      owner,
    })
    .rpc();

  console.log("Transaction:", tx);

  const after =
    await program.account.lockPosition.fetch(lockPosition);

  console.log(
    "Lock amount AFTER:",
    after.amount.toString()
  );

  console.log("SUCCESS: stale lock accounting reconciled.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
