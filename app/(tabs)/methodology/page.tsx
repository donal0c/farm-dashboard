import { PageIntro } from "@/components/ui/page-intro";
import { BRIEFING_RULESET_VERSION, briefingRules } from "@/lib/briefing/rules";

const sections = [
  {
    title: "Deterministic, not generated",
    body: "AgriView applies visible rules to normalized source snapshots. It does not use a language model to invent or rank farm advice. Every priority on the brief points at the rule and the source that produced it.",
  },
  {
    title: "The pin is the working location",
    body: "Routing-key search only centres an approximate area. The point you save manually remains in this browser as your profile; its coordinate is sent to AgriView’s data routes when the app loads point or nearby evidence. There is no server-side user profile. The point is not an official property or Eircode lookup.",
  },
  {
    title: "Evidence keeps its scope",
    body: "A point forecast is an estimate at the saved coordinate. Nearby, county, regional, and national evidence is labelled as such and is never described as field-specific. A weather warning says whether it lists your county.",
  },
  {
    title: "Compliance stays a verification task",
    body: "Scheme dates and environmental layers are prompts to check current terms, records, correspondence, and professional guidance. They do not decide whether an action is permitted.",
  },
  {
    title: "Missing is not zero",
    body: "When a source is stale, unavailable, or structurally invalid, the interface reports that state instead of substituting sample values.",
  },
  {
    title: "Last-known-good has a time limit",
    body: "A previously validated response may be reused only within its source-specific cache window. If its freshness time has elapsed, AgriView labels it stale. If no valid cached response is available and the source fails, the result is unavailable, never silently replaced.",
  },
];

export default function MethodologyPage() {
  return (
    <article className="max-w-3xl">
      <PageIntro
        title="How the weekly brief is made"
        lede="The rules are small, versioned, and written down here so a farmer or adviser can disagree with them on the record."
      />
      <div className="grid gap-9 pt-9">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="display display-sm">{section.title}</h2>
            <p className="mt-3 max-w-[66ch] text-base leading-7 text-muted-foreground">
              {section.body}
            </p>
          </section>
        ))}

        <section className="border-t border-rule pt-9">
          <h2 className="display display-sm">
            The briefing rules, version {BRIEFING_RULESET_VERSION}
          </h2>
          <p className="mt-3 max-w-[66ch] text-base leading-7 text-muted-foreground">
            Three thresholds decide the weather priorities. A Red or Orange Met
            Éireann warning that lists your county is always the lead; a Yellow
            warning is a check; a regional warning that does not list your
            county is only a watch. A verified DAFM deadline within 45 days
            joins the brief as a watch, or a check when the week’s focus is
            compliance.
          </p>
          <dl className="mt-6 grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-3">
            {Object.values(briefingRules).map((rule) => (
              <div key={rule.id} className="bg-sheet px-4 py-4">
                <dt className="text-sm font-semibold">{rule.id}</dt>
                <dd className="mt-2 text-sm leading-6 text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">
                      {rule.threshold} {rule.unit}
                    </span>
                    , {rule.comparison}.
                  </p>
                  <p className="mt-2">{rule.rationale}</p>
                  <p className="mt-2 text-xs">
                    Inputs: {rule.inputs.join(", ")}. If unavailable:{" "}
                    {rule.degradedBehavior}
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </article>
  );
}
