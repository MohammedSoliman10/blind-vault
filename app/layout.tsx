import type { Metadata, Viewport } from "next";
import React from "react";
import { SolanaWalletProvider } from "../components/WalletContextProvider";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-mono/700.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://blind-vault.vercel.app"),
  title: "Blind Vault | Solana Liquid Risk Engine",
  description:
    "Blind Vault — A hedge fund you can verify, not see. Private AI strategy in Intel TDX, public risk guardrails on Solana L1.",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#2531FF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-body text-text antialiased">
        <SolanaWalletProvider>
          {children}
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
