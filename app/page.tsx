"use client";

import React, { useEffect, useState } from "react";
import { NavView } from "../components/nav";
import { Header } from "../components/Header";
import { KpiStrip } from "../components/KpiStrip";
import { OverviewView } from "../components/OverviewView";
import { AttackLabView } from "../components/AttackLabView";
import { AiTradeView } from "../components/AiTradeView";
import { ProofLedgerView } from "../components/ProofLedgerView";
import { JudgeWalkthrough, JudgeChecklist } from "../components/JudgeWalkthrough";
import { PageHero } from "../components/PageHero";
import { SiteFooter } from "../components/SiteFooter";
import { TerminalBlock } from "../components/TerminalBlock";
import { Button } from "../components/ui/Button";
import { ChartPoint } from "../components/VaultPerformanceChart";
import {
  getOrCreateGuestWallet,
  resetGuestWallet,
  requestDemoFaucet,
  setGuestDemoBalance,
  DEFAULT_GUEST_USDC,
} from "../lib/solana/guest-wallet";
import {
  subscribeToArenaEvents,
  subscribeToPresence,
  ArenaEvent,
  emitArenaEvent,
} from "../lib/supabase/realtime";
import {
  DEPLOYED_PROGRAM_ID,
  DEMO_VAULT_PDA,
  DEMO_QUOTE_VAULT_PDA,
  DEMO_TARGET_VAULT_PDA,
  DEMO_USDC_MINT,
  getSolanaConnection,
  ActionResult,
  dispatchDeposit,
  dispatchWithdraw,
} from "../lib/solana/arena-actions";
import { getVaultStateDecoder } from "../lib/solana/generated/accounts/vaultState";
import { getDepositorPositionDecoder } from "../lib/solana/generated/accounts/depositorPosition";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Shield, ArrowRight } from "lucide-react";

const INITIAL_CHART_POINTS: ChartPoint[] = [
  {
    id: "pt-init-0",
    timestamp: Date.now() - 3600000 * 3,
    label: "Vault Genesis Deployment",
    nav: 985.0,
    drawdownPct: 0.0,
    type: "INITIAL",
  },
  {
    id: "pt-init-1",
    timestamp: Date.now() - 3600000 * 2,
    label: "AI Arbitrage +$10.00",
    nav: 995.0,
    drawdownPct: 0.0,
    type: "INITIAL",
  },
  {
    id: "pt-init-2",
    timestamp: Date.now() - 3600000,
    label: "Baseline NAV Verified",
    nav: 1000.0,
    drawdownPct: 0.0,
    type: "INITIAL",
  },
];

export default function ArenaPage() {
  const [mounted, setMounted] = useState(false);
  const [guestPubkey, setGuestPubkey] = useState<string>("");
  const [externalWalletPubkey, setExternalWalletPubkey] = useState<string | null>(null);
  const [demoBalance, setDemoBalance] = useState<number>(DEFAULT_GUEST_USDC);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [isHalted, setIsHalted] = useState(false);
  const [tvlUsdc, setTvlUsdc] = useState<number>(1000);
  const [depositorShares, setDepositorShares] = useState<number>(1000000);
  const [presenceCount, setPresenceCount] = useState<number>(1);
  const [events, setEvents] = useState<ArenaEvent[]>([]);

  // 4-Step Judge Walkthrough Checklist State
  const [judgeChecklist, setJudgeChecklist] = useState<JudgeChecklist>({
    tdxRead: false,
    cap20: false,
    breaker5: false,
    safeExit: false,
  });

  // Live NAV & Drawdown Trajectory Chart Points
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>(INITIAL_CHART_POINTS);

  // 4 Primary Views: "overview" | "attack" | "trade" | "ledger"
  const [currentView, setCurrentView] = useState<NavView>("overview");

  // Real-time Action Feedback (persists across views)
  const [actionFeedback, setActionFeedback] = useState<ActionResult | null>(null);
  const [quoteBalance, setQuoteBalance] = useState<number>(1000);
  const [targetBalance, setTargetBalance] = useState<number>(0);

  const hydrateOnChainState = async (actor: string) => {
    try {
      const conn = getSolanaConnection();
      const vaultPda = new PublicKey(DEMO_VAULT_PDA);
      const quoteVaultPda = new PublicKey(DEMO_QUOTE_VAULT_PDA);
      const targetVaultPda = new PublicKey(DEMO_TARGET_VAULT_PDA);
      const programId = new PublicKey(DEPLOYED_PROGRAM_ID);
      const usdcMint = new PublicKey(DEMO_USDC_MINT);

      // 1. Vault State
      const vaultAcc = await conn.getAccountInfo(vaultPda);
      if (vaultAcc) {
        const decodedVault = getVaultStateDecoder().decode(vaultAcc.data);
        setIsHalted(decodedVault.isHalted);
      }

      // 2. Quote Vault & Target Vault Balances
      let qBal = 1000;
      let tBal = 0;
      try {
        const qRes = await conn.getTokenAccountBalance(quoteVaultPda);
        qBal = qRes.value.uiAmount || 0;
      } catch {}

      try {
        const tRes = await conn.getTokenAccountBalance(targetVaultPda);
        tBal = tRes.value.uiAmount || 0;
      } catch {}

      setQuoteBalance(qBal);
      setTargetBalance(tBal);

      const totalNav = parseFloat((qBal + tBal).toFixed(2));
      if (totalNav > 0) {
        setTvlUsdc(totalNav);
      }

      // 3. Depositor Position
      if (actor) {
        try {
          const [depositorPosPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("depositor"), vaultPda.toBuffer(), new PublicKey(actor).toBuffer()],
            programId
          );
          const posAcc = await conn.getAccountInfo(depositorPosPda);
          if (posAcc) {
            const decodedPos = getDepositorPositionDecoder().decode(posAcc.data);
            const userShares = Number(decodedPos.shares) / 1000;
            setDepositorShares(userShares);
          } else {
            setDepositorShares(0);
          }
        } catch {
          setDepositorShares(0);
        }

        // 4. Guest Wallet USDC balance on-chain
        try {
          const userAta = getAssociatedTokenAddressSync(usdcMint, new PublicKey(actor));
          const ataBal = await conn.getTokenAccountBalance(userAta);
          if (ataBal.value.uiAmount !== null) {
            setDemoBalance(ataBal.value.uiAmount);
            setGuestDemoBalance(ataBal.value.uiAmount);
          }
        } catch {}
      }
    } catch (err) {
      console.warn("On-chain hydration warning:", err);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const v = new URLSearchParams(window.location.search).get("view");
      if (v === "attack" || v === "trade" || v === "ledger" || v === "overview") {
        setCurrentView(v as NavView);
      }
    }
    const session = getOrCreateGuestWallet();
    setGuestPubkey(session.publicKeyBase58);
    setDemoBalance(session.demoUsdcBalance);
    hydrateOnChainState(session.publicKeyBase58);

    if (session.isNew) {
      // Auto-trigger real on-chain GUEST_FAUCET minting on first guest session
      requestDemoFaucet(session.publicKey).then((faucetRes) => {
        if (faucetRes.success && faucetRes.newBalance !== undefined) {
          setDemoBalance(faucetRes.newBalance);
          hydrateOnChainState(session.publicKeyBase58);
          emitArenaEvent({
            eventType: "GUEST_FAUCET",
            status: "SUCCESS",
            actor: session.publicKeyBase58,
            vault: DEPLOYED_PROGRAM_ID,
            txSignature: faucetRes.signature || null,
            errorMessage: "First-session on-chain faucet minted +1,000 Demo USDC to guest identity.",
            timestamp: new Date().toISOString(),
            details: {
              whatYouTried: "Landed on Blind Vault Liquid Arena in Zero-Wallet Guest Mode.",
              whyItHappened: "Instant ephemeral keypair provisioned in-browser with on-chain faucet & gas sponsorship.",
              txSignature: faucetRes.signature || null,
            },
          });
        }
      });
    } else {
      // Initial session boot record
      emitArenaEvent({
        eventType: "GUEST_FAUCET",
        status: "SUCCESS",
        actor: session.publicKeyBase58,
        vault: DEPLOYED_PROGRAM_ID,
        txSignature: null,
        errorMessage: "Zero-Wallet Guest Session ready with 1,000 Demo USDC & sponsored gas.",
        timestamp: new Date().toISOString(),
        details: {
          whatYouTried: "Landed on Blind Vault Liquid Arena in Zero-Wallet Guest Mode.",
          whyItHappened: "Instant ephemeral keypair provisioned in-browser with gas sponsorship.",
        },
      });
    }

    // Real-time telemetry subscription
    const unsubscribeEvents = subscribeToArenaEvents((newEvent) => {
      setEvents((prev) => {
        if (
          prev.some(
            (e) =>
              e.id === newEvent.id ||
              (e.timestamp === newEvent.timestamp &&
                e.eventType === newEvent.eventType &&
                e.actor === newEvent.actor)
          )
        ) {
          return prev;
        }
        return [newEvent, ...prev.slice(0, 49)];
      });
    });

    // Spectator presence tracking
    const unsubscribePresence = subscribeToPresence(session.publicKeyBase58, (count) => {
      setPresenceCount(count);
    });

    return () => {
      unsubscribeEvents();
      unsubscribePresence();
    };
  }, []);

  const handleMilestoneComplete = (milestone: keyof JudgeChecklist) => {
    setJudgeChecklist((prev) => ({ ...prev, [milestone]: true }));
  };

  const handleResetSession = () => {
    const fresh = resetGuestWallet();
    setGuestPubkey(fresh.publicKeyBase58);
    setDemoBalance(DEFAULT_GUEST_USDC);
    setIsHalted(false);
    setTvlUsdc(1000);
    setDepositorShares(1000000);
    setActionFeedback(null);
    setEvents([]);
    setJudgeChecklist({
      tdxRead: false,
      cap20: false,
      breaker5: false,
      safeExit: false,
    });
    setChartPoints(INITIAL_CHART_POINTS);

    emitArenaEvent({
      eventType: "GUEST_FAUCET",
      status: "SUCCESS",
      actor: fresh.publicKeyBase58,
      vault: DEPLOYED_PROGRAM_ID,
      txSignature: null,
      errorMessage: "Guest session reset. Fresh ephemeral keypair provisioned.",
      timestamp: new Date().toISOString(),
    });
  };

  const handleRequestFaucet = async () => {
    if (!guestPubkey) return;
    setFaucetLoading(true);
    try {
      const session = getOrCreateGuestWallet();
      const res = await requestDemoFaucet(session.publicKey);
      if (res.success && res.newBalance !== undefined) {
        setDemoBalance(res.newBalance);
        await hydrateOnChainState(guestPubkey);
        emitArenaEvent({
          eventType: "GUEST_FAUCET",
          status: "SUCCESS",
          actor: guestPubkey,
          vault: DEPLOYED_PROGRAM_ID,
          txSignature: res.signature || null,
          errorMessage: "Faucet airdropped +1,000 Demo USDC to guest identity.",
          timestamp: new Date().toISOString(),
          details: {
            whatYouTried: "Requested +1,000 Demo USDC on-chain guest faucet airdrop.",
            whyItHappened: "Minted 1,000 Demo USDC directly on Solana Devnet to user ATA.",
            txSignature: res.signature || null,
          },
        });
      } else {
        alert(res.error || "Faucet failed");
      }
    } finally {
      setFaucetLoading(false);
    }
  };

  const activeActorPubkey = externalWalletPubkey || guestPubkey;

  const handleDeposit = async (amount: number) => {
    if (amount > demoBalance) {
      alert("Insufficient Demo USDC balance in guest wallet.");
      return;
    }

    try {
      const res = await dispatchDeposit(amount, activeActorPubkey);
      setActionFeedback(res);
      await hydrateOnChainState(activeActorPubkey);

      setChartPoints((prev) => [
        ...prev,
        {
          id: `pt-dep-${Date.now()}`,
          timestamp: Date.now(),
          label: `Deposit +$${amount.toFixed(2)}`,
          nav: tvlUsdc + amount,
          drawdownPct: 0.0,
          type: "DEPOSIT",
        },
      ]);
    } catch (err: any) {
      alert(err.message || "Deposit transaction failed");
    }
  };

  const handleWithdraw = async (amount: number) => {
    const userSharesCount = depositorShares / 1000;
    if (amount > userSharesCount) {
      alert("Withdraw amount exceeds your owned vault shares.");
      return;
    }

    try {
      const res = await dispatchWithdraw(amount, activeActorPubkey);
      setActionFeedback(res);
      await hydrateOnChainState(activeActorPubkey);

      setChartPoints((prev) => [
        ...prev,
        {
          id: `pt-wth-${Date.now()}`,
          timestamp: Date.now(),
          label: `Withdraw -$${amount.toFixed(2)}`,
          nav: Math.max(0, tvlUsdc - amount),
          drawdownPct: 0.0,
          type: "WITHDRAW",
        },
      ]);
    } catch (err: any) {
      alert(err.message || "Withdrawal failed");
    }
  };

  const handleActionResult = (result: ActionResult) => {
    setActionFeedback(result);
  };

  const handleCustomSwapSuccess = async (amountDelta: number) => {
    await hydrateOnChainState(activeActorPubkey);
    setChartPoints((prev) => [
      ...prev,
      {
        id: `pt-swap-${Date.now()}`,
        timestamp: Date.now(),
        label: `Swap ${amountDelta >= 0 ? "+" : ""}$${amountDelta.toFixed(2)}`,
        nav: tvlUsdc + amountDelta,
        drawdownPct: 0.0,
        type: "TRADE",
      },
    ]);
  };

  const handleMarketShock = (shockPct: number) => {
    const delta = (tvlUsdc * shockPct) / 100;
    const newNav = parseFloat(Math.max(0, tvlUsdc + delta).toFixed(2));
    setTvlUsdc(newNav);

    setChartPoints((prev) => [
      ...prev,
      {
        id: `pt-shock-${Date.now()}`,
        timestamp: Date.now(),
        label: `Shock ${shockPct.toFixed(1)}%`,
        nav: newNav,
        drawdownPct: shockPct,
        type: "SHOCK",
      },
    ]);
  };

  const handleTradeSuccess = async () => {
    await hydrateOnChainState(activeActorPubkey);
    setChartPoints((prev) => [
      ...prev,
      {
        id: `pt-trade-${Date.now()}`,
        timestamp: Date.now(),
        label: "AI Bounded Trade",
        nav: tvlUsdc,
        drawdownPct: 0.0,
        type: "TRADE",
      },
    ]);
  };

  const handleDepositorExitSuccess = async () => {
    await hydrateOnChainState(activeActorPubkey);
    setChartPoints((prev) => [
      ...prev,
      {
        id: `pt-exit-${Date.now()}`,
        timestamp: Date.now(),
        label: `100% Exit`,
        nav: 0,
        drawdownPct: 0.0,
        type: "EXIT",
      },
    ]);
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-text">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 animate-pulse text-accent" strokeWidth={1.5} />
          <span className="type-label">Loading Blind Vault</span>
        </div>
      </div>
    );
  }

  const explorerProgramUrl = `https://explorer.solana.com/address/${DEPLOYED_PROGRAM_ID}?cluster=devnet`;

  return (
    <div className="relative min-h-screen w-full bg-background font-body text-text">
      <Header
        activeView={currentView}
        onViewChange={setCurrentView}
        eventsCount={events.length}
        guestAddress={guestPubkey}
        demoBalance={demoBalance}
        onRequestFaucet={handleRequestFaucet}
        faucetLoading={faucetLoading}
        onExternalWalletChange={setExternalWalletPubkey}
      />

      <main>
        {currentView === "overview" && (
          <PageHero
            index="#1"
            section="Overview"
            title="A hedge fund you can verify, not see."
            description="Private AI strategy runs inside Intel TDX. Public risk guardrails are enforced on Solana L1."
            plate="vault"
            plateCaption={["Plate I", "The sealed strategy"]}
            actions={
              <>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setCurrentView("attack")}
                  iconRight={<ArrowRight className="h-4 w-4" strokeWidth={1.75} />}
                >
                  Stress-test the vault
                </Button>
                <Button variant="outline" size="lg" onClick={() => setCurrentView("ledger")}>
                  Read the proof ledger
                </Button>
              </>
            }
          >
            <TerminalBlock
              caption="Verify the program yourself"
              tabs={[
                {
                  id: "cli",
                  label: "CLI",
                  command: `solana program show ${DEPLOYED_PROGRAM_ID} --url devnet`,
                },
                {
                  id: "anchor",
                  label: "Anchor",
                  command: `anchor idl fetch ${DEPLOYED_PROGRAM_ID} --provider.cluster devnet`,
                },
                { id: "explorer", label: "Explorer", command: explorerProgramUrl, prompt: false },
              ]}
            />
          </PageHero>
        )}

        {currentView === "attack" && (
          <PageHero
            size="md"
            index="#2"
            section="Attack lab"
            title="Try to break the vault."
            description="Fire exploits at the guardrails. Every probe shows which invariant stopped it."
            plate="attack"
          />
        )}

        {currentView === "trade" && (
          <PageHero
            size="md"
            index="#3"
            section="AI trade"
            title="Let the model trade inside the limits."
            description="A news catalyst is scored inside Intel TDX. The order is then clamped by the 20% cap on Solana L1."
            plate="trade"
          />
        )}

        {currentView === "ledger" && (
          <PageHero
            size="md"
            index="#4"
            section="Proof ledger"
            title="Every action, on the record."
            description="An immutable tape of Solana L1 execution and hardware telemetry."
            plate="ledger"
          />
        )}

        <JudgeWalkthrough checklist={judgeChecklist} onNavigateToView={setCurrentView} />

        {currentView !== "ledger" && (
          <div className="mt-10">
            <KpiStrip tvlUsdc={tvlUsdc} depositorShares={depositorShares} isHalted={isHalted} />
          </div>
        )}

        {currentView === "overview" && (
          <OverviewView
            actorAddress={activeActorPubkey}
            isExternalWallet={!!externalWalletPubkey}
            isHalted={isHalted}
            tvlUsdc={tvlUsdc}
            quoteBalance={quoteBalance}
            targetBalance={targetBalance}
            depositorShares={depositorShares}
            demoBalance={demoBalance}
            chartData={chartPoints}
            actionFeedback={actionFeedback}
            onActionResult={handleActionResult}
            onNavigateToAttackLab={() => setCurrentView("attack")}
            onDeposit={handleDeposit}
            onWithdraw={handleWithdraw}
            onMilestoneComplete={handleMilestoneComplete}
          />
        )}

        {currentView === "attack" && (
          <AttackLabView
            actorAddress={activeActorPubkey}
            isHalted={isHalted}
            tvlUsdc={tvlUsdc}
            actionFeedback={actionFeedback}
            onVaultHaltChange={setIsHalted}
            onDepositorExitSuccess={handleDepositorExitSuccess}
            onActionResult={handleActionResult}
            onCustomSwapSuccess={handleCustomSwapSuccess}
            onMarketShock={handleMarketShock}
            onMilestoneComplete={handleMilestoneComplete}
          />
        )}

        {currentView === "trade" && (
          <AiTradeView
            actorAddress={activeActorPubkey}
            onTradeSuccess={handleTradeSuccess}
            onActionResult={handleActionResult}
          />
        )}

        {currentView === "ledger" && (
          <ProofLedgerView events={events} onClearTape={() => setEvents([])} />
        )}
      </main>

      <SiteFooter
        presenceCount={presenceCount}
        eventsCount={events.length}
        onViewChange={setCurrentView}
        onResetSession={handleResetSession}
        onRequestFaucet={handleRequestFaucet}
        faucetLoading={faucetLoading}
      />
    </div>
  );
}
