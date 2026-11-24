"use client";

import React, { useState } from "react";
import {
  dispatchAttackOperatorTheft,
  dispatchAttackOversizedSwap,
  dispatchAttackPromptInjection,
  dispatchAttackCrashBreaker,
  dispatchEmergencyExit,
  dispatchCustomSwap,
  dispatchMarketShock,
  ActionResult,
} from "../lib/solana/arena-actions";
import { isRealSolanaTxSignature } from "../lib/supabase/realtime";
import {
  Zap,
  SlidersHorizontal,
  ExternalLink,
  ShieldCheck,
  UserX,
  TrendingUp,
  BrainCircuit,
  Play,
  AlertTriangle,
} from "lucide-react";
import { Panel, PanelHeader } from "./ui/Panel";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { cx } from "./ui/cx";

interface AttackLabViewProps {
  actorAddress: string;
  isHalted: boolean;
  tvlUsdc: number;
  actionFeedback: ActionResult | null;
  onVaultHaltChange: (halted: boolean) => void;
  onDepositorExitSuccess: () => void;
  onActionResult: (result: ActionResult) => void;
  onCustomSwapSuccess?: (pnlPct: number) => void;
  onMarketShock?: (pct: number) => void;
  onMilestoneComplete?: (milestone: "tdxRead" | "cap20" | "breaker5" | "safeExit") => void;
}

const ICON = { strokeWidth: 1.5 } as const;

/** Slider geometry: the thumb centre travels from 7px to (100% - 7px). */
const along = (frac: number) => `calc(7px + (100% - 14px) * ${frac})`;

export function AttackLabView({
  actorAddress,
  tvlUsdc,
  actionFeedback,
  onVaultHaltChange,
  onDepositorExitSuccess,
  onActionResult,
  onCustomSwapSuccess,
  onMarketShock,
  onMilestoneComplete,
}: AttackLabViewProps) {
  const [tradeSizePct, setTradeSizePct] = useState<number>(35); // Defaults to breaching >20%
  const [marketShockPct, setMarketShockPct] = useState<number>(-6.0); // Defaults to tripping >5%
  const [activeAttack, setActiveAttack] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>("OVERSIZED_SWAP");

  const attackScenarios = [
    {
      id: "OPERATOR_THEFT",
      title: "Operator theft simulation",
      subtitle: "Attempt unauthorized vault drain by non-owner key",
      icon: <UserX className="h-4 w-4" {...ICON} />,
      actionFn: dispatchAttackOperatorTheft,
      guardType: "Anchor PDA Ownership",
    },
    {
      id: "OVERSIZED_SWAP",
      title: "Oversized 90% swap",
      subtitle: "Breach 20% trade diversification cap",
      icon: <TrendingUp className="h-4 w-4" {...ICON} />,
      actionFn: dispatchAttackOversizedSwap,
      guardType: "20% NAV Cap",
      milestone: "cap20" as const,
    },
    {
      id: "ROGUE_AI_INJECTION",
      title: "Prompt-injected rogue AI",
      subtitle: "Adversarial news payload forces 95% swap to unapproved mint",
      icon: <BrainCircuit className="h-4 w-4" {...ICON} />,
      actionFn: dispatchAttackPromptInjection,
      guardType: "20% Cap + Allowlist",
    },
    {
      id: "CRASH_BREAKER",
      title: "-6% flash crash",
      subtitle: "Trip 5% daily rolling loss circuit breaker",
      icon: <Zap className="h-4 w-4" {...ICON} />,
      actionFn: dispatchAttackCrashBreaker,
      guardType: "5% Breaker",
      milestone: "breaker5" as const,
    },
  ];

  const handleRunAttack = async (
    id: string,
    actionFn: (actor: string) => Promise<ActionResult>,
    milestone?: "tdxRead" | "cap20" | "breaker5" | "safeExit"
  ) => {
    setActiveAttack(id);
    setSelectedRow(id);
    try {
      const result = await actionFn(actorAddress);
      onActionResult(result);
      if (id === "CRASH_BREAKER") {
        onVaultHaltChange(true);
        onMarketShock?.(-6.12);
      }
      if (milestone) {
        if (milestone === "tdxRead") {
          if (result.proofType === "ENCLAVE_ACL") {
            onMilestoneComplete?.(milestone);
          }
        } else {
          onMilestoneComplete?.(milestone);
        }
      }
    } catch (err: any) {
      onActionResult({
        success: false,
        blocked: true,
        proofType: "L1_PREFLIGHT",
        whatYouTried: `You triggered the ${id} attack simulation.`,
        whyItHappened: err.message || "Attack rejected by on-chain validation.",
        errorMessage: err.message || "Attack failed",
        txSignature: null,
        explorerUrl: "https://explorer.solana.com/?cluster=devnet",
      });
    } finally {
      setActiveAttack(null);
    }
  };

  const handleRunCustomSwap = async () => {
    setActiveAttack("CUSTOM_SWAP");
    try {
      const result = await dispatchCustomSwap(tradeSizePct, tvlUsdc, actorAddress);
      onActionResult(result);
      if (result.success && !result.blocked) {
        onCustomSwapSuccess?.(12.5);
      }
      if (result.blocked && tradeSizePct > 20) {
        onMilestoneComplete?.("cap20");
      }
    } finally {
      setActiveAttack(null);
    }
  };

  const handleSimulateShock = async () => {
    setActiveAttack("SIMULATE_SHOCK");
    try {
      const result = await dispatchMarketShock(marketShockPct, actorAddress);
      onActionResult(result);
      onMarketShock?.(marketShockPct);
      const tripsBreaker = marketShockPct <= -5.0;
      if (tripsBreaker) {
        onVaultHaltChange(true);
        onMilestoneComplete?.("breaker5");
      }
    } catch (err: any) {
      onActionResult({
        success: false,
        blocked: true,
        proofType: "L1_PREFLIGHT",
        whatYouTried: `You triggered a ${marketShockPct.toFixed(1)}% market volatility shock on vault NAV.`,
        whyItHappened: err.message || "Market shock simulation failed.",
        errorMessage: err.message || "Shock failed",
        txSignature: null,
        explorerUrl: `https://explorer.solana.com/address/6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N?cluster=devnet`,
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
      onDepositorExitSuccess();
      onMilestoneComplete?.("safeExit");
    } finally {
      setActiveAttack(null);
    }
  };

  const swapDollarValue = (tvlUsdc * tradeSizePct) / 100;
  const isSwapBreached = tradeSizePct > 20.0;
  const isShockTripped = marketShockPct <= -5.0;
  const isRealTx = isRealSolanaTxSignature(actionFeedback?.txSignature);

  const tradeFrac = (tradeSizePct - 1) / 99;
  const capFrac = (20 - 1) / 99;
  const shockFrac = (marketShockPct + 10) / 20;
  const breakerFrac = (-5 + 10) / 20;

  const tradeTrack = `linear-gradient(to right, #BFF0FF 0, #BFF0FF calc(${capFrac * 100}% ), rgba(255,255,255,0.4) calc(${capFrac * 100}%), rgba(255,255,255,0.4) 100%)`;
  const shockTrack = `linear-gradient(to right, rgba(255,255,255,0.4) 0, rgba(255,255,255,0.4) ${breakerFrac * 25}%, #BFF0FF ${breakerFrac * 25}%, #BFF0FF 100%)`;

  return (
    <div className="mx-auto mt-10 grid max-w-page grid-cols-12 gap-6 px-5 lg:gap-8 lg:px-8">
      {/* LEFT: sandbox, probes, escape hatch */}
      <div className="col-span-12 flex min-w-0 flex-col gap-6 lg:col-span-6 lg:gap-8">
        <Panel className="p-5 lg:p-6">
          <PanelHeader
            icon={<SlidersHorizontal className="h-4 w-4" {...ICON} />}
            title="Boundary parameter sandbox"
            sub="Move a slider, then test it against the on-chain guardrail."
          />

          {/* Position size */}
          <div className="space-y-4 border-b border-line-soft py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="type-label">Position size (% NAV)</span>
              {isSwapBreached ? (
                <Chip tone="alert" icon={<AlertTriangle className="h-3 w-3" strokeWidth={2} />}>
                  {tradeSizePct}% (${swapDollarValue.toFixed(2)}) breaches 20% cap
                </Chip>
              ) : (
                <Chip tone="accent">
                  {tradeSizePct}% (${swapDollarValue.toFixed(2)}) permitted
                </Chip>
              )}
            </div>

            <div>
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={tradeSizePct}
                  aria-label="Position size as a percentage of NAV"
                  onChange={(e) => setTradeSizePct(Number(e.target.value))}
                  className="range"
                  style={{ ["--range-bg" as string]: tradeTrack } as React.CSSProperties}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-[3px] h-4 w-px bg-white"
                  style={{ left: along(capFrac) }}
                />
              </div>
              <div className="type-label relative mt-2 h-4 text-text-2">
                <span className="absolute left-0">1%</span>
                <span className="absolute -translate-x-1/2 text-accent" style={{ left: along(capFrac) }}>
                  20% cap
                </span>
                <span className="absolute right-0">100% all-in</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="type-small max-w-[46ch] flex-1 text-text-2">
                {isSwapBreached
                  ? "The order breaches the 20% position cap. The Solana L1 Anchor constraint ExceedsMaxPositionCap rejects it."
                  : "The order is inside the 20% NAV cap. Execution settles cleanly on Devnet."}
              </p>
              <Button
                variant={isSwapBreached ? "outline" : "primary"}
                size="sm"
                onClick={handleRunCustomSwap}
                disabled={activeAttack === "CUSTOM_SWAP"}
                icon={<Play className="h-3 w-3 fill-current" strokeWidth={1.5} />}
              >
                {activeAttack === "CUSTOM_SWAP" ? "Testing..." : "Test swap"}
              </Button>
            </div>
          </div>

          {/* Market shock */}
          <div className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="type-label">Market volatility shock</span>
              {isShockTripped ? (
                <Chip tone="alert" icon={<AlertTriangle className="h-3 w-3" strokeWidth={2} />}>
                  {marketShockPct.toFixed(1)}% trips the breaker
                </Chip>
              ) : (
                <Chip tone="accent">{marketShockPct.toFixed(1)}% safe range</Chip>
              )}
            </div>

            <div>
              <div className="relative">
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={marketShockPct}
                  aria-label="Market shock percentage"
                  onChange={(e) => setMarketShockPct(Number(e.target.value))}
                  className="range"
                  style={{ ["--range-bg" as string]: shockTrack } as React.CSSProperties}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-[3px] h-4 w-px bg-white"
                  style={{ left: along(breakerFrac) }}
                />
              </div>
              <div className="type-label relative mt-2 h-4 text-text-2">
                <span className="absolute left-0">-10% crash</span>
                <span className="absolute -translate-x-1/2 text-accent" style={{ left: along(breakerFrac) }}>
                  -5% halt
                </span>
                <span className="absolute right-0">+10% rally</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="type-small max-w-[46ch] flex-1 text-text-2">
                {isShockTripped
                  ? "The loss exceeds the 5.0% limit. The on-chain vault freezes and locks all new trades."
                  : "The loss is inside the daily tolerance. The vault stays operational."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulateShock}
                icon={<Zap className="h-3.5 w-3.5 text-accent" {...ICON} />}
              >
                Simulate shock
              </Button>
            </div>
          </div>
        </Panel>

        {/* One-click probes */}
        <section aria-label="One-click exploits and adversarial probes">
          <h3 className="type-label mb-3 text-text-2">One-click exploits and adversarial probes</h3>
          <div className="grid grid-cols-1 gap-px border border-line bg-line-soft sm:grid-cols-3">
            {attackScenarios.map((sc, i) => {
              const selected = selectedRow === sc.id;
              return (
                <button
                  type="button"
                  key={sc.id}
                  onClick={() => handleRunAttack(sc.id, sc.actionFn, sc.milestone)}
                  disabled={!!activeAttack}
                  aria-pressed={selected}
                  className={cx(
                    "flex flex-col gap-4 p-4 text-left transition-colors duration-150 disabled:opacity-50",
                    selected ? "bg-white text-blue" : "bg-background hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-label flex items-center gap-2">
                      <span className={selected ? "text-blue" : "text-accent"}>#{i + 1}</span>
                      <span className={cx("inline-flex", selected ? "text-blue" : "text-accent")}>{sc.icon}</span>
                    </span>
                    <Chip tone={selected ? "ink" : "outline"}>{activeAttack === sc.id ? "Running" : "Test"}</Chip>
                  </div>
                  <div>
                    <span className="type-small block font-semibold">{sc.title}</span>
                    <span className={cx("type-small mt-1 block", selected ? "text-blue/80" : "text-text-2")}>
                      {sc.subtitle}
                    </span>
                  </div>
                  <div
                    className={cx(
                      "type-label mt-auto border-t pt-3",
                      selected ? "border-blue/25 text-blue" : "border-line-soft text-text-2"
                    )}
                  >
                    Guardrail
                    <span className={cx("mt-1 block font-semibold normal-case tracking-normal", selected ? "text-blue" : "text-accent")}>
                      {sc.guardType}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Emergency exit */}
        <Button
          variant="danger"
          size="lg"
          fullWidth
          onClick={handleEmergencyExit}
          disabled={activeAttack === "EMERGENCY_EXIT"}
          icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.75} />}
        >
          {activeAttack === "EMERGENCY_EXIT"
            ? "Redeeming 100% of funds on-chain..."
            : "Emergency depositor exit (100% non-custodial claim)"}
        </Button>
      </div>

      {/* RIGHT: verdict + autopsy (sticky, so a result stays in view beside the probes) */}
      <div className="col-span-12 flex min-w-0 flex-col gap-6 lg:sticky lg:top-24 lg:col-span-6 lg:gap-8 lg:self-start">
        <Panel className="flex min-h-[480px] flex-col p-5 lg:p-6">
          <PanelHeader
            icon={<ShieldCheck className="h-4 w-4" {...ICON} />}
            title="Security verdict and on-chain autopsy"
            right={<Chip tone="accent">Active defense</Chip>}
          />

          <div className="flex-1 py-5">
            {activeAttack ? (
              <div key="loading" className="flex h-full min-h-[260px] items-center justify-center text-center">
                <span className="type-data animate-pulse text-accent">
                  Executing exploit probe against Solana Devnet Anchor constraints...
                </span>
              </div>
            ) : actionFeedback ? (
              <div key="feedback" className="space-y-4">
                <div className="space-y-1.5 border border-line p-4">
                  <span className="type-label block text-text-2">Attack vector submitted</span>
                  <p className="type-small">{actionFeedback.whatYouTried}</p>
                </div>

                <div
                  className={cx(
                    "space-y-1.5 p-4",
                    actionFeedback.blocked ? "panel-alert" : "border border-accent"
                  )}
                  role="status"
                >
                  <span className={cx("type-label block", actionFeedback.blocked ? "text-white" : "text-text-2")}>
                    Defense verdict and invariant triggered
                  </span>
                  <p className={cx("type-small font-semibold", !actionFeedback.blocked && "text-accent")}>
                    {actionFeedback.whyItHappened}
                  </p>
                </div>

                <div className="border border-line">
                  <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line-soft p-4">
                    <span className="type-label text-text-2">Verification proof</span>
                    <span className="type-data font-semibold">
                      {actionFeedback.proofType === "ENCLAVE_ACL"
                        ? "Intel TDX hardware ACL"
                        : "Solana L1 Anchor proof"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-line-soft">
                    <div className="bg-background p-4">
                      <span className="type-label block text-text-2">Proof format</span>
                      <span className="type-data mt-2 block font-semibold">
                        {actionFeedback.proofType || "L1_PREFLIGHT"}
                      </span>
                    </div>
                    <div className="bg-background p-4">
                      <span className="type-label block text-text-2">Security invariant</span>
                      <div className="mt-2">
                        {actionFeedback.blocked ? (
                          <Chip tone="alert" icon={<AlertTriangle className="h-3 w-3" strokeWidth={2} />}>
                            Defended and halted
                          </Chip>
                        ) : (
                          <Chip tone="accent">Confirmed valid</Chip>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {actionFeedback.rawLogs && actionFeedback.rawLogs.length > 0 && (
                  <div className="space-y-2 border border-line p-4">
                    <div className="flex items-center justify-between">
                      <span className="type-label block text-text-2">Raw Solana Validator Logs</span>
                      <span className="type-data font-mono text-[11px] text-accent">Devnet Preflight Autopsy</span>
                    </div>
                    <div className="mt-2 max-h-48 overflow-y-auto rounded border border-line-soft bg-black/70 p-3 font-mono text-[11px] leading-relaxed text-text">
                      {actionFeedback.rawLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={cx(
                            "break-words whitespace-pre-wrap",
                            log.includes("AnchorError") || log.includes("failed") || log.includes("Error") || log.includes("denied")
                              ? "font-semibold text-alert"
                              : log.includes("Instruction") || log.includes("invoke")
                              ? "text-blue"
                              : "text-text-2"
                          )}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div key="idle" className="space-y-5">
                <div className="space-y-1.5">
                  <span className="type-label block text-text-2">Live invariant posture</span>
                  <p className="type-small max-w-[52ch] text-text-2">
                    All four security boundaries are armed. Run a probe on the left or move a sandbox
                    slider to see the guardrail respond.
                  </p>
                </div>

                <ol className="divide-y divide-line-soft border border-line">
                  {[
                    { n: 1, name: "Strategy secrecy", via: "Intel TDX hardware ACL" },
                    { n: 2, name: "Anti-theft ownership", via: "Anchor has_one = owner" },
                    { n: 3, name: "Max trade cap (20%)", via: "ExceedsMaxPositionCap" },
                    { n: 4, name: "5% daily breaker", via: "VaultIsHalted auto-lock" },
                  ].map((r) => (
                    <li key={r.n} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4">
                      <span className="flex items-center gap-3">
                        <span className="type-label text-accent">#{r.n}</span>
                        <span className="type-small font-semibold">{r.name}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="type-data text-text-2">{r.via}</span>
                        <Chip tone="accent">Enforced</Chip>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
            <span className="type-small text-text-2">On-chain attestation</span>
            <a
              href={
                actionFeedback?.explorerUrl ||
                `https://explorer.solana.com/address/6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N?cluster=devnet`
              }
              target="_blank"
              rel="noreferrer"
              className="link type-small inline-flex items-center gap-1.5"
            >
              <span>{isRealTx ? "View verified transaction" : "View program on Explorer"}</span>
              <ExternalLink className="h-3.5 w-3.5" {...ICON} />
            </a>
          </div>
        </Panel>
      </div>
    </div>
  );
}
