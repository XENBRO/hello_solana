const fs = require("fs");
const anchor = require("@anchor-lang/core");

const {
  Connection,
  Keypair,
  PublicKey,
} = require("@solana/web3.js");

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

// BLOOD mint
const BLOOD_MINT = new PublicKey(
  "7VTckSLG46j9A294aiJHKWW5QXxrKaxQj1zwe96J69SF"
);

const LOCK_SECONDS = 60;

// 10 tokens with 9 decimals
const TEST_AMOUNT = new anchor.BN("10000000000");

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("\n🩸 DRC → BLOOD FULL LIFECYCLE TEST\n");

  // --------------------------------------------------
  // PROVIDER
  // --------------------------------------------------

  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const secret = JSON.parse(
    fs.readFileSync(
      "/home/rolly/.config/solana/id.json",
      "utf8"
    )
  );

  const payer = Keypair.fromSecretKey(
    Uint8Array.from(secret)
  );

  const wallet = new anchor.Wallet(payer);

  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    { commitment: "confirmed" }
  );

  anchor.setProvider(provider);

  const idl = JSON.parse(
    fs.readFileSync(
      "target/idl/hello_solana.json",
      "utf8"
    )
  );

  const program = new anchor.Program(idl, provider);

  const owner = payer.publicKey;

  console.log("Owner:", owner.toBase58());
  console.log("Program:", program.programId.toBase58());

  // --------------------------------------------------
  // PDAs
  // --------------------------------------------------

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

  const [bloodMintAuthority] =
    PublicKey.findProgramAddressSync(
      [Buffer.from("blood_mint_authority")],
      program.programId
    );

  console.log("\nLock PDA:", lockPosition.toBase58());
  console.log("Vault PDA:", vault.toBase58());
  console.log(
    "BLOOD authority:",
    bloodMintAuthority.toBase58()
  );

  // --------------------------------------------------
  // DISCOVER DRC MINT FROM VAULT
  // --------------------------------------------------

  const vaultInfo =
    await connection.getParsedAccountInfo(vault);

  if (!vaultInfo.value) {
    throw new Error("Vault account does not exist");
  }

  const vaultData = vaultInfo.value.data.parsed.info;

  const drcMint = new PublicKey(vaultData.mint);

  console.log("\nDRC mint:", drcMint.toBase58());

  // --------------------------------------------------
  // FIND OWNER DRC TOKEN ACCOUNT
  // --------------------------------------------------

  const drcAccounts =
    await connection.getTokenAccountsByOwner(
      owner,
      { mint: drcMint }
    );

  if (drcAccounts.value.length === 0) {
    throw new Error(
      "Owner DRC token account not found"
    );
  }

  const ownerTokenAccount =
    drcAccounts.value[0].pubkey;

  console.log(
    "DRC wallet account:",
    ownerTokenAccount.toBase58()
  );

  // --------------------------------------------------
  // FIND OWNER BLOOD ACCOUNT
  // --------------------------------------------------

  const bloodAccounts =
    await connection.getTokenAccountsByOwner(
      owner,
      { mint: BLOOD_MINT }
    );

  if (bloodAccounts.value.length === 0) {
    throw new Error(
      "Owner BLOOD token account not found"
    );
  }

  const ownerBloodAccount =
    bloodAccounts.value[0].pubkey;

  console.log(
    "BLOOD wallet account:",
    ownerBloodAccount.toBase58()
  );

  // --------------------------------------------------
  // STARTING BALANCES
  // --------------------------------------------------

  const drcBefore =
    await connection.getTokenAccountBalance(
      ownerTokenAccount
    );

  const bloodBefore =
    await connection.getTokenAccountBalance(
      ownerBloodAccount
    );

  console.log(
    "\nDRC before:",
    drcBefore.value.uiAmountString
  );

  console.log(
    "BLOOD before:",
    bloodBefore.value.uiAmountString
  );

  // --------------------------------------------------
  // 1. RELOCK
  // --------------------------------------------------

  console.log(
    `\n[1/6] Relocking for ${LOCK_SECONDS} seconds...`
  );

  const relockTx = await program.methods
    .relock(new anchor.BN(LOCK_SECONDS))
    .accounts({
      lockPosition,
      owner,
    })
    .rpc();

  console.log("Relock TX:", relockTx);

  // --------------------------------------------------
  // 2. DEPOSIT
  // --------------------------------------------------

  console.log("\n[2/6] Depositing 10 DRC...");

  const depositTx = await program.methods
    .deposit(TEST_AMOUNT)
    .accounts({
      lockPosition,
      vault,
      ownerTokenAccount,
      owner,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("Deposit TX:", depositTx);

  const vaultAfterDeposit =
    await connection.getTokenAccountBalance(vault);

  console.log(
    "Vault balance:",
    vaultAfterDeposit.value.uiAmountString
  );

  // --------------------------------------------------
  // 3. WAIT FOR UNLOCK
  // --------------------------------------------------

  const position =
    await program.account.lockPosition.fetch(
      lockPosition
    );

  const unlockTime =
    Number(position.unlockTime.toString());

  const now =
    Math.floor(Date.now() / 1000);

  const waitSeconds =
    Math.max(unlockTime - now + 3, 0);

  console.log(
    `\n[3/6] Waiting ${waitSeconds}s for unlock...`
  );

  if (waitSeconds > 0) {
    await sleep(waitSeconds * 1000);
  }

  // --------------------------------------------------
  // 4. WITHDRAW
  // --------------------------------------------------

  console.log("\n[4/6] Withdrawing 10 DRC...");

  const withdrawTx = await program.methods
    .withdraw(TEST_AMOUNT)
    .accounts({
      lockPosition,
      vault,
      ownerTokenAccount,
      owner,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("Withdraw TX:", withdrawTx);

  const afterWithdraw =
    await program.account.lockPosition.fetch(
      lockPosition
    );

  console.log(
    "BLOOD earned raw:",
    afterWithdraw.bloodEarned.toString()
  );

  if (afterWithdraw.bloodEarned.isZero()) {
    throw new Error(
      "TEST FAILED: withdraw produced no BLOOD"
    );
  }

  // --------------------------------------------------
  // 5. CLAIM BLOOD
  // --------------------------------------------------

  console.log("\n[5/6] Claiming BLOOD...");

  const claimTx = await program.methods
    .claimBlood()
    .accounts({
      lockPosition,
      bloodMint: BLOOD_MINT,
      bloodMintAuthority,
      ownerBloodAccount,
      owner,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("Claim TX:", claimTx);

  // --------------------------------------------------
  // 6. VERIFY EVERYTHING
  // --------------------------------------------------

  console.log("\n[6/6] Verifying state...");

  const finalPosition =
    await program.account.lockPosition.fetch(
      lockPosition
    );

  const finalVault =
    await connection.getTokenAccountBalance(vault);

  const finalDrc =
    await connection.getTokenAccountBalance(
      ownerTokenAccount
    );

  const finalBlood =
    await connection.getTokenAccountBalance(
      ownerBloodAccount
    );

  console.log(
    "\nVault:",
    finalVault.value.uiAmountString
  );

  console.log(
    "DRC:",
    finalDrc.value.uiAmountString
  );

  console.log(
    "BLOOD:",
    finalBlood.value.uiAmountString
  );

  console.log(
    "blood_earned raw:",
    finalPosition.bloodEarned.toString()
  );

  if (!finalPosition.bloodEarned.isZero()) {
    throw new Error(
      "TEST FAILED: blood_earned did not reset"
    );
  }

  if (finalVault.value.amount !== "0") {
    throw new Error(
      "TEST FAILED: vault is not empty"
    );
  }

  const bloodGain =
    BigInt(finalBlood.value.amount) -
    BigInt(bloodBefore.value.amount);

  if (bloodGain <= 0n) {
    throw new Error(
      "TEST FAILED: BLOOD balance did not increase"
    );
  }

  console.log(
    "\nBLOOD gained raw:",
    bloodGain.toString()
  );

  console.log(
    "\n======================================"
  );
  console.log("🩸 FULL PROTOCOL LIFECYCLE: PASS");
  console.log(
    "======================================\n"
  );
}

main().catch((err) => {
  console.error("\n❌ FULL-CYCLE TEST FAILED\n");
  console.error(err);
  process.exit(1);
});
