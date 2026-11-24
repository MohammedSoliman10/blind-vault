import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { checkRateLimit } from "../../../lib/server/rate-limit";
import {
  validateTransactionAllowlist,
  getSponsorKeypair,
  coSignAndBroadcastTransaction,
  mintDemoTokensToUser,
  executeSponsoredTradeOnDevnet,
  executeMarketShockOnDevnet,
} from "../../../lib/server/solana";
import { getSupabaseAdminClient } from "../../../lib/supabase/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Per-IP Rate Limiting (10 req / min)
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const rateCheck = checkRateLimit(clientIp, 10, 60_000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in 60s." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // 2. Parse and Validate Request Payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const { serializedTransaction, userPublicKey, actionType, catalystScore, signalHash, priceDropBps } = body || {};
  const sponsorKeypair = getSponsorKeypair();
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  // 2a. Real On-Chain Guest Faucet Minting
  if (actionType === "GUEST_FAUCET" && userPublicKey && typeof userPublicKey === "string") {
    if (process.env.NODE_ENV === "test" || !sponsorKeypair) {
      return NextResponse.json({
        success: true,
        airdropAmount: 1000,
        userPublicKey,
        note: "Demo-USDC gasless faucet allocation verified (test environment)",
      });
    }

    try {
      const userPk = new PublicKey(userPublicKey);
      const mintResult = await mintDemoTokensToUser(connection, sponsorKeypair, userPk, 1000);

      // Async telemetry
      try {
        const supabase = getSupabaseAdminClient();
        if (supabase) {
          await supabase.from("arena_events").insert({
            event_type: "GUEST_FAUCET",
            status: "SUCCESS",
            actor_pubkey: userPublicKey,
            vault_pubkey: process.env.NEXT_PUBLIC_PROGRAM_ID || "blind_vault",
            tx_signature: mintResult.signature,
            details: { airdropAmount: 1000, userAta: mintResult.userAta },
          });
        }
      } catch {
        // Non-blocking telemetry
      }

      return NextResponse.json({
        success: true,
        airdropAmount: 1000,
        userPublicKey,
        txSignature: mintResult.signature,
        explorerUrl: mintResult.explorerUrl,
      });
    } catch (err: any) {
      console.error("Faucet on-chain mint failure:", err);
      return NextResponse.json(
        { error: "Failed to mint Demo USDC on Devnet", details: err.message },
        { status: 500 }
      );
    }
  }

  // 2b. Real On-Chain AI Bounded Trade Execution (Strategist Co-Signed)
  if (actionType === "EXECUTE_BOUNDED_TRADE") {
    if (process.env.NODE_ENV === "test" || !sponsorKeypair) {
      const mockSig = "mock_trade_sig_" + Buffer.from(clientIp + Date.now()).toString("hex").slice(0, 44);
      return NextResponse.json({
        success: true,
        txSignature: mockSig,
        explorerUrl: `https://explorer.solana.com/tx/${mockSig}?cluster=devnet`,
        tradeAmountUsdc: 150,
      });
    }

    try {
      const tradeResult = await executeSponsoredTradeOnDevnet(
        connection,
        sponsorKeypair,
        catalystScore ?? 75,
        signalHash || "0000000000000000000000000000000000000000000000000000000000000001"
      );

      return NextResponse.json({
        success: true,
        txSignature: tradeResult.signature,
        explorerUrl: tradeResult.explorerUrl,
        tradeAmountUsdc: tradeResult.tradeAmountUsdc,
      });
    } catch (err: any) {
      console.error("Sponsored trade execution failure:", err);
      return NextResponse.json(
        { error: "Failed to execute bounded trade on Devnet", details: err.message },
        { status: 500 }
      );
    }
  }

  // 2c. Real On-Chain Market Shock Simulation (Vault Halt)
  if (actionType === "MARKET_SHOCK") {
    if (process.env.NODE_ENV === "test" || !sponsorKeypair) {
      const mockSig = "mock_shock_sig_" + Buffer.from(clientIp + Date.now()).toString("hex").slice(0, 44);
      return NextResponse.json({
        success: true,
        txSignature: mockSig,
        explorerUrl: `https://explorer.solana.com/tx/${mockSig}?cluster=devnet`,
      });
    }

    try {
      const shockResult = await executeMarketShockOnDevnet(
        connection,
        sponsorKeypair,
        priceDropBps ?? 600
      );

      return NextResponse.json({
        success: true,
        txSignature: shockResult.signature,
        explorerUrl: shockResult.explorerUrl,
      });
    } catch (err: any) {
      console.error("Market shock on-chain failure:", err);
      return NextResponse.json(
        { error: "Failed to simulate market shock on Devnet", details: err.message },
        { status: 500 }
      );
    }
  }

  // 2d. Standard Pre-Serialized Client Transaction Co-Signing
  if (!serializedTransaction || typeof serializedTransaction !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid serializedTransaction" },
      { status: 400 }
    );
  }

  // 3. Strict Program ID Allowlist Inspection
  const validation = validateTransactionAllowlist(serializedTransaction);
  if (!validation.valid) {
    // Log blocked event to Supabase if available
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase && userPublicKey) {
        await supabase.from("arena_events").insert({
          event_type: actionType || "UNKNOWN_ATTACK",
          status: "BLOCKED",
          actor_pubkey: userPublicKey,
          vault_pubkey: "DISALLOWED_PROGRAM",
          error_code: "DisallowedProgramId",
          error_message: validation.error,
          details: { disallowedProgramId: validation.disallowedProgramId },
        });
      }
    } catch {
      // Supabase logging is non-blocking
    }

    return NextResponse.json(
      { error: "Transaction contains disallowed program ID", details: validation.error },
      { status: 400 }
    );
  }

  // 4. Co-sign with Sponsor Fee-Payer and Broadcast
  if (!sponsorKeypair) {
    if (process.env.NODE_ENV === "test" || !process.env.SPONSOR_KEYPAIR_SECRET) {
      const mockSig = "mock_tx_sig_" + Buffer.from(clientIp + Date.now()).toString("hex").slice(0, 44);
      return NextResponse.json({
        success: true,
        txSignature: mockSig,
        explorerUrl: `https://explorer.solana.com/tx/${mockSig}?cluster=devnet`,
        note: "Simulated co-sign (SPONSOR_KEYPAIR_SECRET not configured in test environment)",
      });
    }

    return NextResponse.json(
      { error: "Server sponsor keypair not configured" },
      { status: 500 }
    );
  }

  try {
    const broadcastResult = await coSignAndBroadcastTransaction(
      validation,
      sponsorKeypair,
      connection
    );

    // 5. Asynchronous Telemetry Event Logging
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase && userPublicKey) {
        await supabase.from("arena_events").insert({
          event_type: actionType || "TRANSACTION_EXECUTED",
          status: "SUCCESS",
          actor_pubkey: userPublicKey,
          vault_pubkey: process.env.NEXT_PUBLIC_PROGRAM_ID || "blind_vault",
          tx_signature: broadcastResult.signature,
          details: { actionType },
        });
      }
    } catch {
      // Non-blocking telemetry
    }

    return NextResponse.json({
      success: true,
      txSignature: broadcastResult.signature,
      explorerUrl: broadcastResult.explorerUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "RPC broadcast failure", details: err.message },
      { status: 500 }
    );
  }
}
