import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// This is the render coverage for the landing page: the org site composes
// every export @otto-nation/brand ships, so reading its built output is what
// proves none of them turned out over-fitted to otto-workbench's copy. It
// reads a build that already ran rather than invoking Next itself, so it
// stays fast and does not duplicate `npm run build`'s job.
const OUT_DIR = fileURLToPath(new URL('../out/', import.meta.url));

if (!existsSync(OUT_DIR)) {
  throw new Error(
    `site/out/ not found — build the site first: npm run build --workspace otto-nation-site ` +
    `(looked in ${OUT_DIR})`,
  );
}

function collectFiles(dir, predicate) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

const INDEX_HTML = readFileSync(join(OUT_DIR, 'index.html'), 'utf8');

test('index.html renders output from every component on the page', () => {
  assert.match(INDEX_HTML, /ONE TOOLCHAIN/, 'Eyebrow text missing — Hero/Eyebrow did not render');
  assert.match(INDEX_HTML, /Your machine\./, 'headline fragment missing — Hero did not render');
  assert.match(INDEX_HTML, /<svg/, 'no <svg> at all — Rings/GrecaDivider/icon did not render');
  for (const title of ['otto-workbench', 'otto-stack', 'homebrew-tap']) {
    assert.ok(INDEX_HTML.includes(title), `card title "${title}" missing — CardGrid did not render it`);
  }
  assert.ok(INDEX_HTML.includes('MIT · otto-nation'), 'footer copy missing — Footer did not render');
});

// Turbopack content-hashes CSS filenames, so the file has to be globbed
// rather than named. Reading every emitted stylesheet and concatenating them
// keeps the two assertions below correct regardless of chunk splitting.
const STATIC_DIR = join(OUT_DIR, '_next', 'static');
const cssFiles = collectFiles(STATIC_DIR, (name) => name.endsWith('.css'));
const emittedCss = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');

test('the package-only utility class reached @source and was emitted', () => {
  assert.ok(cssFiles.length > 0, 'no CSS emitted at all under out/_next/static/');
  // `tracking-[0.15em]` exists in exactly one file in the whole tree —
  // packages/brand/src/primitives/eyebrow.tsx, rendered by Hero — so its
  // compiled form in the site's own output proves the site's @source glob
  // reached into node_modules/@otto-nation/brand. Asserting the compiled
  // declaration rather than the source class name is deliberate: Tailwind's
  // minifier drops the leading zero (`0.15em` -> `.15em`) and CSS-escapes the
  // literal period in the selector (`0\.15em`), so the literal source string
  // "0.15em" never appears in the built file and a naive grep for it reports
  // a false negative even when @source worked correctly.
  assert.ok(emittedCss.includes('letter-spacing:.15em'),
    'tracking-[0.15em] from eyebrow.tsx was not emitted — @source did not reach the package');
});

test('a site-only utility class is emitted (control for the assertion above)', () => {
  // `py-7` is used once, on the card-grid wrapper in site/app/page.tsx, and
  // does not appear anywhere under packages/brand. Without this control, an
  // empty CSS scan (a broken build that emits no utilities at all) would
  // leave the previous test's absence of `.15em` looking like proof that
  // @source specifically failed to reach the package, when it actually
  // proves nothing — the scanner never ran at all. This exact false negative
  // cost three rounds of probing before the control was added.
  assert.ok(emittedCss.includes('.py-7{'),
    'py-7 (site-only, not from the package) was not emitted — the CSS scan produced nothing, ' +
    'which means the .15em assertion above carries no information either');
});

test('both League woff2 files are emitted', () => {
  const mediaDir = join(OUT_DIR, '_next', 'static', 'media');
  if (!existsSync(mediaDir)) {
    throw new Error(
      `_next/static/media/ not found — the font url()s in fonts.css likely did not resolve, ` +
      `so nothing was emitted (looked in ${mediaDir})`,
    );
  }
  const mediaFiles = readdirSync(mediaDir);
  assert.ok(mediaFiles.some((name) => /^LeagueMonoVariable\..*\.woff2$/.test(name)),
    'LeagueMonoVariable*.woff2 missing — fonts.css url() did not resolve from inside the package');
  assert.ok(mediaFiles.some((name) => /^LeagueSpartanVariable\..*\.woff2$/.test(name)),
    'LeagueSpartanVariable*.woff2 missing — fonts.css url() did not resolve from inside the package');
});
