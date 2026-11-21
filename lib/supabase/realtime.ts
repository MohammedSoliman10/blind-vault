/**
 * Supabase Realtime Telemetry & Live Event Subscription Handler (T022)
 *
 * Subscribes to the `arena_events` table over Supabase Realtime WebSocket replication
 * and manages spectator Presence tracking. Client writes are routed to /api/arena-events
 * so that browser clients never attempt unauthorized direct table mutations.
 */

import { getSupabaseClient } from "./client";

export type ArenaEventType =
  | "ATTACK_BLOCKED"
  | "TRADE_EXECUTED"
  | "CIRCUIT_BREAKER_TRIPPED"
  | "EMERGENCY_EXIT_EXECUTED"
  | "GUEST_FAUCET"
  | "SIGNAL_EVALUATED";

export interface ArenaEvent {
  id: string;
  eventType: ArenaEventType;
  attackType?: "PEEK_STRATEGY" | "OPERATOR_WITHDRAW" | "OVERSIZED_SWAP" | "CIRCUIT_BREAKER";
  status: "BLOCKED" | "SUCCESS" | "HALTED";
  actor: string;
  vault: string;
  txSignature: string | null;
  errorCode?: string | null;
  errorMessage?: string;
  timestamp: string;
  explorerUrl: string;
  proofType?: "ENCLAVE_ACL" | "L1_PREFLIGHT" | "DEVNET_TX" | "SYSTEM";
  details?: Record<string, any>;
}

type EventListener = (event: ArenaEvent) => void;
type PresenceListener = (count: number) => void;

const localListeners: Set<EventListener> = new Set();
const presenceListeners: Set<PresenceListener> = new Set();
let activePresenceCount = 1;

export const DEFAULT_PROGRAM_ID =
  process.env.NEXT_PUBLIC_PROGRAM_ID || "6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N";

/**
 * Validates whether a signature string is an authentic 87-88 character Base58 Solana tx signature.
 */
export function isRealSolanaTxSignature(sig?: string | null): boolean {
  if (!sig || typeof sig !== "string") return false;
  return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(sig.trim());
}

/**
 * Returns a valid Solana Explorer URL:
 * - If a real Devnet tx signature is present: links to /tx/<sig>?cluster=devnet
 * - Otherwise: links to the deployed Program ID /address/<progId>?cluster=devnet
 */
export function getExplorerUrl(sig?: string | null, programId = DEFAULT_PROGRAM_ID): string {
  if (isRealSolanaTxSignature(sig)) {
    return `https://explorer.solana.com/tx/${sig!.trim()}?cluster=devnet`;
  }
  return `https://explorer.solana.com/address/${programId}?cluster=devnet`;
}

/**
 * Normalizes database row or payload to strongly typed ArenaEvent.
 */
export function normalizeEvent(row: any): ArenaEvent {
  const sig = row.tx_signature || row.signature || null;
  const isReal = isRealSolanaTxSignature(sig);
  const cleanSig = isReal ? sig : null;
  const vault = row.vault_pubkey || row.vault || DEFAULT_PROGRAM_ID;

  let proofType: "ENCLAVE_ACL" | "L1_PREFLIGHT" | "DEVNET_TX" | "SYSTEM" = "L1_PREFLIGHT";
  if (isReal) {
    proofType = "DEVNET_TX";
  } else if (
    row.error_code === "IntelTDXHardwareAcl" ||
    row.attack_type === "PEEK_STRATEGY" ||
    (row.details && row.details.attackType === "PEEK_STRATEGY")
  ) {
    proofType = "ENCLAVE_ACL";
  }

  return {
    id: row.id?.toString() || "evt-" + Math.random().toString(36).substring(2, 9),
    eventType: (row.event_type || row.eventType || "ATTACK_BLOCKED") as ArenaEventType,
    attackType: row.details?.attackType || row.metadata?.attackType || row.attackType,
    status: row.status || (row.error_code ? "BLOCKED" : "SUCCESS"),
    actor: row.actor_pubkey || row.actor || "AnonymousGuest",
    vault,
    txSignature: cleanSig,
    errorCode: row.error_code || row.errorCode || null,
    errorMessage: row.error_message || row.errorMessage || "Action verified",
    timestamp: row.created_at || row.timestamp || new Date().toISOString(),
    explorerUrl: getExplorerUrl(cleanSig, vault),
    proofType,
    details: row.details || row.metadata || {},
  };
}

/**
 * Subscribes to real-time arena events streamed from Supabase.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToArenaEvents(onEvent: EventListener): () => void {
  localListeners.add(onEvent);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return () => localListeners.delete(onEvent);
  }

  const channel = supabase
    .channel("realtime:arena")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "arena_events" },
      (payload) => {
        const event = normalizeEvent(payload.new);
        onEvent(event);
      }
    )
    .subscribe();

  return () => {
    localListeners.delete(onEvent);
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribes to active spectator Presence tracking.
 */
export function subscribeToPresence(userPubkey: string, onCountChange: PresenceListener): () => void {
  presenceListeners.add(onCountChange);
  onCountChange(activePresenceCount);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return () => presenceListeners.delete(onCountChange);
  }

  const presenceChannel = supabase.channel("realtime:arena-presence", {
    config: { presence: { key: userPubkey || "guest-" + Math.random().toString(36).slice(2, 6) } },
  });

  presenceChannel
    .on("presence", { event: "sync" }, () => {
      const state = presenceChannel.presenceState();
      const count = Math.max(1, Object.keys(state).length);
      activePresenceCount = count;
      presenceListeners.forEach((fn) => fn(count));
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({ online_at: new Date().toISOString() });
      }
    });

  return () => {
    presenceListeners.delete(onCountChange);
    supabase.removeChannel(presenceChannel);
  };
}

/**
 * Records an arena event:
 * 1. Broadcasts locally to all in-browser listeners for instant zero-latency UI updates.
 * 2. Emits an asynchronous POST to /api/arena-events where the serverless backend
 *    persists it with SUPABASE_SERVICE_ROLE_KEY (avoiding browser RLS HTTP 400 errors).
 */
export async function emitArenaEvent(eventInput: Omit<ArenaEvent, "id" | "explorerUrl">): Promise<ArenaEvent> {
  const event = normalizeEvent({
    ...eventInput,
    id: "evt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
  });

  // Notify local in-browser subscribers immediately
  localListeners.forEach((fn) => {
    try {
      fn(event);
    } catch (err) {
      console.warn("Error in local event subscriber:", err);
    }
  });

  // Persist to Supabase via server route (bypasses RLS safely)
  if (typeof window !== "undefined") {
    fetch("/api/arena-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: event.eventType,
        status: event.status,
        actor_pubkey: event.actor,
        vault_pubkey: event.vault,
        tx_signature: event.txSignature,
        error_code: event.errorCode,
        error_message: event.errorMessage,
        details: {
          attackType: event.attackType,
          ...(event.details || {}),
        },
      }),
    }).catch((err) => {
      console.warn("Non-fatal error logging event to /api/arena-events:", err.message);
    });
  }

  return event;
}
