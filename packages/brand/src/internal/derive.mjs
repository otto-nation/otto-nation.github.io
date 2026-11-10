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
 * Pattern source for an `--ow-*` token name. Digits are included so
 * `--ow-space-1` is one name, not `--ow-space-`. Every regex in this file
 * and otto-brand-check interpolates this rather than writing its own class.
 */
export const OW_TOKEN = '--ow-[a-z0-9-]+';

/**
 * The `@source` glob consumers must point at this package. Tailwind v4 keeps
 * automatic source detection on alongside `@source`, so a glob whose static
 * head is the package root scans README.md and DESIGN.md as a directory and
 * ignores `*.tsx`. Pinning `src/` keeps the scan on components.
 */
export const SOURCE_GLOB = 'node_modules/@otto-nation/brand/src/**/*.tsx';

/**
 * The `--ow-*` custom property names a tokens.css declares.
 *
 * The leading `\s*` is what lets either indentation style parse; tokens.css is
 * two-space indented today. An empty result is a real answer, not an error, and
 * every caller has to treat it as one — an empty list of expectations is a check
 * that passes on every input forever.
 */
export function declaredTokens(tokensCss) {
  return new Set(
    [...tokensCss.matchAll(new RegExp(`^\\s*(${OW_TOKEN}):`, 'gm'))].map(([, name]) => name),
  );
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
  for (const [, name, value] of block.matchAll(
    new RegExp(`^\\s*(${OW_TOKEN}):\\s*([^;]+);`, 'gm'),
  )) {
    const trimmed = value.trim();
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
      map.set(name, trimmed);
      continue;
    }
    if (trimmed.includes('#')) {
      throw new Error(`${name}: unmodelled hex value ${trimmed}`);
    }
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
    ...tokensCss.matchAll(new RegExp(`(${OW_TOKEN})\\s+([\\d.]+):1 on (?:the )?([a-z-]+)\\b`, 'g')),
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
    ...tokensCss.matchAll(new RegExp(`(${OW_TOKEN})\\s+([\\d.]+):1 (?:on|against) the dark ([a-z-]+)\\b`, 'g')),
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

const LENGTH_GROUPS = [
  ['radii', /^radius-(.+)$/],
  ['spacing', /^space-(\d+)$/],
  ['focus', /^focus-(.+)$/],
  ['rules', /^rule-(.+)$/],
  ['panes', /^pane-(.+)$/],
];

/**
 * `:root` `--ow-*: Npx` declarations grouped by prefix. `radii` keys drop
 * `radius-`, `spacing` keys are the digit after `space-`, and `focus` /
 * `rules` / `panes` drop their prefix the same way. Every other px length
 * goes to `lengths`. Empty maps when none exist.
 */
export function lengthGroups(tokensCss) {
  const groups = {
    radii: new Map(),
    spacing: new Map(),
    focus: new Map(),
    rules: new Map(),
    panes: new Map(),
    lengths: new Map(),
  };
  for (const [, name, value] of lightBlock(tokensCss).matchAll(
    new RegExp(`^\\s*(${OW_TOKEN}):\\s*(\\d+px)\\s*;`, 'gm'),
  )) {
    const rest = name.replace(/^--ow-/, '');
    const grouped = LENGTH_GROUPS.find(([, pattern]) => pattern.test(rest));
    if (grouped) {
      groups[grouped[0]].set(rest.match(grouped[1])[1], value);
      continue;
    }
    groups.lengths.set(rest, value);
  }
  return groups;
}

/**
 * `--ow-<name>: <n>px` declarations on `:root` that are not radii, spacing,
 * focus, rules, or panes. Empty when none exist.
 */
export function lengthTokens(tokensCss) {
  return lengthGroups(tokensCss).lengths;
}

const SCRIM_MIX = new RegExp(
  `^color-mix\\(in srgb, var\\((${OW_TOKEN})\\) (\\d+(?:\\.\\d+)?)%, transparent\\)$`,
);

/**
 * The colour token and 0–1 opacity `--ow-scrim` mixes, per theme.
 * Parses exactly `color-mix(in srgb, var(--ow-x) N%, transparent)`.
 * Dark must restate the declaration; a missing or other-shaped value throws.
 */
export function scrimSpec(tokensCss, theme = 'light') {
  const block = theme === 'dark' ? darkBlock(tokensCss) : lightBlock(tokensCss);
  const where = theme === 'dark' ? '.dark' : ':root';
  const value = [...block.matchAll(/^\s*--ow-scrim:\s*([^;]+);/gm)].at(-1)?.[1]?.trim();
  if (!value) {
    throw new Error(`tokens.css ${where} is missing --ow-scrim`);
  }
  const match = SCRIM_MIX.exec(value);
  if (!match) {
    throw new Error(`--ow-scrim: unmodelled value ${value}`);
  }
  return { token: match[1], opacity: Number(match[2]) / 100 };
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

function fdRoleIn(block, role) {
  const escaped = role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return block.match(new RegExp(`${escaped}:\\s*var\\((${OW_TOKEN})\\)`))?.[1] ?? null;
}

/**
 * The `--ow-*` that a `--color-fd-*` role references. Dark falls back to
 * `:root` when the role is not restated. Null when neither block declares a
 * `var(--ow-*)`.
 */
export function fdRoleToken(tokensCss, role, theme = 'light') {
  const light = fdRoleIn(lightBlock(tokensCss), role);
  if (theme !== 'dark') return light;
  return fdRoleIn(darkBlock(tokensCss), role) ?? light;
}

/** The `--ow-*` that `--color-fd-primary` references. */
export function fdPrimaryToken(tokensCss, theme = 'light') {
  return fdRoleToken(tokensCss, '--color-fd-primary', theme);
}

function ruleVars(value) {
  return [...value.matchAll(new RegExp(`var\\((${OW_TOKEN})\\)`, 'g'))].map(([, name]) => name);
}

function focusTokenIn(names, focus) {
  return names.find((name) => {
    if (!name.startsWith('--ow-focus-')) return false;
    return focus.has(name.slice('--ow-focus-'.length));
  }) ?? null;
}

/**
 * Colour, width, and offset tokens of the `:focus-visible` rule.
 * Colour is the `outline` `var(--ow-*)` that has a hex; width and offset
 * are the `var(--ow-*)` values that `lengthGroups().focus` holds.
 * Throws when any piece is missing.
 */
export function focusRing(tokensCss) {
  const body = tokensCss.replace(/\/\*[\s\S]*?\*\//g, '').match(/:focus-visible\s*\{([^}]+)\}/)?.[1];
  if (body == null) {
    throw new Error('tokens.css is missing a :focus-visible rule');
  }
  const outline = body.match(/outline:\s*([^;]+);/)?.[1]?.trim();
  const offsetValue = body.match(/outline-offset:\s*([^;]+);/)?.[1]?.trim();
  if (!outline) {
    throw new Error('tokens.css :focus-visible rule has no outline');
  }
  if (!offsetValue) {
    throw new Error('tokens.css :focus-visible rule has no outline-offset');
  }
  const hexes = lightTokenHexes(tokensCss);
  const focus = lengthGroups(tokensCss).focus;
  const color = ruleVars(outline).find((name) => hexes.has(name));
  const width = focusTokenIn(ruleVars(outline), focus);
  const offset = focusTokenIn(ruleVars(offsetValue), focus);
  if (!color || !width || !offset) {
    throw new Error('tokens.css :focus-visible rule is missing a colour, width, or offset token');
  }
  return { color, width, offset };
}

/** The `--ow-*` colour inside the `:focus-visible` rule's `outline`. */
export function focusRingToken(tokensCss) {
  return focusRing(tokensCss).color;
}

function channel(byte) {
  const v = byte / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a `#rrggbb` hex. */
export function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two `#rrggbb` hexes. */
export function contrast(fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}
