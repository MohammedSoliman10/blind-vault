"use client";

import React, { useState } from "react";
import {
  DEPLOYED_PROGRAM_ID,
  MAGICBLOCK_VALIDATOR,
  DEMO_TARGET_MINT,
  dispatchAttackPeekStrategy,
  ActionResult,
} from "../lib/solana/arena-actions";

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
    <div className="rounded-2xl border border-[#1e2433] bg-[#0d0f17] p-5 shadow-xl">
      {/* Top Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2433] pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-white tracking-tight">
              Vault Architecture X-Ray
            </span>
            <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[11px] font-medium text-sky-300">
              Dual-Layer Security
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            Compare public on-chain risk guardrails against private hardware-enclosed trading alpha.
          </p>
        </div>
        <div>
          {isHalted ? (
            <span className="inline-flex items-center rounded-full border border-red-500/50 bg-red-950/40 px-3 py-1 text-xs font-bold text-red-400 animate-pulse">
              <span className="mr-1.5 h-2 w-2 rounded-full bg-red-500"></span>
              CIRCUIT BREAKER HALTED
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-950/30 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              L1 Risk Firewall Active
            </span>
          )}
        </div>
      </div>

      {/* Side-by-side Split View */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* LEFT PANEL: Public Solana Devnet L1 */}
        <div className={`rounded-xl border p-4 transition-colors ${
          isHalted ? "border-red-500/40 bg-red-950/10" : "border-sky-500/20 bg-[#12151f]/80"
        }`}>
          <div className="flex items-center justify-between border-b border-[#1e2433] pb-2.5">
            <div className="flex items-center space-x-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isHalted ? "bg-red-400 animate-ping" : "bg-sky-400"}`}></span>
              <span className="text-xs font-bold tracking-wide text-white uppercase">
                Public Solana L1 Risk Firewall
              </span>
            </div>
            <span className="rounded bg-sky-950/60 px-2 py-0.5 text-[10px] font-medium text-sky-300 border border-sky-500/30">
              Immutable
            </span>
          </div>

          {/* Key Metrics */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-[#090a0f] p-3 border border-[#1e2433]">
              <span className="text-[11px] font-medium text-gray-400">Total Vault NAV</span>
              <div className="mt-0.5 text-lg font-bold font-mono text-white">
                ${tvlUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-gray-500">Asset: Demo USDC</span>
            </div>
            <div className="rounded-lg bg-[#090a0f] p-3 border border-[#1e2433]">
              <span className="text-[11px] font-medium text-gray-400">Your Depositor Balance</span>
              <div className="mt-0.5 text-lg font-bold font-mono text-emerald-300">
                {(depositorShares / 1000).toFixed(2)} Shares
              </div>
              <span className="text-[10px] text-gray-500">1 Share = $1.00 NAV</span>
            </div>
          </div>

          {/* Hard Guardrails */}
          <div className="mt-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-[#090a0f]/60 px-3 py-2 border border-[#1e2433]/60">
              <span className="text-gray-300">Single-Trade Position Cap:</span>
              <span className="font-mono font-semibold text-sky-300">
                20.0% NAV (Max ${(tvlUsdc * 0.2).toFixed(2)})
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#090a0f]/60 px-3 py-2 border border-[#1e2433]/60">
              <span className="text-gray-300">Target Mint Allowlist:</span>
              <span className="font-mono font-semibold text-gray-300" title={DEMO_TARGET_MINT}>
                {DEMO_TARGET_MINT.slice(0, 4)}...{DEMO_TARGET_MINT.slice(-4)} (Demo SOL)
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#090a0f]/60 px-3 py-2 border border-[#1e2433]/60">
              <span className="text-gray-300">Daily Drawdown Ceiling:</span>
              <span className="font-mono font-semibold text-amber-300">5.0% Rolling 24h</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-[#090a0f]/60 px-3 py-2 border border-[#1e2433]/60">
              <span className="text-gray-300">Custody Invariant:</span>
              <span className="font-medium text-emerald-400">Non-Custodial (Escape Hatch)</span>
            </div>
          </div>

          <div className="mt-3 text-right">
            <a
              href={`https://explorer.solana.com/address/${DEPLOYED_PROGRAM_ID}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 hover:underline"
            >
              Verify Program ID {DEPLOYED_PROGRAM_ID.slice(0, 4)}... on Solana Explorer ↗
            </a>
          </div>
        </div>

        {/* RIGHT PANEL: MagicBlock Intel TDX Enclave PER */}
        <div className="rounded-xl border border-indigo-500/30 bg-[#12151f]/80 p-4">
          <div className="flex items-center justify-between border-b border-[#1e2433] pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-400"></span>
              <span className="text-xs font-bold tracking-wide text-white uppercase">
                MagicBlock Intel TDX Enclave (PER)
              </span>
            </div>
            <span className="rounded bg-indigo-950/60 px-2 py-0.5 text-[10px] font-medium text-indigo-300 border border-indigo-500/30">
              Hardware Attested
            </span>
          </div>

          {/* Enclave State */}
          <div className="mt-3 rounded-lg bg-[#090a0f] p-3 border border-[#1e2433] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Hardware Attestation:</span>
              <span className="text-emerald-400 font-medium flex items-center">
                <span className="mr-1">🛡️</span> TDX Quote Verified
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">TEE Validator Node:</span>
              <span className="font-mono text-gray-300" title={MAGICBLOCK_VALIDATOR}>
                {MAGICBLOCK_VALIDATOR.slice(0, 6)}...{MAGICBLOCK_VALIDATOR.slice(-4)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Sealed Strategy State:</span>
              <span className="font-medium text-indigo-300">Delegated to Intel TDX PER</span>
            </div>
          </div>

          {/* Redacted Secret Strategy Parameters */}
          <div className="mt-3 rounded-lg bg-indigo-950/20 p-3 border border-indigo-500/30 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Buy Catalyst Trigger:</span>
              <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[11px] text-indigo-300 font-semibold tracking-wider">
                [REDACTED BY PER ACL]
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Sell Catalyst Trigger:</span>
              <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[11px] text-indigo-300 font-semibold tracking-wider">
                [REDACTED BY PER ACL]
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Model Formula &amp; Alpha:</span>
              <span className="rounded bg-black/60 px-2 py-0.5 font-mono text-[11px] text-indigo-300 font-semibold tracking-wider">
                [ENCLAVE ENCRYPTED]
              </span>
            </div>
          </div>

          {/* Live Peek Trigger */}
          <div className="mt-3.5">
            <button
              onClick={handlePeekEnclave}
              disabled={peekLoading}
              className="w-full rounded-lg border border-indigo-500/40 bg-indigo-600/20 py-2 text-xs font-semibold text-indigo-200 transition-colors hover:bg-indigo-600/30 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>🔍</span>
              <span>{peekLoading ? "Testing Hardware Gate..." : "Inspect Enclave: Attempt Unauthorized Read"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
