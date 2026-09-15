import { Buffer } from "buffer";

window.Buffer = Buffer;

import * as anchor from "@anchor-lang/core";

import {
  Connection,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import idl from "./idl/hello_solana.json";

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

const maxButton = document.getElementById("maxButton");

const bloodBalanceEl = document.getElementById("bloodBalance");
const lockedAmountEl = document.getElementById("lockedAmount");
const unlockDateEl = document.getElementById("unlockDate");
const claimableBloodEl = document.getElementById("claimableBlood");
const withdrawButton = document.getElementById("withdrawButton");
const claimButton = document.getElementById("claimButton");

const BLOOD_MINT = new PublicKey(
  "WYQdHQWeLvXSr1L8d65BdnomKM68tKxSgLM6ifAFo94"
);

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

let walletProvider = null;
let walletPublicKey = null;
let lockPositionPda = null;
let vaultPda = null;
let program = null;

function setStatus(message) {
  statusLog.textContent = message;
}

function getFriendlyError(error) {
  const message =
    getFriendlyError(error)?.toString?.() ||
    "Unknown error.";

  const lower = message.toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("rejected the request") ||
    lower.includes("declined") ||
    lower.includes("4001")
  ) {
    return "Transaction cancelled in wallet.";
  }

  if (
    lower.includes("locknotexpired") ||
    lower.includes("lock not expired")
  ) {
    return "This DRC position is still locked. Withdraw is available after maturity.";
  }

  if (
    lower.includes("nobloodtoclaim") ||
    lower.includes("no blood is currently available")
  ) {
    return "No BLOOD is currently available to claim.";
  }

  if (
    lower.includes("insufficient funds") ||
    lower.includes("insufficient lamports")
  ) {
    return "Not enough native X1 balance to pay the network fee.";
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("fetch failed")
  ) {
    return "Unable to reach X1 Mainnet. Please try again.";
  }

  if (
    lower.includes("blockhash not found") ||
    lower.includes("transaction expired")
  ) {
    return "The transaction expired before confirmation. Please try again.";
  }

  return message;
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

  if (window.backpack?.solana) {
    return window.backpack.solana;
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
  

  const browserWallet = {
  publicKey: walletPublicKey,

  signTransaction: async (transaction) => {
    return walletProvider.signTransaction(transaction);
  },

  signAllTransactions: async (transactions) => {
    if (walletProvider.signAllTransactions) {
      return walletProvider.signAllTransactions(
        transactions
      );
    }

    return Promise.all(
      transactions.map((transaction) =>
        walletProvider.signTransaction(transaction)
      )
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

  maxButton.disabled = totalRaw === 0n;

  return formatted;

}

async function loadBloodBalance() {
  bloodBalanceEl.textContent = "Loading...";

  const accounts =
    await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      {
        mint: BLOOD_MINT,
      }
    );

  let totalRaw = 0n;

  for (const account of accounts.value) {
    const tokenAmount =
      account.account.data.parsed.info.tokenAmount;

    totalRaw += BigInt(tokenAmount.amount);
  }

  const formatted =
    formatTokenAmount(totalRaw, 9);

  bloodBalanceEl.textContent =
    `${formatted} BLOOD`;

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

  const lock =
  await program.account.lockPosition.fetch(
    lockPositionPda
  );

const amountRaw = BigInt(lock.amount.toString());
const bloodRaw = BigInt(lock.bloodEarned.toString());

const lockedDrc =
  formatTokenAmount(amountRaw, 9);

const claimableBlood =
  formatTokenAmount(bloodRaw, 9);

const unlockTimestamp =
  Number(lock.unlockTime.toString());

const unlockDate =
  new Date(unlockTimestamp * 1000);

lockedAmountEl.textContent =
  `${lockedDrc} DRC`;

unlockDateEl.textContent =
  unlockDate.toLocaleString();

claimableBloodEl.textContent =
  `${claimableBlood} BLOOD`;

if (amountRaw > 0n) {
  lockStatusEl.textContent = "Locked";
  lockButton.textContent = "Position Funded";
  lockButton.disabled = true;

  const now = Math.floor(Date.now() / 1000);

  withdrawButton.disabled =
    now < unlockTimestamp;

  claimButton.disabled =
    bloodRaw === 0n;
} else {
  lockStatusEl.textContent = "Ready to deposit";
  lockButton.textContent = "Deposit DRC";
  lockButton.disabled = false;

  withdrawButton.disabled = true;
  claimButton.disabled = true;
}

return {
  lockExists: true,
  vaultExists: true,
  funded: amountRaw > 0n,
  amountRaw,
  bloodRaw,
  unlockTimestamp,
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

const connectedPublicKey =
  response?.publicKey ??
  walletProvider.publicKey;

if (!connectedPublicKey) {
  throw new Error(
    "Wallet connected but no public key was returned."
  );
}

walletPublicKey = new PublicKey(
  connectedPublicKey.toString()
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

    const bloodBalance =
  await loadBloodBalance();
    const lock =
      await loadLockPosition();

    setStatus(
      `Wallet connected.\n` +
      `${walletPublicKey.toString()}\n\n` +
      `DRC balance: ${drcBalance} DRC\n` +
      `Lock PDA: ${lock.lockAddress}\n` +
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
        getFriendlyError(error)
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
        getFriendlyError(error)
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

    

const drcAccounts =
  await connection.getParsedTokenAccountsByOwner(
    walletPublicKey,
    {
      mint: DRC_MINT,
    }
  );

const sourceAccount =
  drcAccounts.value.find(({ account }) => {
    const rawAmount =
      BigInt(
        account.data.parsed.info.tokenAmount.amount
      );

    return rawAmount >= amountRaw;
  });

if (!sourceAccount) {
  throw new Error(
    "No DRC token account has enough balance for this deposit."
  );
}

const ownerTokenAccount =
  sourceAccount.pubkey;

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
      `Deposit failed.\n${getFriendlyError(error)}`
    );
  }
}

async function withdrawDrc() {
  try {
    if (
      !walletPublicKey ||
      !program ||
      !lockPositionPda ||
      !vaultPda
    ) {
      throw new Error("Connect your wallet first.");
    }

    const lock =
      await program.account.lockPosition.fetch(
        lockPositionPda
      );

    const amountRaw =
      BigInt(lock.amount.toString());

    const unlockTimestamp =
      Number(lock.unlockTime.toString());

    const now =
      Math.floor(Date.now() / 1000);

    if (amountRaw <= 0n) {
      throw new Error("No locked DRC to withdraw.");
    }

    if (now < unlockTimestamp) {
      throw new Error(
        "This position is still locked."
      );
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

    withdrawButton.disabled = true;

    const displayAmount =
      formatTokenAmount(amountRaw, 9);

    setStatus(
      `Withdrawing ${displayAmount} DRC...\n\n` +
      `Approve the transaction in X1 Wallet.`
    );

    const tx = await program.methods
      .withdraw(
        new anchor.BN(amountRaw.toString())
      )
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
      `DRC withdrawn successfully.\n\n` +
      `Amount: ${displayAmount} DRC\n\n` +
      `Transaction:\n${tx}`
    );

    await loadDrcBalance();
    await loadLockPosition();
  } catch (error) {
    console.error(error);

    setStatus(
      `Withdraw failed.\n${getFriendlyError(error)}`
    );

    await loadLockPosition();
  }
}

async function claimBlood() {
  try {
    if (
      !walletPublicKey ||
      !program ||
      !lockPositionPda
    ) {
      throw new Error("Connect your wallet first.");
    }

    const lock =
      await program.account.lockPosition.fetch(
        lockPositionPda
      );

    const bloodRaw =
      BigInt(lock.bloodEarned.toString());

    if (bloodRaw <= 0n) {
      throw new Error(
        "No BLOOD is currently available to claim."
      );
    }

    const [bloodMintAuthority] =
      PublicKey.findProgramAddressSync(
        [
          new TextEncoder().encode(
            "blood_mint_authority"
          ),
        ],
        program.programId
      );

    const tokenAccounts =
      await connection.getTokenAccountsByOwner(
        walletPublicKey,
        { mint: BLOOD_MINT }
      );

    if (tokenAccounts.value.length === 0) {
      throw new Error(
        "No BLOOD token account found for this wallet."
      );
    }

    const ownerBloodAccount =
      tokenAccounts.value[0].pubkey;

    claimButton.disabled = true;

    const displayAmount =
      formatTokenAmount(bloodRaw, 9);

    setStatus(
      `Claiming ${displayAmount} BLOOD...\n\n` +
      `Approve the transaction in X1 Wallet.`
    );

    const tx = await program.methods
      .claimBlood()
      .accounts({
        lockPosition: lockPositionPda,
        bloodMint: BLOOD_MINT,
        bloodMintAuthority,
        ownerBloodAccount,
        owner: walletPublicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    setStatus(
      `BLOOD claimed successfully.\n\n` +
      `Amount: ${displayAmount} BLOOD\n\n` +
      `Transaction:\n${tx}`
    );


await loadBloodBalance();
    await loadLockPosition();
  } catch (error) {
    console.error(error);

    setStatus(
      `Claim failed.\n${getFriendlyError(error)}`
    );

    await loadLockPosition();
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
        getFriendlyError(error)
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

    const lock =
  await program.account.lockPosition.fetch(
    lockPositionPda
  );

if (BigInt(lock.amount.toString()) > 0n) {
  setStatus(
    "This position is already funded."
  );
  return;
}

await depositDrc();
  }
);
maxButton.addEventListener("click", async () => {
  try {
    if (!walletPublicKey) {
      throw new Error("Connect your wallet first.");
    }

    const maxAmount = await loadDrcBalance();

    if (maxAmount === "0") {
      throw new Error("No DRC available to lock.");
    }

    depositAmountEl.value = maxAmount;
  } catch (error) {
    console.error(error);

    setStatus(
      `Unable to load MAX DRC amount.\n${
        getFriendlyError(error)
      }`
    );
  }
});
setStatus("Ready. Connect your wallet.");


withdrawButton.addEventListener(
  "click",
  withdrawDrc
);

claimButton.addEventListener(
  "click",
  claimBlood
);
