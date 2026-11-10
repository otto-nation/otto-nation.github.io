import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { OW_TOKEN, SOURCE_GLOB } from '../src/internal/derive.mjs';

const CHECK = fileURLToPath(new URL('../bin/otto-brand-check.mjs', import.meta.url));

const GOOD_SOURCE = `'../${SOURCE_GLOB}'`;
const GOOD_CSS = `@import 'tailwindcss';
@import '@otto-nation/brand/tokens.css';
@import '@otto-nation/brand/fonts.css';
@source ${GOOD_SOURCE};
`;
const GOOD_CONFIG = `export default { transpilePackages: ['@otto-nation/brand'] };\n`;
const UNDECLARED_TOKEN = '--ow-nonesuch';

// Every fixture and reindented-check directory is tracked here and swept on
// exit, since the two factories below are called from nearly every test and
// threading a per-test handle through each of them would outweigh the sweep.
const tempDirs = [];
process.on('exit', () => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup: a stray failure here must not flip the exit code.
    }
  }
});

// A fixture consumer. Overrides replace the default file bodies so each test
// breaks exactly one rule. The installed package directory is real, because
// the @source check resolves the glob's literal prefix against the CSS file.
function fixture(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'brand-check-'));
  tempDirs.push(dir);
  mkdirSync(join(dir, 'app'), { recursive: true });
  mkdirSync(join(dir, 'node_modules', '@otto-nation', 'brand', 'src'), { recursive: true });
  writeFileSync(join(dir, 'app', 'global.css'), overrides.css ?? GOOD_CSS);
  writeFileSync(join(dir, 'next.config.mjs'), overrides.config ?? GOOD_CONFIG);
  writeFileSync(
    join(dir, 'app', 'page.tsx'),
    overrides.page ?? `export default () => <p className="text-[var(--ow-ink)]" />;\n`,
  );
  return dir;
}

function run(dir, { src = join(dir, 'app'), check = CHECK, extra = [] } = {}) {
  const result = spawnSync(
    process.execPath,
    [check, '--css', join(dir, 'app', 'global.css'), '--next-config',
      join(dir, 'next.config.mjs'), '--src', src, ...extra],
    { encoding: 'utf8' },
  );
  assert.ifError(result.error);
  return { code: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

// Copies the check script into its own temp bin/ with the given tokens.css
// alongside it in src/, since the script always resolves tokens.css relative to
// its own file location rather than a --src argument. The whole of src/internal/
// comes along because the script imports derive, style-rules, and source-files;
// copying only derive.mjs fails with ERR_MODULE_NOT_FOUND.
function checkWithTokens(tokensCss) {
  const dir = mkdtempSync(join(tmpdir(), 'brand-check-pkg-'));
  tempDirs.push(dir);
  mkdirSync(join(dir, 'bin'), { recursive: true });
  cpSync(CHECK, join(dir, 'bin', 'otto-brand-check.mjs'));
  cpSync(
    fileURLToPath(new URL('../src/internal', import.meta.url)),
    join(dir, 'src', 'internal'),
    { recursive: true },
  );
  writeFileSync(join(dir, 'src', 'tokens.css'), tokensCss);
  return join(dir, 'bin', 'otto-brand-check.mjs');
}

function checkWithReindentedTokens(indent) {
  const tokensPath = fileURLToPath(new URL('../src/tokens.css', import.meta.url));
  return checkWithTokens(
    readFileSync(tokensPath, 'utf8').replace(new RegExp(`^ {2}(${OW_TOKEN}):`, 'gm'), `${indent}$1:`),
  );
}

test('a correctly configured consumer passes', () => {
  assert.equal(run(fixture()).code, 0);
});

test('a missing @source fails', () => {
  const { code, output } = run(fixture({ css: `@import 'tailwindcss';\n@import '@otto-nation/brand/tokens.css';\n` }));
  assert.equal(code, 1);
  assert.match(output, /@source/);
});

test('an @source pointing somewhere else fails', () => {
  const { code, output } = run(fixture({
    css: GOOD_CSS.replace('@otto-nation/brand/src/**/*.tsx', 'other-package/src/**/*.tsx'),
  }));
  assert.equal(code, 1);
  assert.match(output, /@source/);
});

test('an @source whose depth does not resolve fails', () => {
  const { code, output } = run(fixture({
    css: GOOD_CSS.replace(
      GOOD_SOURCE,
      `'../../../../nowhere/${SOURCE_GLOB}'`,
    ),
  }));
  assert.equal(code, 1);
  assert.match(output, /does not exist/);
  assert.match(output, /nowhere/);
});

// `/**/` is also a valid empty CSS comment, so the comment stripper has to
// leave a glob's inner ** alone or the resolved prefix names a directory the
// consumer never wrote.
test('an @source with a ** segment mid-path still resolves', () => {
  const dir = fixture({
    css: GOOD_CSS.replace(
      GOOD_SOURCE,
      `'../node_modules/@otto-nation/brand/src/**/deep/*.tsx'`,
    ),
  });
  mkdirSync(join(dir, 'node_modules', '@otto-nation', 'brand', 'src', 'deep'), { recursive: true });
  assert.equal(run(dir).code, 0);
});

test('a bare-directory @source that does resolve is accepted', () => {
  const { code } = run(fixture({
    css: GOOD_CSS.replace(
      GOOD_SOURCE,
      "'../node_modules/@otto-nation/brand/src'",
    ),
  }));
  assert.equal(code, 0);
});

test('a package-root @source glob warns and --strict fails', () => {
  const dir = fixture({
    css: GOOD_CSS.replace(
      GOOD_SOURCE,
      "'../node_modules/@otto-nation/brand/**/*.tsx'",
    ),
  });
  const warned = run(dir);
  assert.equal(warned.code, 0);
  assert.match(warned.output, /warning source-too-broad:/);
  assert.match(warned.output, /SOURCE_GLOB/);
  const strict = run(dir, { extra: ['--strict'] });
  assert.equal(strict.code, 1);
  assert.match(strict.output, /error source-too-broad:/);
});

test('the src @source glob does not warn source-too-broad', () => {
  const { code, output } = run(fixture());
  assert.equal(code, 0);
  assert.doesNotMatch(output, /source-too-broad/);
});

test('a missing tokens.css import fails', () => {
  const { code, output } = run(fixture({
    css: GOOD_CSS.replace("@import '@otto-nation/brand/tokens.css';\n", ''),
  }));
  assert.equal(code, 1);
  assert.match(output, /tokens\.css/);
});

test('a missing fonts.css import fails', () => {
  const { code, output } = run(fixture({
    css: GOOD_CSS.replace("@import '@otto-nation/brand/fonts.css';\n", ''),
  }));
  assert.equal(code, 1);
  assert.match(output, /fonts\.css/);
});

test('a commented-out tokens.css import does not count', () => {
  const { code, output } = run(fixture({
    css: GOOD_CSS.replace(
      "@import '@otto-nation/brand/tokens.css';",
      "/* @import '@otto-nation/brand/tokens.css'; */",
    ),
  }));
  assert.equal(code, 1);
  assert.match(output, /tokens\.css/);
});

test('a missing transpilePackages fails', () => {
  const { code, output } = run(fixture({ config: 'export default { output: "export" };\n' }));
  assert.equal(code, 1);
  assert.match(output, /transpilePackages/);
});

test('a transpilePackages listing other packages but not this one fails', () => {
  const { code } = run(fixture({ config: `export default { transpilePackages: ['other'] };\n` }));
  assert.equal(code, 1);
});

test('an undeclared --ow-* token fails', () => {
  const { code, output } = run(fixture({
    page: `export default () => <p className="text-[var(${UNDECLARED_TOKEN})]" />;\n`,
  }));
  assert.equal(code, 1);
  assert.match(output, new RegExp(UNDECLARED_TOKEN));
});

// Digit names have to be scanned whole. A [a-z-]+ class truncates
// --ow-space-1 to --ow-space- and reports that truncated name undeclared.
test('a consumer referencing --ow-space-1 is accepted when it is declared', () => {
  const check = checkWithTokens(':root {\n  --ow-space-1: 4px;\n}\n');
  const { code } = run(
    fixture({
      page: 'export default () => <p className="p-[var(--ow-space-1)]" />;\n',
    }),
    { check },
  );
  assert.equal(code, 0);
});

// One pass has to name every offender. Reporting only the last file scanned
// turns one report into a round of whack-a-mole: the developer fixes what was
// named, re-runs, and gets a failure that was there all along.
test('every file referencing the same undeclared token is reported', () => {
  const dir = fixture({
    page: `export default () => <p className="text-[var(${UNDECLARED_TOKEN})]" />;\n`,
  });
  writeFileSync(
    join(dir, 'app', 'other.tsx'),
    `export const Other = () => <p className="bg-[var(${UNDECLARED_TOKEN})]" />;\n`,
  );
  const { code, output } = run(dir);
  assert.equal(code, 1);
  assert.match(output, new RegExp(UNDECLARED_TOKEN));
  assert.match(output, /page\.tsx/);
  assert.match(output, /other\.tsx/);
});

test('a commented-out @source does not count', () => {
  const { code } = run(fixture({
    css: `@import 'tailwindcss';\n/* @source '../node_modules/@otto-nation/brand/src/*.tsx'; */\n`,
  }));
  assert.equal(code, 1);
});

test('a four-space indented tokens.css still resolves --ow-* declarations', () => {
  const check = checkWithReindentedTokens('    ');
  const { code } = run(fixture(), { check });
  assert.equal(code, 0);
});

// An empty parse is a broken package, not a clean consumer: with nothing
// declared, nothing can be undeclared, so a source tree that happens to
// reference no --ow-* name would pass while the check asserted nothing at all.
// src/verify.mjs guards the same shared parse the same way — this is the guard
// on the other entry point, not a second copy of it.
test('a tokens.css that parses to zero --ow-* names fails instead of passing', () => {
  const check = checkWithTokens('');
  const { code, output } = run(
    fixture({ page: `export default () => <p className="text-sm" />;\n` }),
    { check },
  );
  assert.equal(code, 1);
  assert.match(output, /no --ow-\* declaration remains/);
});

// The same empty parse arrives from a reformat rather than an empty file: these
// declarations are real, they have just stopped opening a line. The consumer's
// own references must not be blamed for it — reporting every --ow-* name in
// their tree as undeclared names a fault that is not theirs.
test('a reformatted tokens.css blames the package, not the consumer references', () => {
  const check = checkWithTokens('@theme{--ow-canvas:#fff;--ow-ink:#000}\n');
  const { code, output } = run(fixture(), { check });
  assert.equal(code, 1);
  assert.match(output, /no --ow-\* declaration remains/);
  assert.doesNotMatch(output, /references --ow-ink/);
});

test('a --src directory that does not exist produces a clean message, not a crash', () => {
  const dir = fixture();
  const { code, output } = run(dir, { src: join(dir, 'does-not-exist') });
  assert.equal(code, 1);
  assert.match(output, /^otto-brand-check: cannot read/m);
});

test('a commented-out --ow-* token reference does not fail the build', () => {
  const { code } = run(fixture({
    page: `// export default () => <p className="text-[var(${UNDECLARED_TOKEN})]" />;\n`,
  }));
  assert.equal(code, 0);
});

test('an undeclared --ow-* token in an .mdx file is caught', () => {
  const dir = fixture();
  writeFileSync(join(dir, 'app', 'page.mdx'), `Uses \`var(${UNDECLARED_TOKEN})\` inline.\n`);
  const { code, output } = run(dir);
  assert.equal(code, 1);
  assert.match(output, new RegExp(UNDECLARED_TOKEN));
});

test('a --ow-* reference inside an MDX HTML comment does not fail the build', () => {
  const dir = fixture();
  writeFileSync(
    join(dir, 'app', 'page.mdx'),
    `<!-- uses var(${UNDECLARED_TOKEN}) -->\n`,
  );
  const { code } = run(dir);
  assert.equal(code, 0);
});

const STYLE_SNIPPETS = [
  ['literal-color', 'export default () => <p className="bg-[#18160f]" />;'],
  ['palette-color', 'export default () => <p className="bg-red-500" />;'],
  ['pill-radius', 'export default () => <p className="rounded-full" />;'],
  ['hover-border', 'export default () => <p className="hover:border-ink" />;'],
  ['outline-removed', 'export default () => <p className="outline-none" />;'],
  ['token-redefined', 'el.setProperty("--ow-ink", "red");'],
];

for (const [id, page] of STYLE_SNIPPETS) {
  test(`style rule ${id} warns and exits 0 by default`, () => {
    const { code, output } = run(fixture({ page: `${page}\n` }));
    assert.equal(code, 0);
    assert.match(output, new RegExp(`page\\.tsx:1:\\d+: warning ${id}:`));
  });
}

test('--strict turns a style warning into an error', () => {
  const { code, output } = run(
    fixture({ page: 'export default () => <p className="rounded-full" />;\n' }),
    { extra: ['--strict'] },
  );
  assert.equal(code, 1);
  assert.match(output, /page\.tsx:1:\d+: error pill-radius:/);
});

test('--error escalates one rule and leaves another as a warning', () => {
  const { code, output } = run(
    fixture({
      page: 'export default () => <p className="rounded-full hover:border-ink" />;\n',
    }),
    { extra: ['--error', 'pill-radius'] },
  );
  assert.equal(code, 1);
  assert.match(output, /page\.tsx:1:\d+: error pill-radius:/);
  assert.match(output, /page\.tsx:1:\d+: warning hover-border:/);
});

test('--error with an unknown id exits 2', () => {
  const { code, output } = run(fixture(), { extra: ['--error', 'nonesuch'] });
  assert.equal(code, 2);
  assert.match(output, /unknown --error id: nonesuch/);
});

test('otto-brand-ignore with a reason suppresses the finding', () => {
  const { code, output } = run(fixture({
    page:
      'export default () => <p className="rounded-full" />; // otto-brand-ignore: pill-radius — avatar is a circle\n',
  }));
  assert.equal(code, 0);
  assert.doesNotMatch(output, /pill-radius/);
});

test('otto-brand-ignore without a reason is an error and suppresses nothing', () => {
  const { code, output } = run(fixture({
    page:
      '// otto-brand-ignore: pill-radius\nexport default () => <p className="rounded-full" />;\n',
  }));
  assert.equal(code, 1);
  assert.match(output, /error ignore-reason:/);
  assert.match(output, /warning pill-radius:/);
});

test('a violating tree invoked without new flags still exits 0', () => {
  const { code, output } = run(fixture({
    page:
      'export default () => <p className="rounded-full hover:border-ink outline-none bg-[#18160f]" />;\n',
  }));
  assert.equal(code, 0);
  assert.match(output, /warning pill-radius:/);
  assert.match(output, /warning hover-border:/);
});

test('a violation three directories deep is reported', () => {
  const dir = fixture();
  const deep = join(dir, 'app', 'a', 'b', 'c');
  mkdirSync(deep, { recursive: true });
  writeFileSync(
    join(deep, 'deep.tsx'),
    'export default () => <p className="rounded-full" />;\n',
  );
  const { code, output } = run(dir);
  assert.equal(code, 0);
  assert.match(output, /deep\.tsx:\d+:\d+: warning pill-radius:/);
});

test('a gitignored file is not reported', () => {
  const dir = fixture();
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  writeFileSync(join(dir, '.gitignore'), 'dist/\n');
  mkdirSync(join(dir, 'app', 'dist'));
  writeFileSync(
    join(dir, 'app', 'dist', 'x.js'),
    'export const x = "rounded-full";\n',
  );
  const { code, output } = run(dir);
  assert.equal(code, 0);
  assert.doesNotMatch(output, /pill-radius/);
  assert.doesNotMatch(output, /dist\/x\.js/);
});

test('a violation after a block comment reports the original line', () => {
  const { code, output } = run(fixture({
    page: '/*\n \n */\n\nexport default () => <p className="rounded-full" />;\n',
  }));
  assert.equal(code, 0);
  assert.match(output, /page\.tsx:5:\d+: warning pill-radius:/);
});

test('src-empty warns by default and errors under --strict', () => {
  const dir = fixture();
  const empty = join(dir, 'empty');
  mkdirSync(empty);
  const warned = run(dir, { src: empty });
  assert.equal(warned.code, 0);
  assert.match(warned.output, /warning src-empty:/);
  const strict = run(dir, { src: empty, extra: ['--strict'] });
  assert.equal(strict.code, 1);
  assert.match(strict.output, /error src-empty:/);
});

const VITE_CSS = `@import 'tailwindcss';
@import '@otto-nation/brand/tokens.css';
@import '@otto-nation/brand/fonts.css';
`;
const VITE_CSS_WITH_SOURCE = `${VITE_CSS}@source '../../${SOURCE_GLOB}';
`;
const VITE_CONFIG = `import tailwindcss from '@tailwindcss/vite';
export default { plugins: [tailwindcss()] };
`;
const VITE_PAGE = `export default () => <p className="text-[var(--ow-ink)]" />;
`;
const VITE_PAGE_COMPONENT =
  "import { Button } from '@otto-nation/brand';\nexport default () => <Button />;\n";

function viteFixture(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'brand-check-vite-'));
  tempDirs.push(dir);
  mkdirSync(join(dir, 'src', 'styles'), { recursive: true });
  mkdirSync(join(dir, 'node_modules', '@otto-nation', 'brand', 'src'), { recursive: true });
  writeFileSync(join(dir, 'src', 'styles', 'index.css'), overrides.css ?? VITE_CSS);
  writeFileSync(join(dir, 'vite.config.ts'), overrides.config ?? VITE_CONFIG);
  writeFileSync(join(dir, 'src', 'main.tsx'), overrides.page ?? VITE_PAGE);
  return dir;
}

function runVite(dir, { src = join(dir, 'src'), extra = [], check = CHECK } = {}) {
  const result = spawnSync(
    process.execPath,
    [
      check,
      '--css', join(dir, 'src', 'styles', 'index.css'),
      '--vite-config', join(dir, 'vite.config.ts'),
      '--src', src,
      ...extra,
    ],
    { encoding: 'utf8' },
  );
  assert.ifError(result.error);
  return { code: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

test('a CSS-only Vite consumer with no @source passes', () => {
  assert.equal(runVite(viteFixture()).code, 0);
});

test('a Vite consumer that imports a brand component without @source fails', () => {
  const { code, output } = runVite(viteFixture({ page: VITE_PAGE_COMPONENT }));
  assert.equal(code, 1);
  assert.match(output, /error source-missing:/);
});

test('a Vite consumer that imports a brand component without @tailwindcss/vite fails', () => {
  const { code, output } = runVite(viteFixture({
    css: VITE_CSS_WITH_SOURCE,
    page: VITE_PAGE_COMPONENT,
    config: 'export default { plugins: [] };\n',
  }));
  assert.equal(code, 1);
  assert.match(output, /error vite-tailwind-plugin:/);
  assert.doesNotMatch(output, /source-missing/);
  assert.doesNotMatch(output, /transpilePackages/);
});

test('passing both --next-config and --vite-config exits 2', () => {
  const dir = fixture();
  const result = spawnSync(
    process.execPath,
    [
      CHECK,
      '--css', join(dir, 'app', 'global.css'),
      '--next-config', join(dir, 'next.config.mjs'),
      '--vite-config', join(dir, 'vite.config.ts'),
      '--src', join(dir, 'app'),
    ],
    { encoding: 'utf8' },
  );
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  assert.equal(result.status, 2);
  assert.match(output, /exactly one of --next-config or --vite-config is required/);
});

test('passing neither --next-config nor --vite-config exits 2', () => {
  const dir = fixture();
  const result = spawnSync(
    process.execPath,
    [CHECK, '--css', join(dir, 'app', 'global.css'), '--src', join(dir, 'app')],
    { encoding: 'utf8' },
  );
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  assert.equal(result.status, 2);
  assert.match(output, /exactly one of --next-config or --vite-config is required/);
});
