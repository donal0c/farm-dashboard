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
            Missing is not zero
          </h2>
          <p className="mt-3">
            When a source is stale, unavailable, or structurally invalid, the
            interface reports that state instead of substituting sample values.
          </p>
        </section>
      </div>
    </article>
  );
}
