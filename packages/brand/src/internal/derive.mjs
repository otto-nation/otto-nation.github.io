// Internal to the package: not in the barrel, and the exports map carries no
// wildcard, so a consumer importing this path gets ERR_PACKAGE_PATH_NOT_EXPORTED.
// Only verifyExport is public — see src/verify.mjs and README § Verifying a
// build. These four parses are how it reads this package's own source, and
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
