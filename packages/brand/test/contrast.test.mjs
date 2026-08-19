import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const TOKENS = readFileSync(
  fileURLToPath(new URL('../src/tokens.css', import.meta.url)),
  'utf8',
);

// Only :root declarations — the .dark block redefines a subset, and the
// documented ratios are all stated against the light ramp or the fixed
// --ow-block surface, neither of which the dark block touches.
function lightTokens() {
  const root = TOKENS.slice(TOKENS.indexOf(':root {'), TOKENS.indexOf('.dark {'));
  const map = new Map();
  for (const [, name, hex] of root.matchAll(/(--ow-[a-z-]+):\s*(#[0-9a-f]{6})/gi)) {
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

test('tokens.css documents at least five contrast claims', () => {
  assert.ok(documentedClaims().length >= 5, 'contrast claims disappeared from the header');
});

test('every documented contrast ratio matches the computed one', () => {
  const tokens = lightTokens();
  for (const { token, ratio, background } of documentedClaims()) {
    const fg = tokens.get(token);
    const bg = tokens.get(background);
    assert.ok(fg, `${token} is claimed but not declared`);
    assert.ok(bg, `${background} is claimed but not declared`);
    assert.equal(
      contrast(fg, bg).toFixed(2),
      Number(ratio).toFixed(2),
      `${token} on ${background}: header says ${ratio}:1, hexes compute ${contrast(fg, bg).toFixed(2)}:1`,
    );
  }
});

test('body copy tokens clear the 4.5:1 AA floor on their surface', () => {
  const tokens = lightTokens();
  assert.ok(contrast(tokens.get('--ow-ink'), tokens.get('--ow-canvas')) >= 4.5);
  assert.ok(contrast(tokens.get('--ow-ink-muted'), tokens.get('--ow-canvas')) >= 4.5);
  assert.ok(contrast(tokens.get('--ow-block-ink'), tokens.get('--ow-block')) >= 4.5);
});
