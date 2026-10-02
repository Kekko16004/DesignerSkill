// Color parsing and mixing (sRGB). Used to flatten color-mix()/hsl() for targets without CSS functions.

const NAMED = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', gray: '#808080', grey: '#808080',
  silver: '#c0c0c0', maroon: '#800000', purple: '#800080', fuchsia: '#ff00ff', lime: '#00ff00', olive: '#808000',
  yellow: '#ffff00', navy: '#000080', teal: '#008080', aqua: '#00ffff', orange: '#ffa500', gold: '#ffd700',
};

export function parseColor(v) {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (NAMED[s]) return parseColor(NAMED[s]);
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    const ch = (x) => (x.endsWith('%') ? (parseFloat(x) * 255) / 100 : parseFloat(x));
    const a = p[3] === undefined ? 1 : p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3]);
    return { r: ch(p[0]), g: ch(p[1]), b: ch(p[2]), a };
  }
  m = s.match(/^hsla?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    const h = ((parseFloat(p[0]) % 360) + 360) % 360, sat = parseFloat(p[1]) / 100, l = parseFloat(p[2]) / 100;
    const a = p[3] === undefined ? 1 : p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3]);
    const k = (n) => (n + h / 30) % 12;
    const f = (n) => l - sat * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a };
  }
  return null;
}

export function toHex(c) {
  const h = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  const base = `#${h(c.r)}${h(c.g)}${h(c.b)}`;
  return c.a < 1 ? base + h(c.a * 255) : base;
}

export function toRgba(c) {
  const r = (n) => Math.round(Math.max(0, Math.min(255, n)));
  return c.a < 1 ? `rgba(${r(c.r)}, ${r(c.g)}, ${r(c.b)}, ${+c.a.toFixed(3)})` : `rgb(${r(c.r)}, ${r(c.g)}, ${r(c.b)})`;
}

// color-mix(in srgb, A p%, B q%) with already-resolved colors
export function colorMix(expr) {
  const m = expr.match(/^color-mix\(\s*in\s+[\w-]+\s*,(.*)\)$/i);
  if (!m) return null;
  const parts = splitComma(m[1]);
  if (parts.length !== 2) return null;
  const parse = (p) => {
    const mm = p.trim().match(/^(.*?)(?:\s+([\d.]+)%)?$/);
    return { c: parseColor(mm[1]) ?? (mm[1].startsWith('color-mix') ? parseColor(colorMix(mm[1]) || '') : null), p: mm[2] !== undefined ? parseFloat(mm[2]) / 100 : null };
  };
  const a = parse(parts[0]), b = parse(parts[1]);
  if (!a.c || !b.c) return null;
  let pa = a.p, pb = b.p;
  if (pa === null && pb === null) { pa = 0.5; pb = 0.5; } else if (pa === null) pa = 1 - pb; else if (pb === null) pb = 1 - pa;
  const sum = pa + pb || 1;
  const wa = pa / sum, wb = pb / sum;
  const alpha = a.c.a * wa + b.c.a * wb;
  const ch = (k) => (alpha ? (a.c[k] * a.c.a * wa + b.c[k] * b.c.a * wb) / alpha : 0);
  return toRgba({ r: ch('r'), g: ch('g'), b: ch('b'), a: alpha * Math.min(1, sum) });
}

function splitComma(s) {
  const out = [];
  let d = 0, st = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') d++;
    else if (s[i] === ')') d--;
    else if (s[i] === ',' && d === 0) { out.push(s.slice(st, i)); st = i + 1; }
  }
  out.push(s.slice(st));
  return out;
}

// replace every color-mix()/hsl() inside a value with a literal color
export function flattenColors(value) {
  let v = value, guard = 0;
  while (/color-mix\(/i.test(v) && guard++ < 20) {
    const k = v.toLowerCase().lastIndexOf('color-mix(');
    let d = 0, e = k;
    for (; e < v.length; e++) {
      if (v[e] === '(') d++;
      else if (v[e] === ')' && --d === 0) break;
    }
    const mixed = colorMix(v.slice(k, e + 1));
    if (!mixed) break;
    v = v.slice(0, k) + mixed + v.slice(e + 1);
  }
  return v.replace(/hsla?\([^)]*\)/gi, (m) => { const c = parseColor(m); return c ? toRgba(c) : m; });
}

export const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;
