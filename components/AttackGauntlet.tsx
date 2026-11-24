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
import { AlertTriangle } from "lucide-react";

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
    <div className="rounded-[24px] border border-white/20 bg-background p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/20 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="type-h3 text-white">
              &quot;Try to Rug It&quot; Adversarial Attack Gauntlet
            </span>
            <span className="chip-active text-xs py-0.5 px-2.5">
              Interactive Exploit Test
            </span>
          </div>
          <p className="type-small text-white/80 mt-1">
            Click any exploit button below to test our on-chain security invariants against real attack scenarios.
          </p>
        </div>
        <span className="type-small text-accent font-semibold">
          Zero-risk sandbox execution
        </span>
      </div>

      {/* 4 Attack Buttons Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* ATTACK 1 */}
        <button
          onClick={() => handleRunAttack("PEEK_STRATEGY", dispatchAttackPeekStrategy)}
          disabled={activeAttack !== null}
          className="group relative flex flex-col justify-between rounded-[20px] border border-white/20 bg-background p-4 text-left transition-colors hover:border-white hover:bg-white/5 disabled:opacity-50"
        >
          <div>
            <div className="type-label text-accent">
              <span>Attack 1</span>
            </div>
            <div className="mt-1 text-sm font-bold text-white font-body group-hover:text-accent">
              Spy / Read Strategy
            </div>
            <p className="type-small text-white/80 mt-1 leading-snug">
              Attempt to read secret trading parameters directly from the Intel TDX enclave.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-2.5 text-xs text-accent font-body font-bold">
            <span>Enclave Gate</span>
            <span>{activeAttack === "PEEK_STRATEGY" ? "Testing..." : "Try Exploit →"}</span>
          </div>
        </button>

        {/* ATTACK 2 */}
        <button
          onClick={() => handleRunAttack("OPERATOR_WITHDRAW", dispatchAttackOperatorTheft)}
          disabled={activeAttack !== null}
          className="group relative flex flex-col justify-between rounded-[20px] border border-white/20 bg-background p-4 text-left transition-colors hover:border-white hover:bg-white/5 disabled:opacity-50"
        >
          <div>
            <div className="type-label text-accent">
              <span>Attack 2</span>
            </div>
            <div className="mt-1 text-sm font-bold text-white font-body group-hover:text-accent">
              Operator Rug Pull
            </div>
            <p className="type-small text-white/80 mt-1 leading-snug">
              A rogue strategist attempts an unauthorized withdrawal to steal depositor funds.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-2.5 text-xs text-accent font-body font-bold">
            <span>has_one Anchor</span>
            <span>{activeAttack === "OPERATOR_WITHDRAW" ? "Testing..." : "Try Exploit →"}</span>
          </div>
        </button>

        {/* ATTACK 3 */}
        <button
          onClick={() => handleRunAttack("OVERSIZED_SWAP", dispatchAttackOversizedSwap)}
          disabled={activeAttack !== null}
          className="group relative flex flex-col justify-between rounded-[20px] border border-white/20 bg-background p-4 text-left transition-colors hover:border-white hover:bg-white/5 disabled:opacity-50"
        >
          <div>
            <div className="type-label text-accent">
              <span>Attack 3</span>
            </div>
            <div className="mt-1 text-sm font-bold text-white font-body group-hover:text-accent">
              Oversized 90% Swap
            </div>
            <p className="type-small text-white/80 mt-1 leading-snug">
              Attempt an unapproved swap exceeding the 20% NAV position cap into a random token.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-2.5 text-xs text-accent font-body font-bold">
            <span>20% Risk Cap</span>
            <span>{activeAttack === "OVERSIZED_SWAP" ? "Testing..." : "Try Exploit →"}</span>
          </div>
        </button>

        {/* ATTACK 4 */}
        <button
          onClick={() => handleRunAttack("CRASH_BREAKER", dispatchAttackCrashBreaker)}
          disabled={activeAttack !== null}
          className="group relative flex flex-col justify-between rounded-[20px] border border-white/20 bg-background p-4 text-left transition-colors hover:border-white hover:bg-white/5 disabled:opacity-50"
        >
          <div>
            <div className="type-label text-accent">
              <span>Attack 4</span>
            </div>
            <div className="mt-1 text-sm font-bold text-white font-body group-hover:text-accent">
              -6% Flash Crash
            </div>
            <p className="type-small text-white/80 mt-1 leading-snug">
              Simulate rapid market drawdown to trip the 5% rolling loss circuit breaker.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-2.5 text-xs text-accent font-body font-bold">
            <span>Drawdown Breaker</span>
            <span>{activeAttack === "CRASH_BREAKER" ? "Testing..." : "Try Exploit →"}</span>
          </div>
        </button>
      </div>

      {/* Emergency Depositor Recovery Card */}
      <div className="mt-4 rounded-[20px] border border-white/20 bg-background p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-accent font-body">
                Permanent Depositor Escape Hatch
              </span>
              {isHalted && (
                <span className="badge-alert text-xs py-0.5 px-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                  <span>VAULT HALTED — ESCAPE HATCH UNLOCKED</span>
                </span>
              )}
            </div>
            <p className="type-small text-white/80 mt-1">
              Solana L1 non-custodial guarantee: Depositors can ALWAYS withdraw 100% of remaining funds directly to their wallet, even if the vault is frozen or operator disappears.
            </p>
          </div>
          <button
            onClick={handleEmergencyExit}
            disabled={activeAttack !== null}
            className="badge-alert shrink-0 py-2.5 px-4 text-xs font-bold rounded-full cursor-pointer disabled:opacity-50"
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
