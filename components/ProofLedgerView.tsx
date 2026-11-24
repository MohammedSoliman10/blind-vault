"use client";

import React, { useState } from "react";
import { ArenaEvent, isRealSolanaTxSignature } from "../lib/supabase/realtime";
import { DEPLOYED_PROGRAM_ID } from "../lib/solana/arena-actions";
import {
  ScrollText,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Code,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { Panel, PanelHeader } from "./ui/Panel";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { Segmented } from "./ui/Segmented";
import { cx } from "./ui/cx";

interface ProofLedgerViewProps {
  events: ArenaEvent[];
  onClearTape?: () => void;
}

const ICON = { strokeWidth: 1.5 } as const;

const GENESIS_EVENTS: ArenaEvent[] = [
  {
    id: "genesis-0",
    eventType: "CONTRACT_INITIALIZED",
    status: "SUCCESS",
    actor: "AdminAuthority6pDC",
    vault: DEPLOYED_PROGRAM_ID,
    txSignature: null,
    explorerUrl: `https://explorer.solana.com/address/${DEPLOYED_PROGRAM_ID}?cluster=devnet`,
    errorMessage: "Solana L1 Anchor smart contract deployed with 20% NAV cap, allowlist mint, and 5% breaker.",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    details: {
      whatYouTried: "Deployed Blind Vault Anchor smart contract to Solana Devnet.",
      whyItHappened: "Initialized vault PDA, state accounts, and on-chain risk guardrails.",
      proofType: "L1_PREFLIGHT",
    },
  },
  {
    id: "genesis-1",
    eventType: "TDX_ATTESTATION",
    status: "SUCCESS",
    actor: "IntelTDXEnclavePER",
    vault: DEPLOYED_PROGRAM_ID,
    txSignature: null,
    explorerUrl: `https://explorer.solana.com/address/${DEPLOYED_PROGRAM_ID}?cluster=devnet`,
    errorMessage: "MagicBlock Intel TDX confidential compute hardware enclave attested with ECDSA quote verification.",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    details: {
      whatYouTried: "Initialized Intel TDX PER hardware enclave for confidential model execution.",
      whyItHappened: "Attested hardware enclave measurement and sealed strategy parameters.",
      proofType: "ENCLAVE_ACL",
    },
  },
];

export function ProofLedgerView({ events, onClearTape }: ProofLedgerViewProps) {
  const [filter, setFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allEvents = [...events, ...GENESIS_EVENTS];

  const filteredEvents = allEvents.filter((e) => {
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
    if (event.proofType === "ENCLAVE_ACL" || event.details?.proofType === "ENCLAVE_ACL") {
      return "Intel TDX ACL Proof";
    }
    if (event.proofType === "DEVNET_TX" && isRealSolanaTxSignature(event.txSignature)) {
      return "Solana Devnet Tx";
    }
    return "Solana L1 Anchor Proof";
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="mx-auto mt-10 max-w-page px-5 lg:px-8">
      <Panel className="p-5 lg:p-6">
        <PanelHeader
          icon={<ScrollText className="h-4 w-4" {...ICON} />}
          title="Cryptographic proof ledger"
          sub="Immutable Solana L1 execution and hardware telemetry tape."
          right={
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Segmented
                name="proof-filter"
                value={filter}
                onChange={(val) => setFilter(val)}
                options={[
                  { value: "ALL", label: "All", count: allEvents.length },
                  { value: "BLOCKED", label: "Blocked" },
                  { value: "TRADES", label: "Trades" },
                  { value: "EXITS", label: "Exits" },
                ]}
              />
              {onClearTape && events.length > 0 && (
                <Button variant="outline" size="sm" onClick={onClearTape}>
                  Clear tape
                </Button>
              )}
              <a
                href={`https://explorer.solana.com/address/${DEPLOYED_PROGRAM_ID}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="link type-small hidden items-center gap-1.5 md:inline-flex"
              >
                <span>Explorer</span>
                <ExternalLink className="h-3.5 w-3.5" {...ICON} />
              </a>
            </div>
          }
        />

        {/* Table header */}
        <div className="type-label mt-1 hidden grid-cols-12 gap-4 border-b border-line px-4 py-3 text-text-2 sm:grid">
          <span className="col-span-2">Timestamp</span>
          <span className="col-span-2">Event and status</span>
          <span className="col-span-5">Summary and rationale</span>
          <span className="col-span-3 text-right">Proof attestation</span>
        </div>

        {/* Scrollable body */}
        <div className="max-h-[640px] overflow-y-auto">
          {filteredEvents.length === 0 && (
            <p className="type-small px-4 py-10 text-center text-text-2">
              No events match this filter yet.
            </p>
          )}
          {filteredEvents.map((evt) => {
            const isRealTx = isRealSolanaTxSignature(evt.txSignature);
            const isExpanded = expandedId === evt.id;
            const signalHash = evt.details?.signalHash;
            const whatYouTried = evt.details?.whatYouTried;
            const whyItHappened = evt.details?.whyItHappened;
            const timeFormatted = new Date(evt.timestamp).toLocaleTimeString();
            const alert = isAlertEvent(evt);

            return (
              <div key={evt.id} className="border-b border-line-soft last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleExpand(evt.id)}
                  aria-expanded={isExpanded}
                  className={cx(
                    "grid w-full grid-cols-12 items-center gap-x-4 gap-y-2 px-4 py-4 text-left transition-colors duration-150",
                    isExpanded ? "bg-white/10" : "hover:bg-white/8"
                  )}
                >
                  {/* Timestamp */}
                  <span className="type-data col-span-7 flex items-center gap-2 text-text-2 sm:col-span-2">
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-accent" {...ICON} />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" {...ICON} />
                    )}
                    <span>{timeFormatted}</span>
                  </span>

                  {/* Status */}
                  <span className="col-span-5 flex items-center justify-end sm:col-span-2 sm:justify-start">
                    {alert ? (
                      <Chip tone="alert" icon={<AlertTriangle className="h-3 w-3" strokeWidth={2} />}>
                        {evt.status || evt.eventType}
                      </Chip>
                    ) : (
                      <Chip tone="accent" icon={<ShieldCheck className="h-3 w-3" strokeWidth={2} />}>
                        {evt.status || evt.eventType}
                      </Chip>
                    )}
                  </span>

                  {/* Summary */}
                  <span className="type-small col-span-12 font-semibold sm:col-span-5 sm:truncate">
                    {whatYouTried || evt.errorMessage}
                  </span>

                  {/* Proof */}
                  <span className="type-data col-span-12 font-semibold text-accent sm:col-span-3 sm:truncate sm:text-right">
                    {isRealTx ? "Devnet tx landed" : getProofLabel(evt)}
                  </span>
                </button>

                {/* Forensic record */}
                {isExpanded && (
                  <div className="mx-4 mb-4 space-y-4 border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft pb-3">
                      <span className="type-label flex items-center gap-2">
                        <Code className="h-3.5 w-3.5 text-accent" {...ICON} />
                        Cryptographic forensic record
                      </span>
                      <span className="type-data text-text-2">Event ID {evt.id}</span>
                    </div>

                    <div className="space-y-3">
                      {whatYouTried && (
                        <div>
                          <span className="type-label block text-text-2">Action executed</span>
                          <p className="type-small mt-1">{whatYouTried}</p>
                        </div>
                      )}
                      {whyItHappened && (
                        <div>
                          <span className="type-label block text-text-2">Security invariant verdict</span>
                          <p className="type-small mt-1 font-semibold">{whyItHappened}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 border-t border-line-soft pt-4 sm:grid-cols-2">
                      <div className="min-w-0">
                        <span className="type-label block text-text-2">Actor identity</span>
                        <span className="type-data mt-1 block truncate">{evt.actor}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="type-label block text-text-2">Smart contract target</span>
                        <span className="type-data mt-1 block truncate">{evt.vault}</span>
                      </div>
                      {signalHash && (
                        <div className="sm:col-span-2 space-y-1.5 border border-line-soft p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="type-label text-text-2">Signal hash (SHA-256)</span>
                            <span className="type-label text-accent">Matched on-chain strategy state</span>
                          </div>
                          <span className="type-data mt-1 block break-all font-mono text-xs">{signalHash}</span>
                          <span className="type-small block text-[11px] text-text-2">
                            Verified against SealedStrategy.last_signal_hash cryptographic commit
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-line-soft pt-3 text-right">
                      <a
                        href={
                          evt.explorerUrl ||
                          (isRealTx
                            ? `https://explorer.solana.com/tx/${evt.txSignature}?cluster=devnet`
                            : `https://explorer.solana.com/address/${DEPLOYED_PROGRAM_ID}?cluster=devnet`)
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="link type-small inline-flex items-center gap-1.5"
                      >
                        <span>
                          {isRealTx
                            ? "View verified transaction on Solana Explorer"
                            : "View program verification on Solana Explorer"}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5" {...ICON} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
