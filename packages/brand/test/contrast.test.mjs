import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const TOKENS = readFileSync(
  fileURLToPath(new URL('../src/tokens.css', import.meta.url)),
  'utf8',
);

// Only :root declarations. The claims in the header comment are all stated
// against the light ramp; the .dark overrides carry their own claims and are
// checked separately below.
function lightTokens() {
  const root = TOKENS.slice(TOKENS.indexOf(':root {'), TOKENS.indexOf('.dark {'));
  const map = new Map();
  for (const [, name, hex] of root.matchAll(/(--ow-[a-z-]+):\s*(#[0-9a-f]{6})/gi)) {
    map.set(name, hex);
  }
  return map;
}

// The cascade a consumer actually gets under .dark: the light ramp with the
// dark block's overrides applied over it, not the dark declarations alone.
function darkTokens() {
  const start = TOKENS.indexOf('.dark {');
  const dark = TOKENS.slice(start, TOKENS.indexOf('}', start));
  const map = lightTokens();
  for (const [, name, hex] of dark.matchAll(/(--ow-[a-z-]+):\s*(#[0-9a-f]{6})/gi)) {
    map.set(name, hex);
  }
  return map;
}

function channel(byte) {
  const v = byte / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

// The header comment is the source of truth for both the value and the claim.
// "--ow-rosa      4.42:1 on canvas" and "--ow-block-ink  13.96:1 on the block".
function documentedClaims() {
  const claims = [
    ...TOKENS.matchAll(/(--ow-[a-z-]+)\s+([\d.]+):1 on (?:the )?(canvas|block)\b/g),
  ].map(([, token, ratio, surface]) => ({ token, ratio, background: `--ow-${surface}` }));
  // "It reaches 9.73:1 on the dark terminal block." — amarillo's second claim,
  // phrased as prose rather than as a table row, so it needs its own pattern.
  const [, aside] = TOKENS.match(/reaches ([\d.]+):1 on the dark terminal block/) ?? [];
  if (aside) {
    claims.push({ token: '--ow-amarillo', ratio: aside, background: '--ow-block' });
  }
  return claims;
}

// The .dark note states its ratios as "on the dark block" / "against the dark
// canvas", which is what keeps them out of the light set above.
function documentedDarkClaims() {
  return [
    ...TOKENS.matchAll(/(--ow-[a-z-]+)\s+([\d.]+):1 (?:on|against) the dark (canvas|block)\b/g),
  ].map(([, token, ratio, surface]) => ({ token, ratio, background: `--ow-${surface}` }));
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

// The footer is a band, not a page-coloured region: if --ow-block collapses
// onto --ow-canvas the component whose job is to terminate the page stops
// terminating it, and Footer carries no border to fall back on.
test('the block band separates from the canvas in both themes', () => {
  for (const [theme, tokens] of [['light', lightTokens()], ['dark', darkTokens()]]) {
    const ratio = contrast(tokens.get('--ow-block'), tokens.get('--ow-canvas'));
    assert.ok(ratio >= 1.2, `${theme}: --ow-block is ${ratio.toFixed(2)}:1 on --ow-canvas`);
  }
});
