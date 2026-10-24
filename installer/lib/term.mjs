// Terminal capabilities: color depth, glyph set, cursor control. Zero dependencies.
// Shared verbatim between GameDeveloperSkill and DesignerSkill (installer/lib).

const out = process.stdout;
export const isTTY = Boolean(out.isTTY && process.stdin.isTTY);
const env = process.env;

// ---------------------------------------------------------------- color depth
function colorDepth() {
  if ("NO_COLOR" in env || env.TERM === "dumb") return 1;
  const force = env.FORCE_COLOR;
  if (force === "0" || force === "false") return 1;
  if (force === "3") return 24;
  if (force === "2") return 8;
  if (force === "1" || force === "true") return 4;
  if (!out.isTTY) return 1;
  if (env.COLORTERM === "truecolor" || env.COLORTERM === "24bit" || env.WT_SESSION || env.TERM_PROGRAM === "vscode") return 24;
  try { return out.getColorDepth(); } catch { return 4; }
}
export const depth = colorDepth();

// ---------------------------------------------------------------- glyphs
// "full": Windows Terminal / VS Code / macOS / Linux (Cascadia, SF Mono, DejaVu have braille + geometric shapes).
// "cp437": legacy conhost with Consolas/Lucida — only the box drawing and shapes of code page 437 are safe.
// "ascii": no color terminal, CI logs, redirected output.
function glyphMode() {
  const forced = env.SKILLKIT_GLYPHS;
  if (forced === "full" || forced === "cp437" || forced === "ascii") return forced;
  if (!out.isTTY) return "ascii";
  if (process.platform !== "win32") return "full";
  if (env.WT_SESSION || env.TERM_PROGRAM === "vscode" || env.ConEmuANSI === "ON" || env.TERM_PROGRAM === "WezTerm" || env.ALACRITTY_LOG) return "full";
  return "cp437";
}
export const glyphs = glyphMode();

const G = {
  full:  { top: "┌", rail: "│", end: "└", done: "◆", active: "◇", warn: "▲", fail: "■", on: "◼", off: "◻", cursor: "❯", ok: "✓", ko: "✗", wait: "·", skip: "–", arrow: "→", dot: "·", ell: "…", spin: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"], h: "─", tl: "┌", tr: "┐", bl: "└", br: "┘", v: "│", markOpen: "[", markClose: "]" },
  cp437: { top: "┌", rail: "│", end: "└", done: "●", active: "○", warn: "▲", fail: "■", on: "■", off: "□", cursor: "►", ok: "√", ko: "x", wait: "·", skip: "-", arrow: "→", dot: "·", ell: "...", spin: ["|", "/", "-", "\\"], h: "─", tl: "┌", tr: "┐", bl: "└", br: "┘", v: "│", markOpen: "[", markClose: "]" },
  ascii: { top: "+", rail: "|", end: "+", done: "*", active: "o", warn: "!", fail: "x", on: "[x]", off: "[ ]", cursor: ">", ok: "ok", ko: "x", wait: ".", skip: "-", arrow: "->", dot: "-", ell: "...", spin: ["|", "/", "-", "\\"], h: "-", tl: "+", tr: "+", bl: "+", br: "+", v: "|", markOpen: "[", markClose: "]" },
};
export const g = G[glyphs];

// ---------------------------------------------------------------- color
function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [255, 255, 255];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function to256([r, g2, b]) {
  // grayscale ramp when the color is (almost) neutral, else the 6x6x6 cube
  if (Math.abs(r - g2) < 10 && Math.abs(g2 - b) < 10) {
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  const q = (v) => (v < 48 ? 0 : v < 115 ? 1 : Math.round((v - 35) / 40));
  return 16 + 36 * q(r) + 6 * q(g2) + q(b);
}
function to16([r, g2, b]) {
  const bright = Math.max(r, g2, b) > 200;
  const bit = (v) => (v > 110 ? 1 : 0);
  const idx = bit(r) | (bit(g2) << 1) | (bit(b) << 2);
  return (bright ? 90 : 30) + idx;
}
export function fg(hex) {
  if (depth <= 1) return (s) => String(s);
  const rgb = hexToRgb(hex);
  const open = depth >= 24 ? `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m` : depth >= 8 ? `\x1b[38;5;${to256(rgb)}m` : `\x1b[${to16(rgb)}m`;
  return (s) => `${open}${s}\x1b[39m`;
}
export function bg(hex) {
  if (depth <= 1) return (s) => String(s);
  const rgb = hexToRgb(hex);
  const open = depth >= 24 ? `\x1b[48;2;${rgb[0]};${rgb[1]};${rgb[2]}m` : depth >= 8 ? `\x1b[48;5;${to256(rgb)}m` : `\x1b[${to16(rgb) + 10}m`;
  return (s) => `${open}${s}\x1b[49m`;
}
export const bold = (s) => (depth > 1 ? `\x1b[1m${s}\x1b[22m` : String(s));

// Locked palette (see installer/DESIGN.md). `accent` is per product, set by the manifest brand.
export const palette = { fg: "#e8e4da", dim: "#8a857a", faint: "#55524a", ok: "#7bc47f", warn: "#e0b04a", err: "#e5604f", info: "#79a7d8", accent: "#ff6a1a" };
export const c = {};
export function setAccent(hex) {
  if (hex) palette.accent = hex;
  for (const k of Object.keys(palette)) c[k] = fg(palette[k]);
}
setAccent();

// ---------------------------------------------------------------- text helpers
const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g;
export const strip = (s) => String(s).replace(ANSI, "");
export function width(s) {
  let w = 0;
  for (const ch of strip(s)) {
    const cp = ch.codePointAt(0);
    // wide: CJK, emoji, fullwidth forms
    w += (cp >= 0x1100 && (cp <= 0x115f || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xff00 && cp <= 0xff60) || (cp >= 0x1f300 && cp <= 0x1faff))) ? 2 : 1;
  }
  return w;
}
export const pad = (s, n) => s + " ".repeat(Math.max(0, n - width(s)));
export const cols = () => Math.max(40, Math.min(out.columns || 100, 120));
export function truncate(s, n) {
  const plain = strip(s);
  if (width(plain) <= n) return s;
  // keep the escape sequences, cut the visible text, close every open style
  let acc = "", w = 0, full = false;
  for (const part of String(s).split(/(\x1b\[[0-9;?]*[A-Za-z])/)) {
    if (part.startsWith("\x1b[")) { acc += part; continue; }
    for (const ch of part) { const cw = width(ch); if (w + cw > n - 1) { full = true; break; } acc += ch; w += cw; }
    if (full) break;
  }
  return acc + (depth > 1 ? "\x1b[0m" : "") + (glyphs === "ascii" ? "~" : "…");
}

// ---------------------------------------------------------------- cursor
export const write = (s) => out.write(s);
export const cursor = {
  hide: () => isTTY && write("\x1b[?25l"),
  show: () => isTTY && write("\x1b[?25h"),
  up: (n) => isTTY && n > 0 && write(`\x1b[${n}A`),
  clearLine: () => isTTY && write("\r\x1b[2K"),
  clearDown: () => isTTY && write("\x1b[0J"),
};
// never leave the user without a cursor
process.on("exit", () => cursor.show());
