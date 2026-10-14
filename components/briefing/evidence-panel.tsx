"use client";

import { ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { BriefEvidence } from "@/lib/briefing/types";
import { containTabFocus } from "@/lib/client/focus-management";
import { useUiStore } from "@/lib/store/ui-store";

function formatObserved(value: string | null) {
  if (!value) return "Not time-bound";
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const confidenceCopy: Record<string, string> = {
  authoritative: "Published by the responsible body",
  screening: "A screening prompt, not a determination",
  estimate: "A model estimate at the saved point",
  sample: "Illustrative only",
};

const scopeCopy: Record<string, string> = {
  farm: "At the saved pin",
  nearby: "Near the saved pin",
  county: "County-level",
  regional: "Regional",
  national: "National",
};

export function EvidencePanel({
  evidence,
  returnFocusId,
}: {
  evidence: BriefEvidence | null;
  returnFocusId: string;
}) {
  const setEvidenceId = useUiStore((state) => state.setEvidenceId);
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isDialog, setIsDialog] = useState(false);

  const closeEvidence = useCallback(() => {
    const returnTarget = document.getElementById(returnFocusId);
    setEvidenceId(null);
    requestAnimationFrame(() => returnTarget?.focus());
  }, [returnFocusId, setEvidenceId]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1279px)");
    const update = () => setIsDialog(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (isDialog) closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (isDialog && event.key === "Escape") {
        event.preventDefault();
        closeEvidence();
        return;
      }
      if (isDialog && panelRef.current) {
        containTabFocus(event, panelRef.current);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeEvidence, isDialog]);

  if (!evidence) return null;

  const external = evidence.sourceUrl.startsWith("http");
  const sourceClass =
    "flex min-h-12 items-center justify-between gap-3 rounded-md border border-rule bg-background px-3 text-sm font-semibold hover:border-foreground/40";

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] xl:hidden"
        onClick={closeEvidence}
        aria-label="Close evidence overlay"
      />
      <aside
        id="evidence-panel"
        ref={panelRef}
        role="dialog"
        aria-modal={isDialog ? true : undefined}
        aria-labelledby="evidence-panel-title"
        tabIndex={-1}
        className="sheet dock-enter fixed inset-x-3 bottom-20 top-16 z-50 overflow-auto shadow-dock xl:sticky xl:inset-auto xl:top-9 xl:z-auto xl:max-h-[calc(100dvh-4.5rem)] xl:shadow-sheet"
      >
        <div className="flex items-start justify-between gap-3 border-b border-rule px-5 pb-4 pt-5">
          <div className="min-w-0">
            <h2
              id="evidence-panel-title"
              className="display display-sm text-[1.35rem]"
            >
              {evidence.label}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeEvidence}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close evidence"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-5 px-5 py-5 text-sm">
          <p className="leading-6 text-foreground/85">{evidence.explanation}</p>
          <dl className="grid gap-3 border-y border-rule py-4">
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
              <dt className="text-muted-foreground">Scope</dt>
              <dd className="font-medium">
                {scopeCopy[evidence.scope] ?? evidence.scope}
              </dd>
            </div>
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
              <dt className="text-muted-foreground">Confidence</dt>
              <dd className="font-medium">
                <span className="capitalize">{evidence.confidence}</span>
                {confidenceCopy[evidence.confidence] ? (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {confidenceCopy[evidence.confidence]}
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
              <dt className="text-muted-foreground">
                {evidence.observedLabel ?? "Observed"}
              </dt>
              <dd className="font-medium">
                {formatObserved(evidence.observedAt)}
              </dd>
            </div>
          </dl>
          {external ? (
            <a
              href={evidence.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className={sourceClass}
            >
              {evidence.sourceLabel}
              <ExternalLink
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </a>
          ) : (
            <Link href={evidence.sourceUrl} className={sourceClass}>
              {evidence.sourceLabel}
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
