"use client";

import { ExternalLink, X } from "lucide-react";

import type { BriefEvidence } from "@/lib/briefing/types";
import { useUiStore } from "@/lib/store/ui-store";

function formatObserved(value: string | null) {
  if (!value) return "Not time-bound";
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function EvidencePanel({
  evidence,
}: {
  evidence: BriefEvidence | null;
}) {
  const setEvidenceId = useUiStore((state) => state.setEvidenceId);
  if (!evidence) return null;

  const external = evidence.sourceUrl.startsWith("http");

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-foreground/35 backdrop-blur-[2px] lg:hidden"
        onClick={() => setEvidenceId(null)}
        aria-label="Close evidence overlay"
      />
      <aside
        className="fixed inset-x-3 bottom-20 top-20 z-50 overflow-auto rounded-md border border-border bg-card shadow-[0_18px_45px_-20px_rgba(28,37,29,0.65)] lg:sticky lg:inset-auto lg:top-24 lg:z-auto lg:max-h-[calc(100dvh-8rem)]"
        aria-label="Evidence details"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              Why this is here
            </p>
            <h2 className="font-editorial mt-1 text-2xl font-medium">
              {evidence.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setEvidenceId(null)}
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close evidence"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-5 px-5 py-5 text-sm">
          <p className="leading-6 text-muted-foreground">
            {evidence.explanation}
          </p>
          <dl className="grid gap-3 border-y border-border py-4">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Scope</dt>
              <dd className="font-medium capitalize">{evidence.scope}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Confidence</dt>
              <dd className="font-medium capitalize">{evidence.confidence}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Observed</dt>
              <dd className="text-right font-medium">
                {formatObserved(evidence.observedAt)}
              </dd>
            </div>
          </dl>
          <a
            href={evidence.sourceUrl}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer" : undefined}
            className="flex min-h-11 items-center justify-between rounded-md border border-border px-3 font-semibold hover:bg-muted"
          >
            {evidence.sourceLabel}
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      </aside>
    </>
  );
}
