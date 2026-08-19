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
