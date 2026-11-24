"use client";

import React, { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { Band } from "./art/Plate";
import { NavView, NAV_ITEMS } from "./nav";
import { DEPLOYED_PROGRAM_ID } from "../lib/solana/arena-actions";

interface SiteFooterProps {
  presenceCount: number;
  eventsCount: number;
  onViewChange: (view: NavView) => void;
  onResetSession: () => void;
  onRequestFaucet: () => void;
  faucetLoading: boolean;
}

const linkClass =
  "-ml-1 inline-flex self-start py-1.5 pr-2 pl-1 text-left font-light underline decoration-from-font underline-offset-4 transition-opacity duration-150 hover:opacity-60";

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <h4 className="type-label mb-3 text-text-2">{title}</h4>
      {children}
    </div>
  );
}

export function SiteFooter({
  presenceCount,
  eventsCount,
  onViewChange,
  onResetSession,
  onRequestFaucet,
  faucetLoading,
}: SiteFooterProps) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    setSecondsAgo(0);
  }, [presenceCount, eventsCount]);

  useEffect(() => {
    const interval = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="mt-20 border-t border-line">
      <Band tone="white" className="opacity-60" />
      <div className="mx-auto max-w-page px-5 py-14 lg:px-8">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <BrandLogo showTagline={false} />
            <p className="type-small mt-6 max-w-[38ch] text-text-2">
              A hedge fund you can verify, not see. Private AI strategy in Intel TDX, public risk
              guardrails on Solana L1.
            </p>
            <p className="type-label mt-6 flex items-center gap-2 text-text-2">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-accent" />
              <span>
                {presenceCount} in arena, live {secondsAgo}s
              </span>
            </p>
          </div>

          <div className="md:col-span-2">
            <Column title="Product">
              {NAV_ITEMS.map((item) => (
                <button key={item.id} type="button" onClick={() => {
                  onViewChange(item.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }} className={linkClass}>
                  {item.label}
                </button>
              ))}
            </Column>
          </div>

          <div className="md:col-span-2">
            <Column title="Verify">
              <a
                className={linkClass}
                href={`https://explorer.solana.com/address/${DEPLOYED_PROGRAM_ID}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Program on Explorer
              </a>
              <a
                className={linkClass}
                href="https://solana.com/developers"
                target="_blank"
                rel="noopener noreferrer"
              >
                Solana developers
              </a>
            </Column>
          </div>

          <div className="md:col-span-3">
            <Column title="Session">
              <button type="button" onClick={onRequestFaucet} disabled={faucetLoading} className={linkClass}>
                {faucetLoading ? "Airdropping..." : "Airdrop 1,000 Demo USDC"}
              </button>
              <button type="button" onClick={onResetSession} className={linkClass}>
                Reset session
              </button>
            </Column>
          </div>
        </div>
      </div>

      <div className="border-t border-line-soft">
        <div className="type-label mx-auto flex max-w-page flex-col gap-2 px-5 py-5 text-text-2 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>Blind Vault, 2026</span>
          <span>Devnet demo. Balances are Demo USDC with no market value.</span>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
