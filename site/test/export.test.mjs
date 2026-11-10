import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
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

const STATUS_SPECIMENS = {
  pass: { char: '\u2713', label: 'Passed', token: '--ow-done' },
  fail: { char: '\u00D7', label: 'Failed', token: '--ow-danger' },
  running: { char: '\u2026', label: 'Running', token: '--ow-info' },
  warn: { char: '!', label: 'Warning', token: '--ow-warn' },
  none: { char: '\u00B7', label: 'None', token: '--ow-ink-muted' },
};

test('the /ui specimen renders SectionLabel and ActionButton', () => {
  const html = readFileSync(UI_HTML_PATH, 'utf8');
  const label = section(html, 'section-label');
  assert.ok(label.includes('Open'), 'section label text missing');
  assert.ok(label.includes('--ow-font-section'), 'section font token missing');
  assert.ok(label.includes('--ow-ink-muted'), 'section ink-muted token missing');
  assert.ok(!label.includes('--ow-font-meta'), 'count-less label used meta role');
  const counted = section(html, 'section-label-count');
  assert.ok(counted.includes('Open'), 'counted section label text missing');
  assert.ok(counted.includes('3'), 'section count missing');
  assert.ok(counted.includes('--ow-font-meta'), 'count meta font token missing');

  for (const variant of ['solid', 'outline', 'ghost']) {
    for (const state of ['rest', 'dense', 'disabled']) {
      const block = section(html, `action-${variant}-${state}`);
      const button = block.match(/<button\b[^>]*>/)?.[0];
      assert.ok(button, `${variant} ${state} is not a button`);
      assert.ok(block.includes('Action'), `${variant} ${state} label missing`);
      assert.doesNotMatch(
        button,
        /hover:border/,
        `${variant} ${state} changes the border on hover`,
      );
      if (state === 'disabled') {
        assert.match(button, /\bdisabled\b/, `${variant} disabled is not disabled`);
      } else {
        assert.doesNotMatch(
          button,
          /\bdisabled\b/,
          `${variant} ${state} should not be disabled`,
        );
      }
      if (state === 'dense') {
        assert.ok(
          block.includes('--ow-control-height-dense'),
          `${variant} dense height token missing`,
        );
      } else {
        assert.ok(
          block.includes('--ow-control-height') &&
            !block.includes('--ow-control-height-dense'),
          `${variant} ${state} should use control-height`,
        );
      }
      const pressed =
        (variant === 'outline' || variant === 'ghost') && state !== 'disabled';
      if (pressed) {
        assert.ok(
          button.includes('hover:bg-[var(--ow-hover)]'),
          `${variant} ${state} missing hover fill`,
        );
        assert.ok(
          button.includes('active:bg-[var(--ow-selected)]'),
          `${variant} ${state} missing pressed fill`,
        );
      } else {
        assert.doesNotMatch(
          button,
          /active:bg-\[var\(--ow-selected\)\]/,
          `${variant} ${state} should not paint pressed fill`,
        );
      }
    }
  }
});

test('the /ui specimen renders page-size Button and Button size=app', () => {
  const html = readFileSync(UI_HTML_PATH, 'utf8');

  const pageSolid = section(html, 'button-page-solid');
  const pageSolidControl = pageSolid.match(/<(?:a|button)\b[^>]*>/)?.[0];
  assert.ok(pageSolidControl, 'page solid control missing');
  assert.ok(pageSolid.includes('Page solid'), 'page solid label missing');
  assert.ok(pageSolid.includes('--ow-space-4'), 'page solid space-4 missing');
  assert.ok(pageSolid.includes('--ow-space-2'), 'page solid space-2 missing');
  assert.ok(pageSolid.includes('--ow-radius-md'), 'page solid radius-md missing');
  assert.ok(
    pageSolid.includes('--ow-ink') && pageSolid.includes('--ow-canvas'),
    'page solid fill missing',
  );
  assert.ok(!pageSolid.includes('--ow-control-height'), 'page solid used app height');
  assert.doesNotMatch(
    pageSolidControl,
    /hover:bg-\[var\(--ow-hover\)\]/,
    'page solid should not hover-fill',
  );
  assert.doesNotMatch(
    pageSolidControl,
    /active:bg-\[var\(--ow-selected\)\]/,
    'page solid should not paint pressed fill',
  );

  const pageOutline = section(html, 'button-page-outline');
  const pageOutlineControl = pageOutline.match(/<(?:a|button)\b[^>]*>/)?.[0];
  assert.ok(pageOutlineControl, 'page outline control missing');
  assert.ok(pageOutline.includes('Page outline'), 'page outline label missing');
  assert.ok(
    pageOutlineControl.includes('hover:bg-[var(--ow-hover)]'),
    'page outline missing hover fill',
  );
  assert.ok(
    pageOutlineControl.includes('active:bg-[var(--ow-selected)]'),
    'page outline missing pressed fill',
  );
  assert.ok(!pageOutline.includes('--ow-control-height'), 'page outline used app height');

  const pageLink = section(html, 'button-page-link');
  assert.match(pageLink, /<a\b/, 'page link is not an anchor');
  assert.doesNotMatch(pageLink, /<button\b/, 'page link rendered a button');
  assert.ok(pageLink.includes('Page link'), 'page link label missing');
  assert.match(pageLink, /href="\/ui\/?"/, 'page link href missing');

  const pageOnDark = section(html, 'button-page-ondark');
  const pageOnDarkControl = pageOnDark.match(/<(?:a|button)\b[^>]*>/)?.[0];
  assert.ok(pageOnDarkControl, 'page onDark control missing');
  assert.ok(pageOnDark.includes('Page onDark'), 'page onDark label missing');
  assert.ok(pageOnDark.includes('--ow-block-ink'), 'page onDark fill missing');
  assert.doesNotMatch(
    pageOnDarkControl,
    /hover:bg-\[var\(--ow-hover\)\]/,
    'page onDark should not hover-fill',
  );
  assert.doesNotMatch(
    pageOnDarkControl,
    /active:bg-\[var\(--ow-selected\)\]/,
    'page onDark should not paint pressed fill',
  );

  for (const variant of ['solid', 'outline', 'ghost']) {
    for (const state of ['rest', 'dense', 'disabled']) {
      const block = section(html, `button-app-${variant}-${state}`);
      const button = block.match(/<button\b[^>]*>/)?.[0];
      assert.ok(button, `app ${variant} ${state} is not a button`);
      assert.ok(block.includes('App'), `app ${variant} ${state} label missing`);
      assert.ok(
        block.includes('--ow-font-label'),
        `app ${variant} ${state} label font missing`,
      );
      const pressed =
        (variant === 'outline' || variant === 'ghost') && state !== 'disabled';
      if (pressed) {
        assert.ok(
          button.includes('active:bg-[var(--ow-selected)]'),
          `app ${variant} ${state} missing pressed fill`,
        );
      } else {
        assert.doesNotMatch(
          button,
          /active:bg-\[var\(--ow-selected\)\]/,
          `app ${variant} ${state} should not paint pressed fill`,
        );
      }
    }
  }

  const pageDanger = section(html, 'button-page-danger');
  const pageDangerControl = pageDanger.match(/<(?:a|button)\b[^>]*>/)?.[0];
  assert.ok(pageDangerControl, 'page danger control missing');
  assert.match(pageDangerControl, /<button\b/, 'page danger is not a button');
  assert.ok(pageDanger.includes('Delete'), 'page danger label missing');
  assert.ok(
    pageDangerControl.includes('bg-[var(--ow-danger)]') &&
      pageDangerControl.includes('text-[var(--ow-canvas)]'),
    'page danger fill missing',
  );
  assert.doesNotMatch(
    pageDangerControl,
    /hover:bg-/,
    'page danger should not hover-fill',
  );
  assert.doesNotMatch(
    pageDangerControl,
    /active:bg-/,
    'page danger should not paint pressed fill',
  );

  for (const state of ['rest', 'disabled']) {
    const block = section(html, `button-app-danger-${state}`);
    const button = block.match(/<button\b[^>]*>/)?.[0];
    assert.ok(button, `app danger ${state} is not a button`);
    assert.ok(block.includes('Delete'), `app danger ${state} label missing`);
    assert.ok(
      button.includes('bg-[var(--ow-danger)]') &&
        button.includes('text-[var(--ow-canvas)]'),
      `app danger ${state} fill missing`,
    );
    assert.doesNotMatch(
      button,
      /hover:bg-/,
      `app danger ${state} should not hover-fill`,
    );
    assert.doesNotMatch(
      button,
      /active:bg-/,
      `app danger ${state} should not paint pressed fill`,
    );
    if (state === 'disabled') {
      assert.match(button, /\bdisabled\b/, 'app danger disabled is not disabled');
      assert.ok(
        button.includes('opacity-50'),
        'app danger disabled missing opacity-50',
      );
    }
  }
});

test('the /ui specimen renders SegmentedControl and ListRow', () => {
  const html = readFileSync(UI_HTML_PATH, 'utf8');

  for (const id of ['segmented', 'segmented-dense']) {
    const block = section(html, id);
    assert.match(block, /role="group"/);
    assert.match(block, /aria-label="Status"/);
    assert.ok(block.includes('--ow-hairline'), `${id} track hairline missing`);
    assert.ok(block.includes('--ow-font-label'), `${id} label font missing`);
    const buttons = [...block.matchAll(/<button\b[^>]*>/g)].map((match) => match[0]);
    assert.equal(buttons.length, 3, `${id} should have three segments`);
    const pressed = buttons.filter((tag) => /aria-pressed="true"/.test(tag));
    assert.equal(pressed.length, 1, `${id} should have exactly one pressed segment`);
    assert.ok(
      pressed[0].includes('bg-[var(--ow-ink)]') &&
        pressed[0].includes('text-[var(--ow-canvas)]'),
      `${id} pressed segment is not ink fill with canvas text`,
    );
    const rest = buttons.filter((tag) => !/aria-pressed="true"/.test(tag));
    for (const tag of rest) {
      assert.match(tag, /aria-pressed="false"/, `${id} rest segment missing aria-pressed=false`);
      assert.ok(tag.includes('--ow-ink-muted'), `${id} rest segment ink-muted missing`);
      assert.ok(tag.includes('--ow-hover'), `${id} rest segment hover fill missing`);
      assert.doesNotMatch(tag, /hover:border/, `${id} rest segment changes the border on hover`);
    }
    if (id === 'segmented-dense') {
      assert.ok(
        block.includes('--ow-control-height-dense'),
        'segmented dense height token missing',
      );
    } else {
      assert.ok(
        block.includes('--ow-control-height') &&
          !block.includes('--ow-control-height-dense'),
        'segmented rest should use control-height',
      );
    }
  }

  const restRow = section(html, 'list-row-rest');
  assert.ok(restRow.includes('otto-nation/brand'), 'list-row text missing');
  assert.ok(restRow.includes('--ow-font-body'), 'list-row body font missing');
  assert.ok(
    restRow.includes('--ow-row-height') && !restRow.includes('--ow-row-height-dense'),
    'list-row rest should use row-height',
  );
  assert.ok(restRow.includes('--ow-hover'), 'list-row rest hover fill missing');
  assert.doesNotMatch(restRow, /aria-current="true"/);
  assert.ok(!restRow.includes('--ow-selected'), 'rest row used selected fill');
  assert.ok(!restRow.includes('--color-fd-primary'), 'rest row used the selected left rule');

  const denseRow = section(html, 'list-row-dense');
  assert.ok(
    denseRow.includes('--ow-row-height-dense'),
    'list-row dense height token missing',
  );

  const selectedRow = section(html, 'list-row-selected');
  assert.match(selectedRow, /aria-current="true"/);
  assert.ok(selectedRow.includes('--ow-selected'), 'selected row fill missing');
  assert.ok(
    selectedRow.includes('border-l-[length:var(--ow-rule-selected)]') &&
      selectedRow.includes('border-l-[var(--color-fd-primary)]'),
    'selected row left rule missing',
  );
});

test('the /ui specimen renders AppCard and Input', () => {
  const html = readFileSync(UI_HTML_PATH, 'utf8');

  const card = section(html, 'app-card-card');
  assert.ok(card.includes('card body'), 'app-card body missing');
  assert.ok(card.includes('--ow-surface'), 'app-card surface fill missing');
  assert.ok(card.includes('--ow-card-padding'), 'app-card padding missing');
  assert.ok(card.includes('--ow-font-body'), 'app-card body font missing');
  assert.match(card, /border-\[var\(--ow-hairline\)\]/);
  assert.doesNotMatch(card, /border-\[var\(--ow-outline\)\]/);
  assert.ok(!card.includes('--ow-font-title'), 'untitled card used title role');

  const popover = section(html, 'app-card-popover');
  assert.ok(popover.includes('popover body'), 'popover body missing');
  assert.ok(popover.includes('--ow-surface'), 'popover surface fill missing');
  assert.ok(popover.includes('--ow-card-padding'), 'popover padding missing');
  assert.match(popover, /border-\[var\(--ow-outline\)\]/);
  assert.doesNotMatch(popover, /border-\[var\(--ow-hairline\)\]/);

  const titled = section(html, 'app-card-title');
  assert.ok(titled.includes('Pane'), 'app-card title missing');
  assert.ok(titled.includes('Card body'), 'titled app-card body missing');
  assert.ok(titled.includes('--ow-font-title'), 'app-card title font missing');
  assert.match(titled, /border-\[var\(--ow-hairline\)\]/);

  for (const state of ['rest', 'dense', 'disabled']) {
    const block = section(html, `input-${state}`);
    const input = block.match(/<input\b[^>]*>/)?.[0];
    assert.ok(input, `${state} is not an input`);
    assert.match(input, /border-\[var\(--ow-outline\)\]/);
    assert.doesNotMatch(input, /focus-visible/, `${state} input has a focus class`);
    assert.doesNotMatch(input, /hover:border/, `${state} input changes the border on hover`);
    assert.ok(input.includes('--ow-font-body'), `${state} input body font missing`);
    if (state === 'disabled') {
      assert.match(input, /\bdisabled\b/, 'disabled input is not disabled');
      assert.ok(input.includes('--ow-ink-muted'), 'disabled input ink-muted missing');
    } else {
      assert.doesNotMatch(input, /\bdisabled\b/, `${state} input should not be disabled`);
    }
    if (state === 'dense') {
      assert.ok(
        input.includes('--ow-control-height-dense'),
        'input dense height token missing',
      );
    } else {
      assert.ok(
        input.includes('--ow-control-height') &&
          !input.includes('--ow-control-height-dense'),
        `${state} input should use control-height`,
      );
    }
  }
});

test('the /ui specimen renders Textarea and Select', () => {
  const html = readFileSync(UI_HTML_PATH, 'utf8');

  for (const state of ['rest', 'disabled', 'invalid']) {
    const block = section(html, `textarea-${state}`);
    const control = block.match(/<textarea\b[^>]*>/)?.[0];
    assert.ok(control, `${state} is not a textarea`);
    assert.match(control, /border-\[var\(--ow-outline\)\]/);
    assert.ok(control.includes('--ow-font-body'), `${state} textarea body font missing`);
    assert.ok(control.includes('--ow-space-1'), `${state} textarea space-1 missing`);
    assert.doesNotMatch(
      control,
      /focus-visible/,
      `${state} textarea has a focus class`,
    );
    assert.doesNotMatch(
      control,
      /hover:border/,
      `${state} textarea changes the border on hover`,
    );
    if (state === 'disabled') {
      assert.match(control, /\bdisabled\b/, 'disabled textarea is not disabled');
      assert.ok(
        control.includes('--ow-ink-muted'),
        'disabled textarea ink-muted missing',
      );
    } else {
      assert.doesNotMatch(
        control,
        /\bdisabled\b/,
        `${state} textarea should not be disabled`,
      );
    }
    if (state === 'invalid') {
      assert.match(
        control,
        /aria-invalid="true"/,
        'invalid textarea missing aria-invalid',
      );
      assert.ok(
        control.includes('aria-[invalid=true]:border-[var(--ow-danger)]'),
        'invalid textarea missing danger edge class',
      );
    }
  }

  for (const state of ['rest', 'dense', 'disabled']) {
    const block = section(html, `select-${state}`);
    assert.match(block, /<select\b/, `${state} is not a select`);
    const control = block.match(/<select\b[^>]*>/)?.[0];
    assert.ok(control, `${state} select tag missing`);
    assert.ok(
      control.includes('appearance-none'),
      `${state} select missing appearance-none`,
    );
    assert.match(
      block,
      /<svg\b[^>]*aria-hidden="true"/,
      `${state} select chevron missing aria-hidden`,
    );
    assert.ok(
      block.includes('--ow-ink-muted'),
      `${state} select chevron ink-muted missing`,
    );
    const options = [...block.matchAll(/<option\b/g)];
    assert.equal(options.length, 3, `${state} select should have three options`);
    if (state === 'disabled') {
      assert.match(control, /\bdisabled\b/, 'disabled select is not disabled');
    } else {
      assert.doesNotMatch(
        control,
        /\bdisabled\b/,
        `${state} select should not be disabled`,
      );
    }
    if (state === 'dense') {
      assert.ok(
        control.includes('--ow-control-height-dense'),
        'select dense height token missing',
      );
    } else {
      assert.ok(
        control.includes('--ow-control-height') &&
          !control.includes('--ow-control-height-dense'),
        `${state} select should use control-height`,
      );
    }
  }
});

test('the /ui specimen renders Field and Input invalid', () => {
  const html = readFileSync(UI_HTML_PATH, 'utf8');

  const hint = section(html, 'field-hint');
  assert.match(hint, /<label\b[^>]*\bfor="spec-title"/);
  assert.ok(hint.includes('--ow-font-label'), 'field-hint label font missing');
  assert.ok(hint.includes('--ow-font-meta'), 'field-hint meta font missing');
  const hintControl = hint.match(/<input\b[^>]*>/)?.[0];
  assert.ok(hintControl, 'field-hint control is not an input');
  assert.match(hintControl, /\bid="spec-title"/);
  assert.match(hintControl, /aria-describedby="spec-title-hint"/);
  assert.match(hint, /\bid="spec-title-hint"/);

  const error = section(html, 'field-error');
  assert.match(error, /<label\b[^>]*\bfor="spec-notes"/);
  assert.ok(error.includes('--ow-font-label'), 'field-error label font missing');
  assert.ok(error.includes('--ow-font-meta'), 'field-error meta font missing');
  assert.ok(error.includes('--ow-danger'), 'field-error danger token missing');
  assert.ok(!error.includes('spec-notes-hint'), 'field-error still rendered a hint');
  const errorControl = error.match(/<textarea\b[^>]*>/)?.[0];
  assert.ok(errorControl, 'field-error control is not a textarea');
  assert.match(errorControl, /\bid="spec-notes"/);
  assert.match(errorControl, /aria-describedby="spec-notes-error"/);
  assert.match(errorControl, /aria-invalid="true"/);
  assert.match(error, /\bid="spec-notes-error"/);

  const invalid = section(html, 'input-invalid');
  const invalidControl = invalid.match(/<input\b[^>]*>/)?.[0];
  assert.ok(invalidControl, 'input-invalid is not an input');
  assert.match(invalidControl, /aria-invalid="true"/);
  assert.ok(
    invalidControl.includes('aria-[invalid=true]:border-[var(--ow-danger)]'),
    'input-invalid missing danger edge class',
  );
});

test('the /ui specimen renders IconButton and Checkbox', () => {
  const html = readFileSync(UI_HTML_PATH, 'utf8');

  for (const state of ['rest', 'dense', 'pressed', 'danger', 'disabled']) {
    const block = section(html, `icon-button-${state}`);
    const button = block.match(/<button\b[^>]*>/)?.[0];
    assert.ok(button, `icon-button ${state} is not a button`);
    assert.match(button, /aria-label="Close"/);
    assert.match(block, /<span\b[^>]*aria-hidden="true"/);
    assert.match(button, /border-\[var\(--ow-outline\)\]/);
    if (state === 'dense') {
      assert.ok(
        button.includes('size-[var(--ow-control-height-dense)]'),
        'icon-button dense missing size-[control-height-dense]',
      );
    } else {
      assert.ok(
        button.includes('size-[var(--ow-control-height)]') &&
          !button.includes('--ow-control-height-dense'),
        `icon-button ${state} should use size-[control-height]`,
      );
    }
    if (state === 'rest') {
      assert.ok(
        button.includes('hover:bg-[var(--ow-hover)]'),
        'icon-button rest missing hover fill',
      );
      assert.ok(
        button.includes('active:bg-[var(--ow-selected)]'),
        'icon-button rest missing pressed fill',
      );
    }
    if (state === 'pressed') {
      assert.match(button, /aria-pressed="true"/);
      assert.ok(
        button.includes('bg-[var(--ow-ink)]') &&
          button.includes('text-[var(--ow-canvas)]'),
        'icon-button pressed fill missing',
      );
      assert.doesNotMatch(
        button,
        /hover:bg-/,
        'icon-button pressed should not hover-fill',
      );
    }
    if (state === 'danger') {
      assert.ok(button.includes('--ow-danger'), 'icon-button danger token missing');
    }
    if (state === 'disabled') {
      assert.match(button, /\bdisabled\b/, 'icon-button disabled is not disabled');
    }
  }

  for (const state of ['rest', 'checked', 'disabled', 'bare']) {
    const block = section(html, `checkbox-${state}`);
    const input = block.match(/<input\b[^>]*>/)?.[0];
    assert.ok(input, `checkbox ${state} is not an input`);
    assert.match(input, /type="checkbox"/);
    assert.ok(input.includes('appearance-none'), `${state} missing appearance-none`);
    assert.ok(input.includes('--ow-radius-sm'), `${state} missing radius-sm`);
    assert.match(input, /border-\[var\(--ow-outline\)\]/);
    assert.ok(
      input.includes('checked:bg-[var(--ow-anil)]'),
      `${state} missing checked anil fill`,
    );
    assert.match(
      input,
      /(?:^|[\s"'`])peer(?:[\s"'`]|$)/,
      `${state} input missing peer`,
    );
    assert.match(
      block,
      /<svg\b[^>]*aria-hidden="true"/,
      `${state} check svg missing aria-hidden`,
    );
    assert.ok(
      block.includes('peer-checked:visible'),
      `${state} check svg missing peer-checked:visible`,
    );
    if (state === 'bare') {
      assert.doesNotMatch(block, /<label\b/, 'bare checkbox wrapped in a label');
    } else {
      assert.match(block, /<label\b/, `${state} checkbox is not wrapped in a label`);
    }
    if (state === 'checked') {
      assert.match(input, /\bchecked\b/, 'checked checkbox did not render checked');
    }
    if (state === 'disabled') {
      assert.match(input, /\bdisabled\b/, 'disabled checkbox is not disabled');
    }
  }
});

test('the /ui page has unique ids', () => {
  const html = readFileSync(UI_HTML_PATH, 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const counts = new Map();
  for (const id of ids) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const dupes = [...counts.entries()].filter(([, n]) => n > 1);
  assert.equal(
    dupes.length,
    0,
    `duplicate ids: ${dupes.map(([id, n]) => `${id}×${n}`).join(', ')}`,
  );
});

test('the /ui specimen renders StateMessage', () => {
  const html = readFileSync(UI_HTML_PATH, 'utf8');

  const empty = section(html, 'state-empty');
  assert.ok(empty.includes('No pull requests'), 'empty copy missing');
  assert.ok(empty.includes('--ow-ink-muted'), 'empty ink-muted missing');
  assert.ok(empty.includes('--ow-font-body'), 'empty body font missing');
  assert.ok(empty.includes('text-center'), 'empty is not centred');
  assert.doesNotMatch(empty, /role="status"/);
  assert.doesNotMatch(empty, /role="alert"/);

  const loading = section(html, 'state-loading');
  assert.match(loading, /role="status"/);
  assert.ok(loading.includes('--ow-ink-muted'), 'loading ink-muted missing');
  assert.ok(loading.includes('Loading'), 'loading copy missing');
  assert.ok(loading.includes('\u2026'), 'loading is missing U+2026');

  const stale = section(html, 'state-stale');
  assert.match(stale, /role="status"/);
  assert.ok(stale.includes('--ow-warn'), 'stale warn token missing');
  assert.ok(stale.includes('stale 2m ago'), 'stale copy missing');

  const error = section(html, 'state-error');
  assert.match(error, /role="alert"/);
  assert.ok(error.includes('--ow-danger'), 'error danger token missing');
  assert.ok(error.includes('Could not load pull requests'), 'error copy missing');
  assert.ok(error.includes('Retry'), 'error retry action missing');
  assert.match(error, /border-\[var\(--ow-hairline\)\]/);
});

test('the /ui specimen renders Dialog and Toast', () => {
  const html = readFileSync(UI_HTML_PATH, 'utf8');
  const dialogBlock = section(html, 'dialog-specimen');
  const labelledby = dialogBlock.match(/aria-labelledby="([^"]+)"/)?.[1];
  assert.ok(labelledby, 'dialog missing aria-labelledby');
  assert.match(
    dialogBlock,
    new RegExp(`<h2\\b[^>]*id="${labelledby}"`),
    'aria-labelledby does not match the h2 id',
  );
  assert.match(dialogBlock, /<form\b[^>]*method="dialog"/);
  assert.match(dialogBlock, /\bopen\b/);
  assert.ok(dialogBlock.includes('m-auto'), 'dialog missing m-auto');
  assert.ok(
    dialogBlock.includes('backdrop:bg-[var(--ow-scrim)]'),
    'dialog missing backdrop scrim class',
  );
  assert.doesNotMatch(dialogBlock, /shadow/);

  const info = section(html, 'toast-info');
  assert.match(info, /role="status"/);
  assert.doesNotMatch(info, /role="alert"/);

  const fail = section(html, 'toast-fail');
  assert.match(fail, /role="alert"/);
});

test('the /ui specimen renders StatusGlyph and Tag', () => {
  const html = readFileSync(UI_HTML_PATH, 'utf8');
  for (const [status, { char, label, token }] of Object.entries(STATUS_SPECIMENS)) {
    const block = section(html, `status-${status}`);
    assert.ok(block.includes(char), `${status} glyph missing`);
    assert.ok(block.includes(label), `${status} label missing`);
    assert.ok(block.includes(token), `${status} colour token missing`);
  }
  const hidden = section(html, 'status-pass-sr');
  assert.ok(hidden.includes('\u2713'), 'sr-only pass glyph missing');
  assert.ok(hidden.includes('sr-only'), 'showLabel={false} did not emit sr-only');
  const tag = section(html, 'tag');
  assert.match(tag, /border-\[var\(--ow-hairline\)\]/);
  assert.doesNotMatch(tag, /\bbg-/);
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

test('landing-page linked cards hover with a fill, never a border', () => {
  assert.doesNotMatch(INDEX_HTML, /hover:border/, 'index.html changes a border on hover');
  const cards = [...INDEX_HTML.matchAll(/<a\b[^>]*>/g)]
    .map((match) => match[0])
    .filter(
      (tag) =>
        tag.includes('-m-[var(--ow-space-4)]') &&
        tag.includes('rounded-[var(--ow-radius-lg)]'),
    );
  assert.ok(cards.length >= 3, `expected linked property cards, got ${cards.length}`);
  for (const tag of cards) {
    assert.ok(
      tag.includes('hover:bg-[var(--ow-hover)]'),
      'linked card missing hover fill',
    );
  }
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

test('the built CSS carries a dialog ::backdrop rule naming --ow-scrim', () => {
  const staticDir = join(OUT_DIR, '_next', 'static');
  const cssFiles = readdirSync(staticDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
    .map((entry) => join(entry.parentPath, entry.name));
  const css = cssFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
  assert.match(css, /::backdrop\s*\{[^}]*--ow-scrim/);
});

test('site/app/icon.svg byte-equals the brand icon.svg export', () => {
  const require = createRequire(import.meta.url);
  const exported = readFileSync(require.resolve('@otto-nation/brand/icon.svg'));
  const siteIcon = readFileSync(fileURLToPath(new URL('../app/icon.svg', import.meta.url)));
  assert.ok(
    exported.equals(siteIcon),
    'site/app/icon.svg drifted from @otto-nation/brand/icon.svg',
  );
});
