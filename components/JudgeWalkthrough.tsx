"use client";

import React, { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { NavView } from "./nav";
import { Chip } from "./ui/Chip";
import { cx } from "./ui/cx";

export interface JudgeChecklist {
  tdxRead: boolean;
  cap20: boolean;
  breaker5: boolean;
  safeExit: boolean;
}

interface JudgeWalkthroughProps {
  checklist: JudgeChecklist;
  onNavigateToView: (view: NavView) => void;
}

/** Audit checklist: the four invariants a reviewer should verify, as a numbered strip. */
export function JudgeWalkthrough({ checklist, onNavigateToView }: JudgeWalkthroughProps) {
  const [showGuide, setShowGuide] = useState(false);

  const steps = [
    {
      id: "tdxRead" as const,
      num: "1",
      label: "TDX Enclave",
      targetTab: "overview" as NavView,
      completed: checklist.tdxRead,
      desc: "Test the Intel TDX hardware ACL boundary.",
    },
    {
      id: "cap20" as const,
      num: "2",
      label: "20% Cap",
      targetTab: "attack" as NavView,
      completed: checklist.cap20,
      desc: "Trigger a single swap above 20% of NAV and watch the L1 Anchor block it.",
    },
    {
      id: "breaker5" as const,
      num: "3",
      label: "5% Breaker",
      targetTab: "attack" as NavView,
      completed: checklist.breaker5,
      desc: "Simulate a -6% shock to trip the 24h rolling halt.",
    },
    {
      id: "safeExit" as const,
      num: "4",
      label: "Safe Exit",
      targetTab: "attack" as NavView,
      completed: checklist.safeExit,
      desc: "Use the 100% non-custodial depositor escape hatch.",
    },
  ];

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const allCompleted = completedCount === 4;
  const nextStep = steps.find((s) => !s.completed);

  return (
    <section aria-label="Audit checklist" className="border-y border-line">
      <div className="mx-auto max-w-page px-5 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-[minmax(190px,auto)_repeat(4,minmax(0,1fr))]">
          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            aria-expanded={showGuide}
            className="col-span-2 flex items-center justify-between gap-4 py-4 pr-6 text-left lg:col-span-1"
          >
            <span className="flex items-center gap-3">
              <span className="type-label">Audit</span>
              <Chip tone={allCompleted ? "accent" : "outline"}>{completedCount}/4</Chip>
            </span>
            <ChevronDown
              className={cx("h-4 w-4 transition-transform duration-150", showGuide && "rotate-180")}
              strokeWidth={1.5}
            />
          </button>

          {steps.map((step) => {
            const isNext = !allCompleted && step.id === nextStep?.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onNavigateToView(step.targetTab)}
                title={`Step ${step.num}: ${step.label} (${step.completed ? "verified" : "pending"})`}
                className="flex flex-col items-start gap-2.5 border-l border-t border-line-soft px-4 py-4 text-left transition-colors duration-150 hover:bg-white/8 sm:flex-row sm:items-center sm:justify-between sm:gap-3 lg:border-t-0"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="type-label text-accent">#{step.num}</span>
                  <span className="type-small font-semibold sm:truncate">{step.label}</span>
                </span>
                {step.completed ? (
                  <Chip tone="accent" icon={<Check className="h-3 w-3" strokeWidth={2.5} />}>
                    Passed
                  </Chip>
                ) : isNext ? (
                  <Chip tone="outline">Next</Chip>
                ) : (
                  <Chip tone="ghost">Pending</Chip>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {showGuide && (
        <div className="border-t border-line-soft">
          <div className="mx-auto max-w-page px-5 py-6 lg:px-8">
            <p className="type-small max-w-[64ch] text-text-2">
              Verify all four security invariants that connect Intel TDX confidential compute to the
              Solana L1 risk guardrails.
            </p>
            <ol className="mt-5 grid gap-px border border-line-soft bg-line-soft md:grid-cols-2">
              {steps.map((step) => (
                <li key={step.id} className="bg-background">
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToView(step.targetTab);
                      setShowGuide(false);
                    }}
                    className="flex w-full items-start gap-4 p-4 text-left transition-colors duration-150 hover:bg-white/8"
                  >
                    <span className="type-label mt-0.5 text-accent">#{step.num}</span>
                    <span className="min-w-0 flex-1">
                      <span className="type-small block font-semibold">{step.label}</span>
                      <span className="type-small mt-0.5 block text-text-2">{step.desc}</span>
                    </span>
                    <span className="type-label shrink-0 text-text-2">
                      {step.completed ? "Passed" : "Test now"}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
