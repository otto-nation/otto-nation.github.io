#!/usr/bin/env node
// Fails a consumer's build when it depends on @otto-nation/brand but omits the
// configuration the package needs to render. Every misconfiguration here
// produces a page that builds clean and renders wrong, which is the failure
// mode this converts into a build error. It enforces:
//
//   - @import of tokens.css and of fonts.css
//   - an @source pointing at the package, whose path actually resolves
//   - transpilePackages listing the package
//   - no --ow-* reference in consumer source that tokens.css does not declare
//
// Usage:
//   otto-brand-check --css <entrypoint.css> --next-config <next.config.mjs> \
//                    --src <dir> [<dir>...]

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

import { declaredTokens } from '../src/verify.mjs';

const PACKAGE = '@otto-nation/brand';
// .svg is deliberately absent. An SVG served as a favicon or an <img> src is
// an isolated document that never sees the page's stylesheet, so it cannot
// reference a custom property and its colours are necessarily literal hexes —
// scanning it for --ow-* would only ever produce noise. The package's own
// exception of that shape is src/marks/icon.svg, which names the three tokens
// its hexes stand in for.
const SOURCE_FILES = new Set(['.tsx', '.ts', '.css', '.mjs', '.js', '.jsx', '.mdx']);

// The stylesheets a consumer must pull in, and what breaks when they do not.
const STYLESHEETS = [
  {
    file: 'tokens.css',
    consequence:
      'Every --ow-* custom property is then undefined, so every component renders\n' +
      '  with inherited or transparent colour on a page that builds clean.',
  },
  {
    file: 'fonts.css',
    consequence:
      'Neither @font-face rule is then declared and --font-display / --font-mono are\n' +
      '  undefined, so the whole page renders in the wrong faces.',
  },
];

function escapeRegExp(literal) {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
//
// Quoted strings are masked out first. The recommended @source glob ends in
// '/**/*.tsx', and `/**/` is a syntactically valid empty CSS comment, so a
// naive strip deletes it from the middle of the path — turning
// '../x/**/y/*.tsx' into '../xy/*.tsx' and making the resolved path check
// below report a directory the consumer never wrote.
function stripComments(source) {
  const strings = [];
  const masked = source.replace(/'[^'\n]*'|"[^"\n]*"/g, (match) => {
    strings.push(match);
    return `\u0000${strings.length - 1}\u0000`;
  });
  return masked
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\u0000(\d+)\u0000/g, (_, index) => strings[Number(index)]);
}

// Thrown by walk() rather than exiting from inside the traversal, so the
// entrypoint stays the only place that decides the process's fate and a caller
// reusing walk() can handle the failure itself.
class SourceScanError extends Error {}

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (cause) {
    throw new SourceScanError(`cannot read source directory: ${dir}`, { cause });
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

for (const { file, consequence } of STYLESHEETS) {
  const specifier = escapeRegExp(`${PACKAGE}/${file}`);
  const imported = new RegExp(
    String.raw`@(?:import|use)\s+(?:url\(\s*)?['"]${specifier}['"]`,
  ).test(css);
  if (!imported) {
    failures.push(
      `${args.css}: does not import ${PACKAGE}/${file}.\n` +
        `  ${consequence}\n` +
        `  Add: @import '${PACKAGE}/${file}';`,
    );
  }
}

const sourceDirective = css.match(
  new RegExp(String.raw`@source\s+['"]([^'"]*${escapeRegExp(PACKAGE)}[^'"]*)['"]`),
);
if (!sourceDirective) {
  failures.push(
    `${args.css}: no @source directive points at ${PACKAGE}.\n` +
      `  Tailwind v4 skips node_modules, so every utility the package uses would be\n` +
      `  missing from your stylesheet and the page would render unstyled.\n` +
      `  Add: @source '../node_modules/${PACKAGE}/**/*.tsx';\n` +
      `  Use an explicit file glob, not a bare directory, and use ../../node_modules\n` +
      `  instead if npm hoisted them to a workspace root.`,
  );
} else {
  // Tailwind resolves an @source glob relative to the stylesheet that declares
  // it, so the wrong number of ../ segments is the mistake the depth warning in
  // the README predicts. Only the literal head of the glob — everything before
  // the first wildcard — is a real path, and that is what has to exist.
  const glob = sourceDirective[1];
  const base = dirname(args.css);
  const resolved = resolve(base, glob.split('*')[0]);
  if (!existsSync(resolved)) {
    failures.push(
      `${args.css}: the @source path does not exist: ${resolved}\n` +
        `  Resolved from @source '${glob}' relative to ${base}.\n` +
        `  The depth is wrong: nothing lives at that path, so Tailwind scans none of\n` +
        `  the package's files and the page renders unstyled exactly as if the\n` +
        `  directive were absent.\n` +
        `  Use ../node_modules/... when the app owns its node_modules and\n` +
        `  ../../node_modules/... when npm hoisted them to a workspace root.`,
    );
  }
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
// The parse itself lives in src/verify.mjs because otto-brand-verify needs the
// same list, and two copies of the regex would drift the moment tokens.css
// changed shape — the file is read here rather than there so the reindented
// copy the tests build still resolves beside this script.
const tokens = readFileSync(new URL('../src/tokens.css', import.meta.url), 'utf8');
const declared = declaredTokens(tokens);

// Every file that references a token, not just the last one scanned: a report
// that names one offender per token turns a single run into a round of
// whack-a-mole, where the developer fixes what was named and re-runs into a
// failure that was there all along.
const undeclared = new Map();
try {
  for (const dir of args.src) {
    for (const file of walk(dir)) {
      const source = stripComments(readFileSync(file, 'utf8'));
      for (const [, token] of source.matchAll(/(--ow-[a-z-]+)/g)) {
        if (declared.has(token)) continue;
        if (!undeclared.has(token)) undeclared.set(token, new Set());
        undeclared.get(token).add(file);
      }
    }
  }
} catch (error) {
  if (!(error instanceof SourceScanError)) throw error;
  console.error(`otto-brand-check: ${error.message}`);
  process.exit(1);
}
for (const [token, files] of undeclared) {
  // One file stays on the headline; more than one goes to an indented list, so
  // a token used across a dozen files does not produce a dozen near-identical
  // lines saying the same thing about the same token.
  const [first] = files;
  const rest = [...files].slice(1);
  failures.push(
    `${first}: references ${token}, which ${PACKAGE}/tokens.css does not declare` +
      rest.map((file) => `\n  also referenced by ${file}`).join(''),
  );
}

if (failures.length > 0) {
  console.error(`otto-brand-check: ${failures.length} problem(s)\n`);
  for (const failure of failures) console.error(`  ${failure}\n`);
  process.exit(1);
}

console.log(`otto-brand-check: ${args.css}, ${args.nextConfig}, and ${args.src.length} source tree(s) OK`);
