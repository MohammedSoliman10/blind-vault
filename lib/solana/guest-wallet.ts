/**
 * Browser Ephemeral Guest Keypair & Session State Management (T021)
 *
 * Implements zero-wallet instant onboarding: generates an in-browser Ed25519 keypair,
 * persists it in localStorage for session continuity on reload, and routes
 * transactions through the fee-payer sponsor relayer.
 */

import { Keypair, PublicKey } from "@solana/web3.js";

const STORAGE_KEY_SECRET = "blind_vault_guest_secret";
const STORAGE_KEY_BALANCE = "blind_vault_guest_demo_usdc";
export const DEFAULT_GUEST_USDC = 1000;

export interface GuestSession {
  keypair: Keypair;
  publicKey: PublicKey;
  publicKeyBase58: string;
  demoUsdcBalance: number;
  isSponsored: boolean;
  isNew: boolean;
}

/**
 * Retrieves existing guest keypair from localStorage or generates and persists a new one.
 */
export function getOrCreateGuestWallet(): GuestSession {
  if (typeof window === "undefined") {
    // SSR fallback dummy keypair
    const dummy = Keypair.generate();
    return {
      keypair: dummy,
      publicKey: dummy.publicKey,
      publicKeyBase58: dummy.publicKey.toBase58(),
      demoUsdcBalance: DEFAULT_GUEST_USDC,
      isSponsored: true,
      isNew: true,
    };
  }

  try {
    const storedSecret = localStorage.getItem(STORAGE_KEY_SECRET);
    if (storedSecret) {
      const secretBytes = JSON.parse(storedSecret);
      const keypair = Keypair.fromSecretKey(Uint8Array.from(secretBytes));
      const storedBalance = localStorage.getItem(STORAGE_KEY_BALANCE);
      const demoBalance = storedBalance ? parseFloat(storedBalance) : DEFAULT_GUEST_USDC;

      return {
        keypair,
        publicKey: keypair.publicKey,
        publicKeyBase58: keypair.publicKey.toBase58(),
        demoUsdcBalance: isNaN(demoBalance) ? DEFAULT_GUEST_USDC : demoBalance,
        isSponsored: true,
        isNew: false,
      };
    }
  } catch (err) {
    console.warn("Failed to load existing guest wallet from localStorage, regenerating:", err);
  }

  // Generate fresh keypair
  const keypair = Keypair.generate();
  try {
    localStorage.setItem(STORAGE_KEY_SECRET, JSON.stringify(Array.from(keypair.secretKey)));
    localStorage.setItem(STORAGE_KEY_BALANCE, DEFAULT_GUEST_USDC.toString());
  } catch (err) {
    console.error("Failed to persist guest keypair in localStorage:", err);
  }

  return {
    keypair,
    publicKey: keypair.publicKey,
    publicKeyBase58: keypair.publicKey.toBase58(),
    demoUsdcBalance: DEFAULT_GUEST_USDC,
    isSponsored: true,
    isNew: true,
  };
}

/**
 * Resets the guest session: generates a fresh keypair and restores 1,000 Demo USDC.
 */
export function resetGuestWallet(): GuestSession {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_SECRET);
    localStorage.removeItem(STORAGE_KEY_BALANCE);
  }
  return getOrCreateGuestWallet();
}

/**
 * Updates the guest demo USDC balance in localStorage.
 */
export function setGuestDemoBalance(balance: number): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_BALANCE, Math.max(0, balance).toFixed(2));
  }
}

/**
 * Requests the 1,000 Demo-USDC guest faucet airdrop from the serverless sponsor relayer.
 */
export async function requestDemoFaucet(guestPubkey: PublicKey): Promise<{
  success: boolean;
  signature?: string;
  newBalance?: number;
  error?: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch("/api/sponsor-tx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        actionType: "GUEST_FAUCET",
        userPublicKey: guestPubkey.toBase58(),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `Faucet error ${res.status}` };
    }

    const currentBalance = typeof window !== "undefined"
      ? parseFloat(localStorage.getItem(STORAGE_KEY_BALANCE) || "0")
      : 0;
    const newBalance = currentBalance + DEFAULT_GUEST_USDC;
    setGuestDemoBalance(newBalance);

    const txSignature = data.txSignature || data.signature;
    return {
      success: true,
      signature: txSignature,
      newBalance,
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { success: false, error: "Faucet request timed out (8s). Sponsor relayer latency." };
    }
    return { success: false, error: err.message || "Network error requesting faucet" };
  } finally {
    clearTimeout(timeoutId);
  }
}
