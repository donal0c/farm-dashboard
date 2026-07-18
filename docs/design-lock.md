# AgriView interface design lock

This document is the visual and interaction contract for the AgriView overhaul.
It keeps the product recognisably agricultural and editorial without turning
it into a decorative dashboard.

## Product character

- **Style:** restrained field notebook, public-service clarity, modern farm
  utility.
- **Visual argument:** one weekly decision deserves attention; everything else
  is evidence, a check, or a boundary.
- **Avoid:** card mosaics, glass effects, ornamental gradients, oversized metric
  tiles, generic SaaS blue, decorative animation, and charts without a farmer
  decision use.

## Type

- Newsreader is reserved for page titles and decision headlines.
- IBM Plex Sans carries navigation, body copy, labels, data, and controls.
- Display: `48–72px`, compact leading, maximum two lines where practical.
- Section title: `28–36px`.
- Decision title: lead `32–48px`; supporting `20–28px`.
- Body: `16px` with `1.6–1.75` line-height.
- Data/labels: `12–14px`; never below `10px`, and only metadata may use `10px`.
- Long prose measures `60–72ch`; data uses tabular figures.

## Spacing and surfaces

- Use a 4/8px rhythm. Primary section gaps are `32`, `48`, or `64px`.
- Page gutters: `16px` phone, `28px` tablet, `40px` desktop.
- Borders create notebook structure. Shadows are reserved for dialogs.
- Page background is limestone paper; the lead action uses a quiet raised paper
  surface; supporting checks stay in the page plane.
- Radius stays restrained (`6–10px`) and never makes the interface playful.

## Semantic hierarchy

- **Act:** arrow icon, strongest headline and left rule. Destructive red is an
  attention colour, not an error implication.
- **Check:** checked-circle icon, harvest ochre, medium visual weight.
- **Watch/boundary:** eye or shield icon, water blue, quieter presentation.
- Meaning always includes icon and text; colour is never the only signal.
- Source health uses explicit text and separate Forecast/Warnings state labels.

## Data graphic grammar

- The weekly evidence strip compares rainfall and gusts across usable days.
- Rain uses filled vertical bars and exact millimetre labels.
- Gust uses a thin line with circular points and an explicit km/h label.
- Days and values remain available as text; the graphic has a screen-reader
  summary and does not require hover.
- Gridlines are minimal. There is no chart animation.

## Interaction states

- Controls have a minimum 44px target.
- Hover changes colour/surface only; pressed state uses a subtle colour change,
  never layout movement.
- Focus uses the global 2px semantic ring.
- Loading skeletons reserve the final layout dimensions and do not shimmer when
  reduced motion is requested.
- Errors state what is missing, what was not inferred, and offer a retry.
- Evidence is a dock on wide screens and the proven focus-trapped dialog below
  1024px. Closing always restores its trigger.

## Theme

- Light mode is warm paper with peat text and moss actions.
- Dark mode is a desaturated night-field palette, not an inversion.
- Borders, secondary text, semantic rules, charts, focus and disabled states
  must be checked independently in both themes.

## Responsive composition

### Desktop (1280+)

```text
farm/freshness context
page title + short promise
┌──────────────────────── lead action ────────────────────────┐
│ decision copy                       compact weather evidence │
└──────────────────────────────────────────────────────────────┘
supporting check(s)                   decision boundary
seven-day evidence strip             source state / route link

When opened, the evidence dock takes a real right column and the content
rebalances. No column is reserved while it is closed.
```

### Tablet (768–1023)

```text
context
title
lead action
compact weather evidence
supporting priorities
decision boundary

Evidence opens as a dialog.
```

### Phone (320–767)

```text
context chips
title
lead action
evidence strip (horizontal day rhythm, no page overflow)
supporting priorities
decision boundary
source health
bottom navigation safe area
```

The primary action, its evidence trigger, and the decision boundary remain
visible in document order at 200% text scaling.
