"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cx } from "./ui/cx";

export interface TerminalTab {
  id: string;
  label: string;
  command: string;
  /** Show a `$` prompt (shell commands). Off for plain URLs. */
  prompt?: boolean;
}

/** Hermes-style "install via terminal" block: tabs, a command, a copy button. */
export function TerminalBlock({ tabs, caption }: { tabs: TerminalTab[]; caption?: string }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const [copied, setCopied] = useState(false);
  const tab = tabs.find((t) => t.id === active) ?? tabs[0];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tab.command);
    } catch {
      const el = document.createElement("textarea");
      el.value = tab.command;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      document.body.removeChild(el);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="w-full max-w-[640px]">
      {caption && <p className="type-label mb-3 text-text-2">{caption}</p>}
      <div className="border border-line-strong">
        <div className="flex items-stretch justify-between border-b border-line-strong">
          <div role="tablist" aria-label="Verification method" className="flex">
            {tabs.map((t, i) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={t.id === tab.id}
                onClick={() => setActive(t.id)}
                className={cx(
                  "type-label px-3 py-3 transition-colors duration-150 sm:px-4",
                  i > 0 && "border-l border-line-strong",
                  t.id === tab.id ? "bg-white text-blue" : "hover:bg-white/12"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={copy}
            className="type-label flex items-center gap-2 border-l border-line-strong px-3 transition-colors duration-150 hover:bg-white/12 sm:px-4"
            aria-label="Copy command"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
            ) : (
              <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
        <pre className="type-data m-0 overflow-x-auto whitespace-pre px-4 py-4 text-[13px]">
          <code>
            {tab.prompt !== false && <span className="select-none text-text-2">$ </span>}
            {tab.command}
          </code>
        </pre>
      </div>
    </div>
  );
}

export default TerminalBlock;
