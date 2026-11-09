import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { lint } from '@google/design.md/linter';
import {
  contrast,
  darkTokenHexes,
  fdPrimaryToken,
  fontRoles,
  lengthTokens,
  lightTokenHexes,
} from '../src/internal/derive.mjs';
import { GENERATED_HEADER, generate } from '../scripts/generate-design-md.mjs';

const root = new URL('../', import.meta.url);
const read = (rel) => readFileSync(fileURLToPath(new URL(rel, root)), 'utf8');

function sources(tokensCss = read('src/tokens.css')) {
  return {
    tokensCss,
    fontsCss: read('src/fonts.css'),
    eyebrowSource: read('src/primitives/eyebrow.tsx'),
  };
}

test('DESIGN.md matches a fresh generate from tokens.css', () => {
  const committed = read('DESIGN.md');
  assert.equal(generate(committed, sources()), committed);
});

test('generate opens the front matter with the do-not-edit header', () => {
  const stripped = read('DESIGN.md').replace(`${GENERATED_HEADER.join('\n')}\n`, '');
  const regenerated = generate(stripped, sources());
  assert.ok(
    regenerated.startsWith(`---\n${GENERATED_HEADER.join('\n')}\nversion: alpha\n`),
    'front matter does not open with the generated header',
  );
});

test('generate is idempotent', () => {
  const committed = read('DESIGN.md');
  const once = generate(committed, sources());
  assert.equal(generate(once, sources()), once);
});

test('a hex change in tokens.css fails the drift assertion', () => {
  const committed = read('DESIGN.md');
  const mutated = read('src/tokens.css').replace('#d81e5b', '#000000');
  assert.notEqual(mutated, read('src/tokens.css'), 'the subject hex was not in tokens.css');
  assert.notEqual(generate(committed, sources(mutated)), committed);
});

test('the pinned linter reports no errors and no unexpected warnings', () => {
  const report = lint(read('DESIGN.md'));
  const errors = report.findings.filter((finding) => finding.severity === 'error');
  const warnings = report.findings.filter((finding) => finding.severity === 'warning');
  const unexpected = warnings.filter((finding) => finding.rule !== 'orphaned-tokens');
  assert.equal(errors.length, 0, formatFindings('errors', errors));
  assert.equal(unexpected.length, 0, formatFindings('warnings', unexpected));
});

test('YAML colors include a dark-* key for every light token plus dark-primary', () => {
  const tokensCss = read('src/tokens.css');
  const colors = yamlColors(generate(read('DESIGN.md'), sources(tokensCss)));
  const light = lightTokenHexes(tokensCss);
  const dark = darkTokenHexes(tokensCss);
  assert.ok(light.size > 0, 'tokens.css :root declared no --ow-* hexes');
  for (const [name] of light) {
    const key = `dark-${name.replace(/^--ow-/, '')}`;
    const darkHex = dark.get(name);
    assert.ok(darkHex, `dark cascade missing ${name}`);
    assert.equal(colors[key], darkHex.toLowerCase(), key);
  }
  const darkPrimary = fdPrimaryToken(tokensCss, 'dark');
  assert.ok(darkPrimary, 'tokens.css .dark has no --color-fd-primary');
  assert.equal(colors['dark-primary'], dark.get(darkPrimary).toLowerCase());
});

const APP_FONT_ROLES = {
  meta: { fontSize: '11px', fontWeight: '400', lineHeight: '16px' },
  section: { fontSize: '11px', fontWeight: '600', lineHeight: '16px' },
  label: { fontSize: '12px', fontWeight: '500', lineHeight: '16px' },
  body: { fontSize: '13px', fontWeight: '400', lineHeight: '18px' },
  title: { fontSize: '14px', fontWeight: '600', lineHeight: '20px' },
  code: { fontSize: '12px', fontWeight: '400', lineHeight: '16px' },
};

const APP_LENGTHS = {
  'control-height': '28px',
  'control-height-dense': '24px',
  'row-height': '32px',
  'row-height-dense': '28px',
  'control-padding': '10px',
  'card-padding': '12px',
  'column-min': '260px',
};

test('YAML typography includes app font roles with size, weight, and lineHeight', () => {
  const tokensCss = read('src/tokens.css');
  const generated = generate(read('DESIGN.md'), sources(tokensCss));
  const roles = fontRoles(tokensCss);
  const typography = yamlTypography(generated);
  for (const [role, expected] of Object.entries(APP_FONT_ROLES)) {
    const parsed = roles.get(role);
    assert.ok(parsed, `tokens.css missing --ow-font-${role}`);
    assert.equal(`${parsed.fontSize}`, expected.fontSize, `${role} size`);
    assert.equal(`${parsed.fontWeight}`, expected.fontWeight, `${role} weight`);
    assert.equal(`${parsed.lineHeight}`, expected.lineHeight, `${role} lineHeight`);
    const yaml = typography[role];
    assert.ok(yaml, `missing typography.${role}`);
    assert.equal(yaml.fontSize, expected.fontSize, `yaml ${role} size`);
    assert.equal(yaml.fontWeight, expected.fontWeight, `yaml ${role} weight`);
    assert.equal(yaml.lineHeight, expected.lineHeight, `yaml ${role} lineHeight`);
    assert.ok(yaml.fontFamily, `yaml ${role} fontFamily`);
    assert.equal(yaml.letterSpacing, undefined, `${role} must not emit letterSpacing`);
  }
});

test('YAML spacing includes app length tokens after the Tailwind 1–6 steps', () => {
  const tokensCss = read('src/tokens.css');
  const generated = generate(read('DESIGN.md'), sources(tokensCss));
  const lengths = lengthTokens(tokensCss);
  const spacing = yamlSpacing(generated);
  assert.equal(spacing['1'], '4px');
  assert.equal(spacing['6'], '24px');
  for (const [name, expected] of Object.entries(APP_LENGTHS)) {
    assert.equal(lengths.get(name), expected, `tokens.css --ow-${name}`);
    assert.equal(spacing[name], expected, `yaml spacing.${name}`);
  }
});

function darkColor(ref, colors) {
  const match = ref.match(/^\{colors\.([a-z0-9-]+)\}$/);
  if (!match) return null;
  const name = match[1];
  const key = name.startsWith('dark-') ? name : `dark-${name}`;
  return colors[key];
}

// The pinned linter checks light text/bg pairs. This walks the same YAML and
// resolves each {colors.x} against the dark-* ramp so a dark-only miss fails.
test('each component text/bg pair clears AA on the dark ramp', () => {
  const designMd = read('DESIGN.md');
  const colors = yamlColors(designMd);
  const components = yamlComponents(designMd);
  let pairs = 0;
  for (const [name, props] of Object.entries(components)) {
    const fgRef = props.textColor;
    const bgRef = props.backgroundColor;
    if (!fgRef || !bgRef) continue;
    const fg = darkColor(fgRef, colors);
    const bg = darkColor(bgRef, colors);
    assert.ok(fg, `${name}: ${fgRef} has no dark-* colour`);
    assert.ok(bg, `${name}: ${bgRef} has no dark-* colour`);
    const ratio = contrast(fg, bg);
    assert.ok(
      ratio >= 4.5,
      `dark ${name}: ${fgRef} on ${bgRef} is ${ratio.toFixed(2)}:1, under AA`,
    );
    pairs += 1;
  }
  assert.ok(pairs >= 12, `expected at least 12 text/bg pairs, got ${pairs}`);
});

test('the package exports DESIGN.md', () => {
  const require = createRequire(import.meta.url);
  assert.equal(
    require.resolve('@otto-nation/brand/DESIGN.md'),
    fileURLToPath(new URL('DESIGN.md', root)),
  );
});

function frontMatterBody(designMd) {
  if (!designMd.startsWith('---\n')) {
    throw new Error('DESIGN.md must start with YAML front matter');
  }
  const end = designMd.indexOf('\n---\n', 4);
  if (end === -1) {
    throw new Error('DESIGN.md front matter is not closed');
  }
  return designMd.slice(4, end);
}

function yamlColors(designMd) {
  const colors = {};
  let inColors = false;
  for (const line of frontMatterBody(designMd).split('\n')) {
    if (line === 'colors:') {
      inColors = true;
      continue;
    }
    if (!inColors) continue;
    if (!line.startsWith('  ')) break;
    const match = line.match(/^  ([a-z0-9-]+): "(#[0-9a-f]{6})"$/i);
    assert.ok(match, `unparseable colors entry: ${line}`);
    colors[match[1]] = match[2].toLowerCase();
  }
  return colors;
}

function yamlTypography(designMd) {
  const typography = {};
  let current = null;
  let inTypography = false;
  for (const line of frontMatterBody(designMd).split('\n')) {
    if (line === 'typography:') {
      inTypography = true;
      continue;
    }
    if (!inTypography) continue;
    if (!line.startsWith('  ')) break;
    const role = line.match(/^  ([a-z0-9-]+):$/);
    if (role) {
      current = role[1];
      typography[current] = {};
      continue;
    }
    const prop = line.match(/^    ([a-zA-Z]+): (.+)$/);
    assert.ok(current && prop, `unparseable typography line: ${line}`);
    typography[current][prop[1]] = prop[2].replace(/^"|"$/g, '');
  }
  return typography;
}

function yamlComponents(designMd) {
  const fence = designMd.match(/```yaml\n(components:\n[\s\S]*?)```/);
  assert.ok(fence, 'DESIGN.md missing components YAML fence');
  const components = {};
  let current = null;
  for (const line of fence[1].split('\n')) {
    if (line === 'components:' || line === '') continue;
    const name = line.match(/^  ([a-z0-9-]+):$/);
    if (name) {
      current = name[1];
      components[current] = {};
      continue;
    }
    const prop = line.match(/^    ([a-zA-Z]+): "(.+)"$/);
    assert.ok(current && prop, `unparseable components line: ${line}`);
    components[current][prop[1]] = prop[2];
  }
  return components;
}

function yamlSpacing(designMd) {
  const spacing = {};
  let inSpacing = false;
  for (const line of frontMatterBody(designMd).split('\n')) {
    if (line === 'spacing:') {
      inSpacing = true;
      continue;
    }
    if (!inSpacing) continue;
    if (!line.startsWith('  ')) break;
    const match = line.match(/^  ([a-z0-9-]+): (\S+)$/);
    assert.ok(match, `unparseable spacing entry: ${line}`);
    spacing[match[1]] = match[2];
  }
  return spacing;
}

function formatFindings(label, findings) {
  if (findings.length === 0) return '';
  return `${label}: ${findings.map((finding) => `${finding.rule ?? '?'} ${finding.path ?? ''} ${finding.message}`).join('\n')}`;
}
