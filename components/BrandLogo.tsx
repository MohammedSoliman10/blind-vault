import React from "react";
import { cx } from "./ui/cx";

interface BrandLogoProps {
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
  size?: number;
}

export function BrandLogo({
  showWordmark = true,
  showTagline = true,
  className = "",
  size = 36,
}: BrandLogoProps) {
  return (
    <div className={cx("flex select-none items-center gap-3", className)}>
      {/* Mark: hairline square frame, two-tone B (White over Onahau), one Onahau seal dot. */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <defs>
          <path
            id="bv-b"
            fillRule="evenodd"
            d="M18 12H34C42 12 46 17 46 22.5C46 27 43.5 29.5 40.5 31C44.5 32.5 48 36 48 41C48 47 43 52 35 52H18Z M26 19H33C36 19 38 20.5 38 23C38 25.5 36 27 33 27H26Z M26 35H34C37.5 35 39.5 37 39.5 40C39.5 43 37.5 45 34 45H26Z"
          />
          <clipPath id="bv-top">
            <rect x="0" y="0" width="64" height="32" />
          </clipPath>
          <clipPath id="bv-bottom">
            <rect x="0" y="32" width="64" height="32" />
          </clipPath>
        </defs>
        <rect x="0.75" y="0.75" width="62.5" height="62.5" stroke="#FFFFFF" strokeWidth="1.5" />
        <g clipPath="url(#bv-top)">
          <use href="#bv-b" fill="#FFFFFF" />
        </g>
        <g clipPath="url(#bv-bottom)">
          <use href="#bv-b" fill="#BFF0FF" />
        </g>
        <path d="M12 32H52" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1" />
        <rect x="49" y="11" width="6" height="6" fill="#BFF0FF" />
      </svg>

      {showWordmark && (
        <div className="hidden flex-col min-[400px]:flex">
          <span className="whitespace-nowrap font-heading text-[18px] font-bold sm:text-[22px] leading-none tracking-tight text-white">
            Blind Vault<span className="text-accent">.</span>
          </span>
          {showTagline && (
            <span className="type-label mt-1.5 hidden text-[10px] text-text-2 sm:block">
              Solana L1 / Intel TDX
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default BrandLogo;
