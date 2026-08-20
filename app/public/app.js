import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "https://esm.sh/@solana/web3.js@1.98.4";

import { Buffer } from "https://esm.sh/buffer@6.0.3";

const RPC_URL = "https://api.devnet.solana.com";

const PROGRAM_ID = new PublicKey(
  "HsFWY9X4VUW5gi1eGwtcUjZ136eTNK2h49RnZKhTPXSV"
);

const connection = new Connection(RPC_URL, "confirmed");

const [counterPda] = PublicKey.findProgramAddressSync(
  [new TextEncoder().encode("counter")],
  PROGRAM_ID
);

const connectBtn = document.getElementById("connectBtn");
const incrementBtn = document.getElementById("incrementBtn");
const resetBtn = document.getElementById("resetBtn");
const countEl = document.getElementById("count");
const statusEl = document.getElementById("status");
const COUNTER_AUTHORITY =
  "4pPrqq1kN8hZw98BdGvB4QKU8LFwazTM9mgrpCC6Dwqp";
let walletPublicKey = null;

function getWallet() {
  if (window.solana && window.solana.isPhantom) {
    return window.solana;
  }

  return null;
}

async function getIncrementDiscriminator() {
  const text = new TextEncoder().encode("global:increment");
  const hash = await crypto.subtle.digest("SHA-256", text);

  return new Uint8Array(hash).slice(0, 8);
}

async function loadCounter() {
  try {
    const account = await connection.getAccountInfo(counterPda);

    if (!account) {
      countEl.textContent = "--";
      statusEl.textContent = "Counter account not found";
      return null;

if (
  walletPublicKey &&
  walletPublicKey.toBase58() === COUNTER_AUTHORITY
) {
  resetBtn.disabled = false;

} else {
  resetBtn.disabled = true;
}
    }

    // Anchor account:
    // bytes 0-7   = account discriminator
    // bytes 8-15  = u64 counter value
    const data = new Uint8Array(account.data);

    const view = new DataView(
      data.buffer,
      data.byteOffset,
      data.byteLength
    );

    const count = view.getBigUint64(8, true);

    countEl.textContent = count.toString();

    if (count >= 10n) {
      incrementBtn.disabled = true;
      statusEl.textContent = "Maximum count reached: 10";
    } else if (walletPublicKey) {
      incrementBtn.disabled = false;
    }
// Enable reset only for the original counter authority
if (
  walletPublicKey &&
  walletPublicKey.toBase58() === COUNTER_AUTHORITY
) {
  resetBtn.disabled = false;
} else {
  resetBtn.disabled = true;
}

    return count;
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Could not read counter";
    return null;
  }
}

connectBtn.addEventListener("click", async () => {
  const wallet = getWallet();

  if (!wallet) {
    statusEl.textContent =
      "Phantom wallet extension not detected";
    return;
  }

  try {
    const response = await wallet.connect();

    walletPublicKey = response.publicKey;

    connectBtn.textContent =
      walletPublicKey.toBase58().slice(0, 4) +
      "..." +
      walletPublicKey.toBase58().slice(-4);

    statusEl.textContent = "Wallet connected";

    await loadCounter();
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Wallet connection cancelled";
  }
});

incrementBtn.addEventListener("click", async () => {
  if (!walletPublicKey) {
    statusEl.textContent = "Connect wallet first";
    return;
  }

  try {
    incrementBtn.disabled = true;
    statusEl.textContent = "Preparing transaction...";

    const discriminator = await getIncrementDiscriminator();

    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,

      keys: [
        {
          pubkey: counterPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: walletPublicKey,
          isSigner: true,
          isWritable: false,
        },
      ],

      data: Buffer.from(discriminator),
    });

    const transaction = new Transaction().add(instruction);

    transaction.feePayer = walletPublicKey;

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    transaction.recentBlockhash = blockhash;

    statusEl.textContent = "Approve transaction in wallet...";

    const signedTransaction =
      await window.solana.signTransaction(transaction);

    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize()
    );

    statusEl.textContent = "Confirming transaction...";

    await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed"
    );

    statusEl.textContent = "Transaction confirmed";

    await loadCounter();
  } catch (error) {
    console.error(error);

    if (
      String(error).includes("CounterOverflow") ||
      String(error).includes("6001")
    ) {
      statusEl.textContent = "Maximum count reached";
    } else {
      statusEl.textContent =
        "Transaction failed — check browser console";
    }

    await loadCounter();
  }
});

resetBtn.addEventListener("click", async () => {

  if (!walletPublicKey) {
    statusEl.textContent = "Connect wallet first";
    return;
  }

  if (walletPublicKey.toBase58() !== COUNTER_AUTHORITY) {
    statusEl.textContent = "Only the counter authority can reset";
    return;
  }

  try {
    resetBtn.disabled = true;
    statusEl.textContent = "Preparing reset...";

    const text = new TextEncoder().encode("global:reset");
    const hash = await crypto.subtle.digest("SHA-256", text);
    const discriminator = new Uint8Array(hash).slice(0, 8);

    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: counterPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: walletPublicKey,
          isSigner: true,
          isWritable: false,
        },
      ],
      data: Buffer.from(discriminator),
    });

    const transaction = new Transaction().add(instruction);

    transaction.feePayer = walletPublicKey;

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    transaction.recentBlockhash = blockhash;

    statusEl.textContent = "Approve reset in wallet...";

    const signedTransaction =
      await window.solana.signTransaction(transaction);

    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize()
    );

    statusEl.textContent = "Confirming reset...";

    await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed"
    );

    statusEl.textContent = "Counter reset successfully";

    await loadCounter();
  } catch (error) {
    console.error(error);
    statusEl.textContent = "Reset failed"+ (error.message || error);
    await loadCounter();
  }
});

// Read the Devnet counter immediately when page loads.
loadCounter();
