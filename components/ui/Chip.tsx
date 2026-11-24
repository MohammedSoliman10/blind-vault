import React from "react";
import { cx } from "./cx";

export type ChipTone =
  | "accent"
  | "outline"
  | "ghost"
  | "paper"
  | "alert"
  | "ink"
  | "ink-outline";

const TONE: Record<ChipTone, string> = {
  accent: "chip-accent",
  outline: "chip-outline",
  ghost: "chip-ghost",
  paper: "chip-paper",
  alert: "chip-alert",
  ink: "chip-ink",
  "ink-outline": "chip-ink-outline",
};

export function Chip({
  tone = "outline",
  icon,
  className,
  children,
}: {
  tone?: ChipTone;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cx("chip", TONE[tone], className)}>
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

export default Chip;
