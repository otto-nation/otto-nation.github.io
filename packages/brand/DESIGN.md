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

Sizes live as those Tailwind classes, not as a pixel type scale. Do not invent one.

## Layout

Spacing follows Tailwind's 4px base (`{spacing.1}` is one step). Chrome uses
`px-6`. Cards `p-4`. Hero `pt-11 pb-9` with content `sm:max-w-[62%]`.

CardGrid: 2 columns at `gap-4`; 3 columns at `gap-6` because linked cards add a
`-m-4` hit area.

## Elevation & Depth

Flat. No shadows. Hierarchy is three edges:

| Treatment | Token | Use |
| --- | --- | --- |
| Hairline | `{colors.hairline}` | Card edges, nav border, dividers |
| Outline | `{colors.outline}` | Control boundary — how you find an input |
| Block band | `{colors.block}` | Footer and install; stays dark in both themes |

## Shapes

Buttons: `rounded-md` → `{rounded.md}`. Cards and the install block:
`rounded-lg` → `{rounded.lg}`. No pills.

## Components

Pairs below match the `.tsx` exports. Borders, hover, and hit-area are prose —
the format's component keys do not include them.

```yaml
components:
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
  button-outline:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
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
```

- **button-solid** — default CTA. `font-semibold`, `px-4 py-2`, `text-sm` (or `xs`).
- **button-outline** — same radius; hairline border, no fill.
- **button-on-dark** — solid on the block band (`onDark`).
- **card** — no fill (sits on canvas), hairline border, `p-4`. Title `text-sm font-bold tracking-tight`; body `text-xs` ink-muted.
- **card-accent** — card plus a 3px left rule; colour is the caller's (`accent` prop).
- **card-linked** — no border until hover/focus paints hairline; `-m-4` hit area.
- **eyebrow** — mono, 10px, ink-muted.
- **hero** — Rings mark, then eyebrow, headline, lede, actions.
- **nav** — hairline bottom border; Greca + product wordmark; mono links.
- **install-block** — block fill; amarillo `$ ` prefix on each command.
- **footer** — block fill; Greca onDark; property links.

## Do's and Don'ts

- Do put body copy in `{colors.ink}` or `{colors.ink-muted}` on `{colors.canvas}` / `{colors.surface}`.
- Do put text on amarillo/rosa fills in `{colors.on-amarillo}` / `{colors.on-rosa}`.
- Do keep the block band dark in both themes.
- Don't use amarillo as text on the light canvas.
- Don't use rosa for inline prose; UI and large text only.
- Don't use `{colors.outline}` as text; dim and faint map to `{colors.ink-muted}`.
- Don't use `{colors.hover}` as a border colour.
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

## Consuming

This file ships with `@otto-nation/brand` from 1.3.0. Locate it with
`node -p "require.resolve('@otto-nation/brand/DESIGN.md')"`. For setup, tokens,
and the no-build zip, see the package README.
