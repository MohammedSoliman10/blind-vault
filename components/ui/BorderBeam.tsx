"use client";

import React from "react";

interface BorderBeamProps {
  className?: string;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorMid?: string;
  colorTo?: string;
  size?: number;
}

export function BorderBeam({
  className = "",
  duration = 5,
  borderWidth = 1.5,
  colorFrom = "#BFF0FF",
  colorMid = "#FFFFFF",
  colorTo = "#2531FF",
  size = 200,
}: BorderBeamProps) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] z-20 ${className}`}>
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <defs>
          <linearGradient id={`vaultbeam-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorFrom} />
            <stop offset="50%" stopColor={colorMid} />
            <stop offset="100%" stopColor={colorTo} />
          </linearGradient>
        </defs>
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx="15"
          ry="15"
          fill="none"
          stroke={`url(#vaultbeam-grad-${id})`}
          strokeWidth={borderWidth}
          strokeDasharray={`${size} 600`}
          style={{
            animation: `border-beam-dash ${duration}s linear infinite`,
          }}
        />
      </svg>
    </div>
  );
}

export default BorderBeam;
