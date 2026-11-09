// Internal to the package: not in the barrel, and the exports map carries no
// wildcard, so a consumer importing this path gets ERR_PACKAGE_PATH_NOT_EXPORTED.
// Only verifyExport is public — see src/verify.mjs and README § Verifying a
// build. These parses are how it reads this package's own source, and
// keeping them unexported means their shapes stay changeable after the tag.
//
// bin/otto-brand-check.mjs shares declaredTokens from here rather than holding
// a second copy of the regex: the check and the verifier have to agree on what
// tokens.css declares or one of them is measuring a list the other does not.
//
// Every function here takes source text rather than reading a file, so a caller
// can hand over a relocated copy — which is what lets otto-brand-check resolve
// tokens.css beside its own script and the tests substitute fixtures.

import { basename } from 'node:path';

/**
 * The `--ow-*` custom property names a tokens.css declares.
 *
 * The leading `\s*` is what lets either indentation style parse; tokens.css is
 * two-space indented today. An empty result is a real answer, not an error, and
 * every caller has to treat it as one — an empty list of expectations is a check
 * that passes on every input forever.
 */
export function declaredTokens(tokensCss) {
  return new Set([...tokensCss.matchAll(/^\s*(--ow-[a-z-]+):/gm)].map(([, name]) => name));
}

/**
 * The raw value of the `tracking-[…]` class in eyebrow.tsx, e.g. `0.15em`, or
 * null when no such class remains. That class exists in exactly one file in the
 * whole tree, which is what makes its compiled form evidence that Tailwind's
 * @source glob reached inside the package.
 */
export function trackingValue(eyebrowSource) {
  const tracking = eyebrowSource.match(/tracking-\[([^\]]+)\]/);
  return tracking ? tracking[1] : null;
}

// A signed decimal with a unit, and nothing else. Anchored on purpose: a value
// this does not match is one whose minified form is not modelled below, and the
// caller is expected to fail loudly rather than guess at it.
const PLAIN_LENGTH = /^(-?)(\d*)(?:\.(\d*))?([a-z]+)$/;

/**
 * A CSS length as Tailwind's minifier (lightningcss) writes it, or null when the
 * value's shape is not modelled.
 *
 * Three normalisations are modelled, and they are the whole of it:
 *
 *   - a leading zero before the decimal point is dropped: `0.15em` -> `.15em`,
 *     and `-0.15em` -> `-.15em`, since the sign stays in front of it
 *   - trailing zeros in the fraction are dropped: `0.150em` -> `.15em`
 *   - a fraction that was only zeros takes the point with it: `1.0em` -> `1em`
 *
 * Everything else returns null and is reported as unmodelled rather than
 * guessed at. The bounds worth naming: a zero length (`0em`), which lightningcss
 * may write as a bare `0` with the unit elided; a unitless or uppercase-unit
 * value; and any calc(), var(), or multi-part value. Emitting a wrong
 * expectation for one of those would read as a package regression in a
 * consumer's CI, which is worse than saying the shape is unsupported.
 */
export function minifyLength(value) {
  const match = PLAIN_LENGTH.exec(value.trim());
  if (!match) return null;
  const [, sign, whole, fraction, unit] = match;
  const digits = `${whole}${fraction ?? ''}`;
  if (digits === '' || /^0*$/.test(digits)) return null;
  const trimmedFraction = (fraction ?? '').replace(/0+$/, '');
  const trimmedWhole = whole.replace(/^0+/, '');
  const number = trimmedFraction === ''
    ? trimmedWhole || '0'
    : `${trimmedWhole}.${trimmedFraction}`;
  return `${sign}${number}${unit}`;
}

/**
 * The basename stems of the woff2 files fonts.css points at, e.g.
 * `LeagueSpartanVariable`. The stem rather than the filename because Next
 * content-hashes the emitted asset (`LeagueSpartanVariable.11kb5ckq3-_9c.woff2`).
 */
export function fontStems(fontsCss) {
  return [...fontsCss.matchAll(/url\(\s*['"]?([^'")]+\.woff2)['"]?\s*\)/g)]
    .map(([, url]) => basename(url, '.woff2'));
}

/**
 * The ordered font-family list a `--font-*` custom property declares in
 * fontsCss, e.g. `['League Spartan', 'Otto Fallback Sans', 'system-ui', 'sans-serif']`.
 * Each entry is unquoted; a bare keyword (`system-ui`, `sans-serif`) comes back
 * the same as a quoted family name. Returns null when the variable is not
 * declared at all, which a caller is expected to treat as a real failure.
 */
export function fontStack(fontsCss, variable) {
  const value = fontsCss.match(new RegExp(`${variable}:\\s*([^;]+);`))?.[1];
  if (!value) return null;
  return [...value.matchAll(/'([^']+)'|([^,\s][^,]*)/g)].map(([, quoted, bare]) => (quoted ?? bare).trim());
}

function lightBlock(tokensCss) {
  return tokensCss.slice(tokensCss.indexOf(':root {'), tokensCss.indexOf('.dark {'));
}

function darkBlock(tokensCss) {
  const start = tokensCss.indexOf('.dark {');
  return tokensCss.slice(start, tokensCss.indexOf('}', start));
}

function hexMap(block) {
  const map = new Map();
  for (const [, name, hex] of block.matchAll(/(--ow-[a-z-]+):\s*(#[0-9a-f]{6})/gi)) {
    map.set(name, hex);
  }
  return map;
}

/**
 * `--ow-*` hexes declared on `:root`. Later duplicates in the same block win.
 * Empty when `:root` is missing or declares none — callers must treat that as
 * a real answer, same as declaredTokens.
 */
export function lightTokenHexes(tokensCss) {
  return hexMap(lightBlock(tokensCss));
}

/**
 * The cascade under `.dark`: the light ramp with that block's hexes overlaid.
 * Matches what a consumer actually gets, not the dark declarations alone.
 */
export function darkTokenHexes(tokensCss) {
  const map = lightTokenHexes(tokensCss);
  for (const [name, hex] of hexMap(darkBlock(tokensCss))) {
    map.set(name, hex);
  }
  return map;
}

/**
 * Declared `--ow-*` names without the prefix. Empty when tokens.css
 * declares none.
 */
function claimSurfaceNames(tokensCss) {
  return [...declaredTokens(tokensCss)].map((name) => name.replace(/^--ow-/, ''));
}

/**
 * Contrast claims in the tokens.css header, plus amarillo's aside on the block.
 * Shape: `{ token, ratio, background }` with `--ow-*` names.
 *
 * Surfaces come from `declaredTokens`, not a hard-coded list, so a new
 * background cannot drift out of the matcher.
 */
export function documentedClaims(tokensCss) {
  const surfaces = new Set(claimSurfaceNames(tokensCss));
  if (surfaces.size === 0) return [];
  const claims = [
    ...tokensCss.matchAll(/(--ow-[a-z-]+)\s+([\d.]+):1 on (?:the )?([a-z-]+)\b/g),
  ]
    .filter((match) => surfaces.has(match[3]))
    .map(([, token, ratio, surface]) => ({ token, ratio, background: `--ow-${surface}` }));
  const [, aside] = tokensCss.match(/reaches ([\d.]+):1 on the dark terminal block/) ?? [];
  if (aside) {
    claims.push({ token: '--ow-amarillo', ratio: aside, background: '--ow-block' });
  }
  return claims;
}

/**
 * Claims phrased as "on/against the dark …", which is what keeps them out of
 * the light set above.
 */
export function documentedDarkClaims(tokensCss) {
  const surfaces = new Set(claimSurfaceNames(tokensCss));
  if (surfaces.size === 0) return [];
  return [
    ...tokensCss.matchAll(/(--ow-[a-z-]+)\s+([\d.]+):1 (?:on|against) the dark ([a-z-]+)\b/g),
  ]
    .filter((match) => surfaces.has(match[3]))
    .map(([, token, ratio, surface]) => ({ token, ratio, background: `--ow-${surface}` }));
}

const FONT_SHORTHAND = /^(400|500|600) (\d+)px\/(\d+)px var\((--font-[a-z]+)\)$/;

/**
 * `--ow-font-<role>` shorthands on `:root`.
 * Shape: `<400|500|600> <size>px/<leading>px var(--font-x)`.
 * Throws on any declaration that does not match.
 */
export function fontRoles(tokensCss) {
  const roles = new Map();
  for (const [, name, role, value] of lightBlock(tokensCss).matchAll(
    /^\s*(--ow-font-([a-z]+)):\s*([^;]+);/gm,
  )) {
    const match = FONT_SHORTHAND.exec(value.trim());
    if (!match) {
      throw new Error(`${name}: unmodelled font shorthand ${value.trim()}`);
    }
    const [, weight, size, leading, fontVariable] = match;
    roles.set(role, {
      fontWeight: Number(weight),
      fontSize: `${size}px`,
      lineHeight: `${leading}px`,
      fontVariable,
    });
  }
  return roles;
}

/**
 * `--ow-<name>: <n>px` declarations on `:root`. Empty when none exist.
 */
export function lengthTokens(tokensCss) {
  const lengths = new Map();
  for (const [, name, value] of lightBlock(tokensCss).matchAll(
    /^\s*(--ow-[a-z-]+):\s*(\d+px)\s*;/gm,
  )) {
    lengths.set(name.replace(/^--ow-/, ''), value);
  }
  return lengths;
}

function letterSpacingIn(block) {
  return block?.match(/letter-spacing:\s*([^;]+)/)?.[1].trim() ?? null;
}

/** `letter-spacing` on the `body` rule, or null when the rule or property is absent. */
export function bodyLetterSpacing(tokensCss) {
  return letterSpacingIn(tokensCss.match(/(?:^|\n)body\s*\{([^}]+)\}/)?.[1]);
}

/** `letter-spacing` on the `h1, h2, h3, h4` rule, or null when absent. */
export function headingLetterSpacing(tokensCss) {
  return letterSpacingIn(tokensCss.match(/(?:^|\n)h1,\s*h2,\s*h3,\s*h4\s*\{([^}]+)\}/)?.[1]);
}

/**
 * The `--ow-*` that `--color-fd-primary` references in `:root` or `.dark`.
 * Null when the declaration is missing or is not a `var(--ow-*)`.
 */
export function fdPrimaryToken(tokensCss, theme = 'light') {
  const block = theme === 'dark' ? darkBlock(tokensCss) : lightBlock(tokensCss);
  return block.match(/--color-fd-primary:\s*var\((--ow-[a-z-]+)\)/)?.[1] ?? null;
}

function channel(byte) {
  const v = byte / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two `#rrggbb` hexes. */
export function contrast(fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}
