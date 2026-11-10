import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// This package has no in-package render tests on purpose. Render coverage is
// the landing page plus the `/ui/` specimen page: the org site composes every
// export, so its build is the coverage. A component that breaks fails that
// build rather than a snapshot here. App primitives with branching the
// landing page does not exercise live on `/ui/` and are asserted from the
// built HTML.

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const read = (target) => readFileSync(fileURLToPath(new URL(target, root)), 'utf8');

// npm always packs package.json, even when files omits it. Every other export
// must sit under a files entry: an export that exists on disk but is outside
// files is a dangling resolve in every tarball consumer.
function filesCoverExport(target, files) {
  const rel = target.replace(/^\.\//, '');
  if (rel === 'package.json') return true;
  return files.some((entry) => {
    const prefix = entry.replace(/^\.\//, '').replace(/\/+$/, '');
    return rel === prefix || rel.startsWith(`${prefix}/`);
  });
}

// Every target is a literal path: the exports map has no wildcard, so the
// barrel and the named subpaths are the whole public API and each one of them
// is disk-checked here. A pattern entry reintroduced later fails this test
// rather than skipping it, which is the intended signal.
test('every exports-map target exists on disk', () => {
  for (const target of Object.values(manifest.exports)) {
    assert.ok(!target.includes('*'), `${target} is a wildcard: the API is the barrel and the named subpaths`);
    assert.doesNotThrow(() => read(target), `${target} is exported but missing`);
  }
});

test('every exports target is covered by a files entry', () => {
  for (const [key, target] of Object.entries(manifest.exports)) {
    assert.ok(
      filesCoverExport(target, manifest.files),
      `${key} → ${target} is exported but not in files; it would not ship`,
    );
  }
});

// Every declared bin, not just the first one: a second bin added later that
// nobody listed here would ship as a broken command rather than fail the suite.
test('the bins are listed in files, or they never ship', () => {
  assert.ok(manifest.files.includes('bin'), 'files must include "bin"');
  assert.ok(manifest.files.includes('src'), 'files must include "src"');
  for (const [name, target] of Object.entries(manifest.bin)) {
    assert.doesNotThrow(() => read(target),
      `package.json declares the bin ${name} at ${target}, which is not on disk`);
  }
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

// Bundlers keep unused barrel re-exports unless this is set; only CSS has effects.
test('sideEffects is only CSS', () => {
  assert.deepEqual(manifest.sideEffects, ['*.css']);
});

test('every component in src is reachable from the barrel or a subpath export', () => {
  const srcDir = fileURLToPath(new URL('src/', root));
  const barrel = read('src/index.ts');
  const subpaths = Object.values(manifest.exports).join(' ');
  const files = [];
  for (const entry of readdirSync(srcDir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.tsx')) continue;
    const path = relative(srcDir, join(entry.parentPath, entry.name)).split(sep).join('/');
    if (path.startsWith('internal/')) continue;
    files.push(path);
  }
  files.sort();
  for (const file of files) {
    const id = file.replace(/\.tsx$/, '');
    const referenced = barrel.includes(`./${id}'`) || subpaths.includes(`./src/${file}`);
    assert.ok(referenced, `src/${file} is unreachable — dead code or a missing export`);
  }
});
