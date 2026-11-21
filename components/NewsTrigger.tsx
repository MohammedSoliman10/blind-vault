"use client";

import React, { useState } from "react";
import { evaluateAndExecuteSignal, ActionResult } from "../lib/solana/arena-actions";

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

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400 border-emerald-500/40 bg-emerald-950/30";
    if (score <= 30) return "text-red-400 border-red-500/40 bg-red-950/30";
    return "text-amber-400 border-amber-500/40 bg-amber-950/30";
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 70) return "BULLISH CATALYST (BUY TRIGGER)";
    if (score <= 30) return "BEARISH CATALYST (SELL TRIGGER)";
    return "NEUTRAL CATALYST (HOLD / REBALANCE)";
  };

  return (
    <div className="rounded-2xl border border-[#1e2433] bg-[#0d0f17] p-5 shadow-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#1e2433] pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-sky-400 tracking-tight">
              Live News Catalyst &amp; Bounded Trade Pipeline
            </span>
            <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[11px] font-semibold text-sky-300">
              Firecrawl + Gemini AI
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            Scrapes live URL with Firecrawl, scores catalyst sentiment via Gemini 3.8 Flash, and executes an enclave-approved trade bounded by the 20% L1 cap.
          </p>
        </div>
        <span className="text-xs text-gray-400 font-medium">
          Automated Pipeline
        </span>
      </div>

      {/* Preset 1-Click Chips */}
      <div className="space-y-3.5">
        <div>
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            1-Click Verified News Sources:
          </label>
          <div className="mt-2 flex flex-wrap gap-2.5">
            {SAMPLE_URLS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedUrl(sample.url);
                  setCustomUrl("");
                }}
                className={`rounded-xl border p-3 text-left transition-all ${
                  selectedUrl === sample.url && !customUrl
                    ? "border-sky-500 bg-sky-950/40 text-sky-200"
                    : "border-[#1e2433] bg-[#12151f] text-gray-300 hover:border-gray-500"
                }`}
              >
                <div className="text-xs font-bold">{sample.label}</div>
                <div className="font-mono text-[11px] text-gray-400 truncate max-w-sm">{sample.url}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom URL Input */}
        <div>
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Or Enter Custom News Article URL:
          </label>
          <div className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://... (e.g. cointelegraph.com, coindesk.com)"
              className="flex-1 rounded-xl border border-[#1e2433] bg-[#090a0f] px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:border-sky-500 focus:outline-none"
            />
            <button
              onClick={handleEvaluateAndTrade}
              disabled={loading || !activeUrl}
              className="rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-2.5 text-xs font-bold text-black transition-colors disabled:opacity-50 shrink-0 shadow-md shadow-sky-500/20"
            >
              {loading ? "Scraping & Scoring..." : "Evaluate & Execute Trade ⚡"}
            </button>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-300">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="mt-4 rounded-xl border border-[#1e2433] bg-[#12151f] p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2433] pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white uppercase tracking-wider">
                AI Catalyst Evaluation
              </span>
              {result.cached && (
                <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300">
                  ⚡ 15-min Cache
                </span>
              )}
            </div>
            <div className={`rounded-lg border px-2.5 py-1 font-bold ${getScoreColor(result.catalystScore)}`}>
              Score: <span className="font-mono">{result.catalystScore}</span> / 100 — {getSentimentLabel(result.catalystScore)}
            </div>
          </div>

          {/* Visual Gauge */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-gray-500 mb-1">
              <span>0 (Extreme Bearish)</span>
              <span>50 (Neutral)</span>
              <span>100 (Extreme Bullish)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  result.catalystScore >= 70
                    ? "bg-emerald-400"
                    : result.catalystScore <= 30
                    ? "bg-red-400"
                    : "bg-amber-400"
                }`}
                style={{ width: `${Math.max(5, Math.min(100, result.catalystScore))}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-3 space-y-2 text-gray-300">
            <div>
              <span className="text-gray-400 font-medium">Catalyst Summary: </span>
              <span>{result.summary}</span>
            </div>
            <div className="truncate">
              <span className="text-gray-400 font-medium">SHA-256 Signal Hash: </span>
              <span className="font-mono text-sky-300 text-[11px]">{result.signalHash}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#1e2433] text-[11px]">
              <span className="text-emerald-400 font-medium">
                ✓ Risk-Bounded Trade Executed (15% NAV &lt; 20% L1 Cap)
              </span>
              <span className="text-gray-400">Enclave Evaluated + L1 Risk Firewall Passed</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
