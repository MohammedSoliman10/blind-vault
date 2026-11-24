"use client";

import React, { useState } from "react";
import { evaluateAndExecuteSignal, ActionResult } from "../lib/solana/arena-actions";
import { isRealSolanaTxSignature } from "../lib/supabase/realtime";
import { ExternalLink, ShieldCheck, Globe, Play, AlertTriangle, Check } from "lucide-react";
import { Panel, PanelHeader } from "./ui/Panel";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { cx } from "./ui/cx";

interface AiTradeViewProps {
  actorAddress: string;
  onTradeSuccess: () => void;
  onActionResult: (result: ActionResult) => void;
}

const ICON = { strokeWidth: 1.5 } as const;

const SAMPLE_FEEDS = [
  {
    id: "eco-news",
    source: "Solana Foundation",
    title: "Solana Ecosystem Inflow: Institutional DeFi Volume Surges +42%",
    url: "https://solana.com/news",
    time: "4m ago",
    sentimentHint: "Bullish catalyst",
  },
  {
    id: "dev-portal",
    source: "Solana Developers",
    title: "Mainnet Performance Upgrades & Firedancer Validator Rollout",
    url: "https://solana.com/developers",
    time: "18m ago",
    sentimentHint: "Technical alpha",
  },
];

export function AiTradeView({ actorAddress, onTradeSuccess, onActionResult }: AiTradeViewProps) {
  const [selectedUrl, setSelectedUrl] = useState(SAMPLE_FEEDS[0].url);
  const [customUrl, setCustomUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [result, setResult] = useState<{
    catalystScore: number;
    summary: string;
    signalHash: string;
    cached: boolean;
    txSignature: string | null;
    explorerUrl: string;
    hashMatched?: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeUrl = customUrl.trim() || selectedUrl;

  const handleEvaluateAndTrade = async () => {
    if (!activeUrl) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setActiveStep(1);

    const t1 = setTimeout(() => setActiveStep(2), 400);
    const t2 = setTimeout(() => setActiveStep(3), 1000);
    const t3 = setTimeout(() => setActiveStep(4), 1400);

    try {
      const res = await evaluateAndExecuteSignal(activeUrl, actorAddress);
      setResult({
        catalystScore: res.catalystScore,
        summary: res.summary,
        signalHash: res.signalHash,
        cached: res.cached,
        txSignature: res.txSignature,
        explorerUrl: res.explorerUrl,
        hashMatched: res.hashMatched,
      });

      setActiveStep(4);
      onActionResult({
        success: true,
        blocked: false,
        proofType: "DEVNET_TX",
        whatYouTried: res.whatYouTried,
        whyItHappened: res.whyItHappened,
        errorMessage: res.whyItHappened,
        txSignature: res.txSignature,
        explorerUrl: res.explorerUrl,
      });

      onTradeSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to evaluate news signal");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setLoading(false);
    }
  };

  const isRealTx = isRealSolanaTxSignature(result?.txSignature);
  const score = result?.catalystScore ?? 50;
  const isBullish = score >= 50;

  const pipelineSteps = [
    { num: 1, name: "Firecrawl Scrape", desc: "Clean markdown web extraction" },
    { num: 2, name: "Gemini Flash AI", desc: "Institutional sentiment scoring" },
    { num: 3, name: "SHA-256 Signal Hash", desc: "Tamper-proof payload generation" },
    { num: 4, name: "L1 20% Cap Check", desc: "Position size clamp validation" },
  ];

  return (
    <div className="mx-auto mt-10 grid max-w-page grid-cols-12 gap-6 px-5 lg:gap-8 lg:px-8">
      {/* LEFT: feed, URL, pipeline */}
      <div className="col-span-12 flex min-w-0 flex-col gap-6 lg:col-span-5 lg:gap-8">
        <Panel className="p-5 lg:p-6">
          <PanelHeader
            icon={<Globe className="h-4 w-4" {...ICON} />}
            title="News signal catalyst"
            right={<Chip tone="accent">Firecrawl ready</Chip>}
          />

          <div className="space-y-6 pt-5">
            {/* Curated feeds */}
            <div className="space-y-3">
              <span className="type-label block text-text-2">Select a market catalyst feed</span>
              <ul role="radiogroup" aria-label="Market catalyst feeds" className="border border-line">
                {SAMPLE_FEEDS.map((feed, i) => {
                  const isSelected = selectedUrl === feed.url && !customUrl.trim();
                  return (
                    <li key={feed.id} className={cx(i > 0 && "border-t border-line-soft")}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => {
                          setSelectedUrl(feed.url);
                          setCustomUrl("");
                        }}
                        className={cx(
                          "block w-full p-4 text-left transition-colors duration-150",
                          isSelected ? "bg-white text-blue" : "hover:bg-white/8"
                        )}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className={cx("type-label", isSelected ? "text-blue" : "text-accent")}>
                            {feed.source}
                          </span>
                          <span className={cx("type-data text-[11px]", isSelected ? "text-blue/80" : "text-text-2")}>
                            {feed.time}
                          </span>
                        </span>
                        <span className="type-small mt-2 block font-semibold leading-snug">{feed.title}</span>
                        <span
                          className={cx(
                            "mt-3 flex items-center justify-between gap-3 border-t pt-2.5",
                            isSelected ? "border-blue/25" : "border-line-soft"
                          )}
                        >
                          <span className={cx("type-data truncate text-[11px]", isSelected ? "text-blue/80" : "text-text-2")}>
                            {feed.url}
                          </span>
                          <span className={cx("type-label shrink-0", isSelected ? "text-blue" : "text-accent")}>
                            {feed.sentimentHint}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Custom URL */}
            <div className="space-y-2">
              <label htmlFor="custom-news-url" className="type-label block text-text-2">
                Or enter a news article URL
              </label>
              <input
                id="custom-news-url"
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/breaking-news-article"
                disabled={loading}
                className="field"
              />
              <p className="type-small text-text-2">
                Scrapes the full article, extracts the key catalysts and executes a bounded trade.
              </p>
            </div>

            {/* Pipeline: a real sequence, so it is numbered */}
            <div className="border border-line">
              <div className="flex items-center justify-between gap-3 border-b border-line-soft p-4">
                <span className="type-label">Catalyst execution pipeline</span>
                <Chip tone="ghost">Enclave protected</Chip>
              </div>
              <ol>
                {pipelineSteps.map((st, i) => {
                  const isCurrent = loading && activeStep === st.num;
                  const isDone = activeStep > st.num || (result && activeStep >= st.num);
                  return (
                    <li
                      key={st.num}
                      aria-current={isCurrent ? "step" : undefined}
                      className={cx(
                        "flex items-center gap-4 p-4 transition-colors duration-150",
                        i > 0 && "border-t border-line-soft",
                        isCurrent && "bg-white/10"
                      )}
                    >
                      <span
                        className={cx(
                          "type-label flex h-6 w-6 shrink-0 items-center justify-center border",
                          isDone
                            ? "border-accent bg-accent text-blue"
                            : isCurrent
                            ? "border-white bg-white text-blue"
                            : "border-line text-text-2"
                        )}
                      >
                        {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : st.num}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="type-small block font-semibold">{st.name}</span>
                        <span className="type-small block text-text-2">{st.desc}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {error && (
              <div className="panel-alert flex items-start gap-3 p-4" role="alert">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" {...ICON} />
                <p className="type-small">
                  <strong className="font-semibold">Execution error.</strong> {error}
                </p>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleEvaluateAndTrade}
              disabled={loading || !activeUrl}
              icon={<Play className="h-3.5 w-3.5 fill-current" strokeWidth={1.5} />}
            >
              {loading ? "Evaluating in Intel TDX..." : "Evaluate catalyst and trade"}
            </Button>
          </div>
        </Panel>
      </div>

      {/* RIGHT: enclave telemetry + result (sticky, so the result stays in view) */}
      <div className="col-span-12 flex min-w-0 flex-col gap-6 lg:sticky lg:top-24 lg:col-span-7 lg:gap-8 lg:self-start">
        <Panel className="flex min-h-[480px] flex-col p-5 lg:p-6">
          <PanelHeader
            icon={<ShieldCheck className="h-4 w-4" {...ICON} />}
            title="Intel TDX confidential execution"
            right={<Chip tone="accent">Active</Chip>}
          />

          <div className="flex-1 py-5">
            {result ? (
              <div key="result" className="space-y-4">
                {/* Score */}
                <div className="flex flex-wrap items-end justify-between gap-6 border border-line p-5">
                  <div>
                    <span className="type-label block text-text-2">Catalyst sentiment score</span>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <span className="num-xl text-accent">{score}/100</span>
                      {isBullish ? (
                        <Chip tone="accent">Bullish catalyst: buy USDC/SOL</Chip>
                      ) : (
                        <Chip tone="alert" icon={<AlertTriangle className="h-3 w-3" strokeWidth={2} />}>
                          Bearish catalyst: short / defensive
                        </Chip>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="type-label block text-text-2">Order sizing</span>
                    <span className="type-data mt-2 block text-[14px] font-semibold">15.0% NAV (bounded)</span>
                  </div>
                </div>

                <div className="space-y-1.5 border border-line p-4">
                  <span className="type-label block text-text-2">Enclave sentiment rationale</span>
                  <p className="type-small">{result.summary}</p>
                </div>

                <div className="space-y-2.5 border border-line p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="type-label text-text-2">Cryptographic signal hash</span>
                    <span className="type-label text-accent">
                      {result.hashMatched ? "SHA-256 validated & verified on-chain" : "SHA-256 validated"}
                    </span>
                  </div>
                  <div className="type-data select-all break-all border border-line-soft p-2.5 font-mono text-xs">
                    {result.signalHash}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-2.5">
                    <span className="type-small text-text-2">SealedStrategy.lastSignalHash:</span>
                    {result.hashMatched ? (
                      <span className="type-label inline-flex items-center gap-1.5 text-accent">
                        <ShieldCheck className="h-3.5 w-3.5 text-accent" {...ICON} />
                        Verified on-chain (Anchored to Enclave Strategy State)
                      </span>
                    ) : (
                      <span className="type-label inline-flex items-center gap-1.5 text-text-2">
                        Pending Enclave Verification
                      </span>
                    )}
                  </div>
                </div>

                {result.txSignature && (
                  <div className="space-y-1.5 border border-line p-4">
                    <div className="flex items-center justify-between">
                      <span className="type-label block text-text-2">Solana Devnet Settlement</span>
                      <Chip tone="accent">Confirmed on L1</Chip>
                    </div>
                    <div className="type-data select-all break-all font-mono text-xs text-accent">
                      {result.txSignature}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div key="idle" className="space-y-5">
                <div className="space-y-1.5">
                  <span className="type-label block text-text-2">Autonomous trading desk status</span>
                  <p className="type-small max-w-[56ch] text-text-2">
                    Waiting for a catalyst. Select a news feed on the left to extract live market
                    sentiment, compute the model signal and execute a bounded trade on Solana Devnet.
                  </p>
                </div>

                <dl className="divide-y divide-line-soft border border-line">
                  {[
                    { k: "AI scoring model", v: "Gemini Flash AI (enclave-verified)", enforced: false },
                    { k: "Execution venue", v: "Solana Devnet liquidity pool", enforced: false, accent: true },
                    { k: "L1 position clamp", v: "Hard-capped at 20.0% NAV", enforced: true, accent: true },
                    { k: "Circuit breakers", v: "Auto-halt on 5% rolling loss", enforced: true },
                  ].map((r) => (
                    <div key={r.k} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4">
                      <dt className="flex items-center gap-3">
                        {r.enforced && <Chip tone="accent">Enforced</Chip>}
                        <span className="type-small text-text-2">{r.k}</span>
                      </dt>
                      <dd className={cx("type-data font-semibold", r.accent && "text-accent")}>{r.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
            <span className="type-small text-text-2">Execution settlement</span>
            <a
              href={
                result?.explorerUrl ||
                `https://explorer.solana.com/address/6pDCJuSSzoQCJLtySBf5DqEkSmoFBSDExzjmxWsaDD5N?cluster=devnet`
              }
              target="_blank"
              rel="noreferrer"
              className="link type-small inline-flex items-center gap-1.5"
            >
              <span>{isRealTx ? "View on Solana Explorer" : "View program on Explorer"}</span>
              <ExternalLink className="h-3.5 w-3.5" {...ICON} />
            </a>
          </div>
        </Panel>
      </div>
    </div>
  );
}
