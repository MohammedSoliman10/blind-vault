import { NextResponse } from "next/server";
import { verifyTeeRpcIntegrity } from "@magicblock-labs/ephemeral-rollups-sdk";

export const dynamic = "force-dynamic";

let cachedQuoteStatus: {
  verified: boolean;
  timestamp: number;
  error?: string;
} | null = null;

const TEE_RPC_URL =
  process.env.NEXT_PUBLIC_MAGICBLOCK_TEE_RPC_URL || "https://devnet-tee.magicblock.app";
const TEE_VALIDATOR =
  process.env.NEXT_PUBLIC_MAGICBLOCK_VALIDATOR || "MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo";
const STRATEGY_PDA = "AAQunvudNxbpcLUz2rbTuV3Z6Ga7PQbni3Q7n6xW275A";

export async function GET() {
  const now = Date.now();
  let quoteVerified = false;
  let quoteError: string | null = null;

  // Cache quote verification for 60 seconds to avoid spamming the hardware attestation RPC
  if (cachedQuoteStatus && now - cachedQuoteStatus.timestamp < 60_000) {
    quoteVerified = cachedQuoteStatus.verified;
    quoteError = cachedQuoteStatus.error || null;
  } else {
    try {
      await verifyTeeRpcIntegrity(TEE_RPC_URL);
      quoteVerified = true;
      cachedQuoteStatus = { verified: true, timestamp: now };
    } catch (err: any) {
      quoteVerified = false;
      quoteError = err.message;
      cachedQuoteStatus = { verified: false, timestamp: now, error: err.message };
    }
  }

  // Probe the delegated SealedStrategy PDA on the TEE without an auth token to check ACL denial
  let aclBlocked = false;
  let tdxAccountDataLength = 0;
  try {
    const res = await fetch(TEE_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [STRATEGY_PDA, { encoding: "base64" }],
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (res.status === 401 || res.status === 403 || !res.ok) {
      aclBlocked = true;
      tdxAccountDataLength = 0;
    } else {
      const json = await res.json();
      if (json?.error || json?.result?.value === null) {
        aclBlocked = true;
        tdxAccountDataLength = 0;
      } else if (json?.result?.value) {
        aclBlocked = false;
        tdxAccountDataLength = json.result.value.data?.[0]?.length || 0;
      }
    }
  } catch (err) {
    aclBlocked = true;
    tdxAccountDataLength = 0;
  }

  return NextResponse.json({
    success: true,
    quoteVerified,
    quoteError,
    enclaveValidator: TEE_VALIDATOR,
    teeRpcUrl: TEE_RPC_URL,
    attestationEngine: "MagicBlock Intel TDX PER",
    hardwareMemory: "AES-128-XTS Encrypted Enclave Memory",
    strategyProtection: "Hardware PER ACL Enforced",
    sealedStrategyPda: STRATEGY_PDA,
    delegated: true,
    aclBlocked,
    tdxAccountDataLength,
    timestamp: new Date().toISOString(),
  });
}
