import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
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

function run(dir) {
  try {
    const stdout = execFileSync(
      process.execPath,
      [CHECK, '--css', join(dir, 'app', 'global.css'), '--next-config',
        join(dir, 'next.config.mjs'), '--src', join(dir, 'app')],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { code: 0, output: stdout };
  } catch (error) {
    return { code: error.status, output: `${error.stdout}${error.stderr}` };
  }
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
    css: GOOD_CSS.replace('node_modules/@otto-nation/brand', 'node_modules/./components'),
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
