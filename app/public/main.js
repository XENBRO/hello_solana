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

const vaultTab =
  document.getElementById("vaultTab");

const bloodlinesTab =
  document.getElementById("bloodlinesTab");

const bloodHuntTab =
  document.getElementById("bloodHuntTab");

const vaultView =
  document.getElementById("vaultView");

const bloodlinesView =
  document.getElementById("bloodlinesView");

const bloodHuntView =
  document.getElementById("bloodHuntView");

const leaderboardBody =
  document.getElementById("leaderboardBody");
const BLOOD_MINT = new PublicKey(
  "WYQdHQWeLvXSr1L8d65BdnomKM68tKxSgLM6ifAFo94"
);

const GENESIS_IMMORTAL_WALLETS = new Set([
  "9MEiLuNSvtCNt9QD8Gp6KCdkCgqQjuPLVoMaTUMwTjtQ",
  "9qymDNeM1LJyX2bigx4TyMfjnX4VusGypqkeSMpKjX7x",
  "13xP5SAZzoekL8v9LgmYqzKEXtJtyRwjSDH1BEH3LH2F",
  "2HaBh9WmAKwnH59mQbftt8MCpA4AqY8XPqBKBYZTCjo4",
  "B7pKynzSGCevkEscwkAVWnvYW1mGo1xBHHm8njZrxCwj",
  "ADRBisAFnvn4YT16BuU8Uprmq86fPmYwCrFwNeGXzx34",
  "BSfMne7pJKauQGnqFayjRfwZ85FAVZXCBPWbRs9Puv45",
  "Giz3FQFRNoihsQNWRJSyJX1HKF9pRB9VQbNS6xQALPSp",
  "FGndhyrUtp9cpNKgHHbBxpCGN3pJ7mhhzST7pXxdKmTR",
  "HM2Htd2Ubc5e4eQm4GZrfg23LbJBqvpzWzkxm3PuVAiG",
  "AiPgc3sqv2WVA4BZpbswNVD4JRgNZMxMJBd1NbX18ssB",
]);

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
    error?.message?.toString?.() ||
    error?.toString?.() ||
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
function updateBloodHuntCountdown() {
  const huntEnd =
    new Date("2026-11-01T00:00:00-05:00");

  const now = new Date();
  const remaining = huntEnd - now;

  const daysRemaining =
    remaining > 0
      ? Math.ceil(
          remaining / (1000 * 60 * 60 * 24)
        )
      : 0;

  const huntDays =
    document.getElementById("huntDays");

  if (huntDays) {
    huntDays.textContent =
      daysRemaining.toString();
  }
}

updateBloodHuntCountdown();

async function loadBloodlineLeaderboard() {
  if (!program) {
    throw new Error("Connect your wallet first.");
  }

  leaderboardBody.innerHTML = `
    <tr>
      <td colspan="5" class="leaderboard-empty">
        Awakening the bloodlines...
      </td>
    </tr>
  `;

  try {
    const positions =
      await program.account.lockPosition.all();

    const fundedPositions = positions
      .filter(({ account }) => {
        return BigInt(account.amount.toString()) > 0n;
      })
      .sort((a, b) => {
        const amountA =
          BigInt(a.account.amount.toString());

        const amountB =
          BigInt(b.account.amount.toString());

        if (amountA === amountB) {
          return 0;
        }

        return amountA > amountB ? -1 : 1;
      });

    if (fundedPositions.length === 0) {
      leaderboardBody.innerHTML = `
        <tr>
          <td colspan="5" class="leaderboard-empty">
            No funded bloodlines found.
          </td>
        </tr>
      `;

      return;
    }

    leaderboardBody.innerHTML =
      fundedPositions
        .map(({ account }, index) => {
          const owner =
            account.owner.toString();

          const shortOwner =
            `${owner.slice(0, 4)}...${owner.slice(-4)}`;

          const isGenesisImmortal =
            GENESIS_IMMORTAL_WALLETS.has(owner);

          const walletDisplay =
            isGenesisImmortal
              ? `${shortOwner} 👑 GENESIS`
              : shortOwner;

          const amountRaw =
  BigInt(account.amount.toString());

const amount =
  formatTokenAmount(
    amountRaw,
    9
  );

const lockStart =
  Number(account.lockStart.toString());

const unlockTime =
  Number(account.unlockTime.toString());

const durationSeconds =
  unlockTime - lockStart;

const durationDays =
  Math.round(
    durationSeconds / 86400
  );

const multiplierBps = {
  30: 10000n,
  90: 12500n,
  180: 15000n,
  365: 20000n,
}[durationDays];

const projectedBloodRaw =
  multiplierBps
    ? (
        amountRaw *
        BigInt(durationDays) *
        250n *
        multiplierBps
      ) /
      1000000n /
      10000n
    : 0n;

const blood =
  formatTokenAmount(
    projectedBloodRaw,
    9
  );

          

          return `
            <tr>
              <td>#${index + 1}</td>
              <td>${walletDisplay}</td>
              <td>${amount} DRC</td>
              <td>${durationDays} days</td>
              <td>${blood} BLOOD</td>
            </tr>
          `;
        })
        .join("");
  } catch (error) {
    console.error(
      "Bloodline leaderboard error:",
      error
    );

    leaderboardBody.innerHTML = `
      <tr>
        <td colspan="5" class="leaderboard-empty">
          Unable to load the bloodlines.
        </td>
      </tr>
    `;

    throw error;
  }
}
async function loadBloodHunt() {
  if (!program) {
    throw new Error("Connect your wallet first.");
  }

  const positions =
    await program.account.lockPosition.all();

  const fundedPositions =
    positions.filter(({ account }) => {
      return BigInt(
        account.amount.toString()
      ) > 0n;
    });

  let totalDrcRaw = 0n;
  let totalProjectedBloodRaw = 0n;

  for (const { account } of fundedPositions) {
    const amountRaw =
      BigInt(account.amount.toString());

    const lockStart =
      Number(account.lockStart.toString());

    const unlockTime =
      Number(account.unlockTime.toString());

    const durationDays =
      Math.round(
        (unlockTime - lockStart) / 86400
      );

    const multiplierBps = {
      30: 10000n,
      90: 12500n,
      180: 15000n,
      365: 20000n,
    }[durationDays];

    const projectedBloodRaw =
      multiplierBps
        ? (
            amountRaw *
            BigInt(durationDays) *
            250n *
            multiplierBps
          ) /
          1000000n /
          10000n
        : 0n;

    totalDrcRaw += amountRaw;
    totalProjectedBloodRaw +=
      projectedBloodRaw;
  }

  const participantsEl =
    document.getElementById(
      "huntParticipants"
    );

  const drcLockedEl =
    document.getElementById(
      "huntDrcLocked"
    );

  const projectedBloodEl =
    document.getElementById(
      "huntProjectedBlood"
    );

  participantsEl.textContent =
    fundedPositions.length.toString();

  const formattedTotalDrc =
    Number(
      formatTokenAmount(totalDrcRaw, 9)
    ).toLocaleString("en-US", {
      maximumFractionDigits: 3,
    });

  const formattedProjectedBlood =
    Number(
      formatTokenAmount(
        totalProjectedBloodRaw,
        9
      )
    ).toLocaleString("en-US", {
      maximumFractionDigits: 3,
    });

  drcLockedEl.textContent =
    `${formattedTotalDrc} DRC`;

  projectedBloodEl.textContent =
    `${formattedProjectedBlood} BLOOD`;

  const immortalPositions =
    fundedPositions
      .filter(({ account }) => {
        const lockStart =
          Number(account.lockStart.toString());

        const unlockTime =
          Number(account.unlockTime.toString());

        const durationDays =
          Math.round(
            (unlockTime - lockStart) / 86400
          );

        return durationDays === 365;
      })
      .sort((a, b) => {
        const amountA =
          BigInt(a.account.amount.toString());

        const amountB =
          BigInt(b.account.amount.toString());

        if (amountA !== amountB) {
          return amountA > amountB ? -1 : 1;
        }

        const lockStartA =
          Number(a.account.lockStart.toString());

        const lockStartB =
          Number(b.account.lockStart.toString());

        return lockStartA - lockStartB;
      });

  const immortalCount =
    document.getElementById("immortalCount");

  const immortalLeaderboardBody =
    document.getElementById(
      "immortalLeaderboardBody"
    );

  immortalCount.textContent =
    immortalPositions.length.toString();

  if (immortalPositions.length === 0) {
    immortalLeaderboardBody.innerHTML = `
      <tr>
        <td
          colspan="4"
          class="leaderboard-empty"
        >
          No 365-day Immortals yet.
        </td>
      </tr>
    `;
  } else {
    immortalLeaderboardBody.innerHTML =
      immortalPositions
        .map(({ account }, index) => {
          const owner =
            account.owner.toString();

          const shortOwner =
            `${owner.slice(0, 4)}...${owner.slice(-4)}`;

          const amountRaw =
            BigInt(account.amount.toString());

          const amount =
            Number(
              formatTokenAmount(
                amountRaw,
                9
              )
            ).toLocaleString("en-US", {
              maximumFractionDigits: 3,
            });

          return `
            <tr>
              <td>#${index + 1}</td>
              <td>${shortOwner}</td>
              <td>${amount} DRC</td>
              <td>
                ${index === 0
                  ? "👑 CROWN LEADER"
                  : "IMMORTAL 🩸"}
              </td>
            </tr>
          `;
        })
        .join("");
  }

  const walletPosition =
    fundedPositions.find(({ account }) => {
      return (
        account.owner.toString() ===
        walletPublicKey.toString()
      );
    });

  const statusTitle =
    document.getElementById(
      "huntStatusTitle"
    );

  const statusText =
    document.getElementById(
      "huntStatusText"
    );

  if (walletPosition) {
    const amountRaw =
      BigInt(
        walletPosition.account.amount.toString()
      );

    const lockStart =
      Number(
        walletPosition.account.lockStart.toString()
      );

    const unlockTime =
      Number(
        walletPosition.account.unlockTime.toString()
      );

    const durationDays =
      Math.round(
        (unlockTime - lockStart) / 86400
      );

    const isGenesisImmortal =
      GENESIS_IMMORTAL_WALLETS.has(
        walletPublicKey.toString()
      );

    const huntRank = isGenesisImmortal
      ? "GENESIS IMMORTAL"
      : ({
          30: "INITIATE",
          90: "BLOODBORN",
          180: "ELDER VAMPIRE",
          365: "IMMORTAL",
        }[durationDays] ?? "HUNTER");

    statusTitle.textContent =
      isGenesisImmortal
        ? "GENESIS IMMORTAL 👑🩸"
        : `YOU'RE IN THE HUNT 🩸 · ${huntRank}`;

    statusText.textContent =
      isGenesisImmortal
        ? `${formatTokenAmount(
            amountRaw,
            9
          )} DRC locked for ${durationDays} days. Founding Bloodline · Grandfathered Sept. 17, 2026.`
        : `${formatTokenAmount(
            amountRaw,
            9
          )} DRC locked for ${durationDays} days. Blood Hunt Rank: ${huntRank}.`;
  } else {
    statusTitle.textContent =
      "NOT YET IN THE HUNT";

    statusText.textContent =
      "Lock DRC in Dracula Vault to enter the Halloween Blood Hunt.";
  }
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
vaultTab.addEventListener("click", () => {
  vaultView.hidden = false;
  bloodlinesView.hidden = true;
  bloodHuntView.hidden = true;

  vaultTab.classList.add("active");
  bloodlinesTab.classList.remove("active");
  bloodHuntTab.classList.remove("active");
});

bloodlinesTab.addEventListener(
  "click",
  async () => {
    vaultView.hidden = true;
    bloodlinesView.hidden = false;
    bloodHuntView.hidden = true;

    bloodlinesTab.classList.add("active");
    vaultTab.classList.remove("active");
    bloodHuntTab.classList.remove("active");

    try {
      await loadBloodlineLeaderboard();
    } catch (error) {
      console.error(error);
    }
  }
);

bloodHuntTab.addEventListener(
  "click",
  async () => {
    vaultView.hidden = true;
    bloodlinesView.hidden = true;
    bloodHuntView.hidden = false;

    bloodHuntTab.classList.add("active");
    vaultTab.classList.remove("active");
    bloodlinesTab.classList.remove("active");

    updateBloodHuntCountdown();

    try {
      await loadBloodHunt();
    } catch (error) {
      console.error(
        "Blood Hunt error:",
        error
      );
    }
  }
);
setStatus("Ready. Connect your wallet.");


withdrawButton.addEventListener(
  "click",
  withdrawDrc
);

claimButton.addEventListener(
  "click",
  claimBlood
);
