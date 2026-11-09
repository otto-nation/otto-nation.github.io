// Parses the hand-written ## Terminal YAML fence in DESIGN.md and resolves
// `{colors.*}` refs to hexes. Lives in scripts/ (not src/internal/) because
// that directory ships and runs in consumers via the bins; this does not.
//
// Used by the terminal contrast test and generate-terminal-themes.mjs.

import { parse } from 'yaml';
import {
  darkTokenHexes,
  fdPrimaryToken,
  lightTokenHexes,
} from '../src/internal/derive.mjs';

const SCHEMES = ['light', 'dark'];
const SPECIAL_SLOTS = ['background', 'foreground', 'cursor', 'selection'];
const ANSI_SLOTS = [...Array(16).keys()];
const COLOR_REF = /^\{colors\.([a-z0-9-]+)\}$/;

/**
 * The `terminal:` map from the fenced yaml block under `## Terminal`.
 * Throws when the heading, fence, or `terminal:` key is missing.
 */
export function terminalMap(designMd) {
  const headingAt = designMd.search(/^## Terminal\s*$/m);
  if (headingAt === -1) {
    throw new Error('DESIGN.md is missing ## Terminal');
  }
  const afterHeading = designMd.slice(headingAt);
  const sectionEnd = afterHeading.search(/\n## /);
  const section = sectionEnd === -1 ? afterHeading : afterHeading.slice(0, sectionEnd);
  const fence = section.match(/```yaml\n([\s\S]*?)```/);
  if (!fence) {
    throw new Error('DESIGN.md ## Terminal is missing a yaml fence');
  }
  const parsed = parse(fence[1]);
  if (!parsed || typeof parsed !== 'object' || parsed.terminal == null) {
    throw new Error('DESIGN.md ## Terminal yaml must have a terminal: map');
  }
  return parsed.terminal;
}

/**
 * `{ light, dark }` of hexes. Resolves `{colors.x}` via lightTokenHexes,
 * `{colors.dark-x}` via darkTokenHexes, and `primary` / `dark-primary` via
 * fdPrimaryToken. Throws on an unknown ref, a missing slot, or a `dark-*`
 * ref under `light:`.
 */
export function resolveTerminal(map, tokensCss) {
  if (!map || typeof map !== 'object') {
    throw new Error('terminal map is missing');
  }
  const resolved = {};
  for (const scheme of SCHEMES) {
    resolved[scheme] = resolveScheme(map[scheme], scheme, tokensCss);
  }
  return resolved;
}

function resolveScheme(schemeMap, scheme, tokensCss) {
  if (!schemeMap || typeof schemeMap !== 'object' || Array.isArray(schemeMap)) {
    throw new Error(`terminal ${scheme}: missing scheme map`);
  }
  const out = {};
  for (const slot of SPECIAL_SLOTS) {
    const ref = schemeMap[slot];
    if (ref == null) {
      throw new Error(`terminal ${scheme}: missing slot ${slot}`);
    }
    out[slot] = resolveRef(ref, scheme, tokensCss);
  }
  for (const slot of ANSI_SLOTS) {
    const ref = schemeMap[slot] ?? schemeMap[String(slot)];
    if (ref == null) {
      throw new Error(`terminal ${scheme}: missing slot ${slot}`);
    }
    out[slot] = resolveRef(ref, scheme, tokensCss);
  }
  return out;
}

function resolveRef(ref, scheme, tokensCss) {
  if (typeof ref !== 'string') {
    throw new Error(`terminal ${scheme}: ref is not a string: ${ref}`);
  }
  const match = COLOR_REF.exec(ref);
  if (!match) {
    throw new Error(`terminal ${scheme}: not a colors ref: ${ref}`);
  }
  const name = match[1];
  if (name.startsWith('dark-') && scheme === 'light') {
    throw new Error(`terminal light: dark-* ref {colors.${name}}`);
  }
  if (name === 'primary' || name === 'dark-primary') {
    const theme = name === 'dark-primary' ? 'dark' : 'light';
    const token = fdPrimaryToken(tokensCss, theme);
    if (!token) {
      throw new Error(`unknown ref {colors.${name}}`);
    }
    const hexes = theme === 'dark' ? darkTokenHexes(tokensCss) : lightTokenHexes(tokensCss);
    const hex = hexes.get(token);
    if (!hex) {
      throw new Error(`unknown ref {colors.${name}}`);
    }
    return hex.toLowerCase();
  }
  if (name.startsWith('dark-')) {
    const token = `--ow-${name.slice('dark-'.length)}`;
    const hex = darkTokenHexes(tokensCss).get(token);
    if (!hex) {
      throw new Error(`unknown ref {colors.${name}}`);
    }
    return hex.toLowerCase();
  }
  const hex = lightTokenHexes(tokensCss).get(`--ow-${name}`);
  if (!hex) {
    throw new Error(`unknown ref {colors.${name}}`);
  }
  return hex.toLowerCase();
}
