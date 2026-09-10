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
    {}
  );

  const program = new anchor.Program(idl, provider);

  const [lockPosition] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("lock"),
        payer.publicKey.toBuffer(),
      ],
      program.programId
    );

  const lock =
    await program.account.lockPosition.fetch(lockPosition);

  console.log(
    "BLOOD earned raw:",
    lock.bloodEarned.toString()
  );
}

main().catch(console.error);
