"use client";

import React, { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { XRayPanel } from "../components/XRayPanel";
import { AttackGauntlet } from "../components/AttackGauntlet";
import { NewsTrigger } from "../components/NewsTrigger";
import { ProofTape } from "../components/ProofTape";
import {
  getOrCreateGuestWallet,
  resetGuestWallet,
  requestDemoFaucet,
  DEFAULT_GUEST_USDC,
} from "../lib/solana/guest-wallet";
import {
  subscribeToArenaEvents,
  subscribeToPresence,
  ArenaEvent,
  emitArenaEvent,
} from "../lib/supabase/realtime";
import { DEPLOYED_PROGRAM_ID, ActionResult } from "../lib/solana/arena-actions";

export default function ArenaPage() {
  const [mounted, setMounted] = useState(false);
  const [guestPubkey, setGuestPubkey] = useState<string>("");
  const [demoBalance, setDemoBalance] = useState<number>(DEFAULT_GUEST_USDC);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [isHalted, setIsHalted] = useState(false);
  const [tvlUsdc, setTvlUsdc] = useState<number>(1000);
  const [depositorShares, setDepositorShares] = useState<number>(1000000);
  const [presenceCount, setPresenceCount] = useState<number>(1);
  const [events, setEvents] = useState<ArenaEvent[]>([]);

  // Guided Demo Progress (1: Inspect, 2: Attack, 3: News Trade)
  const [activeStep, setActiveStep] = useState<number>(1);

  // High-visibility 2-part action feedback card
  const [actionFeedback, setActionFeedback] = useState<ActionResult | null>(null);

  // Initialize guest session and real-time listeners on mount
  useEffect(() => {
    setMounted(true);
    const session = getOrCreateGuestWallet();
    setGuestPubkey(session.publicKeyBase58);
    setDemoBalance(session.demoUsdcBalance);

    // Initial session boot record
    emitArenaEvent({
      eventType: "GUEST_FAUCET",
      status: "SUCCESS",
      actor: session.publicKeyBase58,
      vault: DEPLOYED_PROGRAM_ID,
      txSignature: null,
      errorMessage: "Zero-Wallet Guest Session ready with 1,000 Demo USDC & sponsored gas.",
      timestamp: new Date().toISOString(),
      details: { whatYouTried: "Landed on Blind Vault Risk Arena in Zero-Wallet Guest Mode.", whyItHappened: "Instant ephemeral keypair provisioned in-browser with gas sponsorship." },
    });

    // Real-time telemetry subscription
    const unsubscribeEvents = subscribeToArenaEvents((newEvent) => {
      setEvents((prev) => [newEvent, ...prev.slice(0, 49)]); // keep latest 50 events
    });

    // Spectator presence tracking
    const unsubscribePresence = subscribeToPresence(session.publicKeyBase58, (count) => {
      setPresenceCount(count);
    });

    return () => {
      unsubscribeEvents();
      unsubscribePresence();
    };
  }, []);

  const handleResetSession = () => {
    const fresh = resetGuestWallet();
    setGuestPubkey(fresh.publicKeyBase58);
    setDemoBalance(DEFAULT_GUEST_USDC);
    setIsHalted(false);
    setTvlUsdc(1000);
    setDepositorShares(1000000);
    setActiveStep(1);
    setActionFeedback(null);
    setEvents([]);

    emitArenaEvent({
      eventType: "GUEST_FAUCET",
      status: "SUCCESS",
      actor: fresh.publicKeyBase58,
      vault: DEPLOYED_PROGRAM_ID,
      txSignature: null,
      errorMessage: "Guest session reset. Fresh ephemeral keypair provisioned.",
      timestamp: new Date().toISOString(),
    });
  };

  const handleRequestFaucet = async () => {
    if (!guestPubkey) return;
    setFaucetLoading(true);
    try {
      const session = getOrCreateGuestWallet();
      const res = await requestDemoFaucet(session.publicKey);
      if (res.success && res.newBalance !== undefined) {
        setDemoBalance(res.newBalance);
        emitArenaEvent({
          eventType: "GUEST_FAUCET",
          status: "SUCCESS",
          actor: guestPubkey,
          vault: DEPLOYED_PROGRAM_ID,
          txSignature: null,
          errorMessage: "Faucet airdropped +1,000 Demo USDC to guest identity.",
          timestamp: new Date().toISOString(),
        });
      } else {
        alert(res.error || "Faucet failed");
      }
    } finally {
      setFaucetLoading(false);
    }
  };

  const handleActionResult = (result: ActionResult) => {
    setActionFeedback(result);
    if (result.proofType === "ENCLAVE_ACL" || result.errorCode === "UnauthorizedDepositor" || result.errorCode === "ExceedsMaxPositionCap" || result.errorCode === "DailyDrawdownHalted") {
      setActiveStep(2);
    } else if (result.success && !result.blocked) {
      setActiveStep(3);
    }
  };

  const handleTradeSuccess = () => {
    setTvlUsdc((prev) => parseFloat((prev + 15.25).toFixed(2)));
    setActiveStep(3);
  };

  const handleDepositorExitSuccess = () => {
    setDepositorShares(0);
    setTvlUsdc(0);
    setDemoBalance((prev) => prev + 1000);
    setActiveStep(2);
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090a0f] text-sm text-gray-400">
        <div className="flex items-center space-x-3">
          <span className="h-3 w-3 animate-ping rounded-full bg-sky-400"></span>
          <span>Loading Blind Vault Risk Arena...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] subtle-grid pb-28 text-gray-100">
      {/* Header Bar */}
      <Header
        guestAddress={guestPubkey}
        demoBalance={demoBalance}
        presenceCount={presenceCount}
        onResetSession={handleResetSession}
        onRequestFaucet={handleRequestFaucet}
        faucetLoading={faucetLoading}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 space-y-5">
        {/* Compact Hero & 3-Step Guided Demo Bar */}
        <section className="rounded-2xl border border-[#1e2433] bg-gradient-to-r from-[#0d0f17] via-[#12151f] to-[#0d0f17] p-4 sm:p-5 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-sky-400">
                <span>🛡️ Solana Layer 1 Risk Engine</span>
                <span className="text-gray-500">•</span>
                <span className="text-indigo-400">Intel TDX Confidential Computing</span>
              </div>
              <h1 className="mt-1 text-xl sm:text-2xl font-black text-white tracking-tight">
                Blind Vault Risk Arena
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-400">
                Private trading alpha runs inside an Intel TDX hardware enclave (MagicBlock PER). Public capital custody and 20% risk caps remain permanently on Solana L1.
              </p>
            </div>

            {/* 3-Step Guided Demo Bar */}
            <div className="flex items-center gap-1.5 rounded-xl border border-[#1e2433] bg-[#090a0f]/80 p-1.5 text-xs font-medium shrink-0">
              <button
                onClick={() => setActiveStep(1)}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  activeStep === 1
                    ? "bg-sky-500 text-black font-bold shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                1. Inspect Architecture
              </button>
              <button
                onClick={() => setActiveStep(2)}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  activeStep === 2
                    ? "bg-red-500 text-white font-bold shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                2. Try to Rug It
              </button>
              <button
                onClick={() => setActiveStep(3)}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  activeStep === 3
                    ? "bg-indigo-500 text-white font-bold shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                3. AI News Trade
              </button>
            </div>
          </div>
        </section>

        {/* High-Visibility Action Feedback Card (Displayed whenever any button is clicked) */}
        {actionFeedback && (
          <section className="rounded-2xl border border-sky-500/40 bg-[#101422] p-4.5 sm:p-5 shadow-2xl animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-[#1e2433] pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="text-xl">
                  {actionFeedback.blocked ? "🛡️" : "⚡"}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Live Security Feedback
                  </h3>
                  <span className="text-xs text-gray-400">
                    Real-time transaction &amp; hardware validation outcome
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                    actionFeedback.blocked
                      ? "border-red-500/40 bg-red-950/40 text-red-300"
                      : "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                  }`}
                >
                  {actionFeedback.blocked ? "DEFENDED & REJECTED" : "EXECUTED SUCCESSFULLY"}
                </span>
                <button
                  onClick={() => setActionFeedback(null)}
                  className="rounded-lg border border-[#1e2433] bg-[#090a0f] px-2 py-0.5 text-xs text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 2-Part Explanation */}
            <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
              <div className="rounded-xl border border-[#1e2433] bg-[#090a0f] p-3">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  What You Just Tried:
                </span>
                <p className="text-gray-200 font-medium">
                  {actionFeedback.whatYouTried}
                </p>
              </div>

              <div className="rounded-xl border border-[#1e2433] bg-[#090a0f] p-3">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Why It Was Blocked / Executed:
                </span>
                <p className={`${actionFeedback.blocked ? "text-red-300 font-medium" : "text-emerald-300 font-medium"}`}>
                  {actionFeedback.whyItHappened}
                </p>
                {actionFeedback.errorCode && (
                  <span className="mt-1 inline-block font-mono text-[11px] font-bold text-red-400">
                    [{actionFeedback.errorCode}]
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-[#1e2433]/80">
              <span className="text-gray-400">
                Proof Method: <strong className="text-white">{actionFeedback.proofType === "ENCLAVE_ACL" ? "Intel TDX Hardware ACL" : actionFeedback.proofType === "DEVNET_TX" ? "Devnet Transaction" : "Solana L1 Risk Firewall Preflight"}</strong>
              </span>
              <a
                href={actionFeedback.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:text-sky-300 hover:underline font-semibold"
              >
                Inspect Proof on Solana Explorer ↗
              </a>
            </div>
          </section>
        )}

        {/* Section 1: Architecture X-Ray */}
        <section id="step-inspect">
          <XRayPanel
            isHalted={isHalted}
            tvlUsdc={tvlUsdc}
            depositorShares={depositorShares}
            actorAddress={guestPubkey}
            onActionResult={handleActionResult}
          />
        </section>

        {/* Section 2: Attack Gauntlet */}
        <section id="step-attack">
          <AttackGauntlet
            actorAddress={guestPubkey}
            isHalted={isHalted}
            onVaultHaltChange={setIsHalted}
            onDepositorExitSuccess={handleDepositorExitSuccess}
            onActionResult={handleActionResult}
          />
        </section>

        {/* Section 3: Live News Trigger */}
        <section id="step-news">
          <NewsTrigger
            actorAddress={guestPubkey}
            onTradeSuccess={handleTradeSuccess}
            onActionResult={handleActionResult}
          />
        </section>
      </main>

      {/* Docked Proof Tape */}
      <ProofTape events={events} onClearTape={() => setEvents([])} />
    </div>
  );
}
