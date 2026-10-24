// Color parsing and mixing (sRGB), plus OKLCH <-> sRGB. Used to flatten color-mix()/hsl() for targets without CSS functions.

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
  if (/^oklch\(/.test(s)) return parseOklch(s);
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

// OKLCH (Björn Ottosson). L 0..1, C ~0..0.4, H degrees. Out-of-gamut colors keep L and H and lose chroma.
const lin = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
const gam = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);

function oklabToLinear(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}

const lchLinear = (L, C, H) => oklabToLinear(L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180));
const inGamut = (rgb, e = 1e-4) => rgb.every((v) => v >= -e && v <= 1 + e);

export function oklchToRgb(L, C, H, a = 1) {
  L = Math.max(0, Math.min(1, L));
  C = Math.max(0, C || 0);
  H = Number.isFinite(H) ? H : 0;
  let rgb = lchLinear(L, C, H);
  if (!inGamut(rgb)) {
    let lo = 0, hi = C;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (inGamut(lchLinear(L, mid, H))) lo = mid; else hi = mid; }
    rgb = lchLinear(L, lo, H);
  }
  const [r, g, b] = rgb.map((v) => gam(Math.max(0, Math.min(1, v))) * 255);
  return { r, g, b, a };
}

export function rgbToOklch(c) {
  const [r, g, b] = [c.r, c.g, c.b].map((v) => lin(Math.max(0, Math.min(255, v)) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H: C < 1e-4 ? 0 : H, a: c.a ?? 1 };
}

// "oklch(97% 0.006 55)", "oklch(0.7 0.12 30deg / 50%)" -> {r,g,b,a}; null for var()/none-resolvable input
export function parseOklch(v) {
  const m = String(v).trim().toLowerCase().match(/^oklch\(\s*([^()]+)\)$/);
  if (!m) return null;
  const [main, alpha] = m[1].split('/');
  const p = main.trim().split(/[\s,]+/);
  if (p.length < 3) return null;
  const num = (x, pct) => (x === 'none' ? 0 : x.endsWith('%') ? (parseFloat(x) / 100) * pct : parseFloat(x));
  const L = num(p[0], 1), C = num(p[1], 0.4), H = p[2] === 'none' ? 0 : parseFloat(p[2]) * (p[2].endsWith('turn') ? 360 : p[2].endsWith('rad') ? 180 / Math.PI : 1);
  const a = alpha === undefined ? 1 : num(alpha.trim(), 1);
  if (![L, C, H, a].every(Number.isFinite)) return null;
  return oklchToRgb(L, C, H, a);
}

export function oklchToHex(v, C, H) {
  const c = typeof v === 'number' ? oklchToRgb(v, C, H) : parseOklch(v);
  return c ? toHex(c) : null;
}

// replace every literal oklch() in a value with hex
export function flattenOklch(value) {
  return String(value).replace(/oklch\([^()]*\)/gi, (m) => oklchToHex(m) || m);
}

export function hueOf(v) {
  const c = typeof v === 'string' ? parseColor(v) : v;
  return c ? rgbToOklch(c) : null;
}

export const ANY_COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^()]*\)/g;
