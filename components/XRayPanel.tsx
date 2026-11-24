"use client";

import React, { useState } from "react";
import {
  DEMO_TARGET_MINT,
  dispatchAttackPeekStrategy,
  ActionResult,
} from "../lib/solana/arena-actions";
import { AlertTriangle, ShieldCheck } from "lucide-react";

interface XRayPanelProps {
  isHalted: boolean;
  tvlUsdc: number;
  depositorShares: number;
  actorAddress: string;
  onActionResult: (result: ActionResult) => void;
}

export function XRayPanel({
  isHalted,
  tvlUsdc,
  depositorShares,
  actorAddress,
  onActionResult,
}: XRayPanelProps) {
  const [peekLoading, setPeekLoading] = useState(false);

  const handlePeekEnclave = async () => {
    setPeekLoading(true);
    try {
      const result = await dispatchAttackPeekStrategy(actorAddress);
      onActionResult(result);
    } finally {
      setPeekLoading(false);
    }
  };

  return (
    <div className="rounded-[24px] border border-white/20 bg-background p-5">
      {/* Top Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/20 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="type-h3 text-white">
              Vault Architecture X-Ray
            </span>
            <span className="chip-active text-xs py-0.5 px-2.5">
              Dual-Layer Security
            </span>
          </div>
          <p className="type-small text-white/80 mt-0.5">
            Compare public on-chain risk guardrails against private hardware-enclosed trading alpha.
          </p>
        </div>
        <div>
          {isHalted ? (
            <span className="badge-alert text-xs py-0.5 px-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
              <span>CIRCUIT BREAKER HALTED</span>
            </span>
          ) : (
            <span className="chip-active text-xs py-0.5 px-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-background" />
              <span>L1 Risk Firewall Active</span>
            </span>
          )}
        </div>
      </div>

      {/* Side-by-side Split View */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* LEFT PANEL: Public Solana Devnet L1 */}
        <div className="rounded-[20px] border border-white/20 bg-background p-4">
          <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isHalted ? "bg-white" : "bg-accent"}`}></span>
              <span className="type-label text-white">
                Public Solana L1 Risk Firewall
              </span>
            </div>
            <span className="chip-inactive text-[10px] py-0.2 px-2">
              Immutable
            </span>
          </div>

          {/* Key Metrics */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-[16px] bg-background p-3 border border-white/20">
              <span className="type-label text-accent block">Total Vault NAV</span>
              <div className="mt-1 text-xl font-bold font-heading text-white">
                ${tvlUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="type-small text-white/70 block mt-0.5">Asset: Demo USDC</span>
            </div>
            <div className="rounded-[16px] bg-background p-3 border border-white/20">
              <span className="type-label text-accent block">Your Depositor Balance</span>
              <div className="mt-1 text-xl font-bold font-heading text-white">
                ${(depositorShares / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="type-small text-white/70 block mt-0.5">{(depositorShares / 1000).toFixed(0)} Vault Shares</span>
            </div>
          </div>

          {/* Anchor Constraints */}
          <div className="mt-3 space-y-2 text-xs font-body">
            <div className="flex items-center justify-between rounded-xl bg-background px-3 py-2 border border-white/20">
              <span className="text-white/80">Max Swap Position Cap:</span>
              <span className="font-mono font-bold text-accent">
                20.0% of NAV (${(tvlUsdc * 0.2).toFixed(2)})
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background px-3 py-2 border border-white/20">
              <span className="text-white/80">Drawdown Circuit Breaker:</span>
              <span className="font-mono font-bold text-white">
                5.0% Rolling Auto-Halt
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background px-3 py-2 border border-white/20">
              <span className="text-white/80">Vault State:</span>
              {isHalted ? (
                <span className="badge-alert text-[10px] py-0.2 px-2">
                  <AlertTriangle className="w-3 h-3 text-white" />
                  <span>HALTED (DEPOSITS FROZEN)</span>
                </span>
              ) : (
                <span className="chip-active text-[10px] py-0.2 px-2">
                  ACTIVE &amp; SOLVENT
                </span>
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background px-3 py-2 border border-white/20">
              <span className="text-white/80">Allowed Swap Target:</span>
              <span className="font-mono text-xs text-white">
                {DEMO_TARGET_MINT.slice(0, 4)}...{DEMO_TARGET_MINT.slice(-4)} (Allowed)
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Private Intel TDX Enclave */}
        <div className="rounded-[20px] border border-white/20 bg-background p-4">
          <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-accent"></span>
              <span className="type-label text-white">
                Private Intel TDX Enclave
              </span>
            </div>
            <span className="chip-active text-[10px] py-0.2 px-2">
              Hardware Encrypted
            </span>
          </div>

          <div className="mt-3 rounded-[16px] bg-background p-3.5 border border-white/20 text-xs space-y-2 font-body">
            <div className="flex items-center justify-between">
              <span className="text-white/80">Strategy Model:</span>
              <span className="font-body font-bold text-white">DeepSeek-V3 / Gemini Flash</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Confidential Runtime:</span>
              <span className="font-body font-semibold text-white">Intel TDX PER Validator</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Memory State:</span>
              <span className="font-mono text-accent font-bold">AES-128-XTS Encrypted</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Attestation Engine:</span>
              <span className="font-body font-semibold text-white">MagicBlock TEE / Devnet</span>
            </div>
          </div>

          <div className="mt-3">
            <button
              onClick={handlePeekEnclave}
              disabled={peekLoading}
              className="button-outline w-full text-xs py-2.5 px-4 rounded-full font-bold disabled:opacity-50"
            >
              {peekLoading ? "Attempting Unauthorized Enclave Read..." : "Attempt Unauthorized Enclave Read →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default XRayPanel;
