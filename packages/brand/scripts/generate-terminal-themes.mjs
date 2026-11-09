#!/usr/bin/env node
// Writes packages/brand/terminal/otto-{light,dark}.json from the DESIGN.md
// terminal map and tokens.css. Shape is herdr-app's theme schema minus
// `colors`. Generated; do not edit the JSON. Idempotent: a second run is a
// no-op on current files.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTerminal, terminalMap } from './terminal.mjs';

const pkgRoot = fileURLToPath(new URL('..', import.meta.url));

const THEME_KEYS = ['background', 'foreground', 'selection', 'cursor', 'ansi'];

/**
 * `{ 'otto-light.json': string, 'otto-dark.json': string }` — 2-space JSON,
 * lowercase hex, trailing newline, keys in THEME_KEYS order.
 */
export function generate(designMd, tokensCss) {
  const resolved = resolveTerminal(terminalMap(designMd), tokensCss);
  return {
    'otto-light.json': stringifyTheme(resolved.light),
    'otto-dark.json': stringifyTheme(resolved.dark),
  };
}

function stringifyTheme(slots) {
  const theme = {
    background: slots.background,
    foreground: slots.foreground,
    selection: slots.selection,
    cursor: slots.cursor,
    ansi: Array.from({ length: 16 }, (_, i) => slots[i]),
  };
  for (const key of Object.keys(theme)) {
    if (!THEME_KEYS.includes(key)) {
      throw new Error(`unexpected theme key ${key}`);
    }
  }
  return `${JSON.stringify(theme, null, 2)}\n`;
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
  const dir = join(pkgRoot, 'terminal');
  mkdirSync(dir, { recursive: true });
  const files = generate(readPkg('DESIGN.md'), readPkg('src/tokens.css'));
  for (const [name, content] of Object.entries(files)) {
    writeAtomic(join(dir, name), content);
  }
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && thisFile === process.argv[1]) {
  generateCommitted();
}
