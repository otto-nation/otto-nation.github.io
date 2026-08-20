// Verifies that a consumer's built static export actually picked this package
// up. bin/otto-brand-check.mjs reads a consumer's *configuration* before a
// build; this reads the *output* after one, which is the only place these
// failures become visible — each of them produces a build that succeeds and a
// page that renders wrong:
//
//   - tokens.css was imported but never reached the emitted CSS
//   - Tailwind's @source glob never scanned the package's .tsx
//   - the vendored woff2 files were not emitted as assets
//   - nothing at all was emitted, which makes the three checks above vacuous
//
// Every package-owned expectation is derived from this package's own source at
// call time. A hardcoded copy here would be the duplication the consumers
// already had, moved one directory in — the point is that editing tokens.css,
// fonts.css, or eyebrow.tsx moves the assertion along with it, and that a
// third consumer in another repo inherits the contract by installing the
// package rather than by copying four magic strings.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const PACKAGE = '@otto-nation/brand';

// The evidence sources are read relative to this file, never to the caller, so
// the derivation always describes the version of the package the consumer
// actually installed rather than whatever copy sits near their build output.
const packageSource = (target) => readFileSync(new URL(target, import.meta.url), 'utf8');

/**
 * The `--ow-*` custom property names tokens.css declares.
 *
 * Takes the stylesheet's text rather than reading it, so bin/otto-brand-check.mjs
 * can hand over the copy it resolved from its own location and the two share one
 * regex instead of drifting apart. The leading `\s*` is what lets either
 * indentation style parse — tokens.css is two-space indented today.
 */
export function declaredTokens(tokensCss) {
  return new Set([...tokensCss.matchAll(/^\s*(--ow-[a-z-]+):/gm)].map(([, name]) => name));
}

/**
 * The compiled CSS declaration of the one utility class that exists nowhere but
 * inside this package, derived from eyebrow.tsx. Returns null when that class is
 * gone, which callers must treat as a failure rather than a skip.
 */
export function packageOnlyDeclaration(eyebrowSource) {
  const tracking = eyebrowSource.match(/tracking-\[([^\]]+)\]/);
  if (!tracking) return null;
  // Tailwind's minifier drops a decimal's leading zero, so the source class
  // `tracking-[0.15em]` compiles to `letter-spacing:.15em` and the literal text
  // `0.15em` never appears in the built stylesheet — a grep for the source form
  // reports a false negative even when @source worked. Tailwind also CSS-escapes
  // the period inside the generated selector for the same reason. This strip is
  // the single assumption in the whole derivation; everything else is verbatim.
  return `letter-spacing:${tracking[1].replace(/^0\./, '.')}`;
}

/**
 * The basename stems of the woff2 files fonts.css points at, e.g.
 * `LeagueSpartanVariable`. The stem rather than the filename because Next
 * content-hashes the emitted asset (`LeagueSpartanVariable.11kb5ckq3-_9c.woff2`).
 */
export function fontStems(fontsCss) {
  return [...fontsCss.matchAll(/url\(\s*['"]?([^'")]+\.woff2)['"]?\s*\)/g)]
    .map(([, url]) => basename(url, '.woff2'));
}

function collectFiles(dir, predicate) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

// One shared instance for every passing check. Frozen so a caller inspecting
// result.tokens cannot annotate it and silently change what result.fonts says.
const passed = Object.freeze({ ok: true });

/**
 * Verify a built static export against the package's own source.
 *
 * @param {object} options
 * @param {string} options.out      path to the consumer's static export directory
 * @param {string} options.control  a utility class the consumer uses and the package does not
 * @returns {{
 *   ok: boolean,
 *   control: { ok: boolean, failure?: string },
 *   tokens: { ok: boolean, failure?: string },
 *   utility: { ok: boolean, failure?: string },
 *   fonts: { ok: boolean, failure?: string },
 *   failures: string[],
 * }}
 *
 * Throws only when there is nothing to verify at all — a missing export
 * directory. Every other problem comes back as a failed check, so one run
 * reports every fault rather than stopping at the first.
 */
export function verifyExport({ out, control }) {
  if (!out) throw new Error('verifyExport: an out directory is required');
  if (!control) {
    throw new Error(
      'verifyExport: a control utility is required.\n' +
        `  It must be a class the consumer's own markup uses and ${PACKAGE} does not;\n` +
        '  without it a missing package utility cannot be told apart from a build that\n' +
        '  emitted no CSS at all.',
    );
  }
  if (!existsSync(out)) {
    throw new Error(
      `static export not found: ${out}\n` +
        '  Nothing was verified. Either the consumer\'s build has not run yet, or this\n' +
        '  path is wrong — a Next static export writes to out/ beside next.config.mjs.',
    );
  }

  // Turbopack content-hashes stylesheet filenames into _next/static/chunks/, so
  // the emitted CSS has to be globbed rather than named; the webpack-era
  // _next/static/css/ does not exist. Concatenating every sheet keeps the three
  // CSS checks correct however the chunks happen to split.
  const staticDir = join(out, '_next', 'static');
  const cssFiles = existsSync(staticDir)
    ? collectFiles(staticDir, (name) => name.endsWith('.css'))
    : [];
  const emittedCss = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');

  // ceiling: the control's compiled selector is assumed to be `.<utility>{`.
  // Tailwind CSS-escapes brackets and periods, so an arbitrary-value control
  // such as tracking-[0.15em] would be reported missing when it was in fact
  // emitted. Upgrade to escaping the selector the way Tailwind does if a
  // consumer's only package-free utility is an arbitrary-value one.
  const controlCheck = emittedCss.includes(`.${control}{`)
    ? passed
    : {
        ok: false,
        failure:
          `${staticDir}: the control utility .${control} was not emitted.\n` +
          `  Read ${cssFiles.length} stylesheet(s) here; none of them compiled it.\n` +
          `  The control is a class the consumer's own markup uses and ${PACKAGE} does not,\n` +
          '  so this is either a build that emitted no usable CSS at all or a --control\n' +
          '  naming a class this consumer never actually used. Until it is settled, the\n' +
          '  token and utility results below carry no information — an absent package\n' +
          '  utility and an absent stylesheet look identical. That exact false negative\n' +
          '  cost three rounds of probing before the control existed, which is why it is\n' +
          '  reported first.',
      };

  const declared = declaredTokens(packageSource('./tokens.css'));
  // The trailing colon is what makes each name its own search rather than a
  // prefix one: a bare `--ow-ink` is a substring of `--ow-ink-muted`, so
  // dropping the declaration of the first would go unnoticed while the second
  // survived. tokens.css is inlined verbatim, so the declaration form is what
  // reaches the build whether or not the CSS was minified.
  const missingTokens = [...declared].filter((name) => !emittedCss.includes(`${name}:`));
  const tokens = missingTokens.length === 0
    ? passed
    : {
        ok: false,
        failure:
          `${staticDir}: ${missingTokens.length} of ${declared.size} --ow-* token(s) declared by\n` +
          `  ${PACKAGE}/tokens.css are absent from the emitted CSS: ${missingTokens.join(', ')}\n` +
          '  tokens.css is @imported and inlined verbatim, so every name it declares has to\n' +
          '  survive into the build. A name that did not means the @import never resolved,\n' +
          '  and every component styled by that token renders with inherited or transparent\n' +
          '  colour on a page that built clean.',
      };

  const expectedDeclaration = packageOnlyDeclaration(packageSource('./primitives/eyebrow.tsx'));
  const utility = utilityCheck(expectedDeclaration, emittedCss, staticDir);

  const mediaDir = join(out, '_next', 'static', 'media');
  const fonts = fontCheck(fontStems(packageSource('./fonts.css')), mediaDir);

  // The control leads: when it fails, the three results after it are describing
  // a stylesheet that was never emitted, not a package that failed to arrive.
  const failures = [controlCheck, tokens, utility, fonts]
    .filter((check) => !check.ok)
    .map((check) => check.failure);

  return { ok: failures.length === 0, control: controlCheck, tokens, utility, fonts, failures };
}

// Split out only so verifyExport stays readable; both halves are one check.
function utilityCheck(expectedDeclaration, emittedCss, staticDir) {
  // A missing tracking-[…] class is not a check that can be skipped. This
  // verifier's whole claim that @source reached into the package rests on that
  // one class living in exactly one file, so losing it silently would leave the
  // suite green while testing nothing.
  if (expectedDeclaration === null) {
    return {
      ok: false,
      failure:
        `${PACKAGE}/src/primitives/eyebrow.tsx: no tracking-[…] class remains.\n` +
        '  That class was this check\'s evidence: it exists in exactly one file in the\n' +
        '  whole tree, so its compiled form in a consumer\'s output is what proves\n' +
        '  Tailwind\'s @source glob reached inside the package. With it gone there is\n' +
        '  nothing left to assert, and a consumer whose @source silently stopped working\n' +
        '  would now pass. Restore it, or re-point this check at another class that\n' +
        '  exists only inside the package.',
    };
  }
  if (emittedCss.includes(expectedDeclaration)) return passed;
  return {
    ok: false,
    failure:
      `${staticDir}: the package-only declaration ${expectedDeclaration} was not emitted.\n` +
      `  It compiles from the tracking-[…] class in ${PACKAGE}/src/primitives/eyebrow.tsx,\n` +
      '  which is the only file in the tree that uses it, so its absence means Tailwind\'s\n' +
      '  @source glob never scanned the package. Every utility the package relies on is\n' +
      '  then missing from the stylesheet and the components render unstyled.\n' +
      `  Add or fix: @source '../node_modules/${PACKAGE}/**/*.tsx';`,
  };
}

function fontCheck(stems, mediaDir) {
  // Same reasoning as the utility check above: fonts.css with no url() at all
  // means the evidence is gone, not that there is nothing to verify.
  if (stems.length === 0) {
    return {
      ok: false,
      failure:
        `${PACKAGE}/src/fonts.css: no url('./fonts/*.woff2') remains to derive from.\n` +
        '  This check asserts that each vendored face was emitted as a build asset; with\n' +
        '  no url() to read, it would assert nothing and pass on any build. Restore the\n' +
        '  @font-face src, or drop this check deliberately.',
    };
  }
  if (!existsSync(mediaDir)) {
    return {
      ok: false,
      failure:
        `${mediaDir}: not found.\n` +
        `  The font url()s in ${PACKAGE}/fonts.css did not resolve, so no asset was\n` +
        '  emitted for any face and the page renders in the fallback stack. Under a\n' +
        '  workspace symlink this is usually a url() rebased through the package\'s\n' +
        '  realpath, which climbs out of the app root.',
    };
  }
  const emitted = readdirSync(mediaDir);
  const missing = stems.filter(
    (stem) => !emitted.some((name) => name.startsWith(`${stem}.`) && name.endsWith('.woff2')),
  );
  if (missing.length === 0) return passed;
  return {
    ok: false,
    failure:
      `${mediaDir}: no emitted asset for ${missing.join(', ')}.\n` +
      `  Each of those is named by a url() in ${PACKAGE}/fonts.css, so the face was\n` +
      '  declared and never shipped and the page renders in the fallback stack.\n' +
      '  Matched on the basename stem because Next content-hashes the filename.',
  };
}
