import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { verifyExport } from '@otto-nation/brand/verify';

// This is the render coverage for the landing page and the /ui/ specimen
// page: the org site composes every export @otto-nation/brand ships, so
// reading its built output is what proves none of them turned out over-fitted
// to otto-workbench's copy. App primitives with branching the landing page
// does not exercise live on /ui/. It reads a build that already ran rather
// than invoking Next itself, so it stays fast and does not duplicate
// `npm run build`'s job.
const OUT_DIR = fileURLToPath(new URL('../out/', import.meta.url));

if (!existsSync(OUT_DIR)) {
  throw new Error(
    `site/out/ not found — build the site first: npm run build --workspace otto-nation-site ` +
    `(looked in ${OUT_DIR})`,
  );
}

const INDEX_HTML = readFileSync(join(OUT_DIR, 'index.html'), 'utf8');
const UI_HTML_PATH = join(OUT_DIR, 'ui', 'index.html');

// Slice one specimen block out of the /ui/ page by data-specimen="<id>".
// Later phases assert each primitive variant from the matching block.
function section(html, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(
    new RegExp(`<([a-zA-Z][\\w:-]*)([^>]*\\sdata-specimen="${escaped}"[^>]*)>([\\s\\S]*?)</\\1>`),
  );
  assert.ok(match, `specimen "${id}" missing`);
  return match[0];
}

test('the /ui specimen page is built and noindexed', () => {
  assert.ok(existsSync(UI_HTML_PATH), 'out/ui/index.html missing — the specimen page did not build');
  const html = readFileSync(UI_HTML_PATH, 'utf8');
  assert.match(html, /<meta\b[^>]*\bnoindex\b/i);
  assert.match(section(html, 'page'), /App UI specimens/);
});

test('index.html renders output from every component on the page', () => {
  assert.match(INDEX_HTML, /ONE TOOLCHAIN/, 'Eyebrow text missing — Hero/Eyebrow did not render');
  assert.match(INDEX_HTML, /Your machine\./, 'headline fragment missing — Hero did not render');
  assert.match(INDEX_HTML, /<svg/, 'no <svg> at all — Rings/GrecaDivider/icon did not render');
  for (const title of ['otto-workbench', 'otto-stack', 'homebrew-tap']) {
    assert.ok(INDEX_HTML.includes(title), `card title "${title}" missing — CardGrid did not render it`);
  }
  assert.ok(INDEX_HTML.includes('MIT · otto-nation'), 'footer copy missing — Footer did not render');
});

// The tokens, the package-only utility, the vendored faces, and the control
// are all package-owned facts, so the package owns the assertion: every
// expectation is derived from its own source at call time rather than restated
// here as a literal. The tarball fixture in CI and otto-workbench run the same
// verifier against their own builds, which is what keeps three consumers from
// each holding a private copy of four magic strings.
//
// `py-7` is the control. It is used once, on the card-grid wrapper in
// site/app/page.tsx, and appears nowhere under packages/brand — so it is the
// site's own class, and the one class here that the verifier cannot derive.
test('the built export carries @otto-nation/brand', () => {
  const result = verifyExport({ out: OUT_DIR, control: 'py-7' });
  assert.ok(result.ok, result.failures.join('\n\n'));
});

// lightningcss may split the outline shorthand, so this only requires a
// :focus-visible rule whose declarations name --ow-anil.
test('the built CSS carries the anil :focus-visible ring', () => {
  const staticDir = join(OUT_DIR, '_next', 'static');
  const cssFiles = readdirSync(staticDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
    .map((entry) => join(entry.parentPath, entry.name));
  const css = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
  assert.match(css, /:focus-visible\s*\{[^}]*--ow-anil/);
});
