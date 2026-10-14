# AgriView interface design lock

This document is the visual and interaction contract for AgriView. It keeps the
product recognisably agricultural and editorial without turning it into a
decorative dashboard. Revised 14 October 2026 after the deep audit.

## Product character

- **Style:** a field notebook that opens on this week's decision. Public-service
  clarity, modern farm utility, restrained paper surfaces.
- **Visual argument:** one weekly decision deserves attention; everything else
  is evidence, a check, or a boundary. The decision is the first thing on the
  page at every width.
- **Avoid:** card mosaics, glass effects, ornamental gradients, oversized metric
  tiles, generic SaaS blue, decorative animation, charts without a farmer
  decision use, uppercase tracked kickers above headings, and coloured
  left-rules as a semantic device.

## Semantic hierarchy: the margin mark

Priorities are annotated in a notebook margin, never by a coloured border.

- A **margin mark** is a filled disc (36–44 px) holding the semantic icon with
  the word beneath it: `Act`, `Check`, `Watch`, `Boundary`
  (`components/ui/priority-mark.tsx`).
- **Act** is rust (`--act`), arrow icon, the lead headline.
- **Check** is ochre (`--check`), checked-circle icon.
- **Watch** is slate (`--watch`), eye icon; also used for a warning that does
  not list the saved county.
- **Boundary** is neutral, shield icon, on a muted ground.
- Meaning always includes icon and text; colour is never the only signal.
- The one-line eyebrow above a decision title is content (the rule or hazard and
  whether it covers the county), set in the semantic colour at 13 px sentence
  case. It is not a decorative kicker.

## Type

- Newsreader (variable, optical sizing on, italic available) is reserved for
  page titles, decision headlines, section titles and one italic date line.
- IBM Plex Sans carries navigation, body copy, labels, data, and controls.
- Scale: `.display-lg` 2.125–3.25 rem, `.display-md` 1.75–2.5 rem,
  `.display-sm` 1.375–1.75 rem; body 16 px at 1.6–1.75; data and labels 11–14
  px. Nothing below 10 px.
- Display tracking −0.028 em with balanced wrapping; prose measures 58–70 ch;
  data uses tabular figures.

## Spacing and surfaces

- 4/8 px rhythm. Section gaps 32, 48 or 64 px. Page gutters 16 px phone, 28 px
  tablet, 40 px desktop; content max-width 1180 px.
- `--rule` hairlines create notebook structure. The lead decision and dialogs
  sit on a `.sheet`: raised paper with a real offset shadow. Nothing else casts
  a shadow.
- The rail is a second neutral layer (`--rail`) with a hairline, not a dark
  admin sidebar.
- Radius 4–8 px.

## Theme

- Light is limestone paper with peat ink and moss actions.
- Dark is a desaturated night field: deep moss-black ground, lifted panels,
  calmer semantic tones. It is a recalibration, not an inversion.
- Charts read their colours from the same CSS tokens at runtime; the map's
  night style is derived from the day style so both share one source of
  geographic truth.
- Browser surfaces are themed: selection, caret, focus ring, scrollbar,
  underline offset, select chevrons, numerals.

## Data graphic grammar

- The weather ledger (`weekly-evidence-strip.tsx`) is one column per usable
  day: day, date, icon, high, low, rain bar with millimetres, gust. The days the
  lead decision names are highlighted with a moss rule and tint, so the
  evidence visibly supports the call.
- Gusts at or above the versioned threshold are set bold in ochre.
- Everything in a graphic is also available as text; no hover is required.
- No chart animation.

## Interaction states

- Controls have a minimum 44 px target; `.control` is the one form vocabulary.
- Hover changes colour or surface only; pressed state is a subtle colour change.
- Focus uses the global 2 px moss ring with 2 px offset.
- Loading skeletons reserve final dimensions.
- Degraded, partial and empty states use one component (`SourceNotice`) that
  says what is missing, what was not inferred, and offers a retry.
- Evidence is a sticky dock at 1280 px and up, and a focus-trapped dialog
  below. Closing restores its trigger.

## Motion

- One authored moment per surface: the lead sheet settles in (420 ms), the
  ledger highlight fades up (700 ms, delayed), the evidence dock slides in
  (320 ms). All use an exponential ease-out from an already-visible default.
- Reduced motion swaps every entrance for a 160 ms opacity fade.

## Responsive composition

### Desktop (1280+)

```text
week line + farm title                    source dots
enterprise · focus · Change (inline sheet)
┌───────────────────── sheet ─────────────────────┐
│ mark │ decision copy          │ weather ledger   │
└──────────────────────────────────────────────────┘
Also this week (margin-marked list)   decision boundary
footer disclaimer · print
```

With the evidence dock open, the sheet stacks the ledger beneath the copy and
the dock takes a 340 px column.

### Phone (320–767)

```text
week line + farm title
source dots
enterprise · focus · Change
sheet: mark + decision, then the ledger (seven narrow columns, no overflow)
Also this week
decision boundary
footer · print
bottom navigation safe area
```

The decision title is visible in the first viewport on a 390 px phone.
