"use client";

import React, { useState } from "react";
import { ArenaEvent, isRealSolanaTxSignature } from "../lib/supabase/realtime";
import { DEPLOYED_PROGRAM_ID } from "../lib/solana/arena-actions";
import { AlertTriangle, ShieldCheck } from "lucide-react";

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

  const isAlertEvent = (event: ArenaEvent) => {
    return (
      event.status === "BLOCKED" ||
      event.eventType === "CIRCUIT_BREAKER_TRIPPED" ||
      event.status === "HALTED"
    );
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
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/20 bg-background text-white">
      {/* Dock Header Bar */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 pl-24 sm:pl-28">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs font-bold font-body tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent"></span>
            </span>
            <span>Real-Time Cryptographic Proof Tape</span>
            <span className="chip-inactive text-[10px] py-0.2 px-2 font-mono">
              {events.length} Events
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="hidden sm:flex items-center space-x-1.5 text-xs font-body">
            {["ALL", "BLOCKED", "TRADES", "EXITS"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-full px-3 py-0.5 text-xs transition-colors font-semibold ${
                  filter === tab
                    ? "bg-accent text-background"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-body">
          {onClearTape && events.length > 0 && (
            <button
              onClick={onClearTape}
              className="text-white/70 hover:text-white text-xs underline"
              title="Clear event history"
            >
              Clear
            </button>
          )}
          <a
            href={`https://explorer.solana.com/address/${DEPLOYED_PROGRAM_ID}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-block text-accent hover:underline text-xs font-bold"
          >
            Program Explorer ↗
          </a>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="button-outline text-xs py-0.5 px-3 rounded-full"
          >
            {isExpanded ? "▼ Collapse" : "▲ Expand"}
          </button>
        </div>
      </div>

      {/* Streaming Event Ledger Body */}
      {isExpanded && (
        <div className="max-h-56 overflow-y-auto border-t border-white/20 bg-background px-4 py-2 text-xs sm:px-6 pl-24 sm:pl-28 font-body">
          {filteredEvents.length === 0 ? (
            <div className="py-5 text-center text-white/70 italic type-small">
              No events recorded yet. Trigger an attack above or run a news catalyst trade to stream real-time proofs.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredEvents.map((evt) => {
                const isRealTx = isRealSolanaTxSignature(evt.txSignature);
                const alert = isAlertEvent(evt);
                return (
                  <div
                    key={evt.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 gap-2 hover:bg-white/5 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <span className="font-mono text-[11px] text-white/70 shrink-0">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                      {alert ? (
                        <span className="badge-alert text-[10px] py-0.2 px-2 shrink-0">
                          <AlertTriangle className="w-3 h-3 text-white" />
                          <span>{evt.status || evt.eventType}</span>
                        </span>
                      ) : (
                        <span className="chip-active text-[10px] py-0.2 px-2 shrink-0">
                          <ShieldCheck className="w-3 h-3 text-background" />
                          <span>{evt.status || evt.eventType}</span>
                        </span>
                      )}
                      <span className="font-body text-xs text-white truncate font-medium">
                        {evt.details?.whatYouTried || evt.errorMessage}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 text-xs">
                      <span className="chip-inactive text-[10px] py-0.2 px-2 font-mono">
                        {getProofLabel(evt)}
                      </span>
                      {isRealTx && (
                        <a
                          href={evt.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] text-accent hover:underline font-bold"
                        >
                          Devnet Tx ↗
                        </a>
                      )}
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

export default ProofTape;
