"use client";

import { ExternalLink, X } from "lucide-react";
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

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-foreground/45 backdrop-blur-[2px] xl:hidden"
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
        className="fixed inset-x-3 bottom-20 top-16 z-50 overflow-auto rounded-md border border-border bg-card shadow-[0_18px_45px_-20px_rgba(28,37,29,0.65)] xl:sticky xl:inset-auto xl:top-10 xl:z-auto xl:max-h-[calc(100dvh-5rem)] xl:rounded-none xl:shadow-none"
      >
        <div className="paper-grain flex items-start justify-between border-b border-border px-5 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              Why this is here
            </p>
            <h2
              id="evidence-panel-title"
              className="font-editorial mt-2 text-[1.7rem] font-medium leading-tight"
            >
              {evidence.label}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeEvidence}
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close evidence"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-5 px-5 py-6 text-sm">
          <p className="leading-6 text-foreground/78">{evidence.explanation}</p>
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
