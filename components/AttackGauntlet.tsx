"use client";

import React, { useState } from "react";
import {
  dispatchAttackPeekStrategy,
  dispatchAttackOperatorTheft,
  dispatchAttackOversizedSwap,
  dispatchAttackCrashBreaker,
  dispatchEmergencyExit,
  ActionResult,
} from "../lib/solana/arena-actions";

interface AttackGauntletProps {
  actorAddress: string;
  isHalted: boolean;
  onVaultHaltChange: (halted: boolean) => void;
  onDepositorExitSuccess: () => void;
  onActionResult: (result: ActionResult) => void;
}

export function AttackGauntlet({
  actorAddress,
  isHalted,
  onVaultHaltChange,
  onDepositorExitSuccess,
  onActionResult,
}: AttackGauntletProps) {
  const [activeAttack, setActiveAttack] = useState<string | null>(null);

  const handleRunAttack = async (
    name: string,
    actionFn: (actor: string) => Promise<ActionResult>
  ) => {
    setActiveAttack(name);
    try {
      const result = await actionFn(actorAddress);
      onActionResult(result);
      if (name === "CRASH_BREAKER") {
        onVaultHaltChange(true);
      }
    } catch (err: any) {
      onActionResult({
        success: false,
        blocked: true,
        proofType: "L1_PREFLIGHT",
        whatYouTried: `You triggered the ${name} attack simulation.`,
        whyItHappened: err.message || "Attack rejected by on-chain validation.",
        errorMessage: err.message || "Attack failed",
        txSignature: null,
        explorerUrl: "https://explorer.solana.com/?cluster=devnet",
      });
    } finally {
      setActiveAttack(null);
    }
  };

  const handleEmergencyExit = async () => {
    setActiveAttack("EMERGENCY_EXIT");
    try {
      const result = await dispatchEmergencyExit(actorAddress);
      onActionResult(result);
      onVaultHaltChange(false);
      onDepositorExitSuccess();
    } catch (err: any) {
      alert("Emergency exit error: " + err.message);
    } finally {
      setActiveAttack(null);
    }
  };

  return (
    <div className="rounded-2xl border border-[#1e2433] bg-[#0d0f17] p-5 shadow-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2433] pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-red-400 tracking-tight">
              &quot;Try to Rug It&quot; Adversarial Attack Gauntlet
            </span>
            <span className="rounded-full bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[11px] font-semibold text-red-400">
              Interactive Exploit Test
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            Click any exploit button below to test our on-chain security invariants against real attack scenarios.
          </p>
        </div>
        <span className="text-xs text-gray-400 font-medium">
          Zero-risk sandbox execution
        </span>
      </div>

      {/* 4 Red Attack Buttons Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* ATTACK 1 */}
        <button
          onClick={() => handleRunAttack("PEEK_STRATEGY", dispatchAttackPeekStrategy)}
          disabled={activeAttack !== null}
          className="group relative flex flex-col justify-between rounded-xl border border-red-500/30 bg-gradient-to-b from-red-950/20 to-[#12151f] p-4 text-left transition-all hover:border-red-500 hover:from-red-950/40 disabled:opacity-50"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-red-400 uppercase tracking-wider">
              <span>Attack 1</span>
              <span>👁️</span>
            </div>
            <div className="mt-1 text-sm font-bold text-white group-hover:text-red-200">
              Spy / Read Strategy
            </div>
            <p className="mt-1.5 text-xs text-gray-400 leading-snug">
              Attempt to read secret trading parameters directly from the Intel TDX enclave.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-red-500/20 pt-2.5 text-xs text-red-400 font-medium">
            <span>Enclave Gate</span>
            <span className="font-bold">
              {activeAttack === "PEEK_STRATEGY" ? "Testing..." : "Try Exploit →"}
            </span>
          </div>
        </button>

        {/* ATTACK 2 */}
        <button
          onClick={() => handleRunAttack("OPERATOR_WITHDRAW", dispatchAttackOperatorTheft)}
          disabled={activeAttack !== null}
          className="group relative flex flex-col justify-between rounded-xl border border-red-500/30 bg-gradient-to-b from-red-950/20 to-[#12151f] p-4 text-left transition-all hover:border-red-500 hover:from-red-950/40 disabled:opacity-50"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-red-400 uppercase tracking-wider">
              <span>Attack 2</span>
              <span>🦹</span>
            </div>
            <div className="mt-1 text-sm font-bold text-white group-hover:text-red-200">
              Operator Rug Pull
            </div>
            <p className="mt-1.5 text-xs text-gray-400 leading-snug">
              A rogue strategist attempts an unauthorized withdrawal to steal depositor funds.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-red-500/20 pt-2.5 text-xs text-red-400 font-medium">
            <span>has_one Anchor</span>
            <span className="font-bold">
              {activeAttack === "OPERATOR_WITHDRAW" ? "Testing..." : "Try Exploit →"}
            </span>
          </div>
        </button>

        {/* ATTACK 3 */}
        <button
          onClick={() => handleRunAttack("OVERSIZED_SWAP", dispatchAttackOversizedSwap)}
          disabled={activeAttack !== null}
          className="group relative flex flex-col justify-between rounded-xl border border-red-500/30 bg-gradient-to-b from-red-950/20 to-[#12151f] p-4 text-left transition-all hover:border-red-500 hover:from-red-950/40 disabled:opacity-50"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-red-400 uppercase tracking-wider">
              <span>Attack 3</span>
              <span>📈</span>
            </div>
            <div className="mt-1 text-sm font-bold text-white group-hover:text-red-200">
              Oversized 90% Swap
            </div>
            <p className="mt-1.5 text-xs text-gray-400 leading-snug">
              Attempt an unapproved swap exceeding the 20% NAV position cap into a random token.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-red-500/20 pt-2.5 text-xs text-red-400 font-medium">
            <span>20% Risk Cap</span>
            <span className="font-bold">
              {activeAttack === "OVERSIZED_SWAP" ? "Testing..." : "Try Exploit →"}
            </span>
          </div>
        </button>

        {/* ATTACK 4 */}
        <button
          onClick={() => handleRunAttack("CRASH_BREAKER", dispatchAttackCrashBreaker)}
          disabled={activeAttack !== null}
          className="group relative flex flex-col justify-between rounded-xl border border-red-500/30 bg-gradient-to-b from-red-950/20 to-[#12151f] p-4 text-left transition-all hover:border-red-500 hover:from-red-950/40 disabled:opacity-50"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-red-400 uppercase tracking-wider">
              <span>Attack 4</span>
              <span>⚡</span>
            </div>
            <div className="mt-1 text-sm font-bold text-white group-hover:text-red-200">
              -6% Flash Crash
            </div>
            <p className="mt-1.5 text-xs text-gray-400 leading-snug">
              Simulate rapid market drawdown to trip the 5% rolling loss circuit breaker.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-red-500/20 pt-2.5 text-xs text-red-400 font-medium">
            <span>Drawdown Breaker</span>
            <span className="font-bold">
              {activeAttack === "CRASH_BREAKER" ? "Testing..." : "Try Exploit →"}
            </span>
          </div>
        </button>
      </div>

      {/* Emergency Depositor Recovery Card */}
      <div
        className={`mt-4 rounded-xl border p-4 transition-all ${
          isHalted
            ? "border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/50"
            : "border-emerald-500/30 bg-[#12151f]/80"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-emerald-400">
                🛡️ Permanent Depositor Escape Hatch
              </span>
              {isHalted && (
                <span className="rounded-full bg-red-900/80 px-2 py-0.5 text-[10px] text-red-200 font-bold">
                  VAULT HALTED — ESCAPE HATCH UNLOCKED
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-300">
              Solana L1 non-custodial guarantee: Depositors can ALWAYS withdraw 100% of remaining funds directly to their wallet, even if the vault is frozen or operator disappears.
            </p>
          </div>
          <button
            onClick={handleEmergencyExit}
            disabled={activeAttack !== null}
            className="shrink-0 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5 text-xs font-bold text-black transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-emerald-500/20"
          >
            {activeAttack === "EMERGENCY_EXIT"
              ? "Withdrawing..."
              : "Emergency Depositor Exit (100% Capital)"}
          </button>
        </div>
      </div>
    </div>
  );
}
