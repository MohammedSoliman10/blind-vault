"use client";

import React from "react";

export function SolanaBreakpointNode({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1200 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full opacity-60 mix-blend-screen"
      >
        <defs>
          <linearGradient id="breakpointGrad" x1="120" y1="120" x2="1080" y2="360" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#BFF0FF" />
            <stop offset="100%" stopColor="#2531FF" />
          </linearGradient>
        </defs>

        <path
          d="M 160 240 C 240 140, 480 120, 600 240 C 720 360, 960 340, 1040 240 C 960 140, 720 120, 600 240 C 480 360, 240 340, 160 240 Z"
          stroke="url(#breakpointGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default SolanaBreakpointNode;
