#!/usr/bin/env node
// Fails a consumer's build when it depends on @otto-nation/brand but omits the
// configuration the package needs to render. Tailwind v4 excludes node_modules
// from auto-detection, so a missing @source produces a page that builds clean
// and renders unstyled — the exact failure this converts into a build error.
//
// Usage:
//   otto-brand-check --css <entrypoint.css> --next-config <next.config.mjs> \
//                    --src <dir> [<dir>...]

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const PACKAGE = '@otto-nation/brand';
const SOURCE_FILES = new Set(['.tsx', '.ts', '.css', '.mjs', '.js', '.jsx', '.mdx']);

function parseArgs(argv) {
  const args = { css: null, nextConfig: null, src: [] };
  let current = null;
  for (const token of argv) {
    if (token === '--css' || token === '--next-config' || token === '--src') {
      current = token;
      continue;
    }
    if (current === '--css') args.css = token;
    else if (current === '--next-config') args.nextConfig = token;
    else if (current === '--src') args.src.push(token);
    else usage(`unexpected argument: ${token}`);
  }
  if (!args.css || !args.nextConfig || args.src.length === 0) {
    usage('--css, --next-config, and at least one --src are all required');
  }
  return args;
}

function usage(message) {
  console.error(`otto-brand-check: ${message}`);
  console.error('usage: otto-brand-check --css <file> --next-config <file> --src <dir> [<dir>...]');
  process.exit(2);
}

// Comments are stripped before every check so a commented-out directive never
// counts as configuration.
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    console.error(`otto-brand-check: cannot read source directory: ${dir}`);
    process.exit(1);
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (SOURCE_FILES.has(extname(path))) yield path;
  }
}

function read(path, label) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    console.error(`otto-brand-check: cannot read ${label}: ${path}`);
    process.exit(1);
  }
}

const args = parseArgs(process.argv.slice(2));
const failures = [];

const css = stripComments(read(args.css, 'CSS entrypoint'));
if (!new RegExp(String.raw`@source\s+['"][^'"]*${PACKAGE}[^'"]*['"]`).test(css)) {
  failures.push(
    `${args.css}: no @source directive points at ${PACKAGE}.\n` +
      `  Tailwind v4 skips node_modules, so every utility the package uses would be\n` +
      `  missing from your stylesheet and the page would render unstyled.\n` +
      `  Add: @source '../node_modules/${PACKAGE}/**/*.tsx';\n` +
      `  Use an explicit file glob, not a bare directory, and use ../../node_modules\n` +
      `  instead if npm hoisted them to a workspace root.`,
  );
}

const config = stripComments(read(args.nextConfig, 'next config'));
const transpile = config.match(/transpilePackages\s*:\s*\[([^\]]*)\]/);
if (!transpile || !transpile[1].includes(PACKAGE)) {
  failures.push(
    `${args.nextConfig}: transpilePackages does not list ${PACKAGE}.\n` +
      `  The package ships raw .tsx; without this Next will not compile it.\n` +
      `  Add: transpilePackages: ['${PACKAGE}'],`,
  );
}

// tokens.css is read from this package's own src, so the check always measures
// against the version actually installed rather than a copy in the consumer.
const tokens = readFileSync(new URL('../src/tokens.css', import.meta.url), 'utf8');
const declared = new Set(
  [...tokens.matchAll(/^\s*(--ow-[a-z-]+):/gm)].map(([, name]) => name),
);

const undeclared = new Map();
for (const dir of args.src) {
  for (const file of walk(dir)) {
    const source = stripComments(readFileSync(file, 'utf8'));
    for (const [, token] of source.matchAll(/(--ow-[a-z-]+)/g)) {
      if (!declared.has(token)) undeclared.set(token, file);
    }
  }
}
for (const [token, file] of undeclared) {
  failures.push(`${file}: references ${token}, which ${PACKAGE}/tokens.css does not declare`);
}

if (failures.length > 0) {
  console.error(`otto-brand-check: ${failures.length} problem(s)\n`);
  for (const failure of failures) console.error(`  ${failure}\n`);
  process.exit(1);
}

console.log(`otto-brand-check: ${args.css}, ${args.nextConfig}, and ${args.src.length} source tree(s) OK`);
