"use client";

import React from "react";
import { cx } from "./cx";

export interface SegmentedOption {
  value: string;
  label: string;
  count?: number;
}

interface SegmentedProps {
  name: string;
  options: SegmentedOption[];
  value: string;
  onChange: (val: string) => void;
  tone?: "blue" | "paper";
  className?: string;
}

/** Square segmented control. Selected segment is solid; the rest are hairline. */
export function Segmented({
  name,
  options,
  value,
  onChange,
  tone = "blue",
  className,
}: SegmentedProps) {
  const paper = tone === "paper";
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cx(
        "inline-flex max-w-full select-none items-stretch overflow-x-auto border",
        paper ? "border-blue" : "border-line-strong",
        className
      )}
    >
      {options.map((option, i) => {
        const selected = value === option.value;
        const id = `${name}-${option.value}`;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cx(
              "type-label relative flex cursor-pointer items-center gap-2 px-3.5 py-2 transition-colors duration-150",
              i > 0 && (paper ? "border-l border-blue" : "border-l border-line-strong"),
              selected
                ? paper
                  ? "bg-blue text-white"
                  : "bg-white text-blue"
                : paper
                ? "text-blue hover:bg-blue/10"
                : "text-white hover:bg-white/12"
            )}
          >
            <input
              type="radio"
              id={id}
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={cx(
                  "min-w-[20px] border px-1 text-center text-[10px] leading-4",
                  selected
                    ? paper
                      ? "border-white/70"
                      : "border-blue/60"
                    : paper
                    ? "border-blue/60"
                    : "border-white/60"
                )}
              >
                {option.count}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

export default Segmented;
