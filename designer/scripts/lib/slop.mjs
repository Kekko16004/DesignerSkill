// Shared anti-slop data: banned fonts, stock colors, gradient hue check, copy word lists, search-row flags.
// Sources (MIT): Hallmark references/fonts.md + scripts/sloplint.mjs gates [H<n>] (nutlope/hallmark@7ec8682),
// no-ai-slop skills/no-ai-slop/SKILL.md [NAS] (petergyang/no-ai-slop@000650b), Web Interface Guidelines [V].
import { parseColor, rgbToOklch } from './color.mjs';

// ---- fonts [H1] (Hallmark fonts.md "Banned as a default" / "Saturated")
export const DEFAULT_BANNED_FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Source Sans', 'Nunito', 'Montserrat', 'Raleway', 'Work Sans', 'DM Sans', 'Plus Jakarta Sans', 'system-ui', 'Arial', 'Helvetica', 'Merriweather', 'Lora', 'Georgia', 'Courier New'];
export const SATURATED_FONTS = ['Playfair Display', 'Cormorant Garamond', 'DM Serif Display', 'Fraunces', 'Instrument Serif', 'Recoleta', 'Space Grotesk', 'Hubot Sans', 'Bebas Neue', 'Unbounded', 'Geist', 'Instrument Sans', 'Mona Sans'];
// designer's own pre-Hallmark list (Geist as the only family stays banned there)
export const LEGACY_GENERIC_FONTS = ['Inter', 'Geist', 'Roboto', 'Arial', 'Open Sans', 'Helvetica'];
export const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-monospace', 'ui-serif', 'ui-sans-serif', 'ui-rounded', 'math', 'emoji', 'fangsong', 'inherit', 'initial', 'unset', '-apple-system', 'blinkmacsystemfont', 'segoe ui']);
export const famKey = (f) => String(f || '').toLowerCase().replace(/["']/g, '').replace(/\s+(pro|variable|vf|\d+)$/g, '').replace(/[\s_-]+/g, '');
export const families = (v) => String(v || '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '').trim()).filter(Boolean);
export const firstFamily = (v) => families(v)[0] || '';
const BANNED_KEYS = new Set([...DEFAULT_BANNED_FONTS, 'Helvetica Neue', 'Source Sans Pro', 'Source Sans 3', '-apple-system', 'Segoe UI'].map(famKey));
const LEGACY_KEYS = new Set([...LEGACY_GENERIC_FONTS, ...DEFAULT_BANNED_FONTS].map(famKey));
export const isBannedFont = (f) => BANNED_KEYS.has(famKey(f));
export const isGenericLike = (f) => LEGACY_KEYS.has(famKey(f)) || GENERIC_FAMILIES.has(String(f).toLowerCase());
export const isSaturatedFont = (f) => SATURATED_FONTS.some((s) => famKey(s) === famKey(f));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const BANNED_FONT_RE = new RegExp(`(?<![\\w-])(${DEFAULT_BANNED_FONTS.map(esc).join('|')})(?![\\w-])`);

// ---- colors
export const INDIGO_HEXES = ['6366f1', '4f46e5', '4338ca', '818cf8', '8b5cf6', '7c3aed', 'a855f7', '9333ea', '6d28d9'];
export const INDIGO_HEX_RE = new RegExp(`#(${INDIGO_HEXES.join('|')})\\b`, 'gi');
export const INDIGO_TW_RE = /\b(from|to|via|bg|text|border|ring|shadow)-(indigo|violet|purple)-\d{2,3}\b/g;
// Tailwind default swatches that read as "the AI look" [H74]
export const TAILWIND_STOCK_HEXES = ['0f172a', '1e293b', '334155', '64748b', 'f8fafc', '6366f1', '4f46e5', '8b5cf6', '7c3aed', '3b82f6', '2563eb', '09090b', '18181b', 'a855f7', 'ec4899', '06b6d4'];
export const TAILWIND_STOCK_RE = new RegExp(`#(${TAILWIND_STOCK_HEXES.join('|')})\\b`, 'gi');
export const STOCK_DARK_RE = /#(09090b|18181b|0f172a|020617)\b|\b(bg|from)-(zinc|slate)-950\b/i;
// Tailwind palette hue (OKLCH) per family, from Hallmark's TW_HUE
export const TW_HUE = { red: 25, orange: 47, amber: 70, yellow: 86, lime: 131, green: 150, emerald: 163, teal: 183, cyan: 215, sky: 237, blue: 260, indigo: 277, violet: 293, purple: 304, fuchsia: 322, pink: 354, rose: 16 };

const hueIn = (h, lo, hi) => (lo <= hi ? h >= lo && h <= hi : h >= lo || h <= hi);
// [H2a] hue-based: purple stop (265-330) with a blue (200-264) or pink (331-25) stop
export function bannedGradientHues(hues) {
  const purple = hues.some((h) => hueIn(h, 265, 330));
  if (purple && hues.some((h) => hueIn(h, 200, 264))) return 'purple-to-blue';
  if (purple && hues.some((h) => hueIn(h, 331, 25))) return 'purple-to-pink';
  return null;
}
export function gradientStopHues(value) {
  const out = [];
  for (const m of String(value).matchAll(/#[0-9a-fA-F]{3,8}\b|oklch\([^()]*\)|rgba?\([^)]*\)|hsla?\([^)]*\)/g)) {
    const c = parseColor(m[0]);
    if (!c || c.a <= 0.05) continue;
    const ok = rgbToOklch(c);
    if (ok.C > 0.04) out.push(ok.H);
  }
  return out;
}
export const bannedGradient = (value) => bannedGradientHues(gradientStopHues(value));
export function twGradientHues(classStr) {
  const out = [];
  for (const m of String(classStr).matchAll(/(?:^|\s)(?:[\w-]+:)*(?:from|via|to)-([a-z]+)-(?:50|[1-9]00|950)\b/g)) if (TW_HUE[m[1]] != null) out.push(TW_HUE[m[1]]);
  return out;
}

// ---- copy
// [NAS] no-ai-slop "Words to cut"
export const NAS_BANNED_WORDS = ['delve', 'foster', 'leverage', 'utilize', 'facilitate', 'empower', 'streamline', 'robust', 'cutting-edge', 'paradigm shift', 'game changer', 'this is huge', 'this changes everything', 'tapestry', 'realm', 'beacon', 'multifaceted', 'meticulous', 'intricate', 'paramount', 'transformative', 'elevate', 'embark', 'supercharge', 'harness', 'ever-evolving'];
export const NAS_ADVERBS = ['just', 'literally', 'honestly', 'simply', 'actually', 'truly', 'fundamentally', 'importantly', 'crucially', 'inherently', 'inevitably'];
export const NAS_PHRASES = ["it's worth noting", "it's important to note", 'at the end of the day', 'when it comes to', 'at its core', "in today's world", 'in the age of', 'in the world of', 'the reality is', 'the truth is', 'in terms of', 'with regard to', 'in order to', 'going forward', 'in this article', "let's dive in"];
// [NAS] pattern openers / puffery / setups, as literal phrases
export const NAS_PATTERN_PHRASES = ["here's the thing", "here's what i mean", 'let me be clear', "i'll be honest", 'the uncomfortable truth is', 'this is the part most people skip', 'what most people get wrong', "here's what nobody tells you", 'the part everyone misses', 'stands as a testament', 'marks a pivotal moment', 'plays a vital role', 'solidifies its position', 'underscores its significance', 'experts agree', 'studies show', 'widely regarded as', 'what if i told you', 'think about it:', 'plot twist:', 'in conclusion'];
// [H19] Hallmark buzzwords (checkCopyTell)
export const HALLMARK_BUZZ_RE = /\b(seamless(ly)?|robust|empower(s|ing)?|supercharge[sd]?|best[- ]in[- ]class|industry[- ]leading|mission[- ]critical|future[- ]proof(ed)?|unleash(es|ed|ing)?|elevate[sd]?|effortless(ly)?|unlock(s|ing)?|next[- ]generation|world[- ]class|cutting[- ]edge|streamline[sd]?|revolutioni[sz]e[sd]?|game[- ]chang(er|ing)|enterprise[- ]grade|quietly (trusted|in use)|built for the modern|in today's)\b/gi;
// [H19] Hallmark TELLS19
export const TELLS19 = [
  [/\bwhether you'?re\b/i, 'filler opener'],
  [/\bwe'?ve got you covered\b/i, 'cliche'],
  [/\bsay goodbye to\b/i, 'cliche'],
  [/\bno credit card required\b/i, 'template line'],
  [/\beverything you need to\b/i, 'cliche'],
  [/\ball in one place\b/i, 'cliche'],
  [/\blorem ipsum\b/i, 'placeholder text'],
  [/\ball rights reserved\b/i, 'template footer line'],
  [/\bmade with\s*(?:♥|❤|\u{1f9e1}|\u{1f49b}|\u{1f49a}|\u{1f499}|\u{1f49c}|\u{1f5a4}|\u{1f90d}|&hearts;|&#9829;|&#10084;|<3)/iu, 'made with a heart'],
];
export const REBUTTAL_RE = /(^|[.!?]\s+)(not|no)\s+[a-z][^.!?\n]{0,40}[.]\s+(just|only|a|an)?\s*[a-z][^.!?\n]{0,40}[.]/gi;
export const NOT_X_ITS_Y_RE = /\b(?:it'?s|this is|that'?s|we'?re|isn'?t)?\s*not\s+(?:just\s+)?(?:about\s+)?[^.,;!?\n]{1,40}[,.;:—–-]\s*(?:it'?s|but|this is|that'?s|they'?re|we'?re|it is)\b/gi;
export const PLACEHOLDER_NAME_RE = /\b(?:John|Jane) (?:Doe|Smith)\b|\bAcme(?: Corp(?:oration)?| Inc\.?| Co\.?)?\b|\bYour (?:Company|Logo|Brand)\b|\bCompany Name\b/g;
export const SECOND_CTA_RE = /^(learn more|see how it works|watch (the )?demo|get started|book a demo|read more|find out more)$/i;
export const STOCK_LINK_RE = /^(learn more|read more|find out more|click here|more info|see more)$/i;
// designer's original copy lists (kept)
export const SAAS_COPY_RE = /\b(unlock your potential|next[- ]generation|seamless(ly)?|elevate your|supercharge|game[- ]changer)\b/gi;
export const FAKE_STATS_RE = /\b(10x faster|99\.9%|loved by thousands|trusted by \d+)/gi;

export function wordListRe(list) {
  return new RegExp(`(?<![\\w'-])(${[...list].sort((a, b) => b.length - a.length).map((w) => esc(w).replace(/'/g, "['’]").replace(/ /g, '\\s+')).join('|')})(?![\\w'-])`, 'gi');
}

// ---- search-row flags
const INDIGO_ONE = new RegExp(INDIGO_HEX_RE.source, 'i');
const FLAG_TESTS = [
  ['indigo-brand', (t) => INDIGO_ONE.test(t) || /\bindigo\b|\b(?:purple|violet)[- ](?:to[- ])?(?:blue|pink)\b|\b(?:purple|violet|indigo) gradient\b/i.test(t) || /\b(?:from|to|via|bg|text)-(?:indigo|violet)-\d{2,3}\b/.test(t)],
  ['generic-font', (t) => BANNED_FONT_RE.test(t)],
  ['glass', (t) => /glass(?:morphism|y)?\b|frosted|backdrop-(?:blur|filter)/i.test(t)],
  ['aurora', (t) => /\baurora\b|\b(?:gradient[- ]mesh|mesh[- ]gradient)\b/i.test(t)],
  ['bento', (t) => /\bbento\b/i.test(t)],
  ['hero-3-cards', (t) => /\bhero\b[^|¦;]{0,70}?\bfeatures?\b[^|¦;]{0,50}?\bcta\b|\b(?:three|3)[- ](?:feature[- ])?(?:cards|columns?)\b|\bfeature cards? \(3\)/i.test(t)],
  ['elastic', (t) => /\b(?:elastic|bounc(?:e|y|ing)|overshoot|spring[- ]?(?:y|physics)?\s+(?:easing|animation))\b/i.test(t)],
  ['saas-dark', (t) => STOCK_DARK_RE.test(t) && (INDIGO_ONE.test(t) || /#(3b82f6|2563eb)\b|\bindigo\b/i.test(t))],
];
export const SLOP_FLAGS = FLAG_TESTS.map(([k]) => k);
export function slopFlags(text) {
  const t = typeof text === 'string' ? text : Object.values(text || {}).filter((v) => typeof v === 'string').join(' ¦ ');
  const out = [];
  for (const [k, test] of FLAG_TESTS) if (test(t)) out.push(k);
  return out;
}
