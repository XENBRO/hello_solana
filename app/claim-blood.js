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

  const bloodMint = new PublicKey(
    "WYQdHQWeLvXSr1L8d65BdnomKM68tKxSgLM6ifAFo94"
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
      [Buffer.from("blood_mint_authority")],
      program.programId
    );

  const tokenAccounts =
    await connection.getTokenAccountsByOwner(
      owner,
      { mint: bloodMint }
    );

  if (tokenAccounts.value.length === 0) {
    throw new Error("No BLOOD token account found");
  }

  const ownerBloodAccount =
    tokenAccounts.value[0].pubkey;

  const before =
    await program.account.lockPosition.fetch(
      lockPosition
    );

  console.log(
    "Claimable BLOOD raw:",
    before.bloodEarned.toString()
  );

  console.log(
    "BLOOD account:",
    ownerBloodAccount.toBase58()
  );

  console.log(
    "Mint authority PDA:",
    bloodMintAuthority.toBase58()
  );

  const tx = await program.methods
    .claimBlood()
    .accounts({
      lockPosition,
      bloodMint,
      bloodMintAuthority,
      ownerBloodAccount,
      owner,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("Transaction:", tx);

  const balance =
    await connection.getTokenAccountBalance(
      ownerBloodAccount
    );

  const after =
    await program.account.lockPosition.fetch(
      lockPosition
    );

  console.log(
    "BLOOD wallet balance:",
    balance.value.uiAmountString
  );

  console.log(
    "Remaining claimable raw:",
    after.bloodEarned.toString()
  );

  console.log("SUCCESS: BLOOD claimed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
