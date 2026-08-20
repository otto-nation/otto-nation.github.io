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
//
// verifyExport is the whole public surface. The parses it derives from live in
// internal/derive.mjs, which the exports map does not list.
//
// Each of the three derived checks guards its own evidence: a derivation that
// comes back empty is a failure, never a skip. An empty expectation asserts
// nothing and passes on every build forever, which is the one outcome a
// verifier must not produce quietly.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { declaredTokens, fontStems, minifyLength, trackingValue } from './internal/derive.mjs';

const PACKAGE = '@otto-nation/brand';

// The evidence sources are read relative to this file, never to the caller, so
// the derivation always describes the version of the package the consumer
// actually installed rather than whatever copy sits near their build output.
const packageSource = (target) => readFileSync(new URL(target, import.meta.url), 'utf8');

// entry.parentPath is what sets this package's engines floor: it replaced the
// deprecated entry.path, and on a runtime without it every collected path would
// be `undefined/<name>` and every check would report a stylesheet that is
// actually there. package.json declares the floor rather than this file
// guarding it, so the failure is an install-time warning naming the version
// instead of a mid-run TypeError naming nothing.
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
 * Throws when there is nothing to verify at all — no export directory, or an
 * export directory carrying no build output. Both sit upstream of every check,
 * and reporting four failures when the real fault is "no build ran" sends the
 * reader after four things that are not wrong. Every other problem comes back
 * as a failed check, so one run reports every fault rather than stopping at
 * the first.
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
  if (!existsSync(staticDir)) {
    throw new Error(
      `build output not found: ${staticDir}\n` +
        `  ${out} exists but carries no _next/static/, so no stylesheet and no font\n` +
        '  asset was emitted and there is nothing for any check to read. The build did\n' +
        '  not run to completion, its output went elsewhere, or a stale out/ was left\n' +
        '  behind by an earlier failure. Every check is downstream of this, so none is\n' +
        '  reported — each would name a cause that is not the one in front of you.',
    );
  }
  const cssFiles = collectFiles(staticDir, (name) => name.endsWith('.css'));
  const emittedCss = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');

  const controlResult = checkControl(control, cssFiles.length, emittedCss, staticDir);
  const tokens = checkTokens(declaredTokens(packageSource('./tokens.css')), emittedCss, staticDir);
  const utility = checkUtility(
    trackingValue(packageSource('./primitives/eyebrow.tsx')), emittedCss, staticDir,
  );
  const fonts = checkFonts(fontStems(packageSource('./fonts.css')), join(staticDir, 'media'));

  // The control leads: when it fails, the three results after it are describing
  // a stylesheet that was never emitted, not a package that failed to arrive.
  const failures = [controlResult, tokens, utility, fonts]
    .filter((check) => !check.ok)
    .map((check) => check.failure);

  return { ok: failures.length === 0, control: controlResult, tokens, utility, fonts, failures };
}

function checkControl(control, sheetCount, emittedCss, staticDir) {
  // ceiling: the control's compiled selector is assumed to be `.<utility>{`.
  // Tailwind CSS-escapes brackets and periods, so an arbitrary-value control
  // such as tracking-[0.15em] would be reported missing when it was in fact
  // emitted. Upgrade to escaping the selector the way Tailwind does if a
  // consumer's only package-free utility is an arbitrary-value one.
  if (emittedCss.includes(`.${control}{`)) return passed;
  return {
    ok: false,
    failure:
      `${staticDir}: the control utility .${control} was not emitted.\n` +
      `  Read ${sheetCount} stylesheet(s) here; none of them compiled it.\n` +
      `  The control is a class the consumer's own markup uses and ${PACKAGE} does not,\n` +
      '  so this is either a build that emitted no usable CSS at all or a --control\n' +
      '  naming a class this consumer never actually used. Until it is settled, the\n' +
      '  token and utility results below carry no information — an absent package\n' +
      '  utility and an absent stylesheet look identical. That exact false negative\n' +
      '  cost three rounds of probing before the control existed, which is why it is\n' +
      '  reported first.',
  };
}

function checkTokens(declared, emittedCss, staticDir) {
  // An empty parse is the failure this check is least able to notice on its own:
  // with nothing declared, nothing can be missing, and it would pass on every
  // build from here on. bin/otto-brand-check.mjs shares the parse and fails the
  // same way, but it runs before the build and a consumer may not run it at all,
  // so this check cannot lean on it — each entry point states the guard itself.
  if (declared.size === 0) {
    return {
      ok: false,
      failure:
        `${PACKAGE}/src/tokens.css: no --ow-* declaration remains to derive from.\n` +
        '  The parse reads a name only where it opens a line, so this is either a\n' +
        '  reformatted stylesheet — declarations folded onto one line, or moved inside\n' +
        '  an @theme block — or a renamed prefix. Either way no expectation is left,\n' +
        '  and a check with no expectations passes on every build forever.\n' +
        '  Fix declaredTokens in src/internal/derive.mjs to match the new shape.',
    };
  }
  // The trailing colon is what makes each name its own search rather than a
  // prefix one: a bare `--ow-ink` is a substring of `--ow-ink-muted`, so
  // dropping the declaration of the first would go unnoticed while the second
  // survived. tokens.css is inlined verbatim, so the declaration form is what
  // reaches the build whether or not the CSS was minified.
  const missing = [...declared].filter((name) => !emittedCss.includes(`${name}:`));
  if (missing.length === 0) return passed;
  return {
    ok: false,
    failure:
      `${staticDir}: ${missing.length} of ${declared.size} --ow-* token(s) declared by\n` +
      `  ${PACKAGE}/tokens.css are absent from the emitted CSS: ${missing.join(', ')}\n` +
      '  tokens.css is @imported and inlined verbatim, so every name it declares has to\n' +
      '  survive into the build. A name that did not means the @import never resolved,\n' +
      '  and every component styled by that token renders with inherited or transparent\n' +
      '  colour on a page that built clean.',
  };
}

function checkUtility(value, emittedCss, staticDir) {
  // A missing tracking-[…] class is not a check that can be skipped. This
  // verifier's whole claim that @source reached into the package rests on that
  // one class living in exactly one file, so losing it silently would leave the
  // suite green while testing nothing.
  if (value === null) {
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
  // Guessing at a value whose minified form is not modelled would put a wrong
  // expectation in front of a consumer, where it reads as a package regression
  // in their CI rather than as a gap here. Saying so is the cheaper failure.
  const minified = minifyLength(value);
  if (minified === null) {
    return {
      ok: false,
      failure:
        `${PACKAGE}/src/primitives/eyebrow.tsx: tracking-[${value}] carries a value this\n` +
        '  check cannot compile. It models a signed decimal with a unit and the three\n' +
        '  normalisations lightningcss applies to one: dropped leading zero, dropped\n' +
        '  trailing zeros, dropped empty fraction. A zero length, a unitless or\n' +
        '  uppercase unit, and any calc() or var() sit outside that, and asserting a\n' +
        '  guess at one of them would fail every consumer\'s build for a fault that is\n' +
        '  not theirs. Extend minifyLength in src/internal/derive.mjs, or use a plain\n' +
        '  decimal value.',
    };
  }
  const expected = `letter-spacing:${minified}`;
  if (emittedCss.includes(expected)) return passed;
  return {
    ok: false,
    failure:
      `${staticDir}: the package-only declaration ${expected} was not emitted.\n` +
      `  It compiles from tracking-[${value}] in ${PACKAGE}/src/primitives/eyebrow.tsx,\n` +
      '  which is the only file in the tree that uses it, so its absence means Tailwind\'s\n' +
      '  @source glob never scanned the package. Every utility the package relies on is\n' +
      '  then missing from the stylesheet and the components render unstyled.\n' +
      `  Add or fix: @source '../node_modules/${PACKAGE}/**/*.tsx';`,
  };
}

function checkFonts(stems, mediaDir) {
  // Same reasoning as the two checks above: fonts.css with no url() at all
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
