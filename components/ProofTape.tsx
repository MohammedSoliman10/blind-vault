"use client";

import React, { useState } from "react";
import { ArenaEvent, isRealSolanaTxSignature } from "../lib/supabase/realtime";
import { DEPLOYED_PROGRAM_ID } from "../lib/solana/arena-actions";

interface ProofTapeProps {
  events: ArenaEvent[];
  onClearTape?: () => void;
}

export function ProofTape({ events, onClearTape }: ProofTapeProps) {
  const [filter, setFilter] = useState<string>("ALL");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const filteredEvents = events.filter((e) => {
    if (filter === "ALL") return true;
    if (filter === "BLOCKED") return e.status === "BLOCKED";
    if (filter === "TRADES") return e.eventType === "TRADE_EXECUTED";
    if (filter === "EXITS") return e.eventType === "EMERGENCY_EXIT_EXECUTED";
    return true;
  });

  const getBadgeStyle = (event: ArenaEvent) => {
    if (event.status === "BLOCKED") {
      return "border-red-500/40 bg-red-950/40 text-red-300";
    }
    if (event.eventType === "CIRCUIT_BREAKER_TRIPPED" || event.status === "HALTED") {
      return "border-amber-500/40 bg-amber-950/40 text-amber-300";
    }
    if (event.eventType === "EMERGENCY_EXIT_EXECUTED") {
      return "border-purple-500/40 bg-purple-950/40 text-purple-300";
    }
    return "border-emerald-500/40 bg-emerald-950/40 text-emerald-300";
  };

  const getProofLabel = (event: ArenaEvent) => {
    if (event.proofType === "ENCLAVE_ACL") {
      return "Enclave ACL Proof";
    }
    if (event.proofType === "DEVNET_TX" && isRealSolanaTxSignature(event.txSignature)) {
      return "Devnet Tx Landed";
    }
    return "L1 Preflight Proof";
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#1e2433] bg-[#090a0f]/95 backdrop-blur-md shadow-2xl transition-all">
      {/* Dock Header Bar with padding-left to clear Next.js dev badge */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 pl-24 sm:pl-28">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-white tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>Real-Time Cryptographic Proof Tape</span>
            <span className="rounded-full bg-[#12151f] px-2 py-0.5 text-[10px] font-mono text-gray-400 border border-[#1e2433]">
              {events.length} Events
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="hidden sm:flex items-center space-x-1 text-xs">
            {["ALL", "BLOCKED", "TRADES", "EXITS"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
                  filter === tab
                    ? "bg-[#1e2433] text-white font-semibold"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          {onClearTape && events.length > 0 && (
            <button
              onClick={onClearTape}
              className="text-gray-500 hover:text-gray-300 text-xs"
              title="Clear event history"
            >
              Clear
            </button>
          )}
          <a
            href={`https://explorer.solana.com/address/${DEPLOYED_PROGRAM_ID}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-block text-sky-400 hover:underline text-xs"
          >
            Program Explorer ↗
          </a>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg border border-[#1e2433] bg-[#12151f] px-2.5 py-1 text-xs text-gray-300 hover:text-white"
          >
            {isExpanded ? "▼ Collapse" : "▲ Expand"}
          </button>
        </div>
      </div>

      {/* Streaming Event Ledger Body */}
      {isExpanded && (
        <div className="max-h-56 overflow-y-auto border-t border-[#1e2433]/70 bg-[#0c0e15] px-4 py-2 text-xs sm:px-6 pl-24 sm:pl-28">
          {filteredEvents.length === 0 ? (
            <div className="py-5 text-center text-gray-500 italic">
              No events recorded yet. Trigger an attack above or run a news catalyst trade to stream real-time proofs.
            </div>
          ) : (
            <div className="divide-y divide-[#1e2433]/50">
              {filteredEvents.map((evt) => {
                const isRealTx = isRealSolanaTxSignature(evt.txSignature);
                return (
                  <div
                    key={evt.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 gap-2 hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <span className="font-mono text-[11px] text-gray-500 shrink-0">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase shrink-0 ${getBadgeStyle(
                          evt
                        )}`}
                      >
                        {evt.status === "BLOCKED" ? "DEFENDED" : evt.eventType.replace(/_/g, " ")}
                      </span>
                      <span className="truncate text-gray-200 text-xs font-normal">
                        {evt.errorMessage || "Action verified"}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 text-right">
                      {evt.errorCode && (
                        <span className="font-mono text-red-400 font-semibold text-[11px]">
                          [{evt.errorCode}]
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400 font-medium">
                        {getProofLabel(evt)}
                      </span>
                      <a
                        href={evt.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 hover:text-sky-300 hover:underline text-xs shrink-0 font-medium"
                      >
                        {isRealTx ? "Inspect Tx ↗" : "Verify Program ↗"}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
