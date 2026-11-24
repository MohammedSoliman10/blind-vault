import React from "react";
import { cx } from "./cx";

export type PanelTone = "blue" | "paper" | "accent" | "alert";

const TONE: Record<PanelTone, string> = {
  blue: "panel",
  paper: "panel-paper on-paper",
  accent: "panel-accent on-paper",
  alert: "panel-alert",
};

export function Panel({
  tone = "blue",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { tone?: PanelTone }) {
  return (
    <div className={cx(TONE[tone], className)} {...rest}>
      {children}
    </div>
  );
}

/** Panel title row: Bluu Next title, optional one-line description, optional right slot. */
export function PanelHeader({
  icon,
  title,
  sub,
  right,
  tone = "blue",
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  tone?: PanelTone;
  className?: string;
}) {
  const onPaper = tone === "paper" || tone === "accent";
  return (
    <div
      className={cx(
        "flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b pb-4",
        onPaper ? "border-blue/25" : "border-line-soft",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 basis-[200px] items-start gap-3">
        {icon && (
          <span className={cx("mt-[6px] inline-flex shrink-0", onPaper ? "text-blue" : "text-accent")}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="type-title">{title}</h3>
          {sub && (
            <p className={cx("type-small mt-1", onPaper ? "text-blue/80" : "text-text-2")}>{sub}</p>
          )}
        </div>
      </div>
      {right && <div className="min-w-0 max-w-full">{right}</div>}
    </div>
  );
}

export default Panel;
