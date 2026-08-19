# @otto-nation/brand

otto-nation's design tokens, marks, and page chrome. Every org property consumes
this package; nothing else in the org owns a hex, a font, or page chrome.

## Fonts

Both faces are vendored as variable woff2 and loaded by plain `@font-face`. Neither
uses `next/font`, so a consumer's build needs no network access.

| Face | Variable | Source | Version / commit | Licence |
|---|---|---|---|---|
| League Spartan | `--font-display` | https://github.com/theleagueof/league-spartan, release asset `variable/WOFF2/LeagueSpartan-VF.woff2` from tag `2.220` (2020-10-28) | `2.220`, sha256 `268294f19c129945d188288e01166b341edbadbe47a6d2cc19d1aa829f3ec4ff` | SIL OFL — `fonts/OFL-LeagueSpartan.txt` |
| League Mono | `--font-mono` | https://github.com/theleagueof/league-mono | unconfirmed — see note below, sha256 `6be53ec3d4bcede8d20063542627fb92e3d82d363cc65042e7426ce28f5e7588` | SIL OFL — `fonts/OFL-LeagueMono.txt` |

League Mono's binary is a byte-for-byte copy of the file already vendored at
`otto-workbench/site/app/fonts/LeagueMonoVariable.woff2` (introduced in that repo's
`f0f90d44`), verified by matching sha256 on both sides. Its hash does not match the
`variable/WOFF2/LeagueMono-VF.woff2` asset in either of the upstream repo's releases
with a variable build (`2.220`, `2.300`), so the exact upstream version could not be
pinned — the vendored file was likely subset or rebuilt before it was first added.
Flagged here rather than guessing a version number.

The two faces carry separate SIL OFL license files because their copyright lines
name different holders: League Mono's OFL is held solely by Tyler Finck, while
League Spartan's also names Micah Rich and reserves the font name "League Spartan".
One license file cannot stand in for both.

Each face's `@font-face` `font-weight` range in `fonts.css` matches its actual `fvar`
`wght` axis, confirmed with fontTools against the vendored binaries — not a uniform
100–900:

- League Spartan: `200 900` (axis default 200)
- League Mono: `100 800` (axis default 100; also carries an unused `wdth` axis,
  50–200, default 100, not exposed by `fonts.css`)

No automatic update. Refresh by repeating the acquisition above and updating this
table — a committed binary with no provenance is the failure mode this exists to
prevent.

This retires the upgrade trigger the predecessor spec recorded ("when League Mono
reaches Google Fonts, move it to `next/font/google`"): neither face uses that loader.

## Consumer setup

Two config lines, and `otto-brand-check` fails your build if either is missing.

1. Depend on a release tarball — public releases need no authentication, so no
   consumer, contributor, or CI job needs a token to install:

   ```json
   "@otto-nation/brand": "https://github.com/otto-nation/otto-nation.github.io/releases/download/brand-v1.0.0/otto-nation-brand-1.0.0.tgz"
   ```

2. In your Tailwind entrypoint:

   ```css
   @import 'tailwindcss';
   @import '@otto-nation/brand/tokens.css';
   @import '@otto-nation/brand/fonts.css';
   @source '../node_modules/@otto-nation/brand/**/*.tsx';
   ```

   The `@source` line is not optional. Tailwind v4 excludes `node_modules` from
   auto-detection, so without it every utility the package uses is absent from
   your stylesheet and the page renders unstyled.

   Write it as an explicit file glob, exactly as above — not as a bare directory
   (`@source '../node_modules/@otto-nation/brand/src'`). The glob form is the one
   verified to work against Next 16 + Turbopack + Tailwind v4.3.3; the directory
   form is untested here and a directory argument is the shape Tailwind applies
   its auto-detection heuristics to, which is what excludes `node_modules` in the
   first place. Adjust the depth to your own layout: `../node_modules/...` from
   `app/global.css` when the app has its own `node_modules`, `../../node_modules/...`
   when it is a workspace package and npm has hoisted them to the repo root.

3. In `next.config.mjs`:

   ```js
   transpilePackages: ['@otto-nation/brand'],
   ```

4. In CI, and ideally in a pre-push hook:

   ```bash
   npx otto-brand-check --css site/app/global.css --next-config site/next.config.mjs --src site/app site/components
   ```

## Exports

| Export | Shape |
|---|---|
| `@otto-nation/brand/tokens.css` | Sole owner of every hex in the org, including the `--color-fd-*` fumadocs remap |
| `@otto-nation/brand/fonts.css` | `@font-face` for both faces; defines `--font-display`, `--font-mono` |
| `Greca` | `{ size?: number; onDark?: boolean }` |
| `GrecaDivider` | — |
| `Rings` | — |
| `Eyebrow` | `{ children, className? }` |
| `Button` | `{ href, children, variant?: 'solid' \| 'outline', size?: 'sm' \| 'xs', onDark?, className? }` |
| `CardGrid` | `{ columns: 2 \| 3, items: CardItem[], className? }` |
| `Nav` | `{ product, links, slot? }` |
| `Footer` | `{ cta?, className? }` |
| `Hero` | `{ eyebrow, headline, lede, actions? }` |
| `InstallBlock` | `{ shell, commands }` |
| `SearchButton` | Client component, `@otto-nation/brand/search-button` only |

`CardItem` is `{ title, body, href?, accent?, meta? }`.

Every component takes `className?` and merges it with `tailwind-merge`, so your
class beats the package default by prop rather than by stylesheet source order.

### Cross-deployment links

`Nav`'s `links` and `CardGrid`'s `href` are site-local and render through
`next/link`. The org property links are internal to `Nav` and `Footer` and render
as absolute anchors. This is structural on purpose: a consumer with a `basePath`
(otto-workbench sets `/otto-workbench`) has `next/link` prefix every internal
href, so an absolute URL passed through `Link` resolves inside the wrong site.
There is no prop that lets a caller get this wrong.

## Why raw source, no build step

Tailwind's scanner has to read the components' source to emit their utilities, so
a compiled artifact would mean shipping source *and* build output. Shipping source
also sidesteps the `"use client"` directive mangling bundlers are prone to, which
would break `InstallBlock` and `SearchButton`.

Probe verdict — 2026-08-18 (`.superpowers/sdd/2026-08-18-otto-nation-brand-package/task-1c-report.md`
in the otto-workbench repo has the full evidence trail; three rounds were needed
because the first two produced a false negative from a broken `/tmp` scaffold that
emitted zero utilities from *any* source, package or not):

| Question | Verified |
|---|---|
| A bare-specifier `@import` of the package's CSS resolves | pass, both workspace-symlink and real-tarball shapes |
| `"use client"` survives raw `.tsx` + `transpilePackages` | pass, both shapes |
| `@source` reaches `.tsx` inside `node_modules`, including through an npm `file:` symlink | pass, with a control class from the consumer's own source emitted in the same build |

Winning `@source` form: `@source '../node_modules/<pkg>/**/*.tsx';` — an explicit
file glob. Adjust depth per consumer: `../` when the app owns its `node_modules`,
`../../` when npm has hoisted them to a workspace root. The bare-directory form
was never confirmed to work on a host where the scanner was genuinely running, so
the glob is the form to use, not an assumption that either would do.
