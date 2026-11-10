#!/usr/bin/env node
// Fails a consumer's build when it depends on @otto-nation/brand but omits the
// configuration the package needs to render. Every misconfiguration here
// produces a page that builds clean and renders wrong, which is the failure
// mode this converts into a build error. It enforces:
//
//   - @import of tokens.css and of fonts.css
//   - (Next) an @source pointing at the package, whose path actually resolves
//   - (Next) transpilePackages listing the package
//   - (Vite, only when source imports a brand component) that same @source,
//     and the config importing @tailwindcss/vite under a binding it then calls
//   - no --ow-* reference in consumer source that tokens.css does not declare,
//     and a tokens.css this package can still parse those names out of at all
//
// It also warns on style drift in --src (literal colours, palette colours, pill
// radii, hover borders, removed outlines, redefined tokens) and on an @source
// glob whose literal head is the package root rather than src/ (source-too-broad).
// Warnings print and leave the exit code 0 unless --strict or --error <id>
// escalates them.
//
// Usage:
//   otto-brand-check --css <entrypoint.css> \
//                    (--next-config <next.config.mjs> | --vite-config <vite.config.ts>) \
//                    --src <dir> [<dir>...] [--strict] [--error <id>]

import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';

import { declaredTokens, OW_TOKEN, SOURCE_GLOB } from '../src/internal/derive.mjs';
import { SourceScanError, sourceFiles } from '../src/internal/source-files.mjs';
import {
  CONSUMER_RULES,
  findViolations,
  IGNORE_REASON,
  IGNORE_UNKNOWN_RULE,
  IGNORE_UNUSED,
  maskComments,
} from '../src/internal/style-rules.mjs';

const PACKAGE = '@otto-nation/brand';
// .svg is deliberately absent. An SVG served as a favicon or an <img> src is
// an isolated document that never sees the page's stylesheet, so it cannot
// reference a custom property and its colours are necessarily literal hexes —
// scanning it for --ow-* would only ever produce noise. The package's own
// exception of that shape is src/marks/icon.svg, which names the three tokens
// its hexes stand in for.
const SOURCE_EXTS = ['.tsx', '.ts', '.css', '.mjs', '.js', '.jsx', '.mdx'];

const CONFIG_RULE_IDS = Object.freeze([
  'css-import',
  'source-missing',
  'source-path',
  'transpile-packages',
  'undeclared-token',
  'tokens-unparsed',
  'vite-tailwind-plugin',
]);

const ERRORABLE = new Set([
  ...CONSUMER_RULES.map((rule) => rule.id),
  ...CONFIG_RULE_IDS,
  'src-empty',
  'source-too-broad',
  IGNORE_REASON.id,
  IGNORE_UNKNOWN_RULE.id,
  IGNORE_UNUSED.id,
]);

const ALWAYS_ERROR = new Set([
  ...CONFIG_RULE_IDS,
  IGNORE_REASON.id,
  IGNORE_UNKNOWN_RULE.id,
]);

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
  const args = {
    css: null,
    nextConfig: null,
    viteConfig: null,
    src: [],
    strict: false,
    error: [],
  };
  let current = null;
  for (const token of argv) {
    if (token === '--strict') {
      args.strict = true;
      current = null;
      continue;
    }
    if (
      token === '--error' ||
      token === '--css' ||
      token === '--next-config' ||
      token === '--vite-config' ||
      token === '--src'
    ) {
      current = token;
      continue;
    }
    if (current === '--css') {
      args.css = token;
      current = null;
    } else if (current === '--next-config') {
      args.nextConfig = token;
      current = null;
    } else if (current === '--vite-config') {
      args.viteConfig = token;
      current = null;
    } else if (current === '--src') {
      args.src.push(token);
    } else if (current === '--error') {
      const ids = token.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length === 0) usage('--error requires a rule id');
      args.error.push(...ids);
      current = null;
    } else {
      usage(`unexpected argument: ${token}`);
    }
  }
  if (current === '--error') usage('--error requires a rule id');
  if (!args.css || args.src.length === 0) {
    usage('--css and at least one --src are required');
  }
  if (Boolean(args.nextConfig) === Boolean(args.viteConfig)) {
    usage('exactly one of --next-config or --vite-config is required');
  }
  for (const id of args.error) {
    if (!ERRORABLE.has(id)) usage(`unknown --error id: ${id}`);
  }
  return args;
}

function usage(message) {
  console.error(`otto-brand-check: ${message}`);
  console.error(
    'usage: otto-brand-check --css <file> (--next-config <file> | --vite-config <file>) --src <dir> [<dir>...] [--strict] [--error <id>]',
  );
  process.exit(2);
}

function isBrandPackageRoot(resolved) {
  return basename(resolved) === 'brand' && basename(dirname(resolved)) === '@otto-nation';
}

function displayPath(path) {
  if (!isAbsolute(path)) return path;
  const rel = relative(process.cwd(), path);
  if (rel.startsWith(`..${sep}`) || rel === '..') return path;
  return rel || path;
}

function severityOf(id, args) {
  if (ALWAYS_ERROR.has(id)) return 'error';
  if (args.strict) return 'error';
  if (args.error.includes(id)) return 'error';
  return 'warning';
}

function read(path, label) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    console.error(`otto-brand-check: cannot read ${label}: ${path}`);
    process.exit(1);
  }
}

function kindOf(path) {
  return extname(path) === '.css' ? 'css' : 'script';
}

// A component entry is the package root or a subpath that is not a stylesheet,
// data file, mark, markdown, the verify script, or package.json. CSS-only Vite
// consumers import tokens.css / fonts.css and must not be asked for @source.
function isBrandComponentSpecifier(specifier) {
  if (specifier === PACKAGE) return true;
  if (!specifier.startsWith(`${PACKAGE}/`)) return false;
  const subpath = specifier.slice(PACKAGE.length + 1);
  if (subpath === 'verify' || subpath === 'package.json') return false;
  return !/\.(?:css|json|svg|md)$/.test(subpath);
}

function sourceImportsBrandComponent(text) {
  const pattern = new RegExp(
    String.raw`(?:(?<![\w$])from\s+|(?<![\w$])import\s*\(?\s*|(?<![\w$])require\s*\(\s*)['"](${escapeRegExp(PACKAGE)}(?:/[^'"]*)?)['"]`,
    'g',
  );
  for (const match of text.matchAll(pattern)) {
    if (isBrandComponentSpecifier(match[1])) return true;
  }
  return false;
}

function viteTailwindPluginCalled(config) {
  const imported = config.match(
    /(?:import\s+([\w$]+)\s+from\s+['"]@tailwindcss\/vite['"]|(?:const|let|var)\s+([\w$]+)\s*=\s*require\s*\(\s*['"]@tailwindcss\/vite['"]\s*\)|import\s*\{\s*default\s+as\s+([\w$]+)\s*\}\s*from\s*['"]@tailwindcss\/vite['"])/,
  );
  if (!imported) return false;
  const binding = imported[1] || imported[2] || imported[3];
  return new RegExp(String.raw`(?<![\w$.])${escapeRegExp(binding)}\s*\(`).test(config);
}

function scanSource(dirs, declared) {
  const undeclared = new Map();
  const style = [];
  const empty = [];
  let importsComponent = false;
  for (const dir of dirs) {
    const files = sourceFiles(dir, SOURCE_EXTS);
    if (files.length === 0) empty.push(dir);
    for (const file of files) {
      const raw = readFileSync(file, 'utf8');
      const masked = maskComments(raw, kindOf(file));
      if (!importsComponent && kindOf(file) !== 'css' && sourceImportsBrandComponent(masked)) {
        importsComponent = true;
      }
      if (declared && declared.size > 0) {
        for (const [, token] of masked.matchAll(new RegExp(`(${OW_TOKEN})`, 'g'))) {
          if (declared.has(token)) continue;
          if (!undeclared.has(token)) undeclared.set(token, new Set());
          undeclared.get(token).add(file);
        }
      }
      for (const finding of findViolations(raw, { kind: kindOf(file) })) {
        style.push({ ...finding, file });
      }
    }
  }
  return { undeclared, style, empty, importsComponent };
}

const args = parseArgs(process.argv.slice(2));
const reports = [];

function report(path, id, message, { line, column, detail } = {}) {
  const sev = severityOf(id, args);
  const where =
    line == null
      ? `${displayPath(path)}: ${sev} ${id}: ${message}`
      : `${displayPath(path)}:${line}:${column}: ${sev} ${id}: ${message}`;
  reports.push({ severity: sev, text: detail ? `${where}\n${detail}` : where });
}

const css = maskComments(read(args.css, 'CSS entrypoint'), 'css');

for (const { file, consequence } of STYLESHEETS) {
  const specifier = escapeRegExp(`${PACKAGE}/${file}`);
  const imported = new RegExp(
    String.raw`@(?:import|use)\s+(?:url\(\s*)?['"]${specifier}['"]`,
  ).test(css);
  if (!imported) {
    report(
      args.css,
      'css-import',
      `does not import ${PACKAGE}/${file}.`,
      {
        detail:
          `  ${consequence}\n` +
          `  Add: @import '${PACKAGE}/${file}';`,
      },
    );
  }
}

// tokens.css is read from this package's own src, so the check always measures
// against the version actually installed rather than a copy in the consumer.
// The parse itself lives in src/internal/derive.mjs because otto-brand-verify
// needs the same list, and two copies of the regex would drift the moment
// tokens.css changed shape — the file is read here rather than there so the
// reindented copy the tests build still resolves beside this script.
const tokens = readFileSync(new URL('../src/tokens.css', import.meta.url), 'utf8');
const declared = declaredTokens(tokens);

let undeclared = new Map();
let style = [];
let empty = [];
let importsComponent = false;
try {
  const scanned = scanSource(args.src, declared.size === 0 ? null : declared);
  undeclared = scanned.undeclared;
  style = scanned.style;
  empty = scanned.empty;
  importsComponent = scanned.importsComponent;
} catch (error) {
  if (!(error instanceof SourceScanError)) throw error;
  for (const { text } of reports) console.error(text);
  console.error(`otto-brand-check: ${error.message}`);
  process.exit(1);
}

// Next always needs @source. Vite needs it only when source imports a component
// entry; a CSS-only Vite app (tokens and fonts, no brand TSX) has nothing for
// Tailwind to scan in node_modules.
const checkSource = Boolean(args.nextConfig) || importsComponent;
const sourceDirective = css.match(
  new RegExp(String.raw`@source\s+['"]([^'"]*${escapeRegExp(PACKAGE)}[^'"]*)['"]`),
);
if (checkSource && !sourceDirective) {
  report(
    args.css,
    'source-missing',
    `no @source directive points at ${PACKAGE}.`,
    {
      detail:
        `  Tailwind v4 skips node_modules, so every utility the package uses would be\n` +
        `  missing from your stylesheet and the page would render unstyled.\n` +
        `  Add: @source '../${SOURCE_GLOB}';\n` +
        `  Pin the glob at src/, not the package root: Tailwind still auto-detects\n` +
        `  beside @source, and a package-root glob scans README.md and DESIGN.md.\n` +
        `  Use ../../node_modules instead if npm hoisted them to a workspace root.`,
    },
  );
} else if (checkSource) {
  // Tailwind resolves an @source glob relative to the stylesheet that declares
  // it, so the wrong number of ../ segments is the mistake the depth warning in
  // the README predicts. Only the literal head of the glob — everything before
  // the first wildcard — is a real path, and that is what has to exist.
  const glob = sourceDirective[1];
  const base = dirname(args.css);
  const resolved = resolve(base, glob.split('*')[0]);
  if (!existsSync(resolved)) {
    report(
      args.css,
      'source-path',
      `the @source path does not exist: ${resolved}`,
      {
        detail:
          `  Resolved from @source '${glob}' relative to ${base}.\n` +
          `  The depth is wrong: nothing lives at that path, so Tailwind scans none of\n` +
          `  the package's files and the page renders unstyled exactly as if the\n` +
          `  directive were absent.\n` +
          `  Use ../node_modules/... when the app owns its node_modules and\n` +
          `  ../../node_modules/... when npm hoisted them to a workspace root.`,
      },
    );
  } else if (isBrandPackageRoot(resolved)) {
    report(
      args.css,
      'source-too-broad',
      'the @source glob is rooted at the package, not src/.',
      {
        detail:
          `  Tailwind still auto-detects beside @source, so a package-root glob scans\n` +
          `  README.md and DESIGN.md. Class-shaped prose in those files compiles to\n` +
          `  invalid CSS and next dev 500s.\n` +
          `  Use SOURCE_GLOB: @source '../${SOURCE_GLOB}';`,
      },
    );
  }
}

if (args.nextConfig) {
  const config = maskComments(read(args.nextConfig, 'next config'));
  const transpile = config.match(/transpilePackages\s*:\s*\[([^\]]*)\]/);
  if (!transpile || !transpile[1].includes(PACKAGE)) {
    report(
      args.nextConfig,
      'transpile-packages',
      `transpilePackages does not list ${PACKAGE}.`,
      {
        detail:
          `  The package ships raw .tsx; without this Next will not compile it.\n` +
          `  Add: transpilePackages: ['${PACKAGE}'],`,
      },
    );
  }
} else {
  const config = maskComments(read(args.viteConfig, 'vite config'));
  if (importsComponent && !viteTailwindPluginCalled(config)) {
    report(
      args.viteConfig,
      'vite-tailwind-plugin',
      `does not import @tailwindcss/vite under a binding that is then called.`,
      {
        detail:
          `  Without the plugin no utility class compiles, so brand components render\n` +
          `  unstyled on a build that otherwise passes.\n` +
          `  Import @tailwindcss/vite and add its return value to plugins.`,
      },
    );
  }
}

// An empty parse is a broken package, not a clean consumer. With nothing
// declared every --ow-* name a consumer writes would be accepted, so a source
// tree that happens to reference none would pass while asserting nothing at
// all. src/verify.mjs fails the same way for the same reason — the two share
// this parse, and either of them treating an empty result as "no expectations"
// would go green on every build from here on. The source scan is skipped
// rather than run against the empty set: every reference in the tree would be
// reported undeclared, naming a fault that is not the consumer's.
if (declared.size === 0) {
  report(
    `${PACKAGE}/tokens.css`,
    'tokens-unparsed',
    'no --ow-* declaration remains to derive from.',
    {
      detail:
        `  The parse reads a name only where it opens a line, so this is either a\n` +
        `  reformatted stylesheet — declarations folded onto one line, or moved inside\n` +
        `  an @theme block — or a renamed prefix. Either way there is no list left to\n` +
        `  check your source against, so the --ow-* scan was skipped rather than run\n` +
        `  against nothing.\n` +
        `  This is a fault in the installed ${PACKAGE}, not in your configuration:\n` +
        `  fix declaredTokens in src/internal/derive.mjs to match the new shape.`,
    },
  );
}

for (const [token, files] of undeclared) {
  // One file stays on the headline; more than one goes to an indented list, so
  // a token used across a dozen files does not produce a dozen near-identical
  // lines saying the same thing about the same token.
  const [first, ...rest] = [...files].map((file) => displayPath(file));
  report(
    first,
    'undeclared-token',
    `references ${token}, which ${PACKAGE}/tokens.css does not declare`,
    {
      detail: rest.map((file) => `  also referenced by ${file}`).join('\n') || undefined,
    },
  );
}

for (const dir of empty) {
  report(dir, 'src-empty', 'no source files matched under this --src root');
}

for (const finding of style) {
  report(finding.file, finding.rule.id, finding.rule.summary, {
    line: finding.line,
    column: finding.column,
  });
}

const configPath = args.nextConfig ?? args.viteConfig;

if (reports.length === 0) {
  console.log(
    `otto-brand-check: ${args.css}, ${configPath}, and ${args.src.length} source tree(s) OK`,
  );
  process.exit(0);
}

let errors = 0;
let warnings = 0;
for (const { severity, text } of reports) {
  if (severity === 'error') errors++;
  else warnings++;
  console.error(text);
}
console.error(`otto-brand-check: ${errors} error(s), ${warnings} warning(s)`);
if (errors > 0) process.exit(1);
console.log(
  `otto-brand-check: ${args.css}, ${configPath}, and ${args.src.length} source tree(s) OK (${warnings} warning(s))`,
);
