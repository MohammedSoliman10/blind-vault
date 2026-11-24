"use client";

import React, { useMemo, useCallback } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork, WalletError } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(
    () =>
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      clusterApiUrl(network),
    [network]
  );

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  const onError = useCallback((error: WalletError) => {
    // Gracefully handle wallet adapter errors without crashing Next.js dev overlay
    console.warn("[Solana Wallet]", error.name, error.message);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
