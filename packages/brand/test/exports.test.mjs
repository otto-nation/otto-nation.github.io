import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const read = (relative) => readFileSync(fileURLToPath(new URL(relative, root)), 'utf8');

test('every exports-map target exists on disk', () => {
  for (const target of Object.values(manifest.exports)) {
    if (target.includes('*')) continue;
    assert.doesNotThrow(() => read(target), `${target} is exported but missing`);
  }
});

test('the bin is listed in files, or it never ships', () => {
  assert.ok(manifest.files.includes('bin'), 'files must include "bin"');
  assert.ok(manifest.files.includes('src'), 'files must include "src"');
  assert.doesNotThrow(() => read(manifest.bin['otto-brand-check']),
    'package.json declares a bin that is not on disk');
});

// Importing the barrel must not pull fumadocs-ui into a consumer's graph. The
// landing site has no docs and must not acquire a fumadocs dependency just by
// importing Nav. Asserted as a whole-tree invariant rather than by walking the
// barrel's imports: a graph walk has to be transitive to be sound, and one that
// is not passes a fumadocs import sitting two hops down. Every file but one is
// either barrel-reachable or dead, so "only this file may say fumadocs" is both
// the stronger claim and the shorter one.
//
// The exemption is one exact path. A substring or a directory would also cover
// a file added later, which is the hole this test exists to close.
const FUMADOCS_OWNER = 'chrome/search-button.tsx';

test('only search-button mentions fumadocs', () => {
  const srcDir = fileURLToPath(new URL('src/', root));
  for (const entry of readdirSync(srcDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = relative(srcDir, join(entry.parentPath, entry.name)).split(sep).join('/');
    if (path === FUMADOCS_OWNER) continue;
    assert.ok(!readFileSync(join(srcDir, path), 'utf8').includes('fumadocs'),
      `src/${path} mentions fumadocs; only src/${FUMADOCS_OWNER} may`);
  }
});

test('SearchButton has its own subpath export', () => {
  assert.equal(manifest.exports['./search-button'], './src/chrome/search-button.tsx');
  assert.ok(read('src/chrome/search-button.tsx').includes('fumadocs-ui/contexts/search'));
});

test('fumadocs-ui is an optional peer', () => {
  assert.equal(manifest.peerDependenciesMeta['fumadocs-ui'].optional, true);
});

test('every component in src is reachable from the barrel or a subpath export', () => {
  const barrel = read('src/index.ts');
  const subpaths = Object.values(manifest.exports).join(' ');
  for (const file of ['marks/greca', 'marks/rings', 'primitives/eyebrow', 'primitives/button',
    'primitives/card-grid', 'chrome/nav', 'chrome/footer', 'chrome/hero',
    'chrome/install-block', 'chrome/search-button']) {
    const referenced = barrel.includes(`./${file}'`) || subpaths.includes(`./src/${file}.tsx`);
    assert.ok(referenced, `src/${file}.tsx is unreachable — dead code or a missing export`);
  }
});
