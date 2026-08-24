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

  const tokenAccounts =
    await connection.getTokenAccountsByOwner(
      owner,
      { mint: drcMint }
    );

  if (tokenAccounts.value.length === 0) {
    throw new Error("No test DRC token account found");
  }

  const ownerTokenAccount =
    tokenAccounts.value[0].pubkey;

  console.log("Owner:", owner.toBase58());
  console.log(
    "Owner token account:",
    ownerTokenAccount.toBase58()
  );
  console.log("Vault:", vault.toBase58());

  const beforeWallet =
    await connection.getTokenAccountBalance(
      ownerTokenAccount
    );

  const beforeVault =
    await connection.getTokenAccountBalance(vault);

  console.log(
    "Wallet balance before:",
    beforeWallet.value.uiAmountString
  );

  console.log(
    "Vault balance before:",
    beforeVault.value.uiAmountString
  );

  // Mint has 9 decimals.
  // 10 test DRC = 10 * 10^9 base units.
  const amount =
    new anchor.BN("10000000000");

  const tx = await program.methods
    .deposit(amount)
    .accounts({
      lockPosition,
      vault,
      ownerTokenAccount,
      owner,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("Transaction:", tx);

  const afterWallet =
    await connection.getTokenAccountBalance(
      ownerTokenAccount
    );

  const afterVault =
    await connection.getTokenAccountBalance(vault);

  const lock =
    await program.account.lockPosition.fetch(
      lockPosition
    );

  console.log(
    "Wallet balance after:",
    afterWallet.value.uiAmountString
  );

  console.log(
    "Vault balance after:",
    afterVault.value.uiAmountString
  );

  console.log(
    "LockPosition amount raw:",
    lock.amount.toString()
  );

  console.log("SUCCESS: 10 test DRC deposited.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
