export default function MethodologyPage() {
  return (
    <article className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        Methodology
      </p>
      <h1 className="font-editorial mt-2 text-5xl font-medium tracking-[-0.03em]">
        How the weekly brief is made
      </h1>
      <div className="mt-8 grid gap-8 border-t border-border pt-8 text-base leading-7 text-muted-foreground">
        <section>
          <h2 className="font-editorial text-3xl font-medium text-foreground">
            Deterministic, not generated
          </h2>
          <p className="mt-3">
            AgriView applies visible rules to normalized source snapshots. It
            does not use a language model to invent or rank farm advice.
          </p>
        </section>
        <section>
          <h2 className="font-editorial text-3xl font-medium text-foreground">
            The pin is the working location
          </h2>
          <p className="mt-3">
            Routing-key search only centres an approximate area. The point you
            save manually remains in this browser as your profile; its
            coordinate is sent to AgriView’s data routes when the app loads
            point or nearby evidence. There is no server-side user profile. The
            point is not an official property or Eircode lookup.
          </p>
        </section>
        <section>
          <h2 className="font-editorial text-3xl font-medium text-foreground">
            Evidence keeps its scope
          </h2>
          <p className="mt-3">
            A point forecast is an estimate at the saved coordinate. Nearby,
            county, regional, and national evidence is labelled as such and is
            never described as field-specific.
          </p>
        </section>
        <section>
          <h2 className="font-editorial text-3xl font-medium text-foreground">
            Compliance stays a verification task
          </h2>
          <p className="mt-3">
            Scheme dates and environmental layers are prompts to check current
            terms, records, correspondence, and professional guidance. They do
            not decide whether an action is permitted.
          </p>
        </section>
        <section>
          <h2 className="font-editorial text-3xl font-medium text-foreground">
            Missing is not zero
          </h2>
          <p className="mt-3">
            When a source is stale, unavailable, or structurally invalid, the
            interface reports that state instead of substituting sample values.
          </p>
        </section>
        <section>
          <h2 className="font-editorial text-3xl font-medium text-foreground">
            Last-known-good has a time limit
          </h2>
          <p className="mt-3">
            A previously validated response may be reused only within its
            source-specific cache window. If its freshness time has elapsed,
            AgriView labels it stale. If no valid cached response is available
            and the source fails, the result is unavailable—never silently
            replaced.
          </p>
        </section>
      </div>
    </article>
  );
}
