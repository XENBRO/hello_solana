import { Buffer } from "buffer";

window.Buffer = Buffer;

import * as anchor from "@anchor-lang/core";

import {
  Connection,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

const RPC_URL = "https://rpc.mainnet.x1.xyz";

const PROGRAM_ID = new PublicKey(
  "BvCp3TifDEunawh1frrYsPPkT2jCAoKU9bMFQY2GLH8g"
);

const DRC_MINT = new PublicKey(
  "GPPQhRmYzt1op59JAtNvsh1VdaueF8iXR5wjXH8xvTFG"
);


const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);
const connection = new Connection(RPC_URL, "confirmed");

const connectButton = document.getElementById("connectWallet");
const walletAddressEl = document.getElementById("walletAddress");
const drcBalanceEl = document.getElementById("drcBalance");
const lockStatusEl = document.getElementById("lockStatus");
const statusLog = document.getElementById("statusLog");
const lockButton = document.getElementById("lockButton");
const lockTier = document.getElementById("lockTier");

const depositAmountEl = document.getElementById("depositAmount");

let walletProvider = null;
let walletPublicKey = null;
let lockPositionPda = null;
let vaultPda = null;
let program = null;

function setStatus(message) {
  statusLog.textContent = message;
}

function shortenAddress(address) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatTokenAmount(rawAmount, decimals) {
  const raw = rawAmount
    .toString()
    .padStart(decimals + 1, "0");

  const whole = raw.slice(0, -decimals);
  let fraction = raw.slice(-decimals);

  fraction = fraction.replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole;
}

function detectWallet() {
  if (window.x1?.isX1Wallet) {
    return window.x1;
  }

  return null;
}



function deriveLockPosition(owner) {
  const [lockPosition] =
    PublicKey.findProgramAddressSync(
      [
        new TextEncoder().encode("lock"),
        owner.toBytes(),
      ],
      PROGRAM_ID
    );

  return lockPosition;
}

function deriveVault(owner) {
  const [vault] =
    PublicKey.findProgramAddressSync(
      [
        new TextEncoder().encode("vault"),
        owner.toBytes(),
      ],
      PROGRAM_ID
    );

  return vault;
}



async function loadProgram() {
  const response = await fetch(
    "/idl/hello_solana.json"
  );

  if (!response.ok) {
    throw new Error("Unable to load program IDL.");
  }

  const idl = await response.json();

  const browserWallet = {
    publicKey: walletPublicKey,

    signTransaction: async (transaction) => {
      return walletProvider.signTransaction(transaction);
    },

    signAllTransactions: async (transactions) => {
      return walletProvider.signAllTransactions(
        transactions
      );
    },
  };

  const provider = new anchor.AnchorProvider(
    connection,
    browserWallet,
    {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    }
  );

  program = new anchor.Program(idl, provider);
}

async function loadDrcBalance() {
  drcBalanceEl.textContent = "Loading...";

  const accounts =
    await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      {
        mint: DRC_MINT,
      }
    );

  let totalRaw = 0n;

  for (const account of accounts.value) {
    const tokenAmount =
      account.account.data.parsed.info.tokenAmount;

    totalRaw += BigInt(tokenAmount.amount);
  }

  const formatted = formatTokenAmount(totalRaw, 9);

  drcBalanceEl.textContent = `${formatted} DRC`;

  return formatted;
}

async function loadLockPosition() {
  lockPositionPda =
    deriveLockPosition(walletPublicKey);

  vaultPda =
    deriveVault(walletPublicKey);

  const lockInfo =
    await connection.getAccountInfo(
      lockPositionPda
    );

  const vaultInfo =
    await connection.getAccountInfo(
      vaultPda
    );

  if (!lockInfo) {
    lockStatusEl.textContent = "No position yet";
    lockButton.textContent = "Create Lock";
    lockButton.disabled = false;

    return {
      lockExists: false,
      vaultExists: false,
      lockAddress: lockPositionPda.toBase58(),
      vaultAddress: vaultPda.toBase58(),
    };
  }

  if (!vaultInfo) {
    lockStatusEl.textContent = "Lock created";
    lockButton.textContent = "Create DRC Vault";
    lockButton.disabled = false;

    return {
      lockExists: true,
      vaultExists: false,
      lockAddress: lockPositionPda.toBase58(),
      vaultAddress: vaultPda.toBase58(),
    };
  }

  lockStatusEl.textContent = "Ready to deposit";
  lockButton.textContent = "Deposit DRC";
  lockButton.disabled = false;

  return {
    lockExists: true,
    vaultExists: true,
    lockAddress: lockPositionPda.toBase58(),
    vaultAddress: vaultPda.toBase58(),
  };
}

async function connectWallet() {
  try {
    walletProvider = detectWallet();

    if (!walletProvider) {
      setStatus(
        "No compatible browser wallet detected."
      );
      return;
    }

    setStatus("Waiting for wallet approval...");

    const response =
      await walletProvider.connect();

    walletPublicKey = new PublicKey(
      response.publicKey.toString()
    );

    walletAddressEl.textContent =
      walletPublicKey.toString();

    connectButton.textContent =
      shortenAddress(
        walletPublicKey.toString()
      );

    await loadProgram();

    const drcBalance =
      await loadDrcBalance();

    const lock =
      await loadLockPosition();

    setStatus(
      `Wallet connected.\n` +
      `${walletPublicKey.toString()}\n\n` +
      `DRC balance: ${drcBalance} DRC\n` +
      `Lock PDA: ${lock.address}\n` +
      `Lock position: ${
        lock.lockExists
          ? "EXISTS"
          : "NOT CREATED"
      }\n\n` +
      `X1 mainnet connected.`
    );
  } catch (error) {
    console.error(error);

    setStatus(
      `Connection error.\n${
        error?.message || error
      }`
    );
  }
}

async function createVault() {
  try {
    if (
      !walletPublicKey ||
      !program ||
      !lockPositionPda ||
      !vaultPda
    ) {
      throw new Error("Connect your wallet first.");
    }

    const lockInfo =
      await connection.getAccountInfo(
        lockPositionPda
      );

    if (!lockInfo) {
      throw new Error(
        "Create the lock position first."
      );
    }

    const existingVault =
      await connection.getAccountInfo(
        vaultPda
      );

    if (existingVault) {
      throw new Error(
        "DRC vault already exists."
      );
    }

    lockButton.disabled = false;

    setStatus(
      "Creating Token-2022 DRC vault...\n\n" +
      "Approve the transaction in X1 Wallet."
    );

    const tx = await program.methods
      .createVault()
      .accounts({
        lockPosition: lockPositionPda,
        vault: vaultPda,
        drcMint: DRC_MINT,
        owner: walletPublicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    setStatus(
      `DRC vault created successfully.\n\n` +
      `Transaction:\n${tx}\n\n` +
      `Vault PDA:\n${vaultPda.toBase58()}`
    );

    await loadLockPosition();
  } catch (error) {
    console.error(error);

    lockButton.disabled = false;

    setStatus(
      `Create vault failed.\n${
        error?.message || error
      }`
    );
  }
}

async function depositDrc() {
  try {
    if (
      !walletPublicKey ||
      !program ||
      !lockPositionPda ||
      !vaultPda
    ) {
      throw new Error("Connect your wallet first.");
    }

    const amountText = depositAmountEl.value.trim();

    if (!/^\d+(\.\d{1,9})?$/.test(amountText)) {
      throw new Error(
        "Enter a valid DRC amount with up to 9 decimals."
      );
    }

    const [whole, fraction = ""] = amountText.split(".");
    const paddedFraction = fraction.padEnd(9, "0");

    const amountRaw =
      BigInt(whole) * 1_000_000_000n +
      BigInt(paddedFraction || "0");

    if (amountRaw <= 0n) {
      throw new Error("DRC amount must be greater than zero.");
    }

    const tokenAccounts =
      await connection.getTokenAccountsByOwner(
        walletPublicKey,
        { mint: DRC_MINT }
      );

    if (tokenAccounts.value.length === 0) {
      throw new Error(
        "No DRC token account found for this wallet."
      );
    }

    const ownerTokenAccount =
      tokenAccounts.value[0].pubkey;

    lockButton.disabled = true;

    setStatus(
      `Depositing ${amountText} DRC...\n\n` +
      `Approve the transaction in X1 Wallet.`
    );

    const tx = await program.methods
      .deposit(new anchor.BN(amountRaw.toString()))
      .accounts({
        lockPosition: lockPositionPda,
        vault: vaultPda,
        ownerTokenAccount,
        drcMint: DRC_MINT,
        owner: walletPublicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();

    setStatus(
      `DRC deposited successfully.\n\n` +
      `Amount: ${amountText} DRC\n\n` +
      `Transaction:\n${tx}\n\n` +
      `Vault PDA:\n${vaultPda.toBase58()}`
    );

    await loadDrcBalance();
    await loadLockPosition();
  } catch (error) {
    console.error(error);

    lockButton.disabled = false;

    setStatus(
      `Deposit failed.\n${error?.message || error}`
    );
  }
}


async function createLock() {
  try {
    if (
      !walletProvider ||
      !walletPublicKey ||
      !program
    ) {
      throw new Error(
        "Connect your wallet first."
      );
    }

    const existing =
      await connection.getAccountInfo(
        lockPositionPda
      );

    if (existing) {
      throw new Error(
        "This wallet already has a lock position."
      );
    }

    const durationSeconds =
      Number(lockTier.value);

    const allowedTiers = [
      2592000,
      7776000,
      15552000,
      31536000,
    ];

    if (
      !allowedTiers.includes(
        durationSeconds
      )
    ) {
      throw new Error(
        "Invalid lock duration."
      );
    }

    lockButton.disabled = true;

    setStatus(
      `Creating ${
        durationSeconds / 86400
      }-day lock...\n\n` +
      `Approve the transaction in your wallet.`
    );

    const tx = await program.methods
      .createLock(
        new anchor.BN(durationSeconds)
      )
      .accounts({
        lockPosition: lockPositionPda,
        owner: walletPublicKey,
      })
      .rpc();

    setStatus(
      `Lock created successfully.\n\n` +
      `Transaction:\n${tx}\n\n` +
      `Lock PDA:\n${lockPositionPda.toBase58()}`
    );

    await loadLockPosition();
  } catch (error) {
    console.error(error);

    lockButton.disabled = false;

    setStatus(
      `Create lock failed.\n${
        error?.message || error
      }`
    );
  }
}

connectButton.addEventListener(
  "click",
  connectWallet
);


lockButton.addEventListener(
  "click",
  async () => {
    const lockInfo =
      await connection.getAccountInfo(
        lockPositionPda
      );

    if (!lockInfo) {
      await createLock();
      return;
    }

    const vaultInfo =
      await connection.getAccountInfo(
        vaultPda
      );

    if (!vaultInfo) {
      await createVault();
      return;
    }

    await depositDrc();
  }
);

setStatus("Ready. Connect your wallet.");
