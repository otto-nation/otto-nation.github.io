#!/usr/bin/env node
// Rewrites DESIGN.md front matter and <!-- generated:* --> regions from
// tokens.css / fonts.css / eyebrow.tsx. The rest of the file is hand-written
// and left alone. Idempotent: a second run is a no-op on a current file.
//
// ceiling: YAML colors are the :root ramp only, until design.md has light/dark
// modes. A custom top-level key holding hexes is a token-like-ignored warning,
// so the dark ramp is a generated markdown table instead.

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bodyLetterSpacing,
  darkTokenHexes,
  documentedClaims,
  documentedDarkClaims,
  fdPrimaryToken,
  fontStack,
  headingLetterSpacing,
  lightTokenHexes,
  trackingValue,
} from '../src/internal/derive.mjs';

const pkgRoot = fileURLToPath(new URL('..', import.meta.url));

export function generate(designMd, { tokensCss, fontsCss, eyebrowSource }) {
  const yaml = frontMatter({ tokensCss, fontsCss, eyebrowSource });
  let out = replaceFrontMatter(designMd, yaml);
  out = replaceMarkedRegion(out, 'dark-ramp', darkRampTable(tokensCss));
  out = replaceMarkedRegion(out, 'contrast-rules', contrastTable(tokensCss));
  return out;
}

// Front matter is the region most likely to be hand-edited and lost on the
// next regenerate, and unlike the body regions it has no HTML marker.
export const GENERATED_HEADER = [
  '# Generated from src/tokens.css and src/fonts.css by',
  '# `npm run design:generate -w packages/brand`. Do not edit; the prose below is hand-written.',
];

function frontMatter({ tokensCss, fontsCss, eyebrowSource }) {
  const light = lightTokenHexes(tokensCss);
  if (light.size === 0) {
    throw new Error('tokens.css :root declared no --ow-* hexes');
  }
  const primaryToken = fdPrimaryToken(tokensCss, 'light');
  const primaryHex = primaryToken ? light.get(primaryToken) : undefined;
  if (!primaryToken || !primaryHex) {
    throw new Error('tokens.css :root has no --color-fd-primary: var(--ow-*)');
  }

  const display = fontStack(fontsCss, '--font-display')?.[0];
  const mono = fontStack(fontsCss, '--font-mono')?.[0];
  const bodyTracking = bodyLetterSpacing(tokensCss);
  const headingTracking = headingLetterSpacing(tokensCss);
  const eyebrowTracking = trackingValue(eyebrowSource);
  if (!display || !mono || !bodyTracking || !headingTracking || !eyebrowTracking) {
    throw new Error('could not derive typography families and tracking from fonts.css/tokens.css/eyebrow.tsx');
  }

  const colors = { primary: quoteColor(primaryHex) };
  for (const [name, hex] of light) {
    colors[name.replace(/^--ow-/, '')] = quoteColor(hex);
  }

  const lines = [
    // A YAML comment, not a key: the design.md parser never sees it, so it
    // cannot trip the linter's unknown-key rules or leak into an export.
    ...GENERATED_HEADER,
    'version: alpha',
    'name: otto-nation',
    'description: "Warm cream canvas, Mexican palette names, Greca fret. YAML tokens are the light ramp."',
    'colors:',
    ...Object.entries(colors).map(([key, value]) => `  ${key}: ${value}`),
    'typography:',
    '  display:',
    `    fontFamily: ${display}`,
    `    letterSpacing: ${quoteDimension(bodyTracking)}`,
    '  heading:',
    `    fontFamily: ${display}`,
    `    letterSpacing: ${quoteDimension(headingTracking)}`,
    '  mono:',
    `    fontFamily: ${mono}`,
    '  eyebrow:',
    `    fontFamily: ${mono}`,
    `    letterSpacing: ${quoteDimension(eyebrowTracking)}`,
    'rounded:',
    // Tailwind v4 defaults, which is what the components actually use
    // (rounded-md on Button, rounded-lg on CardGrid / InstallBlock).
    '  sm: 4px',
    '  md: 6px',
    '  lg: 8px',
    'spacing:',
    // Tailwind's 4px base. Not in tokens.css; listed so agents share the scale.
    '  1: 4px',
    '  2: 8px',
    '  3: 12px',
    '  4: 16px',
    '  5: 20px',
    '  6: 24px',
    '',
  ];
  return lines.join('\n');
}

function quoteColor(hex) {
  return `"${hex.toLowerCase()}"`;
}

function quoteDimension(value) {
  return value.startsWith('-') ? `"${value}"` : value;
}

function darkRampTable(tokensCss) {
  const light = lightTokenHexes(tokensCss);
  const dark = darkTokenHexes(tokensCss);
  const rows = [];
  for (const [name, lightHex] of light) {
    const darkHex = dark.get(name);
    if (!darkHex || darkHex.toLowerCase() === lightHex.toLowerCase()) continue;
    rows.push(`| ${name.replace(/^--ow-/, '')} | ${darkHex.toLowerCase()} |`);
  }
  if (rows.length === 0) {
    throw new Error('tokens.css .dark restated no --ow-* hexes');
  }
  return ['| Token | Dark |', '| --- | --- |', ...rows, ''].join('\n');
}

function contrastTable(tokensCss) {
  const rows = [
    ...documentedClaims(tokensCss).map((claim) => contrastRow(claim, 'light')),
    ...documentedDarkClaims(tokensCss).map((claim) => contrastRow(claim, 'dark')),
  ];
  if (rows.length === 0) {
    throw new Error('tokens.css documented no contrast claims');
  }
  return ['| Token | Ratio | On | Theme |', '| --- | --- | --- | --- |', ...rows, ''].join('\n');
}

function contrastRow({ token, ratio, background }, theme) {
  const name = token.replace(/^--ow-/, '');
  const on = background.replace(/^--ow-/, '');
  return `| ${name} | ${ratio}:1 | ${on} | ${theme} |`;
}

function replaceFrontMatter(source, yamlBody) {
  if (!source.startsWith('---\n')) {
    throw new Error('DESIGN.md must start with YAML front matter');
  }
  const end = source.indexOf('\n---\n', 4);
  if (end === -1) {
    throw new Error('DESIGN.md front matter is not closed');
  }
  return `---\n${yamlBody}---\n${source.slice(end + '\n---\n'.length)}`;
}

function replaceMarkedRegion(source, name, inner) {
  const start = `<!-- generated:${name} -->`;
  const end = `<!-- /generated:${name} -->`;
  const startIdx = source.indexOf(start);
  const endIdx = source.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`DESIGN.md is missing ${start} … ${end}`);
  }
  const after = source.slice(endIdx + end.length);
  return `${source.slice(0, startIdx)}${start}\n${inner}${end}${after}`;
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
  const dest = join(pkgRoot, 'DESIGN.md');
  const next = generate(readPkg('DESIGN.md'), {
    tokensCss: readPkg('src/tokens.css'),
    fontsCss: readPkg('src/fonts.css'),
    eyebrowSource: readPkg('src/primitives/eyebrow.tsx'),
  });
  writeAtomic(dest, next);
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && thisFile === process.argv[1]) {
  generateCommitted();
}
