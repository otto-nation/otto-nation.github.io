import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  contrast,
  darkTokenHexes,
  documentedClaims as claimsFrom,
  documentedDarkClaims as darkClaimsFrom,
  fdPrimaryToken,
  fdRoleToken,
  focusRingToken,
  lightTokenHexes,
  OW_TOKEN,
} from '../src/internal/derive.mjs';

const TOKENS = readFileSync(
  fileURLToPath(new URL('../src/tokens.css', import.meta.url)),
  'utf8',
);

const ICON = readFileSync(
  fileURLToPath(new URL('../src/marks/icon.svg', import.meta.url)),
  'utf8',
);

function lightTokens() {
  return lightTokenHexes(TOKENS);
}

function darkTokens() {
  return darkTokenHexes(TOKENS);
}

function documentedClaims() {
  return claimsFrom(TOKENS);
}

function documentedDarkClaims() {
  return darkClaimsFrom(TOKENS);
}

function assertClaimsHold(claims, tokens, theme) {
  for (const { token, ratio, background } of claims) {
    const fg = tokens.get(token);
    const bg = tokens.get(background);
    assert.ok(fg, `${token} is claimed but not declared`);
    assert.ok(bg, `${background} is claimed but not declared`);
    assert.equal(
      contrast(fg, bg).toFixed(2),
      Number(ratio).toFixed(2),
      `${theme}: ${token} on ${background}: header says ${ratio}:1, hexes compute ${contrast(fg, bg).toFixed(2)}:1`,
    );
  }
}

// Body copy and the AA-rated labels, on whichever surface each one sits.
function assertReadable(tokens) {
  assert.ok(contrast(tokens.get('--ow-ink'), tokens.get('--ow-canvas')) >= 4.5);
  assert.ok(contrast(tokens.get('--ow-ink-muted'), tokens.get('--ow-canvas')) >= 4.5);
  assert.ok(contrast(tokens.get('--ow-block-ink'), tokens.get('--ow-block')) >= 4.5);
  assert.ok(contrast(tokens.get('--ow-block-ink-muted'), tokens.get('--ow-block')) >= 4.5);
}

// Content inside a card sits on --ow-surface, and accent fills carry text of
// their own. Each pairing a component is told to use has to hold on both ramps.
function assertAccentPairings(tokens, theme) {
  // contrast() sorts by luminance, so contrast(fg, bg) === contrast(bg, fg):
  // the '--ow-anil'/'--ow-canvas' and '--ow-canvas'/'--ow-anil' rows below
  // compute the same ratio. Both are kept because they document two distinct
  // semantic roles — anil as a link on the page, and canvas as text on an
  // anil fill — not because the number differs between them.
  const pairs = [
    ['--ow-ink-muted', '--ow-surface'],
    ['--ow-anil', '--ow-canvas'],
    ['--ow-anil', '--ow-surface'],
    ['--ow-canvas', '--ow-anil'],
    ['--ow-on-amarillo', '--ow-amarillo'],
    ['--ow-on-rosa', '--ow-rosa'],
    ['--ow-ink', '--ow-done-soft'],
    ['--ow-ink-muted', '--ow-done-soft'],
    ['--ow-done', '--ow-done-soft'],
    ['--ow-ink', '--ow-warn-soft'],
    ['--ow-ink-muted', '--ow-warn-soft'],
    ['--ow-warn', '--ow-warn-soft'],
    ['--ow-danger', '--ow-danger-soft'],
    ['--ow-ink', '--ow-danger-soft'],
    ['--ow-ink-muted', '--ow-danger-soft'],
    ['--ow-info', '--ow-info-soft'],
    ['--ow-ink', '--ow-info-soft'],
    ['--ow-ink-muted', '--ow-info-soft'],
  ];
  for (const [fg, bg] of pairs) {
    const ratio = contrast(tokens.get(fg), tokens.get(bg));
    assert.ok(ratio >= 4.5, `${theme}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, under AA`);
  }
  // Non-text floor (WCAG 1.4.11): a control's boundary against what it sits on.
  for (const bg of ['--ow-canvas', '--ow-surface']) {
    const ratio = contrast(tokens.get('--ow-outline'), tokens.get(bg));
    assert.ok(ratio >= 3, `${theme}: --ow-outline on ${bg} is ${ratio.toFixed(2)}:1, under 3:1`);
  }
}

test('accent and card pairings clear AA in both themes', () => {
  assertAccentPairings(lightTokens(), 'light');
  assertAccentPairings(darkTokens(), 'dark');
});

test('tokens.css documents at least five contrast claims', () => {
  assert.ok(documentedClaims().length >= 5, 'contrast claims disappeared from the header');
});

test('every documented contrast ratio matches the computed one', () => {
  assertClaimsHold(documentedClaims(), lightTokens(), 'light');
});

test('tokens.css documents the dark block ramp', () => {
  assert.ok(documentedDarkClaims().length >= 4, 'the .dark block ramp claims disappeared');
});

test('every documented dark contrast ratio matches the computed one', () => {
  assertClaimsHold(documentedDarkClaims(), darkTokens(), 'dark');
});

test('body copy tokens clear the 4.5:1 AA floor on their surface', () => {
  assertReadable(lightTokens());
});

test('body copy tokens clear the 4.5:1 AA floor in dark mode too', () => {
  assertReadable(darkTokens());
});

// icon.svg is the one file exempt from "tokens.css owns every hex", because an
// SVG loaded as a favicon or an <img> src never sees the host stylesheet and so
// cannot resolve a custom property. The exemption is from using var(), not from
// the palette: each hex it paints mirrors a token, and drift between the two is
// the mark rendering in a colour the brand no longer uses. The file's own
// comment states the mapping, so both halves are checked — that the painted
// hexes are the documented ones, and that the documented ones still match
// tokens.css.
test('icon.svg paints the tokens it says it mirrors', () => {
  const [comment] = ICON.match(/<!--[\s\S]*?-->/) ?? [];
  assert.ok(comment, 'icon.svg lost the comment mapping its hexes to tokens');

  const documented = [...comment.matchAll(new RegExp(`(#[0-9a-f]{6})\\s+(${OW_TOKEN})`, 'gi'))]
    .map(([, hex, token]) => ({ hex: hex.toLowerCase(), token }));
  assert.equal(documented.length, 3, 'icon.svg should document exactly three hex/token pairs');

  const painted = [...ICON.replace(/<!--[\s\S]*?-->/g, '').matchAll(/#[0-9a-f]{6}/gi)]
    .map(([hex]) => hex.toLowerCase());
  assert.deepEqual(painted, documented.map(({ hex }) => hex),
    'the hexes icon.svg paints are not the ones its comment documents, in order');

  const tokens = lightTokens();
  for (const { hex, token } of documented) {
    const declared = tokens.get(token)?.toLowerCase();
    assert.ok(declared, `icon.svg mirrors ${token}, which tokens.css does not declare`);
    assert.equal(hex, declared,
      `icon.svg paints ${hex} for ${token}, but tokens.css declares ${declared}`);
  }
});

// The footer is a band, not a page-coloured region: if --ow-block collapses
// onto --ow-canvas the component whose job is to terminate the page stops
// terminating it, and Footer carries no border to fall back on.
test('the block band separates from the canvas in both themes', () => {
  for (const [theme, tokens] of [['light', lightTokens()], ['dark', darkTokens()]]) {
    const ratio = contrast(tokens.get('--ow-block'), tokens.get('--ow-canvas'));
    assert.ok(ratio >= 1.2, `${theme}: --ow-block is ${ratio.toFixed(2)}:1 on --ow-canvas`);
  }
});

const TEXT_ON_SURFACE = [
  '--ow-ink',
  '--ow-ink-muted',
  '--ow-anil',
  '--ow-done',
  '--ow-warn',
  '--ow-danger',
  '--ow-info',
  '--ow-magenta',
];

const APP_SURFACES = [
  '--ow-canvas',
  '--ow-surface',
  '--ow-hover',
  '--ow-selected',
];

function eachRamp() {
  return [['light', lightTokens()], ['dark', darkTokens()]];
}

// Every cell in the app-UI matrix must clear AA.
test('text tokens clear AA on canvas, surface, hover, and selected in both ramps', () => {
  for (const [theme, tokens] of eachRamp()) {
    for (const fg of TEXT_ON_SURFACE) {
      for (const bg of APP_SURFACES) {
        const fgHex = tokens.get(fg);
        const bgHex = tokens.get(bg);
        assert.ok(fgHex, `${theme}: ${fg} is not declared`);
        assert.ok(bgHex, `${theme}: ${bg} is not declared`);
        const ratio = contrast(fgHex, bgHex);
        assert.ok(
          ratio >= 4.5,
          `${theme}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, under AA`,
        );
      }
    }
  }
});

// Hover used to be the hairline hex, so hairline borders vanished on hover.
// 1.1 is the regression floor (was 1.00); the fill is never a border colour.
test('hover fill is distinct from hairline in both ramps', () => {
  for (const [theme, tokens] of eachRamp()) {
    const ratio = contrast(tokens.get('--ow-hover'), tokens.get('--ow-hairline'));
    assert.ok(
      ratio >= 1.1,
      `${theme}: --ow-hover vs --ow-hairline is ${ratio.toFixed(2)}:1, under 1.1`,
    );
  }
});

test('selected indicator primary clears 3:1 on selected in both ramps', () => {
  for (const theme of ['light', 'dark']) {
    const tokens = theme === 'dark' ? darkTokens() : lightTokens();
    const primary = fdPrimaryToken(TOKENS, theme);
    assert.ok(primary, `${theme}: missing --color-fd-primary`);
    const ratio = contrast(tokens.get(primary), tokens.get('--ow-selected'));
    assert.ok(
      ratio >= 3,
      `${theme}: ${primary} on --ow-selected is ${ratio.toFixed(2)}:1, under 3:1`,
    );
  }
});

test('anil clears 3:1 on canvas, surface, hover, and selected in both ramps', () => {
  for (const [theme, tokens] of eachRamp()) {
    for (const bg of APP_SURFACES) {
      const ratio = contrast(tokens.get('--ow-anil'), tokens.get(bg));
      assert.ok(
        ratio >= 3,
        `${theme}: --ow-anil on ${bg} is ${ratio.toFixed(2)}:1, under 3:1`,
      );
    }
  }
});

// One owner: the fumadocs ring token and the base :focus-visible rule name the
// same --ow-*. That token must clear the non-text floor on every app surface.
test('fumadocs ring matches the base focus rule and clears 3:1 on app surfaces', () => {
  const ringToken = focusRingToken(TOKENS);
  for (const [theme, tokens] of eachRamp()) {
    const role = fdRoleToken(TOKENS, '--color-fd-ring', theme);
    assert.equal(role, ringToken, `${theme}: --color-fd-ring is not the focus-rule token`);
    assert.ok(role, `${theme}: missing --color-fd-ring`);
    for (const bg of APP_SURFACES) {
      const ratio = contrast(tokens.get(role), tokens.get(bg));
      assert.ok(
        ratio >= 3,
        `${theme}: ${role} on ${bg} is ${ratio.toFixed(2)}:1, under 3:1`,
      );
    }
  }
});
