# otto-nation brand package and org landing site — design

Date: 2026-08-18
Status: phase 1 shipped — `packages/brand` is implemented, typechecked, and tested,
and the `otto-brand-check` validator landed with it rather than in phase 4. Phases 2–5
(landing site, release automation, otto-workbench migration, consumer fan-out) are
unstarted. Nothing consumes the package yet.
Issue: https://github.com/otto-nation/otto-workbench/issues/796

## Goal

Extract otto-nation's design language out of otto-workbench into a package every org
site consumes, and publish a landing site at the Pages root that presents the
properties as one toolchain.

Success criteria:

1. `https://otto-nation.github.io/` serves a landing page composed entirely from
   package exports.
2. otto-workbench's site renders as it does today while owning no palette, font, or
   page-chrome code of its own.
3. A `brand-v*` tag publishes an installable tarball. Once phase 5 lands, it also opens
   a version-bump pull request in every repo listed in `consumers.yml`.
4. Both sites build with no network access for fonts.
5. A consumer that omits the required `@source` or `transpilePackages` line fails CI
   rather than silently rendering unstyled.
6. Adding otto-stack later costs one line in `consumers.yml` and two config lines in
   that repo.

Explicit non-goals: otto-stack's Hugo migration, a custom domain, cross-property
search, semver ranges and Dependabot, a component playground.

## Context

`site/app/tokens.css` owns the `--ow-*` palette; `site/components/` owns the greca and
rings marks; `site/components/landing/` owns seven page sections. All of it is
otto-workbench-local. otto-stack keeps a parallel copy of the palette in
`docs-site/assets/scss/common/_variables-custom.scss`, in SCSS, already drifted.

The predecessor spec anticipated this exactly, in `2026-08-17-site-fumadocs-design.md`
under "Token ownership":

> This accepts drift between two repos in exchange for not building cross-repo token
> distribution for two consumers. Upgrade trigger: a third consumer, or the first time
> the two sites visibly disagree on the brand colour.

A third consumer is now wanted. The trigger is met and this spec is the response.

The landing components have also drifted internally, which is the evidence that tier-3
extraction is real reuse rather than speculation:

- The eyebrow label appears verbatim three times with two different tracking values —
  `tracking-[0.16em]` in `hero.tsx:9`, `tracking-[0.15em]` in `included.tsx:15` and
  `how-it-works.tsx:9`.
- Button styling appears four times across `hero.tsx` and `footer.tsx` with
  inconsistent sizing (`text-sm` vs `text-xs`).
- `Included` and `HowItWorks` are the same component — a grid of hairline-bordered
  cards — written twice, differing only in whether a card links and whether it carries
  an accent border.

### Verified facts

Checked against the working tree on 2026-08-18:

- Thirteen `--ow-*` tokens are actually referenced across `site/`. The predecessor
  spec listed an `ink-faint` token (line 124) that never shipped. **The package takes
  its token set from `site/app/tokens.css` as implemented, not from that spec.**
- `site/package-lock.json` resolves Tailwind to 4.3.3.
- `site/next.config.mjs` sets `output: 'export'`, `basePath: '/otto-workbench'`,
  `trailingSlash: true`, and a `turbopack.root` override.
- `.github/workflows/pages.yml` is path-filtered to `site/**`, `docs/**`, and itself.
- `site/README.md` records that `npm run build` needs network access solely because
  `next/font/google` fetches League Spartan at build time.
- The org has four repos. No `otto-nation.github.io` repo exists, so the Pages root is
  unclaimed and project pages sit under it with nothing above them.
- `SearchButton` imports `fumadocs-ui/contexts/search` and returns `null` when search
  is disabled.

### Unverified — resolved by probe

Step one of implementation, before any extraction:

1. **Tailwind `@source` against a package in `node_modules`,** through the Next +
   `@tailwindcss/postcss` pipeline, in *both* resolution shapes — the workspace symlink
   the landing site will use, and the real directory an extracted tarball produces.
   Symlink traversal is the specific risk; Tailwind v4 excludes `node_modules` from
   auto-detection, and whether an explicit `@source` follows a workspace symlink is not
   something the documentation settles.
2. **Whether raw `.tsx` plus `transpilePackages` preserves `"use client"`** across a
   tarball install, for the two client components (`InstallBlock`, `SearchButton`).

If either fails, the fallback is a build step in the package emitting ESM plus a
prebuilt stylesheet — the option-2 styling approach, deferred rather than discarded.
Whichever path wins is recorded in the package README with the reason.

## Architecture

New repo `otto-nation/otto-nation.github.io`, npm workspaces:

```
package.json               # workspaces: ["packages/*", "site"]
packages/brand/
  package.json             # name @otto-nation/brand; files: ["src", "bin", "LICENSE"]
  README.md                # consumer setup; probe outcome; font provenance
  LICENSE                  # MIT AND OFL-1.1 — the code, and both vendored faces
  tsconfig.json            # strict, moduleResolution "bundler"; run by npm test
  bin/
    otto-brand-check.mjs   # the consumer-config validator, shipped as the package's bin
  src/
    index.ts
    tokens.css             # moved verbatim from otto-workbench site/app/tokens.css
    fonts.css              # @font-face for both faces
    fonts/                 # LeagueSpartanVariable.woff2, LeagueMonoVariable.woff2, one OFL per face
    internal/
      href.ts              # leavesThisDeployment; absent from the barrel and the exports map
    marks/
      greca.tsx            # Greca, GrecaDivider
      rings.tsx            # Rings
      icon.svg
    primitives/
      eyebrow.tsx
      button.tsx
      card-grid.tsx
    chrome/
      nav.tsx
      footer.tsx
      hero.tsx
      install-block.tsx
      search-button.tsx
  test/                    # node --test: brand-check, contrast, exports, href
site/                      # the landing app; mirrors otto-workbench's naming
.github/workflows/
  pages.yml
  brand-release.yml
consumers.yml
```

The package ships **raw `.tsx` with no build step**. Tailwind's scanner has to read the
source anyway, so a compiled artifact would mean shipping source *and* build output;
and shipping source sidesteps the `"use client"` directive mangling that bundlers are
prone to. `npm pack` tars `src/`, `bin/`, and the `LICENSE`. Consumers add
`transpilePackages`.

The landing site consumes the package through the workspace link, not the tarball. See
"Testing" — that gap needs its own coverage.

## Package API

| Export | Shape | Notes |
|---|---|---|
| `tokens.css` | CSS | Sole owner of every hex in the org. Includes the `--color-fd-*` fumadocs remap. |
| `fonts.css` | CSS | `@font-face` for both faces; defines `--font-display`, `--font-mono`. |
| `Greca` | `{ size?, onDark? }` | Unchanged from today. |
| `GrecaDivider` | — | Unchanged. |
| `Rings` | — | Unchanged. |
| `Eyebrow` | `{ children }` | Resolves the 0.15/0.16em tracking split — one value wins. |
| `Button` | `{ href, variant: 'solid' \| 'outline', size?, onDark? }` | Absorbs the four inconsistent instances. `onDark` selects the `--ow-block-*` ramp. |
| `CardGrid` | `{ columns, items: { title, body, href?, accent?, meta? }[] }` | Subsumes `Included` and `HowItWorks`. `meta` is the mono trailing line. |
| `Nav` | `{ product, links, slot? }` | `links` are site-local; org property links are baked in. `slot` takes `SearchButton` so fumadocs' search context stays out of docs-less consumers. |
| `Footer` | `{ cta? }` | Dark band, `--ow-block-*`. |
| `Hero` | `{ eyebrow, headline, lede, actions }` | `headline` accepts nodes so the two-line break survives. |
| `InstallBlock` | `{ shell, commands }` | Terminal chrome plus copy button; `commands` replaces the hardcoded constant. |
| `SearchButton` | — | Client component; returns `null` when search is disabled. The one export not in the barrel: it is reachable only at `@otto-nation/brand/search-button`, so importing it does not pull fumadocs into the graph of a docs-less consumer. |

Components use `tailwind-merge` so a consumer's `className` beats the package's
defaults by prop rather than by stylesheet source order.

### Cross-property links

otto-workbench sets `basePath: '/otto-workbench'`, so `next/link` prefixes every
internal href. Links that cross deployments must therefore be plain `<a href>` with
absolute URLs, or they resolve inside the wrong site. The `Nav` and `Footer` APIs make
this structural rather than incidental: the `links` prop is site-local and rendered
with `Link`; the org property links are internal to the component and rendered as
absolute anchors. A consumer cannot get this wrong by passing the wrong prop.

## Fonts

Vendor **both** faces as variable woff2 loaded by plain `@font-face`, dropping
`next/font/google`. Today only League Mono is vendored. League Spartan ships as a
variable font across its full 100–900 range, so it is a drop-in with no subsetting or
static-instance step — the same situation as League Mono.

Three reasons: it removes the build-time network dependency `site/README.md` already
flags; it removes any `next/font` coupling from the package, which would otherwise
force `transpilePackages` to interact with Next's font loader; and it makes the font
story identical for every consumer regardless of framework, which keeps the option-2
fallback cheap.

Both faces are SIL OFL, so vendoring is licensed. `--font-display` and `--font-mono`
keep the names `tokens.css:75-83` already expects, so nothing downstream moves. The
package README records upstream source and version for both, since committed binaries
otherwise lose provenance.

This retires the upgrade trigger recorded in the predecessor spec — "when League Mono
reaches Google Fonts, move it to `next/font/google`" — because neither face now uses
that loader.

## Distribution and automation

`packages/brand/package.json` owns the version. Tag `brand-v<version>`; a mismatch
between tag and manifest fails the release.

`brand-release.yml`, on `brand-v*`:

1. `npm pack --workspace @otto-nation/brand`
2. Create the GitHub release, attach the tarball
3. Fan out over `consumers.yml`: for each entry, rewrite the tarball URL in that
   repo's `package.json`, run `npm install` to refresh the lockfile, open a pull
   request

Consumers depend on the release URL:

```json
"@otto-nation/brand": "https://github.com/otto-nation/otto-nation.github.io/releases/download/brand-v1.0.0/otto-nation-brand-1.0.0.tgz"
```

Public releases need no authentication, so no consumer, contributor, or CI job needs a
token to install.

**The fan-out does need one.** `GITHUB_TOKEN` cannot open a pull request in another
repository, so step 3 requires an org PAT stored as a secret in the brand repo. This is
the single piece of credential setup in the design. Without it, steps 1 and 2 still
work and version bumps are hand-edited — so the PAT gates convenience, not correctness,
and phase 4 can be dropped without stranding anything.

## Landing site

`site/` in the new repo. Static export, no `basePath` — it is the Pages root.

Scroll order, composed entirely from package exports: `Nav` → `Hero` → `GrecaDivider` →
`CardGrid` → `Footer`.

The hero frames otto-nation as one toolchain. The card grid is the "how they fit"
section — otto-workbench manages your machine, otto-stack manages your services,
homebrew-tap distributes both — each card linking to that property's site or repo.

No `InstallBlock`: the org root has nothing to install. That component is exercised by
otto-workbench instead, which is the right division — every export should have at least
one real consumer, and the two sites between them cover all of them.

Composing the landing page purely from exports is deliberate. It is the second consumer
that proves the API, and it fails loudly during development if a component is
over-fitted to otto-workbench's copy.

## otto-workbench migration

Deleted:

- `site/app/tokens.css`
- `site/app/fonts/` (both the woff2 and `OFL.txt`)
- `site/components/greca.tsx`, `site/components/rings.tsx`
- all seven files in `site/components/landing/`

Changed:

- `site/app/global.css` imports `@otto-nation/brand/tokens.css` and
  `@otto-nation/brand/fonts.css`, and adds the `@source` directive
- `site/next.config.mjs` adds `transpilePackages: ['@otto-nation/brand']`
- `site/app/layout.tsx` drops both `next/font` calls and the `.variable` class plumbing
- `site/app/page.tsx` composes package components and retains only its content data —
  the `ITEMS` array from `included.tsx:3-10` and `TIERS` from `how-it-works.tsx:1-4`
- `site/app/icon.svg` stays a local file. Next's metadata convention resolves
  `app/icon.svg` from disk and cannot take it from a package import, so this one asset
  is a copy rather than a dependency. A test asserts it matches
  `@otto-nation/brand/src/marks/icon.svg` byte for byte, which is what keeps the
  favicon from drifting away from the mark.

Net: roughly 250 lines removed, two config lines added. `site/README.md`'s "Colors" and
"Fonts" sections are rewritten to point at the package as the owner.

## Guardrails and testing

**New validator** — fails CI when `@otto-nation/brand` is a dependency but the CSS
entrypoint lacks `@source` or `next.config.mjs` lacks `transpilePackages`. This is what
converts "forgot a line" from an unstyled page into a build failure, and it is why
option 1 was acceptable in the first place. It is not optional.

**`tests/site_palette_ssot.bats` tightens** — currently it fails a component that grows
its own hex. After migration no hex belongs anywhere under `site/`, including
`app/`, since the palette is no longer local. The assertion widens accordingly.

**Contrast test in the package** — computes the ratios asserted in the `tokens.css`
header (amarillo 1.65:1 on canvas, rosa 4.42:1, block-ink 13.96:1, block-ink-muted
4.61:1) and fails when a palette edit breaks a documented rule. It computes rather than
restates, so it is a guard, not a constant assertion.

**Tarball smoke test** — the landing site resolves the package through the workspace
link, so nothing in the brand repo exercises the published artifact. CI packs the
package, installs the tarball into a throwaway Next fixture, and builds it. Without
this, a packaging regression is discovered by otto-workbench's CI after release rather
than before it.

**Visual parity** — otto-workbench's landing page is compared before and after
migration. The extraction is meant to be invisible, and everything it does change is
enumerated. This section planned for two changes — the two drift fixes visible from
reading the originals. Phase 1 found two more that were only visible once the
components were rendered and the palette measured, so the list is four:

1. **Eyebrow tracking.** `0.16em` in the hero against `0.15em` in the other two uses.
   `0.15em` wins 2-of-3; the hero's label tightens by `0.01em`.
2. **Button sizing.** `text-sm` twice against `text-xs` once. `text-sm` is the default
   and the footer button takes it, so it grows.
3. **Ring stroke weight.** A stroke expressed in the 32-unit viewBox scales with the
   rendered box — the same value lands at 5.6px on the 290px desktop render and 1.6px
   on the 80px mobile one, which is why the rings went wispy below `sm`.
   `vector-effect: non-scaling-stroke` holds one constant 2.4 CSS px at both
   breakpoints, so the mobile rings thicken and the desktop rings thin.
4. **The dark-mode footer band.** The extracted `--ow-block-*` ramp was theme-agnostic,
   which left the band at 1.08:1 against the dark canvas — invisible, and `Footer` has
   no border to fall back on. All four block tokens are restated in `.dark`, lifting
   the band to 1.54:1 and moving the ink ramp with it to hold its readings.

All four are called out in the migration PR. `packages/brand/README.md` § The four
intended pixel changes carries the same list, and the components name their own
change; the three documents have to agree. One behavioural change rides along and is
not a pixel change: `InstallBlock` takes a `commands` list and its copy button copies
every command rather than only the first.

## Phases

Each phase is independently shippable.

1. **Probe and package.** Resolve both probe questions. Scaffold the repo and
   `packages/brand`; move tokens, vendor both fonts, port marks, extract primitives and
   chrome, add `tailwind-merge` and the contrast test. Ends with a package that builds
   but has no consumer.
2. **Landing site.** `site/`, `pages.yml`, Pages enabled on the new repo. Ends with
   `https://otto-nation.github.io/` live and the package proven by a real consumer.
3. **Release automation.** `brand-release.yml` steps 1–2, tag/manifest check, tarball
   smoke test, `brand-v1.0.0` cut. Ends with an installable artifact.
4. **otto-workbench migration.** Consume the tarball, delete the local copies, add the
   validator, tighten the palette test. Ends with two repos on one design system.
5. **Consumer fan-out.** `consumers.yml`, the PAT, step 3 of the release workflow. Ends
   with bumps arriving as pull requests. Droppable without stranding phases 1–4.

Phases 4 and 5 are ordered this way deliberately: automating consumer bumps before a
consumer exists would be automation with nothing to verify it against.

All otto-workbench work happens in a worktree off `origin/main`.

## Risks

| Risk | Mitigation |
|---|---|
| Tailwind `@source` does not follow the workspace symlink | Probe 1, before any extraction. Fallback is a package build step emitting prebuilt CSS |
| `"use client"` lost through raw-`.tsx` + `transpilePackages` | Probe 2. Affects `InstallBlock` and `SearchButton` only |
| Consumer forgets `@source`; page renders unstyled | The validator makes it a build failure. Non-optional; it shipped in phase 1 with the package and is wired into a consumer's CI in phase 4 |
| Landing site never exercises the tarball | Pack-and-build smoke test in CI, phase 3 |
| Components over-fitted to otto-workbench's copy | Landing site composed only from exports; over-fitting surfaces in phase 2, before otto-workbench depends on the API |
| Extraction changes otto-workbench's appearance | Visual parity check; the four intended pixel changes named explicitly in the PR |
| No Dependabot; a consumer silently stays on an old version | Phase 5's fan-out. If phase 5 is dropped, bumps are manual and that is accepted |
| Org PAT for cross-repo PRs leaks or expires | Scope it to the consumer repos; phases 1–4 do not depend on it |
| Tag and package version disagree, releasing a mislabeled tarball | Release workflow fails on mismatch before publishing |
| otto-stack's Hugo site keeps drifting until it migrates | Accepted. The palette moves to the package now, so its migration is a consumption change, not a second extraction |
| Vendored League Spartan goes stale against upstream | Provenance recorded in the package README; no automatic update, same as League Mono today |
