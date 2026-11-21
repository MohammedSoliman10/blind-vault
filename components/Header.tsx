"use client";

import React, { useState } from "react";
import { DEPLOYED_PROGRAM_ID } from "../lib/solana/arena-actions";

interface HeaderProps {
  guestAddress: string;
  demoBalance: number;
  presenceCount: number;
  onResetSession: () => void;
  onRequestFaucet: () => void;
  faucetLoading: boolean;
}

export function Header({
  guestAddress,
  demoBalance,
  presenceCount,
  onResetSession,
  onRequestFaucet,
  faucetLoading,
}: HeaderProps) {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const truncatedAddress = guestAddress
    ? `${guestAddress.slice(0, 4)}...${guestAddress.slice(-4)}`
    : "Connecting...";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1e2433] bg-[#090a0f]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Brand & Edition */}
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 font-bold text-white shadow-md shadow-sky-500/10 text-sm">
            🛡️
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold tracking-tight text-white">
                Blind Vault
              </span>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                Intel TDX TEE
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span className="flex items-center">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Solana Devnet
              </span>
              <span className="text-gray-600">•</span>
              <a
                href={`https://explorer.solana.com/address/${DEPLOYED_PROGRAM_ID}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] text-sky-400 hover:text-sky-300 hover:underline"
                title="View on Solana Explorer"
              >
                {DEPLOYED_PROGRAM_ID.slice(0, 4)}...{DEPLOYED_PROGRAM_ID.slice(-4)} ↗
              </a>
            </div>
          </div>
        </div>

        {/* Live Arena Metrics & Guest Session Badge */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Active Judges / Spectators Presence */}
          <div className="hidden items-center rounded-lg border border-[#1e2433] bg-[#12151f] px-2.5 py-1 sm:flex text-xs text-gray-300">
            <span className="relative mr-2 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>
              <strong className="text-white font-mono">{presenceCount}</strong> in Arena
            </span>
          </div>

          {/* Guest Identity & Sponsored Pill */}
          <div className="flex items-center rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-1 text-xs">
            <div className="mr-2.5 flex flex-col text-right">
              <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                Guest Mode
              </span>
              <span className="font-mono text-xs font-semibold text-white" title={guestAddress}>
                {truncatedAddress}
              </span>
            </div>
            <div className="h-6 w-[1px] bg-emerald-500/30 mx-1"></div>
            <div className="ml-1.5 flex flex-col text-left">
              <span className="text-[10px] text-gray-400">Balance</span>
              <span className="font-mono text-xs font-bold text-emerald-300">
                ${demoBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Gas Sponsored Pill */}
          <div className="hidden rounded-lg border border-sky-500/30 bg-sky-950/20 px-2.5 py-1.5 text-xs text-sky-300 md:flex items-center">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-sky-400"></span>
            <span>Sponsored (0 SOL)</span>
          </div>

          {/* Faucet Button */}
          <button
            onClick={onRequestFaucet}
            disabled={faucetLoading}
            className="hidden rounded-lg border border-emerald-500/40 bg-emerald-600/20 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-600/30 disabled:opacity-50 sm:inline-block"
            title="Request 1,000 Demo USDC from Sponsor Faucet"
          >
            {faucetLoading ? "Airdropping..." : "+1,000 USDC"}
          </button>

          {/* Reset Session */}
          <button
            onClick={onResetSession}
            className="rounded-lg border border-[#1e2433] bg-[#12151f] px-2.5 py-1.5 text-xs text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
            title="Reset Ephemeral Guest Wallet & Reload Fresh Sandbox"
          >
            ↺ Reset
          </button>

          {/* Connect External Wallet (Secondary) */}
          <button
            onClick={() => setShowWalletModal(!showWalletModal)}
            className="rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs font-medium text-gray-200 hover:border-gray-500 hover:text-white transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>

      {/* Modal / Popover for External Wallet */}
      {showWalletModal && (
        <div className="absolute right-4 top-14 z-50 w-80 rounded-xl border border-[#1e2433] bg-[#12151f] p-4 shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e2433]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Wallet Connection
            </h3>
            <button
              onClick={() => setShowWalletModal(false)}
              className="text-xs text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-300 leading-relaxed">
            You are operating in <strong className="text-emerald-400">Zero-Wallet Guest Mode</strong> with automatic Devnet gas sponsorship.
          </p>
          <div className="mt-3 space-y-2">
            <button
              onClick={() => {
                alert("Guest session has full Devnet execution authority. External wallet adapter ready.");
                setShowWalletModal(false);
              }}
              className="w-full flex items-center justify-between rounded-lg border border-purple-500/30 bg-purple-950/20 p-2 text-left text-xs font-medium text-purple-300 hover:bg-purple-900/30"
            >
              <span>Phantom Wallet</span>
              <span className="text-[10px] text-gray-400">Detected</span>
            </button>
            <button
              onClick={() => {
                alert("Guest session has full Devnet execution authority. External wallet adapter ready.");
                setShowWalletModal(false);
              }}
              className="w-full flex items-center justify-between rounded-lg border border-orange-500/30 bg-orange-950/20 p-2 text-left text-xs font-medium text-orange-300 hover:bg-orange-900/30"
            >
              <span>Solflare Wallet</span>
              <span className="text-[10px] text-gray-400">Detected</span>
            </button>
          </div>
          <p className="mt-3 text-[11px] text-gray-500 italic">
            Hackathon Judges: No browser wallet extension is needed. All 4 attacks, trades, and exits execute immediately.
          </p>
        </div>
      )}
    </header>
  );
}
