import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// bin/pack-brand-assets lives at the repo root, not inside this package,
// because it's release tooling that packs packages/brand/src rather than a
// consumer-facing bin the package ships — otto-brand-check and
// otto-brand-verify are the ones in package.json's "bin" map. Its test lives
// here anyway: this workspace is the one whose `npm test` runs `node --test`,
// and the assertions below are entirely about packages/brand/src.
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const brandSrc = join(repoRoot, 'packages/brand/src');
const script = join(repoRoot, 'bin/pack-brand-assets');

// The script names its own file list once, in FILES=(...). Parsed out of the
// script rather than re-typed here, so a file added or removed there becomes
// a new expectation with no second edit to keep in step — the same rule
// otto-brand-check follows for declaredTokens (src/internal/derive.mjs).
function expectedFiles() {
  const source = readFileSync(script, 'utf8');
  const match = source.match(/^FILES=\(\n([\s\S]*?)\n\)/m);
  assert.ok(match, 'could not find FILES=(...) in bin/pack-brand-assets');
  return [...match[1].matchAll(/"([^"]+)"/g)].map(([, file]) => file);
}

test('packs exactly the files it declares, byte-identical to src', () => {
  const files = expectedFiles();
  assert.ok(files.length > 0, 'FILES parsed empty — the regex above no longer matches the script');

  const dest = mkdtempSync(join(tmpdir(), 'brand-assets-'));
  const extractDir = mkdtempSync(join(tmpdir(), 'brand-assets-extracted-'));
  try {
    const output = execFileSync(script, [dest], { encoding: 'utf8' }).trim();
    const expectedZip = join(dest, `otto-nation-brand-assets-${packedVersion()}.zip`);
    assert.equal(output, expectedZip, 'script printed a different path than the version-derived name predicts');

    execFileSync('unzip', ['-q', output, '-d', extractDir]);

    for (const file of files) {
      const expected = readFileSync(join(brandSrc, file));
      const packed = readFileSync(join(extractDir, file));
      assert.ok(packed.equals(expected), `${file} in the zip does not byte-match packages/brand/src/${file}`);
    }

    // Catches a file the zip carries that FILES does not declare — e.g. a
    // leftover from a bad merge in the staging step — which the loop above,
    // which only ever checks declared files, cannot catch by itself.
    const packedCount = execFileSync('unzip', ['-Z1', output], { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter((entry) => entry && !entry.endsWith('/')).length;
    assert.equal(packedCount, files.length, 'the zip contains a file FILES does not declare, or is missing one');
  } finally {
    rmSync(dest, { recursive: true, force: true });
    rmSync(extractDir, { recursive: true, force: true });
  }
});

function packedVersion() {
  return JSON.parse(readFileSync(join(repoRoot, 'packages/brand/package.json'), 'utf8')).version;
}

test('refuses to pack when a declared file is missing from src', () => {
  // Doesn't touch the real source tree: points BASH_SOURCE-derived REPO_ROOT
  // at a scratch copy with one declared file deleted, so a regression here
  // can't leave packages/brand/src damaged if an assertion above it throws.
  const scratchRepo = mkdtempSync(join(tmpdir(), 'brand-assets-missing-'));
  try {
    const files = expectedFiles();
    const scratchScript = join(scratchRepo, 'bin/pack-brand-assets');
    const scratchBrandSrc = join(scratchRepo, 'packages/brand/src');
    execFileSync('mkdir', ['-p', join(scratchRepo, 'bin'), scratchBrandSrc, join(scratchBrandSrc, 'fonts'),
      join(scratchRepo, 'packages/brand')]);
    execFileSync('cp', [script, scratchScript]);
    execFileSync('chmod', ['+x', scratchScript]);
    execFileSync('cp', [join(repoRoot, 'packages/brand/package.json'), join(scratchRepo, 'packages/brand/package.json')]);
    // Copy every declared file except the first, so the script's own existence
    // check is what fails rather than a directory that never existed.
    for (const file of files.slice(1)) {
      execFileSync('cp', [join(brandSrc, file), join(scratchBrandSrc, file)]);
    }

    assert.throws(() => execFileSync(scratchScript, [scratchRepo], { stdio: 'pipe' }),
      /missing/, 'the script should exit non-zero and name the missing file');
  } finally {
    rmSync(scratchRepo, { recursive: true, force: true });
  }
});
