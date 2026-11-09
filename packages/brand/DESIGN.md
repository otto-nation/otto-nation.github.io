---
# Generated from src/tokens.css and src/fonts.css by
# `npm run design:generate -w packages/brand`. Do not edit; the prose below is hand-written.
version: alpha
name: otto-nation
description: "Warm cream canvas, Mexican palette names, Greca fret. Unprefixed YAML colours are the light ramp; dark-* keys are the dark ramp."
colors:
  primary: "#d81e5b"
  canvas: "#f7f2e9"
  surface: "#fbf6ea"
  ink: "#1a1712"
  ink-muted: "#5c5447"
  hairline: "#e4dac6"
  amarillo: "#e5ba41"
  rosa: "#d81e5b"
  barro: "#c4552f"
  anil: "#2b4ba8"
  done: "#486a2f"
  warn: "#866118"
  on-amarillo: "#1a1712"
  on-rosa: "#fbf6ea"
  outline: "#8f8575"
  done-soft: "#e6ede7"
  warn-soft: "#f3e9d6"
  danger: "#a8361f"
  danger-soft: "#f5e3dc"
  info: "#1d6a75"
  info-soft: "#e0ecee"
  hover: "#f1ebdf"
  selected: "#eee6d6"
  magenta: "#b8184d"
  block: "#1a1712"
  block-ink: "#e8e3d8"
  block-ink-muted: "#8a8073"
  block-hairline: "#3d3420"
  dark-primary: "#e5ba41"
  dark-canvas: "#0f0e13"
  dark-surface: "#1f1c14"
  dark-ink: "#e8e3d8"
  dark-ink-muted: "#978d7f"
  dark-hairline: "#3d3420"
  dark-amarillo: "#e5ba41"
  dark-rosa: "#d81e5b"
  dark-barro: "#c4552f"
  dark-anil: "#7f9cf0"
  dark-done: "#93be74"
  dark-warn: "#d6aa51"
  dark-on-amarillo: "#1a1712"
  dark-on-rosa: "#fbf6ea"
  dark-outline: "#706756"
  dark-done-soft: "#1e2719"
  dark-warn-soft: "#2a2314"
  dark-danger: "#f0907a"
  dark-danger-soft: "#2e1d17"
  dark-info: "#6cc0cb"
  dark-info-soft: "#152427"
  dark-hover: "#28241b"
  dark-selected: "#2b271d"
  dark-magenta: "#f0709a"
  dark-block: "#393328"
  dark-block-ink: "#e8e3d8"
  dark-block-ink-muted: "#a89e8f"
  dark-block-hairline: "#544c3c"
typography:
  display:
    fontFamily: League Spartan
    letterSpacing: "-0.01em"
  heading:
    fontFamily: League Spartan
    letterSpacing: "-0.02em"
  mono:
    fontFamily: League Mono
  eyebrow:
    fontFamily: League Mono
    letterSpacing: 0.15em
  meta:
    fontFamily: League Spartan
    fontSize: 11px
    fontWeight: 400
    lineHeight: 16px
  section:
    fontFamily: League Spartan
    fontSize: 11px
    fontWeight: 600
    lineHeight: 16px
  label:
    fontFamily: League Spartan
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
  body:
    fontFamily: League Spartan
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
  title:
    fontFamily: League Spartan
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
  code:
    fontFamily: League Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
rounded:
  sm: 4px
  md: 6px
  lg: 8px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  control-height: 28px
  control-height-dense: 24px
  row-height: 32px
  row-height-dense: 28px
  control-padding: 10px
  card-padding: 12px
  column-min: 260px
---

# otto-nation

## Overview

otto-nation is **ONE TOOLCHAIN**: three properties that assume each other — a
workbench that manages your machine, a stack that manages your services, and a
tap that installs both.

The page is a warm cream canvas, not white. Palette names are Mexican Spanish
(amarillo, rosa, barro, anil). The Greca fret is the mark.

`{colors.x}` in this file is `var(--ow-x)` in CSS. `{colors.primary}` equals
`{colors.rosa}` and `--color-fd-primary`. Dark mode swaps that mapping to
`{colors.amarillo}` (`{colors.dark-primary}`). `{colors.dark-x}` is every
light token's `.dark` value; a missing key never means inherit.

## Colors

YAML holds both ramps: `{colors.x}` from `:root`, `{colors.dark-x}` from the
`.dark` cascade. Roles below; values live in the tokens.

Text is two tiers: `{colors.ink}` and `{colors.ink-muted}`. `{colors.outline}`
is never text. A dim or faint slot maps to ink-muted.

Hover is `{colors.hover}` (never a border colour). Pressed and selected fill
is `{colors.selected}`; fill is never the only selected cue. CI pass is
`{colors.done}`, fail is `{colors.danger}`, running/queued is `{colors.info}`,
stale is `{colors.warn}`.

| Token | Role |
| --- | --- |
| canvas | Page background |
| surface | fumadocs cards and popovers (`--color-fd-card`); CardGrid cards have no fill |
| ink | Body copy, solid button fill |
| ink-muted | Secondary copy, eyebrows, nav links |
| hairline | Dividers, card edges, outline-button border |
| outline | Control boundary (inputs); non-text 3:1. Never text |
| amarillo | Rules, borders, prompts, SVG line-work. Never text on light |
| rosa | UI and large text only; primary on light |
| barro | Greca stroke on light |
| anil | Links; fill that carries canvas text |
| done / warn | Success / warning, text-safe. CI pass / stale |
| danger / info | Error/fail / working/running, text-safe |
| magenta | Text-safe magenta, ANSI 5/13 only |
| done-soft / warn-soft | Tinted panels behind those states |
| danger-soft / info-soft | Tinted panels behind danger and info |
| hover | Hover fill; never a border colour |
| selected | Selected/pressed fill; never the only selected cue |
| on-amarillo / on-rosa | Text on those fills; invariant across themes |
| block* | Install block and footer; dark band in both themes |

Documented contrast claims from `tokens.css`:

<!-- generated:contrast-rules -->
| Token | Ratio | On | Theme |
| --- | --- | --- | --- |
| amarillo | 1.65:1 | canvas | light |
| rosa | 4.42:1 | canvas | light |
| done | 5.57:1 | canvas | light |
| warn | 5.04:1 | canvas | light |
| danger | 5.86:1 | canvas | light |
| danger | 6.06:1 | surface | light |
| info | 5.59:1 | canvas | light |
| info | 5.78:1 | surface | light |
| magenta | 5.75:1 | canvas | light |
| magenta | 5.94:1 | surface | light |
| anil | 7.04:1 | canvas | light |
| ink-muted | 6.92:1 | surface | light |
| on-amarillo | 9.73:1 | amarillo | light |
| on-rosa | 4.57:1 | rosa | light |
| outline | 3.26:1 | canvas | light |
| outline | 3.37:1 | surface | light |
| ink-muted | 6.27:1 | done-soft | light |
| done | 5.22:1 | done-soft | light |
| ink-muted | 6.20:1 | warn-soft | light |
| warn | 4.67:1 | warn-soft | light |
| danger | 5.26:1 | danger-soft | light |
| info | 5.16:1 | info-soft | light |
| warn | 4.53:1 | selected | light |
| block-ink | 13.96:1 | block | light |
| block-ink-muted | 4.61:1 | block | light |
| amarillo | 9.73:1 | block | light |
| anil | 6.41:1 | surface | dark |
| ink-muted | 5.21:1 | surface | dark |
| outline | 3.44:1 | canvas | dark |
| outline | 3.05:1 | surface | dark |
| ink-muted | 4.73:1 | done-soft | dark |
| done | 7.25:1 | done-soft | dark |
| ink-muted | 4.77:1 | warn-soft | dark |
| warn | 7.21:1 | warn-soft | dark |
| danger | 6.88:1 | danger-soft | dark |
| info | 7.64:1 | info-soft | dark |
| ink-muted | 4.74:1 | hover | dark |
| ink-muted | 4.56:1 | selected | dark |
| block | 1.54:1 | canvas | dark |
| block-ink | 9.78:1 | block | dark |
| block-ink-muted | 4.74:1 | block | dark |
| block-hairline | 1.48:1 | block | dark |
| done | 9.02:1 | canvas | dark |
| warn | 8.90:1 | canvas | dark |
| danger | 8.22:1 | canvas | dark |
| danger | 7.27:1 | surface | dark |
| info | 9.19:1 | canvas | dark |
| info | 8.13:1 | surface | dark |
| magenta | 6.86:1 | canvas | dark |
| magenta | 6.07:1 | surface | dark |
<!-- /generated:contrast-rules -->

## Typography

Two faces, both variable, plus Otto Fallback for glyphs League does not draw.

| Role | Face | Where |
| --- | --- | --- |
| Display / body | League Spartan (`--font-display`) | UI and body. Tracking is `{typography.display}` |
| Headings | League Spartan | `h1`–`h4` tracking is `{typography.heading}` |
| Hero headline | League Spartan | `text-5xl font-extrabold leading-[0.94] tracking-[-0.022em]` |
| Eyebrow / labels | League Mono (`--font-mono`) | `font-mono text-[10px]` plus `{typography.eyebrow}` |
| Code / meta | League Mono | `font-mono text-xs`; install prompt `text-[9px]` |

Pages use those Tailwind classes. App UI uses the roles below and nothing else.
CSS consumers write `font: var(--ow-font-body)`. Weights are 400/500/600. App
roles inherit `{typography.display}` tracking and emit no `letterSpacing` key.

| Role | Token | Use |
| --- | --- | --- |
| meta | `{typography.meta}` | Counts, timestamps, glyph captions |
| section | `{typography.section}` | Section labels |
| label | `{typography.label}` | Buttons, segmented, tags |
| body | `{typography.body}` | Rows, default app text |
| title | `{typography.title}` | Card/pane titles |
| code | `{typography.code}` | Branches, SHAs, paths |

## Layout

Spacing follows Tailwind's 4px base (`{spacing.1}` is one step). Chrome uses
`px-6`. Cards `p-4`. Hero `pt-11 pb-9` with content `sm:max-w-[62%]`.

App UI uses these lengths, owned by `tokens.css` (`{spacing.control-height}` is
`var(--ow-control-height)`):

| Token | Size | Use |
| --- | --- | --- |
| control-height | `{spacing.control-height}` | Buttons, inputs, segmented |
| control-height-dense | `{spacing.control-height-dense}` | Dense controls (WCAG 2.5.8 24px) |
| row-height | `{spacing.row-height}` | List rows |
| row-height-dense | `{spacing.row-height-dense}` | Dense list rows |
| control-padding | `{spacing.control-padding}` | Control inline padding |
| card-padding | `{spacing.card-padding}` | App cards |
| column-min | `{spacing.column-min}` | Board column min width |

Pane widths are the pane's container width. A YAML `breakpoints` key warns,
and `var()` is not allowed in `@container` conditions, so this table is
prose only.

| Pane | Width | Treatment |
| --- | --- | --- |
| rail | <160px | Icons and glyphs only |
| compact | 160–559px | Single column, dense heights |
| board | ≥560px | Columns `minmax(var(--ow-column-min), 1fr)` |
| wide | ≥1100px | Board plus a detail pane |

CardGrid: 2 columns at `gap-4`; 3 columns at `gap-6` because linked cards add a
`-m-4` hit area.

## Elevation & Depth

Flat. No shadows. Hierarchy is three edges:

| Treatment | Token | Use |
| --- | --- | --- |
| Hairline | `{colors.hairline}` | Containers that carry their own text label: cards, tags, the segmented track, text buttons, list dividers, popovers over content, nav |
| Outline | `{colors.outline}` | Controls you find by their edge: inputs, checkboxes, icon-only buttons, and a window/popover that floats over canvas |
| Block band | `{colors.block}` | Footer and install; stays dark in both themes |

Borders do not change on hover. Focus adds a 2px `{colors.anil}` outline,
offset 2px, in both themes; it does not swap the border.

Overlays stay flat. Depth is an edge, never a darker fill.

| Layer | Treatment |
| --- | --- |
| Popover / menu | `{colors.surface}` fill, `{colors.outline}` edge, `{rounded.lg}`. Surface vs canvas is 1.03 light / 1.13 dark, so the edge does the separating. |
| Window | Same as a popover. |
| Scrim | Modal only: `color-mix(in srgb, var(--ow-block) 50%, transparent)`. No token — an alpha hex breaks the token parser. |

## Shapes

Controls (buttons, segmented, inputs): `rounded-md` → `{rounded.md}` (6px).
Cards, popovers, and windows: `rounded-lg` → `{rounded.lg}` (8px). Tags:
`rounded-sm` → `{rounded.sm}` (4px). No `full`.

Do not use pills. Default status is coloured text plus a glyph. A label
that needs a container is a `tag`: hairline border, `{rounded.sm}`,
`{typography.label}`, `{colors.ink-muted}` text, no fill. Otherwise show
nothing.

## Components

Pairs below match the `.tsx` exports. Borders, hover fills, selected indicators,
and hit-area are prose — `borderColor` is not a component key. App entries use
refs to the colour, type, and length tokens. React consumers: `ActionButton`,
`SegmentedControl`, `Tag`, `SectionLabel`, `ListRow`, `AppCard` (including its popover variant), `Input`,
`StatusGlyph`, and `StateMessage` implement these entries.

```yaml
components:
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    height: "{spacing.control-height}"
    typography: "{typography.label}"
  button-outline:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "{spacing.control-height}"
    typography: "{typography.label}"
  button-outline-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "{spacing.control-height}"
    typography: "{typography.label}"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "{spacing.control-height}"
    typography: "{typography.label}"
  button-ghost-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "{spacing.control-height}"
    typography: "{typography.label}"
  button-on-dark:
    backgroundColor: "{colors.block-ink}"
    textColor: "{colors.block}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  card-accent:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  card-linked:
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  eyebrow:
    textColor: "{colors.ink-muted}"
    typography: "{typography.eyebrow}"
  hero:
    textColor: "{colors.ink}"
  nav:
    textColor: "{colors.ink}"
  install-block:
    backgroundColor: "{colors.block}"
    textColor: "{colors.block-ink}"
    rounded: "{rounded.lg}"
  footer:
    backgroundColor: "{colors.block}"
    textColor: "{colors.block-ink}"
  tag:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
  app-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding}"
  list-row:
    textColor: "{colors.ink}"
    height: "{spacing.row-height}"
    typography: "{typography.body}"
  list-row-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.ink}"
    height: "{spacing.row-height}"
    typography: "{typography.body}"
  list-row-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.ink}"
    height: "{spacing.row-height}"
    typography: "{typography.body}"
  section-label:
    textColor: "{colors.ink-muted}"
    typography: "{typography.section}"
  segmented:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    height: "{spacing.control-height}"
    typography: "{typography.label}"
  segmented-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    height: "{spacing.control-height}"
    typography: "{typography.label}"
  popover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding}"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "{spacing.control-height}"
    typography: "{typography.body}"
```

- **button-solid** — default CTA. `{typography.label}`, `{spacing.control-height}`.
- **button-outline** — hairline border; hover `{colors.hover}` fill; rest border stays.
- **button-ghost** — no fill; hover `{colors.hover}` fill; rest border stays.
- **button-on-dark** — solid on the block band (`onDark`).
- **card** — no fill (sits on canvas), hairline border, `p-4`. Title `text-sm font-bold tracking-tight`; body `text-xs` ink-muted.
- **card-accent** — card plus a 3px left rule; colour is the caller's (`accent` prop).
- **card-linked** — no border until hover paints hairline; focus shows the focus ring only; `-m-4` hit area.
- **eyebrow** — page only: mono, 10px, ink-muted.
- **section-label** — app section: `{typography.section}`, sentence case, ink-muted.
- **hero** — Rings mark, then eyebrow, headline, lede, actions.
- **nav** — hairline bottom border; Greca + product wordmark; mono links.
- **install-block** — block fill; amarillo `$ ` prefix on each command.
- **footer** — block fill; Greca onDark; property links.
- **tag** — hairline, `{rounded.sm}`, `{typography.label}`, ink-muted, no fill, 4px (`px-1`) inline padding.
- **app-card** — surface fill, hairline, `{rounded.lg}`, `{spacing.card-padding}`.
- **list-row** — `{typography.body}`, `{spacing.row-height}`. Hover `{colors.hover}`. Selected: `{colors.selected}` plus a 2px left rule in `{colors.primary}` (dark: amarillo) and ink text.
- **segmented** — hairline track, `{rounded.md}`, `{typography.label}`. Unselected ink-muted; selected is ink fill with canvas text.
- **popover** — surface fill, outline edge, `{rounded.lg}`, `{spacing.card-padding}`.
- **input** — outline border, `{rounded.md}`, `{typography.body}`, `{spacing.control-height}`.

| State | Treatment |
| --- | --- |
| hover | `{colors.hover}` fill. Rest border stays. Hover fill is never a border colour. |
| pressed | `{colors.selected}` fill. |
| selected | Never fill alone. Rows: selected fill plus a 2px `{colors.primary}` left rule (dark: amarillo) and ink text. Segmented: ink fill, canvas text. |
| focus | 2px `{colors.anil}` outline, offset 2px, both themes. Does not swap the border. |
| disabled | `{colors.ink-muted}` text, no fill change, no hover. A solid button keeps its ink fill at 50% opacity instead, since ink-muted on ink does not read. |

## Do's and Don'ts

- Do put body copy in `{colors.ink}` or `{colors.ink-muted}` on `{colors.canvas}` / `{colors.surface}`.
- Do put text on amarillo/rosa fills in `{colors.on-amarillo}` / `{colors.on-rosa}`.
- Do keep the block band dark in both themes.
- Don't use amarillo as text on the light canvas.
- Don't use rosa for inline prose; UI and large text only.
- Don't use `{colors.outline}` as text; dim and faint map to `{colors.ink-muted}`.
- Don't use `{colors.hover}` as a border colour.
- Don't change a border colour on hover; focus is the anil ring.
- Don't show selected by fill alone; rows take the primary left rule, segmented takes ink fill with canvas text.
- Don't use pills or `rounded-full`. Status is coloured text plus a glyph; a contained label is a `tag`.
- Don't use `{colors.magenta}` outside the terminal map; it is ANSI 5/13 only.
- Do use `{typography.section}` in sentence case and `{colors.ink-muted}` for app section labels; the page eyebrow stays for pages.
- Do use `{rounded.sm}` for tags, `{rounded.md}` for controls, `{rounded.lg}` for cards and popovers. No `full`.
- Don't copy hexes from this file into CSS. `tokens.css` owns every value.
- Don't hand-edit the front matter or `<!-- generated:* -->` regions; run `npm run design:generate -w packages/brand`.

## Marks

| Mark | Use |
| --- | --- |
| Greca | Wordmark. barro+rosa on light; amarillo+rosa on dark (`onDark`). |
| GrecaDivider | Hairline fret rule. Inline SVG so the stroke follows `{colors.hairline}`. |
| Rings | Hero decoration. Concentric amarillo, then rosa, then anil. Stroke is 2.4 CSS px, non-scaling. |

`src/marks/icon.svg` paints canvas, barro, and rosa as literal hexes: it is
loaded as a favicon and as an `<img>`, an isolated document that cannot resolve
`var(--ow-*)`. Greca is the same mark inline and uses tokens. Edit both together.

## States

Empty, loading, stale, and error copy is sentence case. Each status glyph is
always paired with a text or aria label.

| State | Treatment |
| --- | --- |
| empty | `{colors.ink-muted}` `{typography.body}`, sentence case, centred, no illustration. e.g. "No pull requests", "Not in a repository". |
| loading | "Loading…" (U+2026) in `{colors.ink-muted}`. No spinner unless it runs >1s. |
| stale | `{colors.warn}` "stale" plus relative time. |
| error | `{colors.danger}` one-line reason plus a `button-outline` "Retry". |

| Status | Glyph | Colour |
| --- | --- | --- |
| pass | ✓ U+2713 | `{colors.done}` |
| fail | × U+00D7 | `{colors.danger}` |
| running | … U+2026 | `{colors.info}` |
| warn | ! | `{colors.warn}` |
| none | · U+00B7 | `{colors.ink-muted}` |

## Terminal

The 16 ANSI colours plus foreground, background, cursor, and selection.
Values are refs only; hexes live in `tokens.css`. Brights reuse the normal
slot except dark bright-yellow, which is amarillo. Resolved hexes ship as
`terminal/otto-light.json` and `terminal/otto-dark.json` (generated; do not
edit).

Text slots (foreground, 1–6, 8–14) are ≥4.5:1 on that scheme's background.
Slots 0, 7, and 15 in light and slot 0 in dark are background-class and exempt.

```yaml
terminal:
  light:
    background: "{colors.canvas}"
    foreground: "{colors.ink}"
    cursor: "{colors.rosa}"
    selection: "{colors.selected}"
    0: "{colors.ink}"
    1: "{colors.danger}"
    2: "{colors.done}"
    3: "{colors.warn}"
    4: "{colors.anil}"
    5: "{colors.magenta}"
    6: "{colors.info}"
    7: "{colors.hairline}"
    8: "{colors.ink-muted}"
    9: "{colors.danger}"
    10: "{colors.done}"
    11: "{colors.warn}"
    12: "{colors.anil}"
    13: "{colors.magenta}"
    14: "{colors.info}"
    15: "{colors.surface}"
  dark:
    background: "{colors.dark-canvas}"
    foreground: "{colors.dark-ink}"
    cursor: "{colors.amarillo}"
    selection: "{colors.dark-selected}"
    0: "{colors.dark-hairline}"
    1: "{colors.dark-danger}"
    2: "{colors.dark-done}"
    3: "{colors.dark-warn}"
    4: "{colors.dark-anil}"
    5: "{colors.dark-magenta}"
    6: "{colors.dark-info}"
    7: "{colors.dark-ink-muted}"
    8: "{colors.dark-ink-muted}"
    9: "{colors.dark-danger}"
    10: "{colors.dark-done}"
    11: "{colors.amarillo}"
    12: "{colors.dark-anil}"
    13: "{colors.dark-magenta}"
    14: "{colors.dark-info}"
    15: "{colors.dark-ink}"
```

## Consuming

This file ships with `@otto-nation/brand` from 1.3.0. Locate it with
`node -p "require.resolve('@otto-nation/brand/DESIGN.md')"`. Terminal theme
files ship from 1.4.0 (`terminal/otto-light.json`, `terminal/otto-dark.json`;
generated; do not edit). App-UI React primitives ship from 1.5.0. For setup,
tokens, and the no-build zip, see the package README.
