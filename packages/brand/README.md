# @otto-nation/brand

otto-nation's design tokens, marks, and page chrome. Every org property consumes
this package; nothing else in the org owns a hex, a font, or page chrome. Inside
the package, `tokens.css` owns every hex with one exception, `src/marks/icon.svg`
— see [The one hex outside tokens.css](#the-one-hex-outside-tokenscss).

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

Four lines of configuration, and `otto-brand-check` enforces every one of them:
it fails your build if either `@import` is absent, if the `@source` is absent
*or* points at a path that does not exist on disk, or if `transpilePackages`
omits the package. The compiler settings in step 5 are the one requirement it
cannot see — those surface as errors in your own build.

The package declares an `engines` floor for Node in its `package.json`; that
field is the authority, not this sentence. It is set by `fs.Dirent.parentPath`,
which `otto-brand-verify` uses to walk a static export, and it is higher than
the floor `next` declares for itself — so satisfying your Next version is not
enough to satisfy this package, and a Node that installs Next cleanly can still
fail here with `entry.parentPath is undefined`. Read the field. npm's default is
to report a mismatch as an `EBADENGINE` warning rather than an error, so unless
you set `engine-strict`, an install that prints one still finishes and the break
arrives later, in a build.

1. Depend on a release tarball — public releases need no authentication, so no
   consumer, contributor, or CI job needs a token to install:

   ```json
   "@otto-nation/brand": "https://github.com/otto-nation/otto-nation.github.io/releases/download/brand-v1.0.1/otto-nation-brand-1.0.1.tgz"
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

   After the build, run `otto-brand-verify` on the export as well — see
   [Verifying a build](#verifying-a-build). The two are not interchangeable:
   this one reads configuration, that one reads output.

5. In your `tsconfig.json`:

   ```json
   "moduleResolution": "bundler",
   "jsx": "preserve"
   ```

   The package's exports map points at `./src/index.ts` and the barrel uses
   extensionless relative imports, which resolve under `"bundler"` but not under
   `"node16"` or `"nodenext"` — those report TS2307 on every export. This is not
   checked by `otto-brand-check`; it surfaces as a compile error in your own
   build.

   Because the package ships `.tsx` rather than `.d.ts`, `skipLibCheck` does not
   apply to it: your `strict`, `jsx`, and `isolatedModules` settings are applied
   to the package's source. The package typechecks itself under `strict` with
   `moduleResolution: "bundler"` (`packages/brand/tsconfig.json`, run by
   `npm test`), so that combination is the supported one.

## Verifying a build

`otto-brand-check` cannot see whether a correct configuration actually produced
anything. A stale lockfile, a `@source` glob whose depth changed under a moved
directory, a `url()` rebased out of the app root — each of those passes the
configuration check and ships a page that built clean and renders wrong. Run
`otto-brand-verify` on the static export to close that gap:

```bash
npx otto-brand-verify --out out --control py-7
```

Four assertions, each pinned to a distinct failure:

| Check | Derived from | What its absence means |
|---|---|---|
| Every `--ow-*` name is in the emitted CSS | `src/tokens.css` | The `@import` never resolved; every component renders with inherited or transparent colour |
| The package-only utility was compiled | the `tracking-[…]` class in `src/primitives/eyebrow.tsx` | `@source` never scanned the package's `.tsx`, so every utility it relies on is missing |
| Each vendored face was emitted as an asset | the `url()`s in `src/fonts.css` | The font `url()` did not resolve; the page renders in the fallback stack |
| `--control` was compiled | you | The CSS scan produced nothing at all, which makes the three rows above vacuous |

Nothing in that table is written down twice. Every expectation is parsed out of
the installed package's own source at call time, so the check always measures
against the version you installed and adding a token to `tokens.css` becomes a
new expectation with no edit anywhere else.

`--control` is the one fact the package cannot derive, and it is required. Name
a utility class your own markup uses and the package does not — `py-7` in both
of this repo's consumers. Without it, "the package's utility is missing" and
"no CSS was emitted at all" are the same observation, and the second is reported
first because it makes the rest of the report meaningless. That exact false
negative cost three rounds of probing before the control existed.

Exit codes match `otto-brand-check`: `2` for a usage error, `1` for a failed
check or for an export directory that is absent or carries no build output, `0`
and a one-line summary otherwise. The same logic is importable as
`@otto-nation/brand/verify` for consumers that would rather assert inside their
own test suite — `verifyExport({ out, control })` returns one field per check,
each naming what failed and why, plus `ok` and a flattened `failures` list. It
throws only when nothing can be verified at all, since reporting four failures
against a build that never ran names four causes that are not the real one.

`verifyExport` is the whole of that subpath. The parses it derives from are
internal and deliberately unexported, so their shapes can change without a
breaking release.

## Exports

| Export | Shape |
|---|---|
| `@otto-nation/brand/tokens.css` | Owner of every hex in the org bar the three in `src/marks/icon.svg`, including the `--color-fd-*` fumadocs remap |
| `@otto-nation/brand/fonts.css` | `@font-face` for both faces; defines `--font-display`, `--font-mono` |
| `@otto-nation/brand/verify` | `verifyExport({ out, control })` — see [Verifying a build](#verifying-a-build) |
| `Greca` | `{ size?: number; onDark?: boolean, className? }` |
| `GrecaDivider` | `{ className? }` |
| `Rings` | `{ className? }` |
| `Eyebrow` | `{ children, className? }` |
| `Button` | `{ href, children, variant?: 'solid' \| 'outline', size?: 'sm' \| 'xs', onDark?, className? }` |
| `CardGrid` | `{ columns: 2 \| 3, items: CardItem[], className? }` |
| `Nav` | `{ product, links, slot?, className? }` |
| `Footer` | `{ cta?, className? }` |
| `Hero` | `{ eyebrow, headline, lede, actions?, className? }` |
| `InstallBlock` | `{ shell, commands, className? }` |
| `SearchButton` | Client component, `@otto-nation/brand/search-button` only. The one export with no `className?` — see below |

`CardItem` is `{ title, body, href?, accent?, meta? }`.

Every component takes `className?` and merges it with `tailwind-merge` onto its
outermost element, so your class beats the package default by prop rather than
by stylesheet source order.

`SearchButton` is the single exception. It is a verbatim copy of a
fumadocs-coupled dialog trigger with no styling surface of its own, so there is
nothing for a caller's class to override; style it through the fumadocs layout
that owns it.

### The one hex outside tokens.css

`src/marks/icon.svg` carries three literal hexes — `#F7F2E9` (`--ow-canvas`),
`#C4552F` (`--ow-barro`), and `#D81E5B` (`--ow-rosa`). It is consumed as a favicon
and as an `<img>` src, and an SVG loaded that way is an isolated document that
never sees the host page's stylesheet, so `var(--ow-canvas)` there resolves to
nothing and each shape renders unpainted. `Greca` renders the same mark inline,
where `var()` does resolve, and uses the tokens. `otto-brand-check`'s
token-discipline walk skips `.svg` for the same reason — the file states the
mapping in a comment so the two stay in step, and a change to either value is a
change to both.

### Cross-deployment links

Every caller-supplied href — `Button`'s, `Nav`'s `links`, `CardGrid`'s `href` —
goes through one predicate, `leavesThisDeployment`, which picks `next/link` for a
site-local href and a plain anchor for anything naming its own destination (a
scheme, or protocol-relative `//host`). The org property links internal to `Nav`
and `Footer` take the same route. This matters because a consumer with a
`basePath` (otto-workbench sets `/otto-workbench`) has `next/link` prefix every
internal href, so an off-site URL passed through `Link` resolves inside the wrong
site. There is no prop that lets a caller get this wrong, and no component that
skips the check — `test/href.test.mjs` asserts both.

## The four intended pixel changes

Extracting otto-workbench's chrome into one owner forces a choice wherever the
originals disagreed, so the package does not render identically to what it
replaces. Four differences are deliberate; anything else is a bug.

1. **Eyebrow tracking.** The label shipped three times with two values —
   `0.16em` in the hero, `0.15em` in the other two. `0.15em` wins 2-of-3, so the
   hero's label tightens by `0.01em`.
2. **Footer button size.** The three link-shaped buttons disagreed on size
   (`text-sm` twice, `text-xs` once). `text-sm` is the default and the footer
   takes it, so the footer button grows.
3. **Ring stroke weight.** A stroke expressed in the 32-unit viewBox scaled with
   the rendered box, which is why the rings went wispy below `sm`.
   `vector-effect: non-scaling-stroke` holds one constant 2.4 CSS px at both
   breakpoints, so the mobile rings thicken and the desktop rings thin.
4. **The dark-mode footer band.** The extracted `--ow-block-*` ramp was carried
   into `.dark` unchanged, leaving the band 1.08:1 against the dark canvas —
   invisible, and `Footer` has no border to fall back on. All four block tokens
   are now restated in `.dark`, lifting the band to 1.54:1 while holding the ink
   readings on it (see the ratios recorded in `tokens.css`).

One behavioural change rides along, and it is not a pixel change: `InstallBlock`
takes a `commands` list where otto-workbench held a hardcoded constant, and its
copy button now copies every command rather than only the first.

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

What the probe did **not** cover: fonts. Those three questions are the whole
matrix — nothing in it touched `fonts.css`, the `url()` in either `@font-face`, or
whether the vendored woff2 is emitted and actually loads in a built consumer. The
known risk is that Tailwind rebases a `url()` inside an `@import`ed stylesheet
relative to the entrypoint, and under the workspace-symlink shape it resolves
through the symlink's realpath, so the rebased path can climb out of the app root
and encode the absolute checkout location — which Next may or may not emit an
asset for, and which is not reproducible between a dev machine and a CI runner.
The no-build-step decision rests on the three rows above; the font path is
untested and has to be probed in both shapes before a second consumer ships.
