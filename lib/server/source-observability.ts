export type SourceFailureEvent = {
  event: "source_failure";
  sourceId: string;
  failureClass: string;
  status: number | null;
  durationMs: number;
};

export function createSourceFailureEvent({
  sourceId,
  failureClass,
  status,
  durationMs,
}: Omit<SourceFailureEvent, "event">): SourceFailureEvent {
  return {
    event: "source_failure",
    sourceId,
    failureClass,
    status,
    durationMs: Math.max(0, Math.round(durationMs)),
  };
}

export function logSourceFailure(
  details: Omit<SourceFailureEvent, "event">,
  write: (message: string) => void = console.error,
) {
  write(JSON.stringify(createSourceFailureEvent(details)));
}
