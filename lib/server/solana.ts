/**
 * Server-Side Solana Relayer & Security Validation
 * Validates program allowlist, co-signs as fee-payer, and sponsors Devnet gas.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";

// Program allowlist strictly enforced on all sponsored transactions
export const DEFAULT_PROGRAM_ID = "6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N";

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
    return {
      signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    };
  }
}
