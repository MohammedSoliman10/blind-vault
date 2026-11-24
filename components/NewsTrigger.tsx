"use client";

import React, { useState } from "react";
import { evaluateAndExecuteSignal, ActionResult } from "../lib/solana/arena-actions";
import { AlertTriangle } from "lucide-react";

interface NewsTriggerProps {
  actorAddress: string;
  onTradeSuccess: () => void;
  onActionResult: (result: ActionResult) => void;
}

const SAMPLE_URLS = [
  {
    label: "Bullish: Solana Ecosystem Growth",
    url: "https://solana.com/news",
    desc: "Institutional liquidity inflow and protocol adoption",
  },
  {
    label: "Developers: High-Performance Infrastructure",
    url: "https://solana.com/developers",
    desc: "Enterprise Solana developer tooling & ecosystem upgrades",
  },
];

export function NewsTrigger({ actorAddress, onTradeSuccess, onActionResult }: NewsTriggerProps) {
  const [selectedUrl, setSelectedUrl] = useState(SAMPLE_URLS[0].url);
  const [customUrl, setCustomUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    catalystScore: number;
    summary: string;
    signalHash: string;
    cached: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeUrl = customUrl.trim() || selectedUrl;

  const handleEvaluateAndTrade = async () => {
    if (!activeUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await evaluateAndExecuteSignal(activeUrl, actorAddress);
      setResult({
        catalystScore: res.catalystScore,
        summary: res.summary,
        signalHash: res.signalHash,
        cached: res.cached,
      });

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
      setLoading(false);
    }
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 70) return "BULLISH CATALYST (BUY TRIGGER)";
    if (score <= 30) return "BEARISH CATALYST (SELL TRIGGER)";
    return "NEUTRAL CATALYST (HOLD / REBALANCE)";
  };

  return (
    <div className="rounded-[24px] border border-white/20 bg-background p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/20 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="type-h3 text-white">
              Live News Catalyst &amp; Bounded Trade Pipeline
            </span>
            <span className="chip-active text-xs py-0.5 px-2.5">
              Firecrawl + Gemini AI
            </span>
          </div>
          <p className="type-small text-white/80 mt-0.5">
            Scrapes live URL with Firecrawl, scores catalyst sentiment via Gemini 3.8 Flash, and executes an enclave-approved trade bounded by the 20% L1 cap.
          </p>
        </div>
        <span className="type-small text-accent font-semibold">
          Automated Pipeline
        </span>
      </div>

      {/* Preset Feeds */}
      <div className="space-y-3">
        <label className="type-label text-accent block">
          Select Verified Live Feed:
        </label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {SAMPLE_URLS.map((sample) => (
            <button
              key={sample.url}
              onClick={() => {
                setSelectedUrl(sample.url);
                setCustomUrl("");
              }}
              className={`rounded-[20px] border p-3.5 text-left transition-colors ${
                selectedUrl === sample.url && !customUrl.trim()
                  ? "border-accent bg-background"
                  : "border-white/20 bg-background hover:border-white hover:bg-white/5"
              }`}
            >
              <div className="text-sm font-bold text-white font-body">{sample.label}</div>
              <div className="type-small text-white/70 mt-0.5">{sample.desc}</div>
            </button>
          ))}
        </div>

        {/* Custom URL Input */}
        <div className="mt-3">
          <label className="type-label text-accent block mb-1">
            Or Paste Any Live News Article / Tweet URL:
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/breaking-solana-news"
              className="flex-1 rounded-full border border-white/20 bg-background px-4 py-2.5 text-xs text-white placeholder-white/40 focus:border-accent focus:outline-none"
            />
            <button
              onClick={handleEvaluateAndTrade}
              disabled={loading || !activeUrl}
              className="button-primary text-xs py-2 px-5 rounded-full font-bold disabled:opacity-50"
            >
              {loading ? "Evaluating in Enclave..." : "Evaluate & Trade →"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-[18px] border border-white bg-alert p-3 text-xs text-white font-body flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-white shrink-0 mt-0.5" />
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {result && (
          <div className="mt-4 rounded-[20px] border border-white/20 bg-background p-4 text-xs font-body">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/20 pb-2.5">
              <span className="font-bold text-white">Enclave Intelligence Analysis:</span>
              {result.catalystScore <= 30 ? (
                <span className="badge-alert text-xs py-0.5 px-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                  <span>{getSentimentLabel(result.catalystScore)} (Score: {result.catalystScore}/100)</span>
                </span>
              ) : (
                <span className="chip-active text-xs py-0.5 px-2.5">
                  <span>{getSentimentLabel(result.catalystScore)} (Score: {result.catalystScore}/100)</span>
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <p className="type-small text-white/90 leading-relaxed">{result.summary}</p>
              <div className="flex items-center space-x-2 pt-2 text-xs font-mono text-white/70">
                <span>Signal Hash:</span>
                <span className="text-white break-all">{result.signalHash}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NewsTrigger;
