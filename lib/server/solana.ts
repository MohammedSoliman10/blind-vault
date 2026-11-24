/**
 * Server-Side Solana Relayer & Security Validation
 * Validates program allowlist, co-signs as fee-payer, and sponsors Devnet gas.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";
import * as anchor from "@coral-xyz/anchor";
import { getAuthToken } from "@magicblock-labs/ephemeral-rollups-sdk";
import nacl from "tweetnacl";
import idl from "../solana/idl/blind_vault.json";

// Program allowlist strictly enforced on all sponsored transactions
export const DEFAULT_PROGRAM_ID = "6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N";
export const DEMO_VAULT_PDA = "811BEdAqhr2aUWo59nZ4JpY84AMrWkrnVgnesBjhDVKp";
export const DEMO_STRATEGY_PDA = "3JcaKPWwKaRbVYAY178bk42qfqrkKSY2aWu6Y9gwmwG2";
export const DEMO_QUOTE_VAULT_PDA = "4YnudEYRaXD3bquPBe1fYLPPBbwgxXuckNucTZtReRnE";
export const DEMO_TARGET_VAULT_PDA = "2b1ptxtiVBVF6PqJMV6rA7mEo7V5ym7tRotFUPWiKsUL";
export const DEMO_POOL_PDA = "47ttsGtGvCqcxKydZWPkzNmfwW6xe8UbuyDMiiQkFwBF";
export const DEMO_POOL_QUOTE_VAULT_PDA = "G5K16vKCqxLJnhnZN8MsRbTnajHLen3CpX2gCy4chLYS";
export const DEMO_POOL_BASE_VAULT_PDA = "AT8oYxjmUY7V1oNobi9ie6rf1f8ACPfcqkeBV2aV23ZP";

export const ALLOWED_PROGRAM_IDS = new Set([
  process.env.NEXT_PUBLIC_PROGRAM_ID || DEFAULT_PROGRAM_ID,
  "11111111111111111111111111111111", // System Program
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // SPL Token Program
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", // Associated Token Account Program
  "ComputeBudget111111111111111111111111111111", // Compute Budget Program
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
  disallowedProgramId?: string;
  isVersioned: boolean;
  parsedTransaction: Transaction | VersionedTransaction;
}

/**
 * Deserializes transaction wire bytes and validates that EVERY instruction
 * targets strictly allowlisted program IDs.
 */
export function validateTransactionAllowlist(
  serializedBase64: string,
  allowedPrograms: Set<string> = ALLOWED_PROGRAM_IDS
): ValidationResult {
  let txBuffer: Buffer;
  try {
    txBuffer = Buffer.from(serializedBase64, "base64");
    if (txBuffer.length === 0) {
      return { valid: false, error: "Empty transaction payload", isVersioned: false, parsedTransaction: null as any };
    }
  } catch {
    return { valid: false, error: "Malformed base64 transaction string", isVersioned: false, parsedTransaction: null as any };
  }

  // Attempt VersionedTransaction first
  try {
    const versionedTx = VersionedTransaction.deserialize(txBuffer);
    const staticKeys = versionedTx.message.staticAccountKeys;
    const compiledIxs = versionedTx.message.compiledInstructions;

    for (const ix of compiledIxs) {
      const programPubkey = staticKeys[ix.programIdIndex];
      const programId = programPubkey.toBase58();
      if (!allowedPrograms.has(programId)) {
        return {
          valid: false,
          error: `Transaction contains disallowed program ID: ${programId}`,
          disallowedProgramId: programId,
          isVersioned: true,
          parsedTransaction: versionedTx,
        };
      }
    }

    return {
      valid: true,
      isVersioned: true,
      parsedTransaction: versionedTx,
    };
  } catch {
    // Fall back to legacy Transaction
    try {
      const legacyTx = Transaction.from(txBuffer);
      for (const ix of legacyTx.instructions) {
        const programId = ix.programId.toBase58();
        if (!allowedPrograms.has(programId)) {
          return {
            valid: false,
            error: `Transaction contains disallowed program ID: ${programId}`,
            disallowedProgramId: programId,
            isVersioned: false,
            parsedTransaction: legacyTx,
          };
        }
      }

      return {
        valid: true,
        isVersioned: false,
        parsedTransaction: legacyTx,
      };
    } catch (err: any) {
      return {
        valid: false,
        error: `Failed to parse Solana transaction: ${err.message}`,
        isVersioned: false,
        parsedTransaction: null as any,
      };
    }
  }
}

/**
 * Safely loads the Devnet sponsor fee-payer keypair from environment variables.
 * Never logs or exposes secret keys.
 */
export function getSponsorKeypair(): Keypair | null {
  const secret = process.env.SPONSOR_KEYPAIR_SECRET;
  if (!secret) {
    return null;
  }

  try {
    const trimmed = secret.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const rawBytes = JSON.parse(trimmed);
      return Keypair.fromSecretKey(Uint8Array.from(rawBytes));
    }
    // Assume Base58 string
    return Keypair.fromSecretKey(bs58.decode(trimmed));
  } catch (err) {
    console.error("Failed to parse SPONSOR_KEYPAIR_SECRET from environment");
    return null;
  }
}

/**
 * Mints 1,000 Demo USDC directly on Solana Devnet to the user's ATA,
 * funded and co-signed by the sponsor fee-payer.
 */
export async function mintDemoTokensToUser(
  connection: Connection,
  sponsorKeypair: Keypair,
  userPubkey: PublicKey,
  amountUi: number = 1000
): Promise<{ signature: string; userAta: string; explorerUrl: string }> {
  const usdcMint = new PublicKey(
    process.env.DEMO_USDC_MINT || "7vhu7vaAnwXpF1pt2e6o157zaL6jEvsoRN3gqQz6s5i4"
  );
  const userAta = getAssociatedTokenAddressSync(usdcMint, userPubkey);
  const tx = new Transaction();

  // Create user ATA if not exists and mint demo USDC
  tx.add(
    createAssociatedTokenAccountIdempotentInstruction(
      sponsorKeypair.publicKey,
      userAta,
      userPubkey,
      usdcMint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    ),
    createMintToInstruction(
      usdcMint,
      userAta,
      sponsorKeypair.publicKey,
      BigInt(Math.floor(amountUi * 1_000_000)),
      [],
      TOKEN_PROGRAM_ID
    ),
    // Airdrop 0.005 SOL gas reserve to guest for rent-exempt account creation
    SystemProgram.transfer({
      fromPubkey: sponsorKeypair.publicKey,
      toPubkey: userPubkey,
      lamports: 5_000_000,
    })
  );

  tx.feePayer = sponsorKeypair.publicKey;
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = latestBlockhash.blockhash;
  tx.sign(sponsorKeypair);

  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await connection.confirmTransaction(
    { signature, ...latestBlockhash },
    "confirmed"
  );

  return {
    signature,
    userAta: userAta.toBase58(),
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  };
}

/**
 * Executes on-chain AI bounded trade using the sponsor keypair as strategist.
 */
export async function executeSponsoredTradeOnDevnet(
  connection: Connection,
  sponsorKeypair: Keypair,
  catalystScore: number,
  signalHash: string
): Promise<{ signature: string; explorerUrl: string; tradeAmountUsdc: number }> {
  // Connect via MagicBlock TEE RPC with auth token if strategy is delegated to enclave
  let tradeConn = connection;
  try {
    const signStrategist = async (msg: Uint8Array) => nacl.sign.detached(msg, sponsorKeypair.secretKey);
    const auth = await getAuthToken("https://devnet-tee.magicblock.app", sponsorKeypair.publicKey, signStrategist);
    if (auth?.token) {
      tradeConn = new Connection(`https://devnet-tee.magicblock.app?token=${auth.token}`, "confirmed");
    }
  } catch (teeErr) {
    console.warn("Could not acquire MagicBlock TEE auth token, using L1 Devnet:", teeErr);
  }

  const wallet = new anchor.Wallet(sponsorKeypair);
  const provider = new anchor.AnchorProvider(tradeConn, wallet, { commitment: "confirmed" });
  const program = new anchor.Program(idl as any, provider);

  const vaultPda = new PublicKey(DEMO_VAULT_PDA);
  const strategyPda = new PublicKey(DEMO_STRATEGY_PDA);
  const quoteVaultPda = new PublicKey(DEMO_QUOTE_VAULT_PDA);
  const targetVaultPda = new PublicKey(DEMO_TARGET_VAULT_PDA);
  const demoPoolPda = new PublicKey(DEMO_POOL_PDA);
  const poolQuoteVault = new PublicKey(DEMO_POOL_QUOTE_VAULT_PDA);
  const poolBaseVault = new PublicKey(DEMO_POOL_BASE_VAULT_PDA);

  const qBalance = await connection.getTokenAccountBalance(quoteVaultPda);
  const totalAmount = Number(qBalance.value.amount) || 1000_000_000;
  // Bounded trade: 15% of quote vault NAV
  const tradeRaw = BigInt(Math.max(1_000_000, Math.floor(totalAmount * 0.15)));

  // Convert hex signal hash to 32-byte array
  let hashBytes = new Uint8Array(32);
  try {
    const clean = signalHash.replace(/^0x/, "").padEnd(64, "0").slice(0, 64);
    hashBytes = Uint8Array.from(Buffer.from(clean, "hex"));
  } catch {
    hashBytes = new Uint8Array(32).fill(1);
  }

  // Execute bounded trade instruction on Solana Devnet
  const txSig = await program.methods
    .executeBoundedTrade(new anchor.BN(tradeRaw.toString()))
    .accounts({
      vault: vaultPda,
      strategy: strategyPda,
      quoteVault: quoteVaultPda,
      targetVault: targetVaultPda,
      demoPool: demoPoolPda,
      poolQuoteVault,
      poolBaseVault,
      strategist: sponsorKeypair.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  return {
    signature: txSig,
    explorerUrl: `https://explorer.solana.com/tx/${txSig}?cluster=devnet`,
    tradeAmountUsdc: Number(tradeRaw) / 1_000_000,
  };
}

/**
 * Simulates a market shock on Devnet to trip the 5% rolling loss circuit breaker.
 */
export async function executeMarketShockOnDevnet(
  connection: Connection,
  sponsorKeypair: Keypair,
  priceDropBps: number = 600
): Promise<{ signature: string; explorerUrl: string }> {
  const wallet = new anchor.Wallet(sponsorKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new anchor.Program(idl as any, provider);

  const vaultPda = new PublicKey(DEMO_VAULT_PDA);

  const txSig = await program.methods
    .simulateMarketMove(priceDropBps)
    .accounts({
      vault: vaultPda,
      strategist: sponsorKeypair.publicKey,
    })
    .rpc();

  return {
    signature: txSig,
    explorerUrl: `https://explorer.solana.com/tx/${txSig}?cluster=devnet`,
  };
}

/**
 * Co-signs transaction with sponsor keypair as fee-payer and broadcasts to Solana Devnet.
 */
export async function coSignAndBroadcastTransaction(
  validation: ValidationResult,
  sponsorKeypair: Keypair,
  connection: Connection
): Promise<{ signature: string; explorerUrl: string }> {
  if (validation.isVersioned) {
    const vTx = validation.parsedTransaction as VersionedTransaction;
    vTx.sign([sponsorKeypair]);
    const rawWire = vTx.serialize();
    const signature = await connection.sendRawTransaction(rawWire, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    return {
      signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    };
  } else {
    const lTx = validation.parsedTransaction as Transaction;
    lTx.partialSign(sponsorKeypair);
    const rawWire = lTx.serialize();
    const signature = await connection.sendRawTransaction(rawWire, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      { signature, ...latestBlockhash },
      "confirmed"
    ).catch(() => {});
    return {
      signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    };
  }
}
