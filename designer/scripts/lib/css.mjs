// Minimal, dependency-free CSS parser: enough for tokens, linting and translation.
// parseCss(src) -> [{ type: 'rule', selector, decls, media }, { type: 'at', name, prelude, body }]

export function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '');
}

// index of the '}' matching the '{' at `open`, skipping strings
function matchBrace(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") { i = skipString(s, i); continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return s.length;
}

function skipString(s, i) {
  const q = s[i];
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] === '\\') { j++; continue; }
    if (s[j] === q) return j;
  }
  return s.length;
}

// split on `sep` at paren depth 0, outside strings
export function splitTop(s, sep) {
  const out = [];
  let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") { i = skipString(s, i); continue; }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === sep && depth === 0) { out.push(s.slice(start, i)); start = i + 1; }
  }
  out.push(s.slice(start));
  return out;
}

export function parseDecls(body) {
  const decls = [];
  for (const part of splitTop(body, ';')) {
    const k = part.indexOf(':');
    if (k < 0) continue;
    const prop = part.slice(0, k).trim();
    let value = part.slice(k + 1).trim();
    if (!prop || !value) continue;
    const important = /!important\s*$/i.test(value);
    if (important) value = value.replace(/\s*!important\s*$/i, '');
    decls.push({ prop: prop.startsWith('--') ? prop : prop.toLowerCase(), value, important });
  }
  return decls;
}

export function parseCss(src, media = null) {
  const s = stripComments(src);
  const out = [];
  let i = 0;
  while (i < s.length) {
    // read prelude up to '{' or ';'
    let j = i;
    while (j < s.length && s[j] !== '{' && s[j] !== ';' && s[j] !== '}') {
      if (s[j] === '"' || s[j] === "'") j = skipString(s, j);
      j++;
    }
    const prelude = s.slice(i, j).trim();
    if (j >= s.length) break;
    if (s[j] === ';' || s[j] === '}') {
      if (prelude.startsWith('@')) out.push({ type: 'at', name: atName(prelude), prelude, body: null });
      i = j + 1;
      continue;
    }
    const end = matchBrace(s, j);
    const body = s.slice(j + 1, end);
    if (prelude.startsWith('@')) {
      const name = atName(prelude);
      if (['media', 'supports', 'layer', 'container'].includes(name)) {
        out.push(...parseCss(body, prelude));
      } else {
        out.push({ type: 'at', name, prelude, body });
      }
    } else if (prelude) {
      out.push({ type: 'rule', selector: prelude, decls: parseDecls(body), media });
    }
    i = end + 1;
  }
  return out;
}

function atName(prelude) {
  return (prelude.match(/^@([\w-]+)/) || [, ''])[1].toLowerCase();
}

// custom properties declared on :root / html (first wins per name, later overrides)
export function rootVars(rules, { includeMedia = false } = {}) {
  const vars = {};
  for (const r of rules) {
    if (r.type !== 'rule' || (r.media && !includeMedia)) continue;
    const sels = r.selector.split(',').map((x) => x.trim());
    if (!sels.some((x) => x === ':root' || x === 'html')) continue;
    for (const d of r.decls) if (d.prop.startsWith('--')) vars[d.prop] = d.value;
  }
  return vars;
}

// resolve var(--x, fallback) recursively against a vars map
export function resolveVars(value, vars, depth = 0) {
  if (depth > 12 || !value.includes('var(')) return value;
  let out = '';
  let i = 0;
  while (i < value.length) {
    const k = value.indexOf('var(', i);
    if (k < 0) { out += value.slice(i); break; }
    out += value.slice(i, k);
    let d = 0, e = k + 3;
    for (; e < value.length; e++) {
      if (value[e] === '(') d++;
      else if (value[e] === ')' && --d === 0) break;
    }
    const inner = value.slice(k + 4, e);
    const [name, ...fb] = splitTop(inner, ',');
    const v = vars[name.trim()];
    out += v !== undefined ? resolveVars(v, vars, depth + 1) : resolveVars(fb.join(',').trim(), vars, depth + 1);
    i = e + 1;
  }
  return out;
}
