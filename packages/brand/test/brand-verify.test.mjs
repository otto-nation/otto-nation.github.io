import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

import { verifyExport } from '../src/verify.mjs';
// Reached by relative path, not through the exports map: these parses are
// internal on purpose, so the tests get at them the one way a consumer cannot.
import {
  declaredTokens, fontStems, minifyLength, trackingValue,
} from '../src/internal/derive.mjs';

const VERIFY_CLI = fileURLToPath(new URL('../bin/otto-brand-verify.mjs', import.meta.url));
const source = (target) => readFileSync(new URL(target, import.meta.url), 'utf8');

// The fixtures below are built from the same package sources the verifier
// derives from, never from a second copy of the strings. A test that hardcoded
// `--ow-canvas` or `letter-spacing:.15em` would go green against a verifier
// that had stopped deriving anything, which is the failure this whole change
// exists to remove.
const TOKENS = [...declaredTokens(source('../src/tokens.css'))];
const TRACKING = trackingValue(source('../src/primitives/eyebrow.tsx'));
const DECLARATION = `letter-spacing:${minifyLength(TRACKING)}`;
const STEMS = fontStems(source('../src/fonts.css'));
const CONTROL = 'py-7';
// A path no fixture ever creates, for the two tests that ask what an absent
// export directory reports.
const NOWHERE = join(tmpdir(), 'brand-verify-nowhere');

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
// `css: null` emits no stylesheet, `media: null` omits that directory entirely
// rather than emptying it, and `build: null` leaves out/ standing with no
// _next/static/ beneath it, which is what a build that never ran looks like.
function exportFixture(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'brand-verify-'));
  tempDirs.push(dir);
  const out = join(dir, 'out');
  const staticDir = join(out, '_next', 'static');
  if (overrides.build === null) {
    mkdirSync(out, { recursive: true });
    return out;
  }
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
// what happens when tokens.css, eyebrow.tsx, or fonts.css stops carrying what
// the derivation reads. The verifier resolves those relative to its own file,
// so relocating it is the only way to vary them; internal/derive.mjs comes
// along because the relocated copy still has to resolve its own import.
async function verifierWithSources(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'brand-verify-pkg-'));
  tempDirs.push(dir);
  mkdirSync(join(dir, 'src', 'primitives'), { recursive: true });
  mkdirSync(join(dir, 'src', 'internal'), { recursive: true });
  copyFileSync(
    fileURLToPath(new URL('../src/verify.mjs', import.meta.url)),
    join(dir, 'src', 'verify.mjs'),
  );
  copyFileSync(
    fileURLToPath(new URL('../src/internal/derive.mjs', import.meta.url)),
    join(dir, 'src', 'internal', 'derive.mjs'),
  );
  writeFileSync(join(dir, 'src', 'tokens.css'), overrides.tokens ?? source('../src/tokens.css'));
  writeFileSync(join(dir, 'src', 'fonts.css'), overrides.fonts ?? source('../src/fonts.css'));
  writeFileSync(
    join(dir, 'src', 'primitives', 'eyebrow.tsx'),
    overrides.eyebrow ?? source('../src/primitives/eyebrow.tsx'),
  );
  return import(pathToFileURL(join(dir, 'src', 'verify.mjs')).href);
}

// The well-formed argv, with one field varied at a time — the same shape as
// exportFixture above. Only the tests whose subject is the argv itself (a
// missing flag, a repeated one, a stray word) spell it out, since for those the
// literal list is what is being asserted.
function cliArgs(overrides = {}) {
  return [
    '--out', overrides.out ?? exportFixture(),
    '--control', overrides.control ?? CONTROL,
  ];
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
  assert.equal(TRACKING, '0.15em');
  assert.equal(DECLARATION, 'letter-spacing:.15em');
  assert.deepEqual([...STEMS].sort(), ['LeagueMonoVariable', 'LeagueSpartanVariable']);
});

// verifyExport is the public contract from 1.0.0 on and the exports map has no
// wildcard, so any other name exported here would be supported forever by
// accident. The parses stay internal precisely so their shapes can still move.
test('src/verify.mjs exports verifyExport and nothing else', async () => {
  const module = await import('../src/verify.mjs');
  assert.deepEqual(Object.keys(module), ['verifyExport']);
});

// The minifier model is the one place the verifier predicts rather than reads,
// so each normalisation it claims is asserted on its own rather than only
// through eyebrow.tsx's current value.
test('minifyLength applies the three normalisations it models', () => {
  assert.equal(minifyLength('0.15em'), '.15em');
  assert.equal(minifyLength('-0.15em'), '-.15em');
  assert.equal(minifyLength('0.150em'), '.15em');
  assert.equal(minifyLength('-0.150em'), '-.15em');
  assert.equal(minifyLength('1.50em'), '1.5em');
  assert.equal(minifyLength('1.0em'), '1em');
  assert.equal(minifyLength('1.5px'), '1.5px');
  assert.equal(minifyLength('15em'), '15em');
  assert.equal(minifyLength('.15em'), '.15em');
});

// Returning a wrong expectation for a shape it does not model would fail a
// consumer's CI for a fault that is not theirs, so these come back as null and
// the caller reports them as unmodelled.
test('minifyLength refuses the shapes it does not model', () => {
  for (const value of ['0em', '0.0em', '0.15', '0.15EM', 'calc(1em + 1px)', 'var(--x)', 'em']) {
    assert.equal(minifyLength(value), null, `${value} should come back unmodelled`);
  }
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
    () => verifyExport({ out: NOWHERE, control: CONTROL }),
    (error) => {
      assert.match(error.message, /static export not found/);
      assert.match(error.message, /brand-verify-nowhere/);
      assert.doesNotMatch(error.message, /ENOENT/);
      return true;
    },
  );
});

// Four failures, none of which said the build never ran, would send the reader
// after four things that are not wrong: the utility failure advises fixing an
// @source that is fine, and the token failure blames an @import that resolved.
test('an out directory carrying no build output is diagnosed, not mis-blamed', () => {
  assert.throws(
    () => verifyExport({ out: exportFixture({ build: null }), control: CONTROL }),
    (error) => {
      assert.match(error.message, /build output not found/);
      assert.match(error.message, /_next\/static/);
      assert.doesNotMatch(error.message, /@source/);
      assert.doesNotMatch(error.message, /@import/);
      assert.doesNotMatch(error.message, /ENOENT/);
      return true;
    },
  );
});

test('a missing control argument throws rather than silently skipping the control', () => {
  assert.throws(() => verifyExport({ out: exportFixture() }), /control utility is required/);
});

// The three derived checks each guard their own evidence. A derivation that
// comes back empty leaves no expectations, and a check with no expectations
// passes on every build forever — the one outcome a verifier must not produce
// quietly. The tests below are that guarantee, one per evidence source.
test('a tokens.css that parses to zero tokens fails loudly instead of passing', async () => {
  const { verifyExport: relocated } = await verifierWithSources({ tokens: '' });
  const result = relocated({ out: exportFixture(), control: CONTROL });
  assert.equal(result.ok, false, 'an empty token list must not pass vacuously');
  assert.equal(result.tokens.ok, false);
  assert.match(result.tokens.failure, /no --ow-\* declaration remains/);
  assert.equal(result.control.ok, true, 'the export itself was fine; the evidence source was not');
});

// The same empty parse arrives from a reformat rather than an empty file: these
// declarations are real, they have just stopped opening a line.
test('a tokens.css whose declarations no longer open a line fails loudly', async () => {
  const { verifyExport: relocated } = await verifierWithSources({
    tokens: '@theme{--ow-canvas:#fff;--ow-ink:#000}\n',
  });
  const result = relocated({ out: exportFixture(), control: CONTROL });
  assert.equal(result.ok, false);
  assert.equal(result.tokens.ok, false);
  assert.match(result.tokens.failure, /no --ow-\* declaration remains/);
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

// A tracking value outside the modelled shapes has to say so rather than assert
// a guess: a wrong expectation shipped to a consumer reads as a package
// regression in their CI, not as the gap here that it actually is.
test('a tracking value the minifier model does not cover is reported, not guessed', async () => {
  const { verifyExport: relocated } = await verifierWithSources({
    eyebrow: 'export const E = () => <p className="tracking-[calc(1em/8)]" />;\n',
  });
  const result = relocated({ out: exportFixture(), control: CONTROL });
  assert.equal(result.ok, false);
  assert.equal(result.utility.ok, false);
  assert.match(result.utility.failure, /cannot compile/);
  assert.match(result.utility.failure, /calc\(1em\/8\)/);
});

// A negative or trailing-zero value is modelled, so it has to produce the
// minified expectation rather than a false failure nobody can act on.
test('a negative tracking value derives the sign-preserved minified form', async () => {
  const { verifyExport: relocated } = await verifierWithSources({
    eyebrow: 'export const E = () => <p className="tracking-[-0.150em]" />;\n',
  });
  const result = relocated({
    out: exportFixture({ css: goodCss().replace(DECLARATION, 'letter-spacing:-.15em') }),
    control: CONTROL,
  });
  assert.equal(result.utility.ok, true, result.utility.failure);
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
  const { code, output } = runCli(cliArgs());
  assert.equal(code, 0);
  assert.equal(output.trim().split('\n').length, 1);
  assert.match(output, /^otto-brand-verify: /);
});

test('the CLI exits 1 and names the failing check', () => {
  const { code, output } = runCli(cliArgs({ out: exportFixture({ media: null }) }));
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
  const { code, output } = runCli([...cliArgs(), 'stray']);
  assert.equal(code, 2);
  assert.match(output, /unexpected argument: stray/);
});

// Silently keeping the last value would let a scripted invocation that appends
// a second --out verify a directory nobody meant to name.
test('the CLI exits 2 when a flag is repeated rather than keeping the last value', () => {
  const repeatedOut = runCli([
    '--out', exportFixture(), '--out', exportFixture(), '--control', CONTROL,
  ]);
  assert.equal(repeatedOut.code, 2);
  assert.match(repeatedOut.output, /--out given more than once/);
  const repeatedControl = runCli([
    '--out', exportFixture(), '--control', CONTROL, '--control', 'other',
  ]);
  assert.equal(repeatedControl.code, 2);
  assert.match(repeatedControl.output, /--control given more than once/);
});

// A missing out/ is a well-formed invocation against a build that did not run,
// so it exits like a failed check rather than a usage error.
test('the CLI exits 1, not 2, when the export directory is absent', () => {
  const { code, output } = runCli(cliArgs({ out: NOWHERE }));
  assert.equal(code, 1);
  assert.match(output, /static export not found/);
  assert.doesNotMatch(output, /ENOENT/);
});
