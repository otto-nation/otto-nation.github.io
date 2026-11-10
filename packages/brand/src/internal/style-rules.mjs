// Internal to the package: not in the barrel, and the exports map carries no
// wildcard, so a consumer importing this path gets ERR_PACKAGE_PATH_NOT_EXPORTED.
//
// One owner for every style regex otto-brand-check and the brand source test
// share. Token-name patterns interpolate OW_TOKEN from derive.mjs so a prefix
// rename cannot leave this file matching a different set of names.

import { OW_TOKEN } from './derive.mjs';

const COLOR_FNS = String.raw`(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)`;
const HEX = String.raw`#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})`;
const HEX_FIND = new RegExp(String.raw`(?<![&\w#./])${HEX}(?![\w-])`, 'g');
const COLOR_FN_FIND = new RegExp(String.raw`\b${COLOR_FNS}\(\s*(?!from\s+var\(|var\()`, 'gi');

const PILL_UTILITY =
  /(?:^|[\s"'`:])(?:[\w-]+:)*rounded(?:-[trblxyse]{1,2})?-full(?=[\s"'`]|$)/g;
const PILL_ARBITRARY =
  /rounded(?:-[trblxyse]{1,2})?-\[(?:9999px|50%|100%)\]/g;
const PILL_CSS =
  /border(?:-[\w]+)*-radius\s*:[^;{}]*(?:9999px|50%|100%)/g;

const HOVER_BORDER_UTILITY = /\bhover:border\b/g;

const OUTLINE_REMOVED = /(?:[\w-]+:)*outline-(?:none|hidden|0)\b/g;
const FOCUS_RING =
  /(?:[\w-]+:)*(?:focus-visible:outline-(?!none\b|hidden\b|0\b)|focus-visible:ring-(?!0\b|offset-)|focus:ring-(?!0\b|offset-))/;

const TOKEN_DECL = new RegExp(String.raw`(?<![\w-])(${OW_TOKEN})\s*:`, 'g');
const TOKEN_SET_PROPERTY = new RegExp(String.raw`setProperty\s*\(\s*['"](${OW_TOKEN})['"]`, 'g');
const TOKEN_INDEX = new RegExp(String.raw`\[\s*['"](${OW_TOKEN})['"]\s*\]`, 'g');

const TW_PREFIX =
  'bg|text|decoration|border|outline|shadow|inset-shadow|ring|inset-ring|ring-offset|from|via|to|fill|stroke|accent|caret|divide|placeholder';
const TW_CHROMA =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const PALETTE_BOUNDARY = '(?=[' + ['\\s', '"', "'", '`'].join('') + ']|$)';
const PALETTE_UTILITY = new RegExp(
  String.raw`\b(?:[\w-]+:)*(?:(?:${TW_PREFIX})-(?:black|white)(?:/\d{1,3})?|(?:${TW_PREFIX})-(?:${TW_CHROMA})-(?:50|100|200|300|400|500|600|700|800|900|950)(?:/\d{1,3})?)` +
    PALETTE_BOUNDARY,
  'g',
);

const CSS_NAMED_COLORS =
  'aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen';
const CSS_NAMED = new RegExp(String.raw`(?<![\w-])(?:${CSS_NAMED_COLORS})(?![\w-])`, 'gi');

const NAMED_RADIUS =
  /(?:^|[\s"'`])rounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full))?(?=[\s"'`]|$)/g;
const ARBITRARY_RADIUS = /rounded-\[(?!var\(--ow-radius-[a-z]+\))/g;
const LITERAL_BORDER_LEFT = /border-l-\[\d+px\]/g;
const LITERAL_SOLID = /\d+px\s+solid/g;
const NUMERIC_SPACING =
  /(?:^|[\s"'`])-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y)-[1-6](?=[\s"'`]|$)/g;

function indexes(text, regex) {
  const hits = [];
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(text))) {
    hits.push(match.index);
    if (match[0].length === 0) regex.lastIndex++;
  }
  return hits;
}

function skipQuoted(text, start) {
  const quote = text[start];
  let i = start + 1;
  while (i < text.length && text[i] !== quote && text[i] !== '\n') {
    if (text[i] === '\\') i += 2;
    else i++;
  }
  return i < text.length ? i + 1 : i;
}

function skipBalanced(text, start, open, close) {
  let depth = 0;
  let i = start;
  while (i < text.length) {
    const char = text[i];
    if (char === "'" || char === '"') {
      i = skipQuoted(text, i);
      continue;
    }
    if (char === open) depth++;
    else if (char === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return text.length;
}

export function maskComments(source) {
  const out = source.split('');
  const blank = (from, to) => {
    for (let i = from; i < to; i++) {
      if (source[i] !== '\n') out[i] = ' ';
    }
  };
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (char === "'" || char === '"') {
      i = skipQuoted(source, i);
      continue;
    }
    if (char === '/' && source[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i + 1 < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++;
      if (i + 1 < source.length && source[i] === '*' && source[i + 1] === '/') {
        i += 2;
        blank(start, i);
        continue;
      }
      i = start + 1;
      continue;
    }
    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4);
      if (end === -1) {
        i += 1;
        continue;
      }
      const start = i;
      i = end + 3;
      blank(start, i);
      continue;
    }
    if (i === 0 || source[i - 1] === '\n') {
      let j = i;
      while (j < source.length && (source[j] === ' ' || source[j] === '\t')) j++;
      if (source[j] === '/' && source[j + 1] === '/') {
        const eol = source.indexOf('\n', i);
        const end = eol === -1 ? source.length : eol;
        blank(i, end);
        i = end === source.length ? end : end + 1;
        continue;
      }
    }
    i++;
  }
  return out.join('');
}

function indexToLineColumn(source, index) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index; i++) {
    if (source[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

function forEachStringLiteral(text, visit) {
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === "'" || char === '"') {
      const start = i;
      const end = skipQuoted(text, i);
      visit(start, end);
      i = end;
      continue;
    }
    if (char === '`') {
      let j = i + 1;
      let part = i;
      while (j < text.length && text[j] !== '`') {
        if (text[j] === '\\') {
          j += 2;
          continue;
        }
        if (text[j] === '$' && text[j + 1] === '{') {
          if (j > part) visit(part, j);
          const exprEnd = skipBalanced(text, j + 1, '{', '}');
          forEachStringLiteral(text.slice(j + 2, exprEnd - 1), (innerStart, innerEnd) => {
            visit(j + 2 + innerStart, j + 2 + innerEnd);
          });
          j = exprEnd;
          part = j;
          continue;
        }
        j++;
      }
      if (j > part) visit(part, j < text.length ? j + 1 : j);
      i = j < text.length ? j + 1 : j;
      continue;
    }
    i++;
  }
}

function isAnchorAttr(text, stringStart) {
  return /(?:href|to|id)\s*=\s*\{?\s*$/.test(text.slice(0, stringStart));
}

function literalColorInRange(text, start, end, hits) {
  const slice = text.slice(start, end);
  for (const index of indexes(slice, HEX_FIND)) hits.push(start + index);
  for (const index of indexes(slice, COLOR_FN_FIND)) hits.push(start + index);
}

function eachCssDeclarationValue(text, visit) {
  let i = 0;
  let depth = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === "'" || char === '"') {
      i = skipQuoted(text, i);
      continue;
    }
    if (char === '{') {
      depth++;
      i++;
      continue;
    }
    if (char === '}') {
      if (depth > 0) depth--;
      i++;
      continue;
    }
    if (depth > 0 && /[\w-]/.test(char)) {
      const identStart = i;
      while (i < text.length && /[\w-]/.test(text[i])) i++;
      let j = i;
      while (j < text.length && /[ \t]/.test(text[j])) j++;
      if (text[j] !== ':') continue;
      const valueStart = j + 1;
      let k = valueStart;
      let nested = 0;
      while (k < text.length) {
        if (text[k] === "'" || text[k] === '"') {
          k = skipQuoted(text, k);
          continue;
        }
        if (text[k] === '{') nested++;
        else if (text[k] === '}') {
          if (nested === 0) break;
          nested--;
        } else if (text[k] === ';' && nested === 0) break;
        k++;
      }
      if (nested === 0 && text[k] === ';') {
        visit(valueStart, k);
        i = k + 1;
        continue;
      }
      i = identStart + 1;
      continue;
    }
    i++;
  }
}

function findLiteralColor(text, kind) {
  const hits = [];
  if (kind === 'css') {
    eachCssDeclarationValue(text, (start, end) => literalColorInRange(text, start, end, hits));
    return hits;
  }
  forEachStringLiteral(text, (start, end) => {
    if (isAnchorAttr(text, start)) return;
    literalColorInRange(text, start, end, hits);
  });
  return hits;
}

function eachCssBlock(text, visit) {
  let i = 0;
  while (i < text.length) {
    if (text[i] === "'" || text[i] === '"') {
      i = skipQuoted(text, i);
      continue;
    }
    if (text[i] === '{') {
      let selectorStart = i - 1;
      while (selectorStart >= 0 && text[selectorStart] !== '}' && text[selectorStart] !== '{') {
        selectorStart--;
      }
      const selector = text.slice(selectorStart + 1, i);
      const bodyStart = i + 1;
      const end = skipBalanced(text, i, '{', '}');
      const body = text.slice(bodyStart, end - 1);
      visit(selector, body, bodyStart);
      i = bodyStart;
      continue;
    }
    i++;
  }
}

function topLevelDeclarations(body) {
  const decls = [];
  let i = 0;
  while (i < body.length) {
    if (body[i] === "'" || body[i] === '"') {
      i = skipQuoted(body, i);
      continue;
    }
    if (body[i] === '{') {
      i = skipBalanced(body, i, '{', '}');
      continue;
    }
    if (/[\w-]/.test(body[i])) {
      const nameStart = i;
      while (i < body.length && /[\w-]/.test(body[i])) i++;
      const name = body.slice(nameStart, i);
      let j = i;
      while (j < body.length && /[ \t]/.test(body[j])) j++;
      if (body[j] !== ':') continue;
      const valueStart = j + 1;
      let k = valueStart;
      while (k < body.length && body[k] !== ';' && body[k] !== '{' && body[k] !== '}') k++;
      if (body[k] === ';') {
        decls.push({ name, value: body.slice(valueStart, k), index: nameStart });
        i = k + 1;
        continue;
      }
    }
    i++;
  }
  return decls;
}

function findHoverBorder(text, kind) {
  const hits = indexes(text, HOVER_BORDER_UTILITY);
  if (kind !== 'css') return hits;
  eachCssBlock(text, (selector, body, bodyStart) => {
    if (!/:hover\b/.test(selector)) return;
    for (const decl of topLevelDeclarations(body)) {
      if (/^border/.test(decl.name)) hits.push(bodyStart + decl.index);
    }
  });
  return hits;
}

function classScopes(text) {
  const scopes = [];
  const attr = /(?:className|class)\s*=\s*/g;
  let match;
  while ((match = attr.exec(text))) {
    const i = match.index + match[0].length;
    if (text[i] === '"' || text[i] === "'") {
      const end = skipQuoted(text, i);
      scopes.push({ start: i, end });
    } else if (text[i] === '{') {
      const end = skipBalanced(text, i, '{', '}');
      scopes.push({ start: i, end });
    }
  }
  return scopes;
}

function stringScopeAt(text, index) {
  let found = null;
  forEachStringLiteral(text, (start, end) => {
    if (index >= start && index < end) found = { start, end };
  });
  return found;
}

function scopeFor(text, index) {
  for (const scope of classScopes(text)) {
    if (index >= scope.start && index < scope.end) return scope;
  }
  return stringScopeAt(text, index);
}

function findOutlineRemoved(text, kind) {
  const hits = [];
  if (kind === 'css') {
    eachCssBlock(text, (selector, body, bodyStart) => {
      if (!/:focus(?:-visible)?\b/.test(selector)) return;
      const decls = topLevelDeclarations(body);
      const removes = decls.filter(
        (decl) =>
          (decl.name === 'outline' && /^\s*(?:none|0)\s*$/i.test(decl.value)) ||
          (decl.name === 'outline-style' && /^\s*none\s*$/i.test(decl.value)),
      );
      if (removes.length === 0) return;
      const compensated = decls.some((decl) => {
        if (decl.name === 'box-shadow' && !/^\s*none\s*$/i.test(decl.value)) return true;
        if (/^outline/.test(decl.name) && !/^\s*(?:none|0)\s*$/i.test(decl.value)) return true;
        return false;
      });
      if (compensated) return;
      for (const decl of removes) hits.push(bodyStart + decl.index);
    });
    return hits;
  }
  for (const index of indexes(text, OUTLINE_REMOVED)) {
    const scope = scopeFor(text, index);
    const region = scope ? text.slice(scope.start, scope.end) : text.slice(index, index + 32);
    if (FOCUS_RING.test(region)) continue;
    hits.push(index);
  }
  return hits;
}

function findTokenRedefined(text) {
  return [
    ...indexes(text, TOKEN_DECL),
    ...indexes(text, TOKEN_SET_PROPERTY),
    ...indexes(text, TOKEN_INDEX),
  ];
}

function findPaletteColor(text, kind) {
  if (kind === 'css') {
    const hits = [];
    eachCssDeclarationValue(text, (start, end) => {
      for (const index of indexes(text.slice(start, end), CSS_NAMED)) hits.push(start + index);
    });
    return hits;
  }
  return indexes(text, PALETTE_UTILITY);
}

function findPillRadius(text) {
  return [
    ...indexes(text, PILL_UTILITY),
    ...indexes(text, PILL_ARBITRARY),
    ...indexes(text, PILL_CSS),
  ];
}

function findLiteralRuleWidth(text) {
  return [...indexes(text, LITERAL_BORDER_LEFT), ...indexes(text, LITERAL_SOLID)];
}

export const RULES = Object.freeze([
  Object.freeze({
    id: 'literal-color',
    scope: 'consumer',
    summary: 'literal colour; use a token',
    design: "Don't copy hexes from this file into CSS. `tokens.css` owns every value.",
    find: findLiteralColor,
  }),
  Object.freeze({
    id: 'palette-color',
    scope: 'consumer',
    summary: 'Tailwind palette colour; use a token',
    design: "Don't copy hexes from this file into CSS. `tokens.css` owns every value.",
    find: findPaletteColor,
  }),
  Object.freeze({
    id: 'pill-radius',
    scope: 'consumer',
    summary: 'pill radius; use a tag or a radius token',
    design: "Don't use pills or `rounded-full`. Status is coloured text plus a glyph; a contained label is a `tag`.",
    find: findPillRadius,
  }),
  Object.freeze({
    id: 'hover-border',
    scope: 'consumer',
    summary: 'hover changes a border; change a fill',
    design: "Don't change a border colour on hover; focus is the anil ring.",
    find: findHoverBorder,
  }),
  Object.freeze({
    id: 'outline-removed',
    scope: 'consumer',
    summary: 'outline removed without a replacement ring',
    design: "Don't change a border colour on hover; focus is the anil ring.",
    find: findOutlineRemoved,
  }),
  Object.freeze({
    id: 'token-redefined',
    scope: 'consumer',
    summary: 'redeclares a brand token',
    design: "Don't copy hexes from this file into CSS. `tokens.css` owns every value.",
    find: findTokenRedefined,
  }),
  Object.freeze({
    id: 'named-radius',
    scope: 'brand',
    summary: 'named rounded utility; use a radius token',
    design: 'Do use `{rounded.sm}` for tags, `{rounded.md}` for controls, `{rounded.lg}` for cards and popovers. No `full`.',
    find: (text) => indexes(text, NAMED_RADIUS),
  }),
  Object.freeze({
    id: 'arbitrary-radius',
    scope: 'brand',
    summary: 'rounded value that is not --ow-radius-*',
    design: 'Do use `{rounded.sm}` for tags, `{rounded.md}` for controls, `{rounded.lg}` for cards and popovers. No `full`.',
    find: (text) => indexes(text, ARBITRARY_RADIUS),
  }),
  Object.freeze({
    id: 'literal-rule-width',
    scope: 'brand',
    summary: 'literal rule width; use a token',
    design: "Don't hand-copy a length; use the token.",
    find: findLiteralRuleWidth,
  }),
  Object.freeze({
    id: 'numeric-spacing',
    scope: 'brand',
    summary: 'numeric spacing utility; use a space token',
    design: "Don't hand-copy a length; use the token.",
    find: (text) => indexes(text, NUMERIC_SPACING),
  }),
]);

export const CONSUMER_RULES = Object.freeze(RULES.filter((rule) => rule.scope === 'consumer'));
export const BRAND_RULES = Object.freeze(RULES.filter((rule) => rule.scope === 'brand'));

const SUPPRESSIBLE = new Set(CONSUMER_RULES.map((rule) => rule.id));

export const IGNORE_REASON = Object.freeze({
  id: 'ignore-reason',
  summary: 'ignore directive needs a reason after an em dash, en dash, or " - "',
});
export const IGNORE_UNKNOWN_RULE = Object.freeze({
  id: 'ignore-unknown-rule',
  summary: 'ignore directive names a rule that cannot be suppressed',
});
export const IGNORE_UNUSED = Object.freeze({
  id: 'ignore-unused',
  summary: 'ignore directive suppressed nothing',
});

const REASON_SEP = /(?:\s+—\s+|\s+–\s+|\s+-\s+)/;

function skipTemplate(source, start) {
  let i = start + 1;
  while (i < source.length && source[i] !== '`') {
    if (source[i] === '\\') {
      i += 2;
      continue;
    }
    if (source[i] === '$' && source[i + 1] === '{') {
      i = skipBalanced(source, i + 1, '{', '}');
      continue;
    }
    i++;
  }
  return i < source.length ? i + 1 : i;
}

function expandJsxComment(source, start, end) {
  let from = start;
  let i = start - 1;
  while (i >= 0 && /[ \t]/.test(source[i])) i--;
  if (source[i] !== '{') return { start, end };
  from = i;
  let j = end;
  while (j < source.length && /[ \t]/.test(source[j])) j++;
  if (source[j] === '}') return { start: from, end: j + 1 };
  return { start, end };
}

function collectComments(source) {
  const comments = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (char === "'" || char === '"') {
      i = skipQuoted(source, i);
      continue;
    }
    if (char === '`') {
      i = skipTemplate(source, i);
      continue;
    }
    if (char === '/' && source[i + 1] === '*') {
      const innerStart = i;
      i += 2;
      while (i + 1 < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++;
      if (i + 1 < source.length && source[i] === '*' && source[i + 1] === '/') {
        i += 2;
        const expanded = expandJsxComment(source, innerStart, i);
        comments.push({
          start: expanded.start,
          end: expanded.end,
          innerStart,
          inner: source.slice(innerStart + 2, i - 2),
        });
        continue;
      }
      i = innerStart + 1;
      continue;
    }
    if (source.startsWith('<!--', i)) {
      const close = source.indexOf('-->', i + 4);
      if (close === -1) {
        i += 1;
        continue;
      }
      const end = close + 3;
      comments.push({
        start: i,
        end,
        innerStart: i,
        inner: source.slice(i + 4, close),
      });
      i = end;
      continue;
    }
    if (char === '/' && source[i + 1] === '/') {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      comments.push({
        start: i,
        end: stop,
        innerStart: i,
        inner: source.slice(i + 2, stop),
      });
      i = stop;
      continue;
    }
    i++;
  }
  return comments;
}

function firstCodeIndex(source, comments) {
  let i = 0;
  let c = 0;
  while (i < source.length) {
    if (/\s/.test(source[i])) {
      i++;
      continue;
    }
    while (c < comments.length && comments[c].end <= i) c++;
    if (c < comments.length && i >= comments[c].start && i < comments[c].end) {
      i = comments[c].end;
      continue;
    }
    return i;
  }
  return source.length;
}

function hasCodeBeforeOnLine(source, index) {
  const bol = source.lastIndexOf('\n', index - 1) + 1;
  return /\S/.test(source.slice(bol, index));
}

function nextNonBlankLine(source, line) {
  let seen = 1;
  let i = 0;
  while (seen <= line && i < source.length) {
    const n = source.indexOf('\n', i);
    if (n === -1) return line + 1;
    i = n + 1;
    seen++;
  }
  while (i < source.length) {
    const n = source.indexOf('\n', i);
    const end = n === -1 ? source.length : n;
    if (/\S/.test(source.slice(i, end))) {
      const { line: found } = indexToLineColumn(source, i);
      return found;
    }
    if (n === -1) break;
    i = n + 1;
  }
  return line + 1;
}

function parseIdList(body) {
  const sep = body.match(REASON_SEP);
  if (!sep) return { ids: [], reason: null };
  const ids = body
    .slice(0, sep.index)
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const reason = body.slice(sep.index + sep[0].length).trim();
  if (ids.length === 0 || reason.length === 0) return { ids, reason: null };
  return { ids, reason };
}

function parseDirectives(source) {
  const comments = collectComments(source);
  const codeAt = firstCodeIndex(source, comments);
  const directives = [];
  for (const comment of comments) {
    const inner = comment.inner;
    const patterns = [
      { file: true, re: /otto-brand-ignore-file:/g },
      { file: false, re: /otto-brand-ignore:/g },
    ];
    for (const { file, re } of patterns) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(inner))) {
        const tokenAt = comment.innerStart + innerStartOffset(source, comment) + match.index;
        const after = inner.slice(match.index + match[0].length);
        const lineEnd = after.search(/\n/);
        const body = (lineEnd === -1 ? after : after.slice(0, lineEnd)).trim();
        const { ids, reason } = parseIdList(body);
        const { line, column } = indexToLineColumn(source, tokenAt);
        const targetLine = file
          ? null
          : hasCodeBeforeOnLine(source, comment.start)
            ? line
            : nextNonBlankLine(source, line);
        directives.push({
          file,
          applies: !file || comment.start < codeAt,
          ids,
          reason,
          line,
          column,
          targetLine,
        });
      }
    }
  }
  return directives;
}

function innerStartOffset(source, comment) {
  if (source.startsWith('<!--', comment.innerStart)) return 4;
  return 2;
}

function applySuppressions(source, findings) {
  const directives = parseDirectives(source);
  const kept = [];
  const used = new Set();
  const fileIds = new Map();
  const lineIds = new Map();

  for (const [index, directive] of directives.entries()) {
    if (directive.reason === null) {
      kept.push({ rule: IGNORE_REASON, line: directive.line, column: directive.column });
      used.add(index);
      continue;
    }
    const knownIds = [];
    for (const id of directive.ids) {
      if (!SUPPRESSIBLE.has(id)) {
        kept.push({ rule: IGNORE_UNKNOWN_RULE, line: directive.line, column: directive.column });
        used.add(index);
        continue;
      }
      knownIds.push(id);
    }
    if (!directive.applies) continue;
    if (directive.file) {
      for (const id of knownIds) {
        if (!fileIds.has(id)) fileIds.set(id, []);
        fileIds.get(id).push(index);
      }
    } else {
      for (const id of knownIds) {
        const list = lineIds.get(directive.targetLine) ?? [];
        list.push({ id, index });
        lineIds.set(directive.targetLine, list);
      }
    }
  }

  for (const finding of findings) {
    const fileHits = fileIds.get(finding.rule.id);
    if (fileHits) {
      for (const index of fileHits) used.add(index);
      continue;
    }
    const lineHits = lineIds.get(finding.line);
    const match = lineHits?.find((hit) => hit.id === finding.rule.id);
    if (match) {
      used.add(match.index);
      continue;
    }
    kept.push(finding);
  }

  for (const [index, directive] of directives.entries()) {
    if (used.has(index) || directive.reason === null) continue;
    if (directive.ids.some((id) => SUPPRESSIBLE.has(id))) {
      kept.push({ rule: IGNORE_UNUSED, line: directive.line, column: directive.column });
    }
  }
  return kept;
}

export function findViolations(source, { kind, rules = CONSUMER_RULES, known: _known } = {}) {
  const masked = maskComments(source);
  const findings = [];
  for (const rule of rules) {
    for (const index of rule.find(masked, kind)) {
      const { line, column } = indexToLineColumn(masked, index);
      findings.push({ rule, line, column });
    }
  }
  const applied = applySuppressions(source, findings);
  applied.sort((a, b) => a.line - b.line || a.column - b.column || a.rule.id.localeCompare(b.rule.id));
  return applied;
}
