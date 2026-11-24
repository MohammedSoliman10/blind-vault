"use client";

import React, { useState } from "react";
import {
  dispatchAttackPeekStrategy,
  ActionResult,
} from "../lib/solana/arena-actions";
import {
  Shield,
  Search,
  ArrowRight,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { VaultPerformanceChart, ChartPoint } from "./VaultPerformanceChart";
import { Panel, PanelHeader } from "./ui/Panel";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { Segmented } from "./ui/Segmented";
import { Band } from "./art/Plate";
import { cx } from "./ui/cx";

interface OverviewViewProps {
  actorAddress: string;
  isHalted: boolean;
  tvlUsdc: number;
  depositorShares: number;
  demoBalance: number;
  chartData: ChartPoint[];
  actionFeedback: ActionResult | null;
  onActionResult: (result: ActionResult) => void;
  onNavigateToAttackLab: () => void;
  onDeposit: (amount: number) => Promise<void>;
  onWithdraw: (amount: number) => Promise<void>;
  onMilestoneComplete?: (milestone: "tdxRead" | "cap20" | "breaker5" | "safeExit") => void;
}

const ICON = { strokeWidth: 1.5 } as const;

function Row({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="type-small text-text-2">{label}</dt>
      <dd className={cx("type-data text-right font-semibold", accent && "text-accent")}>{value}</dd>
    </div>
  );
}

export function OverviewView({
  actorAddress,
  isHalted,
  tvlUsdc,
  depositorShares,
  demoBalance,
  chartData,
  onActionResult,
  onNavigateToAttackLab,
  onDeposit,
  onWithdraw,
  onMilestoneComplete,
}: OverviewViewProps) {
  const [cockpitMode, setCockpitMode] = useState<"deposit" | "withdraw">("deposit");
  const [inputAmount, setInputAmount] = useState<string>("250");
  const [submitting, setSubmitting] = useState(false);
  const [peekLoading, setPeekLoading] = useState(false);
  const [peekResult, setPeekResult] = useState<ActionResult | null>(null);

  const numAmount = parseFloat(inputAmount) || 0;
  const userSharesCount = depositorShares / 1000;
  const navPerShare = tvlUsdc > 0 && userSharesCount > 0 ? tvlUsdc / userSharesCount : 1.0;

  const handleQuickFill = (pct: number) => {
    if (cockpitMode === "deposit") {
      const val = Math.floor((demoBalance * pct) / 100);
      setInputAmount(val.toString());
    } else {
      const val = Math.floor((userSharesCount * pct) / 100);
      setInputAmount(val.toString());
    }
  };

  const handleExecuteCockpit = async () => {
    if (numAmount <= 0) return;
    setSubmitting(true);
    try {
      if (cockpitMode === "deposit") {
        if (numAmount > demoBalance) {
          alert("Requested deposit exceeds available Demo USDC balance.");
          return;
        }
        await onDeposit(numAmount);
      } else {
        await onWithdraw(numAmount);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestRead = async () => {
    setPeekLoading(true);
    try {
      const res = await dispatchAttackPeekStrategy(actorAddress);
      setPeekResult(res);
      onActionResult(res);
      if (res.proofType === "ENCLAVE_ACL") {
        onMilestoneComplete?.("tdxRead");
      }
    } finally {
      setPeekLoading(false);
    }
  };

  const depositLocked = isHalted && cockpitMode === "deposit";
  const updatedCap =
    (cockpitMode === "deposit" ? tvlUsdc + numAmount : Math.max(0, tvlUsdc - numAmount)) * 0.2;

  return (
    <div className="mx-auto mt-10 grid max-w-page grid-cols-12 gap-6 px-5 lg:gap-8 lg:px-8">
      {/* LEFT: deposit certificate + enclave */}
      <div className="col-span-12 flex min-w-0 flex-col gap-6 lg:col-span-5 lg:gap-8">
        {/* Vault position, printed as a certificate on paper */}
        <Panel tone="paper" className="overflow-hidden">
          <Band tone="blue" className="h-7 [background-size:auto_28px]" />
          <div className="grain grain-ink relative space-y-5 p-5 lg:p-6">
            <PanelHeader
              tone="paper"
              title="Vault position"
              sub="100% non-custodial, instant Devnet settlement."
              right={
                <Segmented
                  name="cockpit-mode"
                  tone="paper"
                  value={cockpitMode}
                  onChange={(val) => setCockpitMode(val as "deposit" | "withdraw")}
                  options={[
                    { value: "deposit", label: "Deposit" },
                    { value: "withdraw", label: "Withdraw" },
                  ]}
                />
              }
            />

            <div className="space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="type-label text-blue/80">
                  {cockpitMode === "deposit" ? "Wallet balance" : "Your shares"}
                </span>
                <span className="type-data font-semibold">
                  {cockpitMode === "deposit"
                    ? `$${demoBalance.toFixed(2)} USDC`
                    : `${userSharesCount.toFixed(2)} Shares ($${(userSharesCount * navPerShare).toFixed(2)})`}
                </span>
              </div>

              {/* Amount */}
              <div className="border border-blue">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <input
                    id="cockpit-amount-input"
                    name="cockpit-amount"
                    type="number"
                    min="1"
                    step="10"
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={depositLocked}
                    aria-label="Amount"
                    className="w-full bg-transparent font-heading text-[44px] font-bold leading-none text-blue placeholder-blue/40 focus:outline-none disabled:opacity-50"
                  />
                  <Chip tone="ink-outline" className="shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue" />
                    USDC
                  </Chip>
                </div>
                <div className="grid grid-cols-4 border-t border-blue">
                  {[25, 50, 75, 100].map((pct, i) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleQuickFill(pct)}
                      disabled={depositLocked}
                      className={cx(
                        "type-label py-2.5 text-blue transition-colors duration-150 hover:bg-blue hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-blue",
                        i > 0 && "border-l border-blue"
                      )}
                    >
                      {pct === 100 ? "Max" : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <dl className="divide-y divide-blue/20 border-y border-blue/25 text-blue">
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="type-small text-blue/80">
                    {cockpitMode === "deposit" ? "Shares to mint" : "Shares to redeem"}
                  </dt>
                  <dd className="type-data font-semibold">{numAmount.toFixed(2)} Shares</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="type-small text-blue/80">Updated 20% trade cap</dt>
                  <dd className="type-data font-semibold">${updatedCap.toFixed(2)}</dd>
                </div>
              </dl>

              {depositLocked && (
                <div className="panel-alert flex items-start gap-3 p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" {...ICON} />
                  <p className="type-small">
                    <strong className="font-semibold">Vault halted.</strong> The 5% rolling-loss circuit
                    breaker has locked deposits. Withdrawals and the emergency exit stay 100% active.
                  </p>
                </div>
              )}
            </div>

            <Button
              variant="ink"
              size="lg"
              fullWidth
              onClick={handleExecuteCockpit}
              disabled={submitting || depositLocked || numAmount <= 0}
              icon={
                cockpitMode === "deposit" ? (
                  <ArrowDownLeft className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                )
              }
            >
              {submitting
                ? "Settling on Solana Devnet..."
                : cockpitMode === "deposit"
                ? `Deposit $${numAmount.toFixed(2)} Demo USDC`
                : `Withdraw $${numAmount.toFixed(2)} Demo USDC`}
            </Button>
          </div>
          <Band tone="blue" className="h-7 [background-size:auto_28px]" />
        </Panel>

        {/* Intel TDX enclave */}
        <Panel className="p-5 lg:p-6">
          <PanelHeader
            icon={<Lock className="h-4 w-4" {...ICON} />}
            title="Intel TDX enclave"
            right={
              <Chip tone="accent" icon={<ShieldCheck className="h-3 w-3" strokeWidth={2} />}>
                Quote verified
              </Chip>
            }
          />

          <dl className="divide-y divide-line-soft">
            <Row label="Attestation engine" value="MagicBlock TDX PER" />
            <Row label="Hardware memory" value="AES-128-XTS encrypted" accent />
            <Row label="Strategy protection" value="Hardware PER ACL enforced" />
          </dl>

          <div className="mt-4 space-y-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestRead}
              disabled={peekLoading}
              icon={<Search className="h-3.5 w-3.5 text-accent" {...ICON} />}
            >
              {peekLoading ? "Querying PER hardware..." : "Verify hardware boundary (test read)"}
            </Button>

            {peekResult && (
              <div className="panel-alert space-y-2 p-4" role="status">
                <div className="type-label flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5" {...ICON} />
                    Defended: Intel TDX hardware ACL
                  </span>
                  <span>HTTP 401 denied</span>
                </div>
                <p className="type-small">
                  The MagicBlock hardware enclave rejected an inspection that carried no valid Intel TDX
                  JWT attestation.
                </p>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* RIGHT: chart + L1 firewall */}
      <div className="col-span-12 flex min-w-0 flex-col gap-6 lg:col-span-7 lg:gap-8">
        <VaultPerformanceChart data={chartData} isHalted={isHalted} />

        <Panel className="p-5 lg:p-6">
          <PanelHeader
            icon={<Shield className="h-4 w-4" {...ICON} />}
            title="Solana L1 risk firewall"
            sub="The Anchor program guarantees that even if the AI model turns erratic, capital cannot be drained or overleveraged."
            right={
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateToAttackLab}
                iconRight={<ArrowRight className="h-3.5 w-3.5" {...ICON} />}
                className="hidden sm:inline-flex"
              >
                Stress-test in Attack Lab
              </Button>
            }
          />

          <div className="mt-5 grid grid-cols-2 gap-px border border-line bg-line-soft sm:grid-cols-4">
            {[
              { label: "Position cap", value: "20.0% NAV max", sub: "Anti-concentration" },
              { label: "Daily breaker", value: "5.0% rolling", sub: "Auto-halt trigger" },
              { label: "Token whitelist", value: "hTxJ...", sub: "Approved mints only" },
              { label: "Escape hatch", value: "100% exit", sub: "Non-custodial claim", accent: true },
            ].map((g) => (
              <div key={g.label} className="flex flex-col gap-3 bg-background p-4">
                <Chip tone="accent" className="self-start">
                  Enforced
                </Chip>
                <div>
                  <span className="type-label block text-text-2">{g.label}</span>
                  <span className={cx("type-data mt-2 block text-[14px] font-semibold", g.accent && "text-accent")}>
                    {g.value}
                  </span>
                  <span className="type-small mt-1 block text-text-2">{g.sub}</span>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToAttackLab}
            iconRight={<ArrowRight className="h-3.5 w-3.5" {...ICON} />}
            className="mt-4 sm:hidden"
          >
            Stress-test in Attack Lab
          </Button>
        </Panel>
      </div>
    </div>
  );
}
