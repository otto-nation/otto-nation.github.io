import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const CHECK = fileURLToPath(new URL('../bin/otto-brand-check.mjs', import.meta.url));

const GOOD_CSS = `@import 'tailwindcss';
@import '@otto-nation/brand/tokens.css';
@source '../node_modules/@otto-nation/brand/**/*.tsx';
`;
const GOOD_CONFIG = `export default { transpilePackages: ['@otto-nation/brand'] };\n`;

// A fixture consumer. Overrides replace the default file bodies so each test
// breaks exactly one rule.
function fixture(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'brand-check-'));
  mkdirSync(join(dir, 'app'), { recursive: true });
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
    page: `export default () => <p className="text-[var(--ow-nonesuch)]" />;\n`,
  }));
  assert.equal(code, 1);
  assert.match(output, /--ow-nonesuch/);
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
    page: `// export default () => <p className="text-[var(--ow-nonesuch)]" />;\n`,
  }));
  assert.equal(code, 0);
});

test('an undeclared --ow-* token in an .mdx file is caught', () => {
  const dir = fixture();
  writeFileSync(join(dir, 'app', 'page.mdx'), 'Uses `var(--ow-nonesuch)` inline.\n');
  const { code, output } = run(dir);
  assert.equal(code, 1);
  assert.match(output, /--ow-nonesuch/);
});

test('a --ow-* reference inside an MDX HTML comment does not fail the build', () => {
  const dir = fixture();
  writeFileSync(
    join(dir, 'app', 'page.mdx'),
    '<!-- uses var(--ow-nonesuch) -->\n',
  );
  const { code } = run(dir);
  assert.equal(code, 0);
});
