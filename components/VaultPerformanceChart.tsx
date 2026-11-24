"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { Panel, PanelHeader } from "./ui/Panel";
import { Chip } from "./ui/Chip";

export interface ChartPoint {
  id: string;
  timestamp: number;
  label: string;
  nav: number;
  drawdownPct: number;
  type: "INITIAL" | "DEPOSIT" | "WITHDRAW" | "TRADE" | "SHOCK" | "EXIT" | "FAUCET";
}

interface VaultPerformanceChartProps {
  data: ChartPoint[];
  isHalted: boolean;
}

const MONO = "'IBM Plex Mono', ui-monospace, monospace";

export function VaultPerformanceChart({ data, isHalted }: VaultPerformanceChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ pt: ChartPoint; x: number; y: number } | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    setSecondsAgo(0);
  }, [data.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const width = 760;
  const height = 300;
  const padding = { top: 30, right: 36, bottom: 46, left: 64 };

  const effectiveWidth = width - padding.left - padding.right;
  const effectiveHeight = height - padding.top - padding.bottom;

  const navValues = data.map((d) => d.nav);
  const rawMin = Math.min(...navValues, 920);
  const rawMax = Math.max(...navValues, 1080);

  const yMin = Math.max(0, Math.floor((rawMin - 40) / 40) * 40);
  const yMax = Math.ceil((rawMax + 40) / 40) * 40;

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + effectiveWidth / 2;
    return padding.left + (index / (data.length - 1)) * effectiveWidth;
  };

  const getY = (nav: number) => {
    const ratio = (nav - yMin) / (yMax - yMin || 1);
    return padding.top + (1 - ratio) * effectiveHeight;
  };

  const baselineNav = data[0]?.nav || 1000;
  const breakerNav = baselineNav * 0.95;
  const breakerY = getY(breakerNav);
  const floorY = height - padding.bottom;

  const points = data.map((d, i) => ({ x: getX(i), y: getY(d.nav), data: d }));

  let linePath = "";
  let areaPath = "";

  if (points.length === 1) {
    linePath = `M ${padding.left} ${points[0].y} L ${width - padding.right} ${points[0].y}`;
    areaPath = `${linePath} L ${width - padding.right} ${floorY} L ${padding.left} ${floorY} Z`;
  } else if (points.length > 1) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      linePath += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    const last = points[points.length - 1];
    const first = points[0];
    areaPath = `${linePath} L ${last.x} ${floorY} L ${first.x} ${floorY} Z`;
  }

  const yTicks = [yMin, Math.round((yMin + yMax) / 2), yMax];
  const latestPoint = data[data.length - 1] || { nav: 1000, drawdownPct: 0 };

  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const xLabelIdx = Array.from(new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])).filter(
    (i) => i >= 0 && i < data.length
  );

  const breakerLabelW = 104;

  return (
    <Panel className="p-5 lg:p-6">
      <PanelHeader
        icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}
        title="Net asset value"
        sub="Vault NAV since genesis, against the 5% circuit breaker."
        right={
          <span className="type-label flex items-center gap-2 text-text-2">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-accent" />
            Live {secondsAgo}s
          </span>
        }
      />

      {/* Legend */}
      <div className="type-label mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-text-2">
        <span className="flex items-center gap-2">
          <span className="block h-[2px] w-5 bg-accent" />
          Vault NAV
        </span>
        <span className="flex items-center gap-2">
          <svg width="20" height="2" aria-hidden="true">
            <line x1="0" y1="1" x2="20" y2="1" stroke="#fff" strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          -5% breaker
        </span>
        {isHalted && (
          <Chip tone="alert" icon={<AlertTriangle className="h-3 w-3" strokeWidth={2} />}>
            Halted
          </Chip>
        )}
      </div>

      {/* Canvas */}
      <div className="relative mt-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full select-none" role="img" aria-label="Vault NAV over time">
          <defs>
            <pattern id="navHatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke="#BFF0FF" strokeWidth="0.9" strokeOpacity="0.5" />
            </pattern>
            <linearGradient id="navFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.05" />
            </linearGradient>
            <mask id="navFadeMask">
              <rect x="0" y="0" width={width} height={height} fill="url(#navFade)" />
            </mask>
          </defs>

          {/* Y grid + ticks */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="2 5" />
                <text x={padding.left - 12} y={y + 4} fill="#FFFFFF" fillOpacity="0.85" fontSize="11" fontFamily={MONO} textAnchor="end">
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Baseline axis */}
          <line x1={padding.left} y1={floorY} x2={width - padding.right} y2={floorY} stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="1" />

          {/* X labels */}
          {xLabelIdx.map((i) => (
            <text
              key={i}
              x={points[i].x}
              y={floorY + 22}
              fill="#FFFFFF"
              fillOpacity="0.85"
              fontSize="10.5"
              fontFamily={MONO}
              textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
            >
              {fmtTime(data[i].timestamp)}
            </text>
          ))}

          {/* Engraved hatch under the line */}
          {areaPath && (
            <g mask="url(#navFadeMask)">
              <path d={areaPath} fill="url(#navHatch)" />
            </g>
          )}

          {/* -5% breaker: white dashed line, red label chip (red never sits directly on Blue). */}
          <line x1={padding.left} y1={breakerY} x2={width - padding.right} y2={breakerY} stroke="#FFFFFF" strokeWidth="1.25" strokeDasharray="6 5" />
          <g transform={`translate(${padding.left + 8}, ${breakerY - 21})`}>
            <rect width={breakerLabelW} height="18" fill="#C8102E" stroke="#FFFFFF" strokeWidth="1" />
            <text x={breakerLabelW / 2} y="12.5" fill="#FFFFFF" fontSize="9.5" fontFamily={MONO} fontWeight="600" textAnchor="middle" letterSpacing="0.8">
              -5.0% BREAKER
            </text>
          </g>

          {/* NAV line */}
          {linePath && (
            <path d={linePath} fill="none" stroke="#BFF0FF" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Data points */}
          {points.map((pt, i) => {
            const isLatest = i === points.length - 1;
            const s = isLatest ? 10 : 7;
            return (
              <g
                key={pt.data.id || i}
                onMouseEnter={() => setHoveredPoint({ pt: pt.data, x: pt.x, y: pt.y })}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              >
                <rect x={pt.x - 12} y={pt.y - 12} width="24" height="24" fill="transparent" />
                <rect
                  x={pt.x - s / 2}
                  y={pt.y - s / 2}
                  width={s}
                  height={s}
                  fill={isLatest ? "#BFF0FF" : "#FFFFFF"}
                  stroke="#2531FF"
                  strokeWidth="2"
                  transform={`rotate(45 ${pt.x} ${pt.y})`}
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip: paper card, Blue ink */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[130%] border border-white bg-white px-3 py-2 text-blue shadow-lift"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
            }}
          >
            <div className="type-label whitespace-nowrap text-blue/80">{hoveredPoint.pt.label}</div>
            <div className="type-data mt-1 whitespace-nowrap text-[13px] font-semibold">
              NAV ${hoveredPoint.pt.nav.toFixed(2)}
            </div>
            {hoveredPoint.pt.drawdownPct !== 0 && (
              <div className="type-data mt-0.5 whitespace-nowrap font-semibold text-alert">
                Drawdown {hoveredPoint.pt.drawdownPct.toFixed(1)}%
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
        <div className="type-small text-text-2">
          Genesis baseline <span className="type-data ml-1 font-semibold text-white">$1,000.00</span>
        </div>
        <div className="type-small flex items-center gap-2 text-text-2">
          <span>Current NAV</span>
          <span className="type-data font-semibold text-accent">${latestPoint.nav.toFixed(2)}</span>
          <span className="type-data text-text-2">
            ({latestPoint.nav >= 1000 ? "+" : ""}
            {((latestPoint.nav - 1000) / 10).toFixed(2)}%)
          </span>
        </div>
      </div>
    </Panel>
  );
}
