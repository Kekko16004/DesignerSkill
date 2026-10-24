// Rail UI: one vertical line, steps along it, scrolls like a log (readable after the run, safe in conhost and CI).
// Layout and tokens: installer/DESIGN.md. Shared verbatim between GameDeveloperSkill and DesignerSkill.
import readline from "node:readline";
import { c, g, bold, isTTY, write, cursor, width, pad, cols, truncate, strip, glyphs, palette, bg } from "./term.mjs";

const RAIL = () => c.faint(g.rail);
const LABEL_W = 14;
const TASK_W = 20;
let quiet = false;
let jsonMode = false;
const events = [];

export function configure({ json = false, silent = false } = {}) { jsonMode = json; quiet = silent || json; }
export const jsonEvents = () => events;
const emit = (e) => { events.push(e); };
const line = (s = "") => { if (!quiet) write(s + "\n"); };

// ---------------------------------------------------------------- header / sections
export function header({ mark, name, subtitle, version, rev }) {
  emit({ type: "header", name, version });
  if (quiet) return;
  const [o, inner, cl] = splitMark(mark);
  const right = [version && `v${version}`, rev].filter(Boolean).join(` ${g.dot} `);
  const left = `  ${bold(o)}${c.accent(inner)}${bold(cl)} ${bold(name)}  ${c.dim(subtitle || "")}`;
  const gap = Math.max(2, cols() - width(left) - width(right) - 2);
  line("");
  line(left + " ".repeat(gap) + c.dim(right));
  line("");
}
function splitMark(mark = "[■]") {
  // "[■]" → bracket, accent glyph, bracket; downgrade the inner glyph on limited terminals
  const inner = mark.slice(1, -1);
  const safe = glyphs === "full" ? inner : glyphs === "cp437" ? "■" : "#";
  return [mark[0], safe, mark[mark.length - 1]];
}

export function open(title) { emit({ type: "section", title }); line(`${c.faint(g.top)}  ${c.dim(title)}`); line(RAIL()); }
export function close(text = "") { line(`${c.faint(g.end)}  ${c.dim(text)}`); line(""); }
export function gap() { line(RAIL()); }

// ◆ label  value   (detection rows, results)
export function row(state, label, value = "", note = "") {
  emit({ type: "row", state, label, value: strip(value), note: strip(note) });
  const sym = { ok: c.ok(g.done), warn: c.warn(g.warn), fail: c.err(g.fail), info: c.accent(g.active), off: c.faint(g.wait) }[state] || c.faint(g.wait);
  const max = cols() - LABEL_W - 6;
  const body = note ? `${value}  ${c.dim(note)}` : value;
  line(`${sym}  ${pad(state === "off" ? c.faint(label) : label, LABEL_W)} ${truncate(body, max)}`);
}
// │  text  (indented detail under the current step)
export function detail(text, tone = "dim") { emit({ type: "detail", text: strip(text) }); line(`${RAIL()}  ${c[tone] ? c[tone](text) : text}`); }
export function note(text) { emit({ type: "note", text: strip(text) }); for (const l of String(text).split("\n")) line(`${RAIL()}  ${c.dim(l)}`); }
export function warn(text) { emit({ type: "warn", text: strip(text) }); line(`${c.warn(g.warn)}  ${text}`); }
export function fail(text) { emit({ type: "fail", text: strip(text) }); line(`${c.err(g.fail)}  ${text}`); }

// ---------------------------------------------------------------- keys
function keys(onKey) {
  readline.emitKeypressEvents(process.stdin);
  const wasRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  cursor.hide();
  return new Promise((resolve, reject) => {
    const done = (v, err) => {
      process.stdin.off("keypress", handler);
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      cursor.show();
      err ? reject(err) : resolve(v);
    };
    const handler = (str, key = {}) => {
      if (key.ctrl && key.name === "c") { done(null, Object.assign(new Error("cancelled"), { code: "CANCELLED" })); return; }
      onKey(str, key, done);
    };
    process.stdin.on("keypress", handler);
  });
}

function redraw(lines, prev) {
  if (prev) { cursor.up(prev); }
  // a line that wraps would break the cursor-up count: never print wider than the terminal
  const w = Math.max(20, (process.stdout.columns || 100) - 1);
  for (const l of lines) { cursor.clearLine(); write(truncate(l, w) + "\n"); }
  if (prev > lines.length) { cursor.clearDown(); }
  return lines.length;
}

const t = (v, lang) => (v && typeof v === "object" ? v[lang] || v.en || Object.values(v)[0] : v || "");

// ---------------------------------------------------------------- multiselect
// items: [{ id, label, hint, on, disabled, badge }]
export async function multiselect({ title, help, items, lang = "en", min = 0 }) {
  emit({ type: "prompt", title });
  if (!isTTY || quiet) return items.filter((i) => i.on && !i.disabled).map((i) => i.id);
  const state = items.map((i) => ({ ...i, on: Boolean(i.on && !i.disabled) }));
  let pos = Math.max(0, state.findIndex((i) => !i.disabled));
  let n = 0;
  const labelW = Math.min(24, Math.max(...state.map((i) => width(t(i.label, lang)))) + 2);
  const render = (final) => {
    const out = [];
    if (final) {
      const picked = state.filter((i) => i.on).map((i) => t(i.label, lang));
      out.push(`${c.ok(g.done)}  ${bold(title)}  ${c.dim(picked.length ? picked.join(", ") : "—")}`);
      out.push(RAIL());
      return out;
    }
    out.push(`${c.accent(g.active)}  ${bold(title)}  ${c.dim(help)}`);
    state.forEach((it, i) => {
      const here = i === pos;
      const box = it.disabled ? c.faint(g.off) : it.on ? c.accent(g.on) : c.faint(g.off);
      const cur = here ? c.accent(g.cursor) : " ";
      const label = it.disabled ? c.faint(pad(t(it.label, lang), labelW)) : here ? bold(pad(t(it.label, lang), labelW)) : pad(t(it.label, lang), labelW);
      const hint = t(it.hint, lang);
      const badge = it.badge ? `  ${it.badgeTone ? c[it.badgeTone](it.badge) : c.warn(it.badge)}` : "";
      out.push(`${RAIL()}  ${cur} ${box} ${label}${truncate(c.dim(hint) + badge, cols() - labelW - 12)}`);
    });
    out.push(RAIL());
    return out;
  };
  n = redraw(render(false), 0);
  const result = await keys((str, key, done) => {
    const move = (d) => { let p = pos; do { p = (p + d + state.length) % state.length; } while (state[p].disabled && p !== pos); pos = p; };
    if (key.name === "up" || str === "k") move(-1);
    else if (key.name === "down" || str === "j" || key.name === "tab") move(1);
    else if (key.name === "space" || str === " ") { if (!state[pos].disabled) state[pos].on = !state[pos].on; }
    else if (str === "a") state.forEach((i) => { if (!i.disabled) i.on = true; });
    else if (str === "n") state.forEach((i) => { i.on = false; });
    else if (key.name === "return") {
      if (state.filter((i) => i.on).length < min) return;
      n = redraw(render(true), n);
      done(state.filter((i) => i.on).map((i) => i.id));
      return;
    }
    n = redraw(render(false), n);
  });
  return result;
}

// ---------------------------------------------------------------- confirm
export async function confirm({ title, yes = true, lang = "en" }) {
  emit({ type: "confirm", title });
  if (!isTTY || quiet) return yes;
  const Y = lang === "it" ? "Sì" : "Yes", N = "No";
  let v = yes, n = 0;
  const render = (final) => final
    ? [`${c.ok(g.done)}  ${bold(title)}  ${c.dim(v ? Y : N)}`, RAIL()]
    : [`${c.accent(g.active)}  ${bold(title)}  ${v ? c.accent(`${g.cursor} ${Y}`) : c.dim(`  ${Y}`)}   ${!v ? c.accent(`${g.cursor} ${N}`) : c.dim(`  ${N}`)}`];
  n = redraw(render(false), 0);
  return keys((str, key, done) => {
    if (["left", "right", "tab", "h", "l"].includes(key.name)) v = !v;
    else if (str === "y" || str === "s") v = true;
    else if (str === "n") v = false;
    else if (key.name === "return") { n = redraw(render(true), n); done(v); return; }
    n = redraw(render(false), n);
  });
}

// ---------------------------------------------------------------- tasks with spinner
// await task("label", async (ctl) => { ctl.update("git pull"); return { note: "0.4s" } })
// The function may return { state: "ok"|"warn"|"skip"|"fail", note }.
export async function task(label, fn) {
  const t0 = Date.now();
  let sub = "";
  let frame = 0;
  let timer = null;
  const draw = () => { cursor.clearLine(); write(`${RAIL()}  ${c.accent(g.spin[frame++ % g.spin.length])} ${pad(label, TASK_W)} ${c.dim(truncate(sub, cols() - TASK_W - 10))}`); };
  if (isTTY && !quiet) { cursor.hide(); draw(); timer = setInterval(draw, 80); }
  const ctl = { update: (s) => { sub = strip(String(s)).split("\n").filter(Boolean).pop() || sub; } };
  let res;
  try { res = (await fn(ctl)) || {}; }
  catch (e) { res = { state: "fail", note: e.message || String(e) }; }
  if (timer) clearInterval(timer);
  if (isTTY && !quiet) { cursor.clearLine(); cursor.show(); }
  const state = res.state || "ok";
  const secs = (Date.now() - t0) / 1000;
  const time = secs >= 0.3 ? c.faint(`${secs.toFixed(1)}s`) : "";
  const sym = { ok: c.ok(g.ok), warn: c.warn(g.warn), skip: c.faint(g.skip), fail: c.err(g.ko) }[state];
  const noteTxt = res.note ? (state === "fail" ? c.err(res.note) : state === "warn" ? c.warn(res.note) : c.dim(res.note)) : "";
  emit({ type: "task", label, state, note: strip(res.note || ""), secs: +secs.toFixed(2) });
  line(`${RAIL()}  ${sym} ${pad(state === "skip" ? c.faint(label) : label, TASK_W)} ${truncate(noteTxt, cols() - TASK_W - 14)}${time ? "  " + time : ""}`);
  return { ...res, state };
}

// ---------------------------------------------------------------- summary card
export function summary(title, rows, footer = []) {
  emit({ type: "summary", title, rows: rows.map(([k, v]) => [strip(k), strip(v)]) });
  if (quiet) return;
  const w = Math.min(cols() - 4, 84);
  const keyW = Math.max(...rows.map(([k]) => width(k)), 6) + 2;
  line(`${c.faint(g.tl + g.h)} ${bold(title)} ${c.faint(g.h.repeat(Math.max(0, w - width(title) - 4)) + g.tr)}`);
  for (const [k, v] of rows) {
    const body = `${c.dim(pad(k, keyW))}${truncate(v, w - keyW - 4)}`;
    line(`${c.faint(g.v)} ${pad(body, w - 2)}${c.faint(g.v)}`);
  }
  line(c.faint(g.bl + g.h.repeat(w - 1) + g.br));
  for (const f of footer) line(`  ${f}`);
  line("");
}

export { c, g, bold, palette, bg };
