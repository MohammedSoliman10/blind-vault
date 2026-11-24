"use client";

import React, { useState } from "react";
import { DEPLOYED_PROGRAM_ID } from "../lib/solana/arena-actions";
import { Wallet, Plus, X, ExternalLink, ChevronDown } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { NavView, NAV_ITEMS } from "./nav";
import { useWallet } from "@solana/wallet-adapter-react";
import { BrandLogo } from "./BrandLogo";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { Button, buttonClass } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { Segmented } from "./ui/Segmented";
import { cx } from "./ui/cx";

interface HeaderProps {
  activeView: NavView;
  onViewChange: (view: NavView) => void;
  eventsCount: number;
  guestAddress: string;
  demoBalance: number;
  onRequestFaucet: () => void;
  faucetLoading: boolean;
  onExternalWalletChange?: (pubkey: string | null) => void;
}

const ICON = { strokeWidth: 1.5 } as const;

export function Header({
  activeView,
  onViewChange,
  eventsCount,
  guestAddress,
  demoBalance,
  onRequestFaucet,
  faucetLoading,
  onExternalWalletChange,
}: HeaderProps) {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletTab, setWalletTab] = useState<"guest" | "external">("guest");
  const [pendingWalletName, setPendingWalletName] = useState<string | null>(null);
  const [isGuestConnected, setIsGuestConnected] = useState<boolean>(false);
  const connectAttemptRef = React.useRef(0);
  const controlsRef = React.useRef<HTMLDivElement>(null);

  // Close the wallet dropdown on Escape or on a click outside it.
  React.useEffect(() => {
    if (!showWalletModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowWalletModal(false);
    };
    const onDown = (e: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(e.target as Node)) {
        setShowWalletModal(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [showWalletModal]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("wallet") === "open") {
        setShowWalletModal(true);
      }
      if (params.get("tab") === "external") {
        setWalletTab("external");
      }
      if (params.get("connected") === "true") {
        setIsGuestConnected(true);
      }
    }
    return () => {
      connectAttemptRef.current = -1;
    };
  }, []);

  const {
    wallets,
    select,
    connect,
    disconnect,
    connected,
    publicKey,
    wallet,
    connecting,
  } = useWallet();

  const externalAddress = connected && publicKey ? publicKey.toBase58() : null;

  React.useEffect(() => {
    if (onExternalWalletChange) {
      onExternalWalletChange(externalAddress);
    }
  }, [externalAddress, onExternalWalletChange]);

  React.useEffect(() => {
    if (!pendingWalletName) return;
    if (connected) {
      setPendingWalletName(null);
      setShowWalletModal(false);
      return;
    }
    if (wallet && wallet.adapter.name === pendingWalletName && !connecting) {
      const currentAttempt = ++connectAttemptRef.current;
      (async () => {
        try {
          if (wallet.adapter.readyState !== "Installed" && wallet.adapter.readyState !== "Loadable") {
            if (wallet.adapter.url) {
              window.open(wallet.adapter.url, "_blank", "noopener,noreferrer");
            }
            setPendingWalletName(null);
            return;
          }
          await connect();
          if (connectAttemptRef.current === currentAttempt) {
            setPendingWalletName(null);
            setShowWalletModal(false);
          }
        } catch (e) {
          console.error("Wallet connect failed:", e);
          if (connectAttemptRef.current === currentAttempt) {
            setPendingWalletName(null);
          }
        }
      })();
    }
  }, [wallet, connecting, connected, pendingWalletName, connect]);

  const handleSelectAndConnect = async (targetWallet: (typeof wallets)[0]) => {
    try {
      if (targetWallet.readyState !== "Installed" && targetWallet.readyState !== "Loadable") {
        if (targetWallet.adapter.url) {
          window.open(targetWallet.adapter.url, "_blank", "noopener,noreferrer");
        }
        return;
      }
      select(targetWallet.adapter.name);
      setPendingWalletName(targetWallet.adapter.name);
      setIsGuestConnected(false);
    } catch (err) {
      console.error("Selection error:", err);
      setPendingWalletName(null);
    }
  };

  const handleDisconnectToGuest = async () => {
    try {
      await disconnect();
    } catch (e) {
      console.warn("Disconnect error:", e);
    }
    setIsGuestConnected(true);
  };

  const truncatedGuest = guestAddress
    ? `${guestAddress.slice(0, 4)}...${guestAddress.slice(-4)}`
    : "No Wallet";

  const truncatedExternal = externalAddress
    ? `${externalAddress.slice(0, 4)}...${externalAddress.slice(-4)}`
    : "";

  const isAnyConnected = (connected && !!externalAddress) || isGuestConnected;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background">
      <div className="mx-auto flex h-[72px] max-w-page items-stretch justify-between gap-4 px-5 lg:px-8">
        {/* Left: logo + nav */}
        <div className="flex min-w-0 items-stretch gap-10">
          <button
            type="button"
            onClick={() => onViewChange("overview")}
            className="flex shrink-0 items-center"
            aria-label="Blind Vault, go to Overview"
          >
            <BrandLogo />
          </button>

          <nav className="hidden items-stretch gap-7 lg:flex" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onViewChange(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "type-label -mb-px flex items-center gap-2 border-b-2 transition-opacity duration-150",
                    active
                      ? "border-white opacity-100"
                      : "border-transparent opacity-80 hover:opacity-100"
                  )}
                >
                  <span>{item.label}</span>
                  {item.id === "ledger" && (
                    <span className="min-w-[20px] border border-white/60 px-1 text-center text-[10px] leading-4">
                      {eventsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: network, faucet, wallet */}
        <div ref={controlsRef} className="relative flex items-center gap-2">
          <a
            href={`https://explorer.solana.com/address/${DEPLOYED_PROGRAM_ID}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("outline", "md", "hidden whitespace-nowrap xl:inline-flex")}
            title="View deployed program on Solana Explorer"
          >
            <span className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>Devnet</span>
            <span className="normal-case tracking-normal text-accent">
              {DEPLOYED_PROGRAM_ID.slice(0, 4)}...{DEPLOYED_PROGRAM_ID.slice(-4)}
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-accent" {...ICON} />
          </a>

          <Button
            variant="outline"
            onClick={onRequestFaucet}
            disabled={faucetLoading}
            className="hidden whitespace-nowrap md:inline-flex"
            icon={<Plus className="h-3.5 w-3.5 text-accent" strokeWidth={2} />}
            title="Airdrop +1,000 Demo USDC to the active session"
          >
            {faucetLoading ? "Airdropping..." : "+1,000 USDC"}
          </Button>

          {!isAnyConnected ? (
            <ConnectWalletButton onClick={() => setShowWalletModal(true)} />
          ) : (
            <button
              type="button"
              onClick={() => setShowWalletModal(!showWalletModal)}
              className={buttonClass("outline", "md", "whitespace-nowrap")}
              aria-expanded={showWalletModal}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="normal-case tracking-normal">
                {connected ? truncatedExternal : truncatedGuest}
              </span>
              {!connected && <Chip tone="accent">Guest</Chip>}
              {connected && <Chip tone="ghost">External (Sandbox Routing)</Chip>}
              <span className="flex items-center normal-case tracking-normal text-accent">
                <span>$</span>
                <NumberFlow
                  value={demoBalance}
                  format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                />
              </span>
              <ChevronDown className="h-3.5 w-3.5" {...ICON} />
            </button>
          )}

          {/* Wallet dropdown */}
          {showWalletModal && (
            <div
              role="dialog"
              aria-label="Connect wallet"
              className="absolute right-0 top-[calc(100%+22px)] z-50 w-[460px] max-w-[calc(100vw-2.5rem)] space-y-5 border border-line-strong bg-background p-5 shadow-[0_28px_60px_-14px_rgba(8,12,96,0.75)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-line-soft pb-4">
                <div>
                  <h3 className="type-title">Connect wallet</h3>
                  <p className="type-small mt-1 text-text-2">
                    Choose a guest sandbox or a self-custody Solana wallet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWalletModal(false)}
                  className="-mr-1 p-1 opacity-80 transition-opacity hover:opacity-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" {...ICON} />
                </button>
              </div>

              <Segmented
                name="wallet-tab"
                value={walletTab}
                onChange={(v) => setWalletTab(v as "guest" | "external")}
                className="w-full [&>label]:flex-1 [&>label]:justify-center"
                options={[
                  { value: "guest", label: "Guest sandbox" },
                  { value: "external", label: "Self-custody" },
                ]}
              />

              {/* Tab 1: Guest sandbox */}
              {walletTab === "guest" && (
                <div className="space-y-4">
                  <div className="space-y-3 border border-line p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="type-label flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        Ephemeral guest keypair
                      </span>
                      {isGuestConnected && !connected && <Chip tone="accent">Active session</Chip>}
                    </div>

                    <div className="space-y-1.5">
                      <span className="type-label text-text-2">Public address</span>
                      <div className="type-data select-all break-all border border-line-soft p-2.5">
                        {guestAddress}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-line-soft pt-3">
                      <span className="type-small text-text-2">Demo balance</span>
                      <span className="type-data font-semibold">${demoBalance.toFixed(2)} USDC</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isGuestConnected || connected ? (
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={() => {
                          if (connected) disconnect();
                          setIsGuestConnected(true);
                          setShowWalletModal(false);
                        }}
                      >
                        Connect as guest
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setIsGuestConnected(false);
                        }}
                      >
                        Disconnect
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={onRequestFaucet}
                      disabled={faucetLoading}
                      icon={<Plus className="h-3.5 w-3.5 text-accent" strokeWidth={2} />}
                    >
                      +1,000 USDC
                    </Button>
                  </div>
                  <p className="type-small text-text-2">
                    Instant in-browser signing with sponsored Devnet gas. No extension required.
                  </p>
                </div>
              )}

              {/* Tab 2: Self-custody */}
              {walletTab === "external" && (
                <div className="space-y-3">
                  {connected && externalAddress ? (
                    <div className="space-y-3 border border-line p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {wallet?.adapter.icon && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={wallet.adapter.icon} alt="" className="h-6 w-6" />
                          )}
                          <span className="type-small font-semibold">{wallet?.adapter.name}</span>
                        </div>
                        <Chip tone="accent">Connected</Chip>
                      </div>
                      <div className="type-data select-all break-all border border-line-soft p-2.5">
                        {externalAddress}
                      </div>
                      <Button variant="outline" fullWidth onClick={handleDisconnectToGuest}>
                        Disconnect
                      </Button>
                    </div>
                  ) : wallets.length > 0 ? (
                    <ul className="border border-line">
                      {wallets.map((w, i) => {
                        const isInstalled = w.readyState === "Installed" || w.readyState === "Loadable";
                        const isConnectingThis = connecting && pendingWalletName === w.adapter.name;
                        return (
                          <li
                            key={w.adapter.name}
                            className={cx(
                              "flex items-center justify-between gap-3 p-3",
                              i > 0 && "border-t border-line-soft"
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              {w.adapter.icon ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={w.adapter.icon} alt="" className="h-7 w-7 shrink-0" />
                              ) : (
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-line">
                                  <Wallet className="h-4 w-4 text-accent" {...ICON} />
                                </span>
                              )}
                              <div className="min-w-0">
                                <span className="type-small block font-semibold">{w.adapter.name}</span>
                                <span className="type-small block text-text-2">
                                  {isInstalled ? "Detected in browser" : "Available to install"}
                                </span>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectAndConnect(w)}
                              disabled={connecting || (isInstalled && !!pendingWalletName)}
                              iconRight={
                                !isInstalled ? <ExternalLink className="h-3 w-3 text-accent" {...ICON} /> : undefined
                              }
                            >
                              {isInstalled ? (isConnectingThis ? "Connecting..." : "Connect") : "Install"}
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="type-small border border-line p-4 text-center text-text-2">
                      No Solana browser wallets detected. Use Guest mode or install Phantom.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile / tablet nav */}
      <nav
        className="flex items-stretch gap-6 overflow-x-auto border-t border-line-soft px-5 lg:hidden"
        aria-label="Primary"
      >
        {NAV_ITEMS.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              aria-current={active ? "page" : undefined}
              className={cx(
                "type-label -mb-px flex shrink-0 items-center gap-2 border-b-2 py-3 transition-opacity duration-150",
                active ? "border-white opacity-100" : "border-transparent opacity-80 hover:opacity-100"
              )}
            >
              <span>{item.label}</span>
              {item.id === "ledger" && (
                <span className="min-w-[20px] border border-white/60 px-1 text-center text-[10px] leading-4">
                  {eventsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
