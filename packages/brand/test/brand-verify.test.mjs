import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

import { declaredTokens, fontStems, packageOnlyDeclaration, verifyExport } from '../src/verify.mjs';

const VERIFY_CLI = fileURLToPath(new URL('../bin/otto-brand-verify.mjs', import.meta.url));
const source = (target) => readFileSync(new URL(target, import.meta.url), 'utf8');

// The fixtures below are built from the same package sources the verifier
// derives from, never from a second copy of the strings. A test that hardcoded
// `--ow-canvas` or `letter-spacing:.15em` would go green against a verifier
// that had stopped deriving anything, which is the failure this whole change
// exists to remove.
const TOKENS = [...declaredTokens(source('../src/tokens.css'))];
const DECLARATION = packageOnlyDeclaration(source('../src/primitives/eyebrow.tsx'));
const STEMS = fontStems(source('../src/fonts.css'));
const CONTROL = 'py-7';

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

function goodCss() {
  return [
    `:root{${TOKENS.map((name) => `${name}:#000`).join(';')}}`,
    `.eyebrow{${DECLARATION}}`,
    `.${CONTROL}{padding-block:1.75rem}`,
  ].join('\n');
}

// A static export as Turbopack lays one out: content-hashed CSS under
// _next/static/chunks/ and content-hashed woff2 under _next/static/media/.
// `media: null` omits the directory entirely rather than emptying it.
function exportFixture(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'brand-verify-'));
  tempDirs.push(dir);
  const out = join(dir, 'out');
  const staticDir = join(out, '_next', 'static');
  mkdirSync(join(staticDir, 'chunks'), { recursive: true });
  if (overrides.css !== null) {
    writeFileSync(join(staticDir, 'chunks', 'a1b2c3.css'), overrides.css ?? goodCss());
  }
  const media = 'media' in overrides ? overrides.media : STEMS.map((stem) => `${stem}.h4sh.woff2`);
  if (media !== null) {
    mkdirSync(join(staticDir, 'media'), { recursive: true });
    for (const name of media) writeFileSync(join(staticDir, 'media', name), '');
  }
  return out;
}

// A copy of the verifier with its evidence sources swapped, so a test can ask
// what happens when eyebrow.tsx or fonts.css stops carrying what the derivation
// reads. The verifier resolves those relative to its own file, so relocating it
// is the only way to vary them.
async function verifierWithSources(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'brand-verify-pkg-'));
  tempDirs.push(dir);
  mkdirSync(join(dir, 'src', 'primitives'), { recursive: true });
  copyFileSync(fileURLToPath(new URL('../src/verify.mjs', import.meta.url)), join(dir, 'src', 'verify.mjs'));
  writeFileSync(join(dir, 'src', 'tokens.css'), overrides.tokens ?? source('../src/tokens.css'));
  writeFileSync(join(dir, 'src', 'fonts.css'), overrides.fonts ?? source('../src/fonts.css'));
  writeFileSync(
    join(dir, 'src', 'primitives', 'eyebrow.tsx'),
    overrides.eyebrow ?? source('../src/primitives/eyebrow.tsx'),
  );
  return import(pathToFileURL(join(dir, 'src', 'verify.mjs')).href);
}

function runCli(argv) {
  try {
    const stdout = execFileSync(process.execPath, [VERIFY_CLI, ...argv], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, output: stdout };
  } catch (error) {
    return { code: error.status, output: `${error.stdout}${error.stderr}` };
  }
}

test('the derivations read the real package source', () => {
  assert.ok(TOKENS.includes('--ow-canvas'), 'tokens.css parse found no --ow-canvas');
  assert.ok(TOKENS.length > 10, 'tokens.css parse produced an implausibly short list');
  assert.equal(DECLARATION, 'letter-spacing:.15em');
  assert.deepEqual([...STEMS].sort(), ['LeagueMonoVariable', 'LeagueSpartanVariable']);
});

// The leading-zero strip is the one assumption in the derivation, so it is
// asserted on its own rather than only through eyebrow.tsx's current value.
test('the tracking value loses a leading zero and nothing else', () => {
  assert.equal(packageOnlyDeclaration('tracking-[0.15em]'), 'letter-spacing:.15em');
  assert.equal(packageOnlyDeclaration('tracking-[1.5px]'), 'letter-spacing:1.5px');
  assert.equal(packageOnlyDeclaration('tracking-[0.5rem]'), 'letter-spacing:.5rem');
});

test('a complete export passes every check', () => {
  const result = verifyExport({ out: exportFixture(), control: CONTROL });
  assert.ok(result.ok, result.failures.join('\n'));
  assert.deepEqual(result.failures, []);
  for (const name of ['tokens', 'utility', 'fonts', 'control']) {
    assert.equal(result[name].ok, true, `${name} should have passed`);
  }
});

test('a missing token is named, and only that token', () => {
  const result = verifyExport({
    out: exportFixture({ css: goodCss().replace('--ow-rosa:#000;', '') }),
    control: CONTROL,
  });
  assert.equal(result.ok, false);
  assert.equal(result.tokens.ok, false);
  assert.match(result.tokens.failure, /--ow-rosa/);
  assert.doesNotMatch(result.tokens.failure, /--ow-canvas/);
  assert.equal(result.utility.ok, true);
  assert.equal(result.control.ok, true);
});

test('a stylesheet without the package-only declaration fails the utility check', () => {
  const result = verifyExport({
    out: exportFixture({ css: goodCss().replace(DECLARATION, 'letter-spacing:normal') }),
    control: CONTROL,
  });
  assert.equal(result.ok, false);
  assert.equal(result.utility.ok, false);
  assert.match(result.utility.failure, /@source/);
  assert.equal(result.control.ok, true, 'the control still proves CSS was emitted');
});

// The control exists precisely so an empty scan cannot pass for a working one.
test('an export with no CSS at all fails the control first', () => {
  const result = verifyExport({ out: exportFixture({ css: null }), control: CONTROL });
  assert.equal(result.ok, false);
  assert.equal(result.control.ok, false);
  assert.equal(result.failures[0], result.control.failure);
  assert.match(result.control.failure, /no\s+information/);
});

test('a control the consumer never used fails even when the package arrived', () => {
  const result = verifyExport({ out: exportFixture(), control: 'never-used-here' });
  assert.equal(result.ok, false);
  assert.equal(result.control.ok, false);
  assert.equal(result.tokens.ok, true);
  assert.equal(result.utility.ok, true);
});

test('a missing media directory names the path and the cause', () => {
  const result = verifyExport({ out: exportFixture({ media: null }), control: CONTROL });
  assert.equal(result.ok, false);
  assert.equal(result.fonts.ok, false);
  assert.match(result.fonts.failure, /_next\/static\/media/);
  assert.match(result.fonts.failure, /fallback stack/);
});

test('one emitted face and one missing face names only the missing one', () => {
  const result = verifyExport({
    out: exportFixture({ media: ['LeagueMonoVariable.h4sh.woff2'] }),
    control: CONTROL,
  });
  assert.equal(result.ok, false);
  assert.match(result.fonts.failure, /LeagueSpartanVariable/);
  assert.doesNotMatch(result.fonts.failure, /LeagueMonoVariable/);
});

test('a content-hashed woff2 filename still matches its stem', () => {
  const result = verifyExport({
    out: exportFixture({ media: STEMS.map((stem) => `${stem}.11kb5ckq3-_9c.woff2`) }),
    control: CONTROL,
  });
  assert.equal(result.fonts.ok, true, result.fonts.failure);
});

test('an out directory that does not exist throws a diagnostic, not an ENOENT', () => {
  assert.throws(
    () => verifyExport({ out: join(tmpdir(), 'brand-verify-nowhere'), control: CONTROL }),
    (error) => {
      assert.match(error.message, /static export not found/);
      assert.match(error.message, /brand-verify-nowhere/);
      assert.doesNotMatch(error.message, /ENOENT/);
      return true;
    },
  );
});

test('a missing control argument throws rather than silently skipping the control', () => {
  assert.throws(() => verifyExport({ out: exportFixture() }), /control utility is required/);
});

// If eyebrow.tsx stops carrying the class, the check has no evidence left. It
// has to go red: a silent skip leaves the suite green while asserting nothing
// about whether @source reached the package.
test('an eyebrow.tsx with no tracking class fails loudly instead of skipping', async () => {
  const { verifyExport: relocated } = await verifierWithSources({
    eyebrow: 'export function Eyebrow() { return null; }\n',
  });
  const result = relocated({ out: exportFixture(), control: CONTROL });
  assert.equal(result.ok, false);
  assert.equal(result.utility.ok, false);
  assert.match(result.utility.failure, /no tracking-\[…\] class remains/);
  assert.match(result.utility.failure, /evidence/);
  assert.equal(result.control.ok, true, 'the export itself was fine; the evidence source was not');
});

test('a fonts.css with no woff2 url fails loudly instead of skipping', async () => {
  const { verifyExport: relocated } = await verifierWithSources({
    fonts: ':root { --font-display: system-ui; }\n',
  });
  const result = relocated({ out: exportFixture(), control: CONTROL });
  assert.equal(result.fonts.ok, false);
  assert.match(result.fonts.failure, /no url\('\.\/fonts\/\*\.woff2'\) remains/);
});

// A token added to tokens.css has to become a new expectation with no edit
// here, which is the whole reason the list is derived rather than written down.
test('a token added to tokens.css becomes a new expectation on its own', async () => {
  const { verifyExport: relocated } = await verifierWithSources({
    tokens: `${source('../src/tokens.css')}\n:root {\n  --ow-invented: #123456;\n}\n`,
  });
  const result = relocated({ out: exportFixture(), control: CONTROL });
  assert.equal(result.tokens.ok, false);
  assert.match(result.tokens.failure, /--ow-invented/);
});

test('the CLI exits 0 with a one-line summary on a good export', () => {
  const { code, output } = runCli(['--out', exportFixture(), '--control', CONTROL]);
  assert.equal(code, 0);
  assert.equal(output.trim().split('\n').length, 1);
  assert.match(output, /^otto-brand-verify: /);
});

test('the CLI exits 1 and names the failing check', () => {
  const { code, output } = runCli([
    '--out', exportFixture({ media: null }), '--control', CONTROL,
  ]);
  assert.equal(code, 1);
  assert.match(output, /1 problem\(s\)/);
  assert.match(output, /_next\/static\/media/);
});

test('the CLI exits 2 when a required flag is absent', () => {
  const withoutControl = runCli(['--out', exportFixture()]);
  assert.equal(withoutControl.code, 2);
  assert.match(withoutControl.output, /--out and --control are both required/);
  assert.equal(runCli(['--control', CONTROL]).code, 2);
});

test('the CLI exits 2 on an argument it does not recognise', () => {
  const { code, output } = runCli(['--out', exportFixture(), '--control', CONTROL, 'stray']);
  assert.equal(code, 2);
  assert.match(output, /unexpected argument: stray/);
});

// A missing out/ is a well-formed invocation against a build that did not run,
// so it exits like a failed check rather than a usage error.
test('the CLI exits 1, not 2, when the export directory is absent', () => {
  const { code, output } = runCli([
    '--out', join(tmpdir(), 'brand-verify-nowhere'), '--control', CONTROL,
  ]);
  assert.equal(code, 1);
  assert.match(output, /static export not found/);
  assert.doesNotMatch(output, /ENOENT/);
});
