"use client";

import React, { useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Chip } from "./ui/Chip";
import { cx } from "./ui/cx";

interface KpiStripProps {
  tvlUsdc: number;
  depositorShares: number;
  isHalted: boolean;
}

type CellTone = "blue" | "accent" | "alert";

const CELL: Record<CellTone, string> = {
  blue: "bg-background text-white",
  accent: "bg-accent text-blue",
  alert: "bg-alert text-white",
};

function Cell({
  tone = "blue",
  label,
  chip,
  value,
  foot,
}: {
  tone?: CellTone;
  label: string;
  chip: React.ReactNode;
  value: React.ReactNode;
  foot: React.ReactNode;
}) {
  const onAccent = tone === "accent";
  return (
    <div className={cx("flex flex-col justify-between gap-6 p-5 transition-colors duration-150 lg:p-6", CELL[tone])}>
      <div className="flex items-start justify-between gap-3">
        <span className={cx("type-label", onAccent ? "text-blue/85" : tone === "alert" ? "text-white" : "text-text-2")}>
          {label}
        </span>
        {chip}
      </div>
      <div>
        <div className="num-xl flex items-baseline">{value}</div>
        <p className={cx("type-small mt-2", onAccent ? "text-blue/85" : tone === "alert" ? "text-white" : "text-text-2")}>
          {foot}
        </p>
      </div>
    </div>
  );
}

export function KpiStrip({ tvlUsdc, depositorShares, isHalted }: KpiStripProps) {
  const maxTradeCap = tvlUsdc * 0.2;
  const sharesCount = depositorShares / 1000;
  const navPerShare = tvlUsdc > 0 && sharesCount > 0 ? tvlUsdc / sharesCount : 1.0;
  const drawdownVal = isHalted ? 6.0 : 0.0;

  const [flashing, setFlashing] = useState(false);
  const prevTvlRef = useRef(tvlUsdc);

  useEffect(() => {
    if (prevTvlRef.current !== tvlUsdc) {
      setFlashing(true);
      prevTvlRef.current = tvlUsdc;
      const t = setTimeout(() => setFlashing(false), 500);
      return () => clearTimeout(t);
    }
  }, [tvlUsdc]);

  const unit = "ml-2 font-mono text-[13px] font-medium uppercase tracking-[0.08em]";

  return (
    <section aria-label="Vault key figures" className="mx-auto max-w-page px-5 lg:px-8">
      <div className="grid grid-cols-1 gap-px border border-line bg-line-soft sm:grid-cols-2 lg:grid-cols-4">
        <Cell
          tone={isHalted ? "alert" : "accent"}
          label="Total vault NAV"
          chip={
            isHalted ? (
              <Chip tone="paper" icon={<AlertTriangle className="h-3 w-3" strokeWidth={2} />}>
                Halted
              </Chip>
            ) : (
              <Chip tone="ink" icon={<ShieldCheck className="h-3 w-3" strokeWidth={2} />}>
                Active
              </Chip>
            )
          }
          value={
            <span className={cx("flex items-baseline transition-opacity duration-300", flashing ? "opacity-70" : "opacity-100")}>
              <span>$</span>
              <NumberFlow value={tvlUsdc} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
            </span>
          }
          foot="Liquidity: Demo USDC"
        />

        <Cell
          label="Your position"
          chip={<Chip tone="outline">Non-custodial</Chip>}
          value={
            <>
              <NumberFlow value={sharesCount} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
              <span className={unit}>Shares</span>
            </>
          }
          foot={sharesCount > 0 ? `1.00 Share = $${navPerShare.toFixed(2)} NAV` : "No active deposit"}
        />

        <Cell
          label="Max trade limit"
          chip={<Chip tone="outline">L1 Anchor cap</Chip>}
          value={
            <>
              <span>20.0%</span>
              <span className={unit}>NAV</span>
            </>
          }
          foot={
            <span className="inline-flex items-center">
              <span>Single-swap max: $</span>
              <NumberFlow value={maxTradeCap} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
            </span>
          }
        />

        <Cell
          label="24h rolling risk"
          chip={
            isHalted ? (
              <Chip tone="alert" icon={<AlertTriangle className="h-3 w-3" strokeWidth={2} />}>
                Tripped
              </Chip>
            ) : (
              <Chip tone="outline" icon={<ShieldCheck className="h-3 w-3" strokeWidth={2} />}>
                Safe
              </Chip>
            )
          }
          value={
            <>
              <NumberFlow value={drawdownVal} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} />
              <span className={unit}>% of 5.0%</span>
            </>
          }
          foot="Auto-halt circuit breaker"
        />
      </div>
    </section>
  );
}
