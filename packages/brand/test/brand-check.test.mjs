import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const CHECK = fileURLToPath(new URL('../bin/otto-brand-check.mjs', import.meta.url));

const GOOD_CSS = `@import 'tailwindcss';
@import '@otto-nation/brand/tokens.css';
@import '@otto-nation/brand/fonts.css';
@source '../node_modules/@otto-nation/brand/**/*.tsx';
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

function run(dir, { src = join(dir, 'app'), check = CHECK } = {}) {
  try {
    const stdout = execFileSync(
      process.execPath,
      [check, '--css', join(dir, 'app', 'global.css'), '--next-config',
        join(dir, 'next.config.mjs'), '--src', src],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { code: 0, output: stdout };
  } catch (error) {
    return { code: error.status, output: `${error.stdout}${error.stderr}` };
  }
}

// Copies the check script into its own temp bin/ with a reindented copy of the
// real tokens.css alongside it in src/, since the script always resolves
// tokens.css relative to its own file location rather than a --src argument.
function checkWithReindentedTokens(indent) {
  const dir = mkdtempSync(join(tmpdir(), 'brand-check-pkg-'));
  tempDirs.push(dir);
  mkdirSync(join(dir, 'bin'), { recursive: true });
  mkdirSync(join(dir, 'src'), { recursive: true });
  copyFileSync(CHECK, join(dir, 'bin', 'otto-brand-check.mjs'));
  const tokensPath = fileURLToPath(new URL('../src/tokens.css', import.meta.url));
  const reindented = readFileSync(tokensPath, 'utf8')
    .replace(/^ {2}(--ow-[a-z-]+):/gm, `${indent}$1:`);
  writeFileSync(join(dir, 'src', 'tokens.css'), reindented);
  return join(dir, 'bin', 'otto-brand-check.mjs');
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
    css: GOOD_CSS.replace('@otto-nation/brand/**/*.tsx', 'other-package/**/*.tsx'),
  }));
  assert.equal(code, 1);
  assert.match(output, /@source/);
});

test('an @source whose depth does not resolve fails', () => {
  const { code, output } = run(fixture({
    css: GOOD_CSS.replace(
      "'../node_modules/@otto-nation/brand/**/*.tsx'",
      "'../../../../nowhere/node_modules/@otto-nation/brand/**/*.tsx'",
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
      "'../node_modules/@otto-nation/brand/**/*.tsx'",
      "'../node_modules/@otto-nation/brand/**/deep/*.tsx'",
    ),
  });
  mkdirSync(join(dir, 'node_modules', '@otto-nation', 'brand', 'src', 'deep'), { recursive: true });
  assert.equal(run(dir).code, 0);
});

test('a bare-directory @source that does resolve is accepted', () => {
  const { code } = run(fixture({
    css: GOOD_CSS.replace(
      "'../node_modules/@otto-nation/brand/**/*.tsx'",
      "'../node_modules/@otto-nation/brand/src'",
    ),
  }));
  assert.equal(code, 0);
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
