# @otto-nation/brand

otto-nation's design tokens, marks, and page chrome. Every org property consumes
this package; nothing else in the org owns a hex, a font, or page chrome. Inside
the package, `tokens.css` owns every hex with one exception, `src/marks/icon.svg`
— see [The one hex outside tokens.css](#the-one-hex-outside-tokenscss).
`DESIGN.md` is generated from `tokens.css` and is not a second owner.

## For agents and designers

Before UI or styling work, read the otto-nation design system:
`node_modules/@otto-nation/brand/DESIGN.md` (locate with
`node -p "require.resolve('@otto-nation/brand/DESIGN.md')"`). Start at Do's and
Don'ts and Components. Do not copy hexes out of that file, and do not hand-edit
its front matter or `<!-- generated:* -->` regions — run
`npm run design:generate -w packages/brand`.

## Fonts

Both faces are vendored as variable woff2 and loaded by plain `@font-face`. Neither
uses `next/font`, so a consumer's build needs no network access.

| Face | Variable | Source | Version / commit | Licence |
|---|---|---|---|---|
| League Spartan | `--font-display` | https://github.com/theleagueof/league-spartan, release asset `variable/WOFF2/LeagueSpartan-VF.woff2` from tag `2.220` (2020-10-28) | `2.220`, sha256 `268294f19c129945d188288e01166b341edbadbe47a6d2cc19d1aa829f3ec4ff` | SIL OFL — `fonts/OFL-LeagueSpartan.txt` |
| League Mono | `--font-mono` | https://github.com/theleagueof/league-mono | unconfirmed — see note below, sha256 `6be53ec3d4bcede8d20063542627fb92e3d82d363cc65042e7426ce28f5e7588` | SIL OFL — `fonts/OFL-LeagueMono.txt` |

### Fallback faces

Neither League face draws eighth fractions (`⅛ ⅜ ⅝ ⅞`), primes (`′ ″`),
subscripts, arrows (`↗ →`) or the check mark (`✓`), and League Mono also lacks `¼ ½ ¾ ¹ ²`. Without a
fallback those fell through to the OS — Times, Menlo and Hiragino on macOS — so
one measurement could mix three typefaces, differently per machine. No newer
League release fills the gap: League Spartan's current Google Fonts build and
League Mono `2.300` were both checked and lack the same characters.

`fonts.css` therefore declares two more faces, each second in its stack so
League still draws everything it has:

| Face | Variable | Source | Version / commit | Licence |
|---|---|---|---|---|
| Otto Fallback Sans | `--font-display`, after League Spartan | https://github.com/IBM/plex, release `@ibm/plex-sans-variable@0.2.0`, asset `plex-sans-variable.zip` (sha256 `f83825d527be6cd39c8971c932b9bf22688a3ad3e5ac6305b6143d02f52b87b6`), member `fonts/complete/woff2/IBM Plex Sans Var-Roman.woff2` | subset sha256 `f2d5276ff121577f1808213b9e6643c6cd5f1c8dc9c3eb1680adfa176bb35282` | SIL OFL — `fonts/OFL-IBMPlex.txt` |
| Otto Fallback Mono | `--font-mono`, after League Mono | https://github.com/IBM/plex, release `@ibm/plex-mono-variable@1.0.0`, asset `plex-mono-variable.zip` (sha256 `46bbde4aeab959180ebad197f5b841c6bb5c8070146ba02c31240556e1e0b40d`), member `fonts/complete/woff2/IBM Plex Mono Var-Roman.woff2` | subset sha256 `73ab1c508a74d2a09e9a4ad76f3a47980bc7a6b09efdc021242422b0354eb1cd` | SIL OFL — `fonts/OFL-IBMPlex.txt` |

Both are produced by `bin/subset-fallback-fonts`, which downloads the pinned
assets, checks their hashes, subsets to the `unicode-range` declared on the two
faces in `fonts.css` (the one place that range is written), and renames them.
The rename is required: IBM Plex reserves the font name "Plex" under the OFL,
and a subset is a Modified Version. The output is byte-reproducible from the
pinned inputs, so re-running the script and diffing the hashes above is the
provenance check. `test/fonts.test.mjs` holds the stack order and the shared
range.

The `unicode-range` also means a page using none of those characters never
downloads either file.

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
- Otto Fallback Sans: `100 700` (axis default 400; also carries an unused `wdth`
  axis, 85–100, default 100, not exposed by `fonts.css`)
- Otto Fallback Mono: `100 700` (axis default 400)

No automatic update. Refresh by repeating the acquisition above and updating this
table — a committed binary with no provenance is the failure mode this exists to
prevent.

This retires the upgrade trigger the predecessor spec recorded ("when League Mono
reaches Google Fonts, move it to `next/font/google`"): neither face uses that loader.

## Consumer setup

Four lines of configuration, and `otto-brand-check` enforces them: it fails
your build if either `@import` is absent; in Next mode, if the `@source` is
absent *or* points at a path that does not exist on disk, or if
`transpilePackages` omits the package; in Vite mode, those `@source` checks
plus `vite-tailwind-plugin` only when source imports a brand component. It
also warns on style drift in `--src` — see
[Checking consumer source](#checking-consumer-source). The compiler settings
in step 6 are the one requirement it cannot see — those surface as errors in
your own build. The AGENTS.md line in step 5 is for agents, not the build.

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

   <!-- x-release-please-start-version -->
   ```bash
   VERSION=1.5.0
   npm install "https://github.com/otto-nation/otto-nation.github.io/releases/download/brand-v$VERSION/otto-nation-brand-$VERSION.tgz"
   ```
   <!-- x-release-please-end -->

2. In your Tailwind entrypoint:

   ```css
   @import 'tailwindcss';
   @import '@otto-nation/brand/tokens.css';
   @import '@otto-nation/brand/fonts.css';
   @source '../node_modules/@otto-nation/brand/src/**/*.tsx';
   ```

   The `@source` line is not optional. Tailwind v4 excludes `node_modules` from
   auto-detection, so without it every utility the package uses is absent from
   your stylesheet and the page renders unstyled.

   Pin the glob at `src/`, exactly as above — not at the package root
   (`…/brand/**/*.tsx`). Tailwind v4 keeps automatic source detection on
   alongside `@source`, so a glob whose static head is the package root scans
   the whole package as a directory (README.md, DESIGN.md, …) and ignores
   `*.tsx`. Class-shaped prose in those docs then becomes invalid CSS. The
   `src/**/*.tsx` glob scans only the components. Adjust the depth to your own
   layout: `../node_modules/...` from `app/global.css` when the app has its own
   `node_modules`, `../../node_modules/...` when it is a workspace package and
   npm has hoisted them to the repo root.

3. In `next.config.mjs`:

   ```js
   transpilePackages: ['@otto-nation/brand'],
   ```

4. In CI, and ideally in a pre-push hook. Exactly one of `--next-config` or
   `--vite-config` is required:

   ```bash
   npx otto-brand-check --css site/app/global.css --next-config site/next.config.mjs --src site/app site/components
   npx otto-brand-check --css src/styles/index.css --vite-config vite.config.ts --src src
   ```

   Style findings are warnings (exit 0). Pass `--strict` once the tree is
   clean, or `--error <id>[,<id>]` to fail on named rules — see
   [Checking consumer source](#checking-consumer-source). After the build, run
   `otto-brand-verify` on the export as well — see
   [Verifying a build](#verifying-a-build). The two are not interchangeable:
   this one reads configuration and source, that one reads output.

5. In your repo's `AGENTS.md` or `CLAUDE.md`, so agents working on UI find the
   design system the same way every time:

   ```
   Before UI or styling work, read the otto-nation design system:
   `node_modules/@otto-nation/brand/DESIGN.md` (locate with
   `node -p "require.resolve('@otto-nation/brand/DESIGN.md')"`).
   ```

6. In your `tsconfig.json`:

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

## Checking consumer source

`otto-brand-check` walks every `--src` tree and warns on style drift. Warnings
print and leave the exit code 0. `--strict` makes every style rule an error.
`--error <id>[,<id>]` (repeatable) escalates named rules so a consumer can lock
in each one as it gets clean. An unknown id passed to `--error` exits 2.

### Style rules

Each id maps to a Don't in `DESIGN.md`. All six are suppressible.

| ID | DESIGN.md Don't |
|---|---|
| `literal-color` | Don't copy hexes from this file into CSS. `tokens.css` owns every value. |
| `palette-color` | Don't copy hexes from this file into CSS. `tokens.css` owns every value. |
| `pill-radius` | Don't use pills or `rounded-full`. Status is coloured text plus a glyph; a contained label is a `tag`. |
| `hover-border` | Don't change a border colour on hover; focus is the anil ring. |
| `outline-removed` | Don't change a border colour on hover; focus is the anil ring. |
| `token-redefined` | Don't copy hexes from this file into CSS. `tokens.css` owns every value. |

`literal-color` flags `#` plus 3/4/6/8 hex digits in script string and template
literals, and the same in CSS declaration values only (so `#id` selectors are
skipped), plus `rgb()` / `rgba()` / `hsl()` / `hsla()` / `hwb()` / `lab()` /
`lch()` / `oklab()` / `oklch()` whose arguments do not start with `from var(`
or `var(`. It does not flag HTML entities (`&#10003;`), `href="#…"`,
`to="#…"`, `id="#…"`, or `.svg` files (never scanned).

`palette-color` flags Tailwind palette utilities (`bg-black`, `text-white`,
`bg-red-500`, any `-{color}-{shade}` and `/opacity` form, for every colour
utility prefix the matcher knows) and CSS named colours in declarations
(`color: white`, `background: black`). `transparent`, `currentColor`, and
`inherit` are allowed.

`pill-radius` flags `rounded-full` with any side prefix (`rounded-t-full`,
`rounded-s-full`, …) and any variant prefix, plus the arbitrary rounded values
9999px, 50%, and 100%, and CSS `border-radius` (including longhands) set to
those values. A token-backed `rounded-[var(…)]` is not flagged.

`hover-border` flags `hover:border` as a word (`group-hover:`, `peer-hover:`,
`dark:hover:` included) and any CSS `border*` declaration inside a block whose
selector contains `:hover`. Hover background utilities are not flagged.

`outline-removed` flags `outline-none`, `outline-hidden`, and `outline-0`, bare
or with `focus:` / `focus-visible:`, when the same element has no matching
focus-visible ring (other than `ring-0`), focus-visible outline (other than
none/hidden/0), or focus ring. In CSS, a `:focus` / `:focus-visible`
block that sets outline to none or 0, or `outline-style: none`, with no other
non-none outline or `box-shadow` in the same block.

The element for `outline-removed` is the enclosing `className=` / `class=`
attribute value. A quoted value spans to its closing quote. A `{...}` value
spans its balanced braces, which covers `cn(...)`, `clsx(...)` and template
literals. A match outside any attribute (for example
`const BASE = "… outline-none"`) is scoped to its own string literal. Known
gap: a ring split between a constant and the attribute
(`className={cn(BASE, 'focus-visible:ring-2')}` where `BASE` holds
`outline-none`) is a false positive. Move the ring next to the removal, or
suppress it.

`focus-visible:outline-none` is flagged even though `tokens.css` restores the
anil ring at runtime. That restore is a safety net for third-party markup
(fumadocs) consumers cannot edit. Consumer-authored code should state its ring.

`token-redefined` flags a CSS `--ow-*:` declaration (not a `var()` reference),
script `'--ow-x':` / `"--ow-x":` object keys, `['--ow-x']`,
`setProperty('--ow-x'`, and Tailwind `[--ow-x:…]`. Mapping a token into
`@theme` (`--color-canvas: var(--ow-canvas)`) is not a redefinition.

### Configuration and meta rules

Configuration findings are always errors and cannot be suppressed:
`css-import`, `source-missing`, `source-path`, `transpile-packages`,
`undeclared-token`, `tokens-unparsed`, `vite-tailwind-plugin`.

Meta findings cannot be suppressed. `ignore-reason` (a directive with no
reason) and `ignore-unknown-rule` are always errors. `ignore-unused` (a
directive that suppressed nothing) and `src-empty` (a `--src` root yielded no
files) are warnings; `--strict` makes them errors. `src-empty` stays a warning
by default so a previously passing invocation still exits 0.

### Vite mode

`--vite-config <file>` is the alternative to `--next-config <file>`; exactly
one of the two is required. Passing both, or neither, exits 2.

Both modes check the `tokens.css` and `fonts.css` `@import`s, undeclared
`--ow-*` references, and the style rules.

Next mode always requires `@source` (and that its glob head exists) and
`transpilePackages` listing the package.

Vite mode skips `transpilePackages`. The `@source` checks and
`vite-tailwind-plugin` apply only when consumer source imports a component
entry: `@otto-nation/brand` or a `@otto-nation/brand/<subpath>` that is not a
`.css`, `.json`, `.svg` or `.md` file, `verify`, or `package.json`. A CSS-only
Vite consumer needs neither and passes. `vite-tailwind-plugin` requires the
masked config to import `@tailwindcss/vite` under some binding and call that
binding. Without the plugin no utility class compiles, so brand components
would render unstyled on a build that otherwise passes.

### Suppression

A reason is mandatory. An em dash, an en dash, or ` - ` (spaces around a hyphen)
separates the id list from it.

```
// otto-brand-ignore: pill-radius — avatar is a circle by definition
{/* otto-brand-ignore: literal-color, hover-border — third-party embed colours */}
/* otto-brand-ignore-file: literal-color — SVG data-viz palette, not UI chrome */
```

`otto-brand-ignore:` applies to its own line when code precedes it on that
line, otherwise to the next non-blank line. `otto-brand-ignore-file:` applies
to the whole file and must sit in a comment before the first non-comment code.
Suppressions are parsed from the raw source (they live in comments). A
directive with no reason does not suppress anything and raises `ignore-reason`.
An unknown id raises `ignore-unknown-rule`. A directive that matched nothing
raises `ignore-unused`.

### Discovery

Inside a git work tree the check lists files with `git ls-files` (`--cached
--others --exclude-standard`), so `.gitignore` is honoured and build output
such as `dist/` and `.next/` is not scanned. Outside git, or if git is missing,
it walks recursively and skips any path segment that is `node_modules` or
starts with `.`. Extensions: `.tsx`, `.ts`, `.css`, `.mjs`, `.js`, `.jsx`,
`.mdx`. `.svg` is never scanned.

### Output and exit codes

Each finding is one headline on stderr, in the unix style editors and CI
annotators parse: `path:line:col: <error|warning> <rule-id>: <message>`.
Configuration findings have no line number: `path: error <rule-id>: <message>`,
followed by indented detail. Paths are relative to cwd. The last stderr line is
`otto-brand-check: N error(s), M warning(s)`.

On success, stdout prints one OK line, with a warning count when there are
warnings.

| Exit | Meaning |
|---|---|
| 0 | no errors (warnings allowed) |
| 1 | at least one error, or an unreadable input |
| 2 | usage error: missing flags, both `--next-config` and `--vite-config`, neither of them, or an unknown `--error` id |

This repo's `site/` and the packed tarball fixture run `--strict`. Other
consumers add `--strict` when their tree is clean. The default stays warn until
a later major.

## No-build installation

Steps 1–5 above are all for a Next.js + Tailwind consumer. A consumer with no
npm and no build step at all — a static HTML page, a Vite app that hasn't
taken this package on as a dependency — can't use any of that: the React
components need a JSX/Tailwind build to render, but `tokens.css` and
`fonts.css` are themselves plain CSS with no build step of their own.

Every `brand-v*` release attaches a second asset alongside the npm tarball —
`otto-nation-brand-assets-<version>.zip` — containing `tokens.css`, `fonts.css`,
the vendored woff2 files, their OFL licenses, `DESIGN.md`, `tokens.json`, and
`terminal/otto-{light,dark}.json` (generated; do not edit), packed by
`bin/pack-brand-assets` from the same source the npm tarball ships. Download
and vendor it into the consumer's own repo:

<!-- x-release-please-start-version -->
```bash
VERSION=1.5.0
curl -LO https://github.com/otto-nation/otto-nation.github.io/releases/download/brand-v$VERSION/otto-nation-brand-assets-$VERSION.zip
unzip otto-nation-brand-assets-$VERSION.zip -d path/to/vendored/theme
```
<!-- x-release-please-end -->

Then reference the two stylesheets however the consumer loads CSS — a plain
`<link>` for a static page, an `@import` for anything with its own build.
Nothing here is enforced by `otto-brand-check`: that script assumes a
Tailwind entrypoint and a Next or Vite config, neither of which exists in a
no-build consumer, so getting the reference paths right is on the consumer. Pin the
version in whatever the consumer's own vendoring note is (a README next to
the vendored files works) and re-run the two commands above to upgrade —
there is no automatic sync, the same as the npm path has none.

Point agents at the vendored `DESIGN.md` the same way the npm consumer does,
with a line in AGENTS.md or CLAUDE.md naming that file.

This is the same shape `homelab`'s `services/training-log` and
`otto-nation/plans` were already hand-copying `tokens.css`/`fonts.css` out of
`packages/brand/src` to get, before this asset existed. Point new vendoring
at this zip instead of at another repo's copy of the two files — each copy
of a copy is one more place the pin can go stale unnoticed.

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
| `@otto-nation/brand/fonts.css` | `@font-face` for both faces and their fallbacks; defines `--font-display`, `--font-mono` |
| `@otto-nation/brand/DESIGN.md` | Generated design system. Colour tokens come from `tokens.css`; do not copy hexes from here |
| `@otto-nation/brand/tokens.json` | Generated token dump for non-web consumers (`schemaVersion`); do not edit |
| `@otto-nation/brand/icon.svg` | Favicon mark (`src/marks/icon.svg`); the one hex outside tokens.css |
| `@otto-nation/brand/terminal/otto-light.json` | Generated herdr-app theme (no `colors`); do not edit |
| `@otto-nation/brand/terminal/otto-dark.json` | Generated herdr-app theme (no `colors`); do not edit |
| `@otto-nation/brand/verify` | `verifyExport({ out, control })` — see [Verifying a build](#verifying-a-build) |
| `Greca` | `{ size?: number; onDark?: boolean, className? }` |
| `GrecaDivider` | `{ className? }` |
| `Rings` | `{ className? }` |
| `Eyebrow` | `{ children, className? }` |
| `Button` | `{ href?, children, variant?: 'solid' \| 'outline' \| 'ghost' \| 'danger', size?: 'sm' \| 'xs' \| 'app', dense?, onDark?, className? }` |
| `CardGrid` | `{ columns: 2 \| 3, items: CardItem[], className? }` |
| `StatusGlyph` | `{ status: 'pass' \| 'fail' \| 'running' \| 'warn' \| 'none', label, showLabel?: boolean, className? }` |
| `Tag` | `{ children, className? }` |
| `SectionLabel` | `{ children, count?: number, className? }` |
| `ActionButton` | Deprecated alias for `<Button size="app">`. Kept until the next major |
| `SegmentedControl` | `{ options: { value, label }[], value, onChange?, label: string, dense?, className? }` |
| `ListRow` | `{ children, selected?, dense?, onClick?, className?, ...native button attributes }` |
| `AppCard` | `{ children, variant?: 'card' \| 'popover', title?, className? }` |
| `Input` | `{ dense?: boolean, className?, ...native input attributes }` |
| `Field` | `{ id, label, hint?, error?, children: (control: FieldControlProps) => ReactNode, className? }` |
| `Textarea` | `{ className?, ...native textarea attributes }` |
| `Select` | `{ dense?, className?, ...native select attributes }` |
| `Checkbox` | `{ label?, className?, ...native input attributes minus type }` |
| `IconButton` | `{ label, children, dense?, tone?: 'default' \| 'danger', pressed?, className?, ...native button attributes }` (`IconButtonProps`) |
| `Dialog` | `{ id, title, children?, actions?, className?, ...native dialog attributes }` |
| `Toast` | `{ children, status?: StatusGlyphStatus, className? }` |
| `Table` | `{ caption?, className?, ...native table attributes }` with `Table.Head` / `.Body` / `.Row` / `.Cell` / `.HeaderCell`; `TableAlign` is `'start' \| 'center' \| 'end'` |
| `StateMessage` | `{ kind: 'empty' \| 'loading' \| 'stale' \| 'error', children?, action?, className? }` |
| `Nav` | `{ product, links, slot?, className? }` |
| `Footer` | `{ cta?, className? }` |
| `Hero` | `{ eyebrow, headline, lede, actions?, className? }` |
| `InstallBlock` | `{ shell, commands, className? }` |
| `SearchButton` | Client component, `@otto-nation/brand/search-button` only. The one export with no `className?` — see below |

`CardItem` is `{ title, body, href?, accent?, meta? }`.

The org site's `/ui/` page is the render coverage for the app primitives.

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

Winning `@source` form: `@source '../node_modules/<pkg>/src/**/*.tsx';` — an
explicit file glob whose static head is `src/`. A package-root glob
(`…/<pkg>/**/*.tsx`) over-scans the docs because Tailwind still auto-detects
alongside `@source`. Adjust depth per consumer: `../` when the app owns its
`node_modules`, `../../` when npm has hoisted them to a workspace root.

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
