#!/usr/bin/env node
// Writes packages/brand/tokens.json from tokens.css / fonts.css / eyebrow.tsx.
// Generated; do not edit the JSON. Idempotent: a second run is a no-op on a
// current file. schemaVersion is the file's contract, not the package version
// — release-please bumps package.json without regenerating this.

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bodyLetterSpacing,
  darkTokenHexes,
  fdPrimaryToken,
  fdRoleToken,
  focusRing,
  fontRoles,
  fontStack,
  headingLetterSpacing,
  lengthGroups,
  lightTokenHexes,
  scrimSpec,
  trackingValue,
} from '../src/internal/derive.mjs';

const pkgRoot = fileURLToPath(new URL('..', import.meta.url));

const TOP_LEVEL = [
  'schemaVersion',
  'colors',
  'typography',
  'radii',
  'spacing',
  'lengths',
  'focus',
  'rules',
  'panes',
  'scrim',
];

/**
 * 2-space JSON with a trailing newline. Lengths are px strings; weights are
 * integers; opacity is a 0–1 number. schemaVersion is 1.
 */
export function generate(tokensCss, fontsCss, eyebrowSource) {
  const groups = lengthGroups(tokensCss);
  requireGroup(groups.radii, 'radius');
  requireGroup(groups.spacing, 'space');
  requireGroup(groups.lengths, '');
  requireGroup(groups.focus, 'focus');
  requireGroup(groups.rules, 'rule');
  requireGroup(groups.panes, 'pane');

  const doc = {
    schemaVersion: 1,
    colors: {
      light: colorMap(tokensCss, 'light'),
      dark: colorMap(tokensCss, 'dark'),
    },
    typography: typographyMap(tokensCss, fontsCss, eyebrowSource),
    radii: objectFromMap(groups.radii),
    spacing: objectFromMap(groups.spacing),
    lengths: objectFromMap(groups.lengths),
    focus: focusMap(tokensCss, groups),
    rules: objectFromMap(groups.rules),
    panes: objectFromMap(groups.panes),
    scrim: {
      light: scrimRamp(tokensCss, 'light'),
      dark: scrimRamp(tokensCss, 'dark'),
    },
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

export const TOP_LEVEL_KEYS = TOP_LEVEL;

function requireGroup(map, prefix) {
  if (map.size > 0) return;
  const token = prefix ? `--ow-${prefix}-*` : '--ow-* px';
  throw new Error(`tokens.css :root declared no ${token} lengths`);
}

function objectFromMap(map) {
  return Object.fromEntries(map);
}

function colorMap(tokensCss, theme) {
  const hexes = theme === 'dark' ? darkTokenHexes(tokensCss) : lightTokenHexes(tokensCss);
  if (hexes.size === 0) {
    throw new Error(`tokens.css ${theme} declared no --ow-* hexes`);
  }
  const primaryToken = fdPrimaryToken(tokensCss, theme);
  const onPrimaryToken = fdRoleToken(tokensCss, '--color-fd-primary-foreground', theme);
  const primaryHex = primaryToken ? hexes.get(primaryToken) : undefined;
  const onPrimaryHex = onPrimaryToken ? hexes.get(onPrimaryToken) : undefined;
  if (!primaryToken || !primaryHex) {
    throw new Error(`tokens.css ${theme} has no --color-fd-primary: var(--ow-*)`);
  }
  if (!onPrimaryToken || !onPrimaryHex) {
    throw new Error(`tokens.css ${theme} has no --color-fd-primary-foreground: var(--ow-*)`);
  }
  const colors = {
    primary: primaryHex.toLowerCase(),
    'on-primary': onPrimaryHex.toLowerCase(),
  };
  for (const [name, hex] of hexes) {
    colors[name.replace(/^--ow-/, '')] = hex.toLowerCase();
  }
  return colors;
}

function typographyMap(tokensCss, fontsCss, eyebrowSource) {
  const displayStack = fontStack(fontsCss, '--font-display');
  const monoStack = fontStack(fontsCss, '--font-mono');
  const bodyTracking = bodyLetterSpacing(tokensCss);
  const headingTracking = headingLetterSpacing(tokensCss);
  const eyebrowTracking = trackingValue(eyebrowSource);
  if (!displayStack || !monoStack || !bodyTracking || !headingTracking || !eyebrowTracking) {
    throw new Error('could not derive typography families and tracking from fonts.css/tokens.css/eyebrow.tsx');
  }
  const roles = fontRoles(tokensCss);
  if (roles.size === 0) {
    throw new Error('tokens.css :root declared no --ow-font-* roles');
  }
  const out = {
    display: {
      fontFamily: displayStack[0],
      fontStack: displayStack,
      letterSpacing: bodyTracking,
    },
    heading: {
      fontFamily: displayStack[0],
      fontStack: displayStack,
      letterSpacing: headingTracking,
    },
    mono: {
      fontFamily: monoStack[0],
      fontStack: monoStack,
    },
    eyebrow: {
      fontFamily: monoStack[0],
      fontStack: monoStack,
      letterSpacing: eyebrowTracking,
    },
  };
  for (const [role, spec] of roles) {
    const stack = fontStack(fontsCss, spec.fontVariable);
    if (!stack) {
      throw new Error(`could not resolve ${spec.fontVariable} for --ow-font-${role}`);
    }
    out[role] = {
      fontFamily: stack[0],
      fontStack: stack,
      fontSize: spec.fontSize,
      fontWeight: spec.fontWeight,
      lineHeight: spec.lineHeight,
    };
  }
  return out;
}

function focusMap(tokensCss, groups) {
  const ring = focusRing(tokensCss);
  const widthKey = ring.width.replace(/^--ow-focus-/, '');
  const offsetKey = ring.offset.replace(/^--ow-focus-/, '');
  const width = groups.focus.get(widthKey);
  const offset = groups.focus.get(offsetKey);
  if (!width || !offset) {
    throw new Error('tokens.css :focus-visible width or offset has no px length');
  }
  const light = lightTokenHexes(tokensCss).get(ring.color);
  const dark = darkTokenHexes(tokensCss).get(ring.color);
  if (!light || !dark) {
    throw new Error(`tokens.css focus colour ${ring.color} has no hex`);
  }
  return {
    width,
    offset,
    color: {
      light: light.toLowerCase(),
      dark: dark.toLowerCase(),
    },
  };
}

function scrimRamp(tokensCss, theme) {
  const spec = scrimSpec(tokensCss, theme);
  const hexes = theme === 'dark' ? darkTokenHexes(tokensCss) : lightTokenHexes(tokensCss);
  const color = hexes.get(spec.token);
  if (!color) {
    throw new Error(`tokens.css ${theme} scrim token ${spec.token} has no hex`);
  }
  return { color: color.toLowerCase(), opacity: spec.opacity };
}

function readPkg(rel) {
  return readFileSync(join(pkgRoot, rel), 'utf8');
}

function writeAtomic(dest, content) {
  const tmp = `${dest}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, dest);
}

export function generateCommitted() {
  const dest = join(pkgRoot, 'tokens.json');
  const next = generate(
    readPkg('src/tokens.css'),
    readPkg('src/fonts.css'),
    readPkg('src/primitives/eyebrow.tsx'),
  );
  writeAtomic(dest, next);
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && thisFile === process.argv[1]) {
  generateCommitted();
}
