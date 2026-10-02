// Minimal, dependency-free HTML parser (tolerant, good enough for hand-written mocks).
// parseHtml(src) -> { type: 'root', children: [ { type: 'el', tag, attrs, children } | { type: 'text', text } ] }

export const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title']);
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', times: '×', hellip: '…', mdash: '—', ndash: '–', copy: '©', reg: '®', trade: '™', bull: '•', rarr: '→', larr: '←', uarr: '↑', darr: '↓', deg: '°', euro: '€', pound: '£', laquo: '«', raquo: '»' };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENT[e.toLowerCase()] ?? m;
  });
}

function parseAttrs(s) {
  const attrs = {};
  const re = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(s))) attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  return attrs;
}

export function parseHtml(src) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  const re = /<!--[\s\S]*?-->|<![^>]*>|<\/\s*([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
  let last = 0, m;
  const pushText = (t) => { if (t) top().children.push({ type: 'text', text: decodeEntities(t) }); };
  while ((m = re.exec(src))) {
    pushText(src.slice(last, m.index));
    last = re.lastIndex;
    if (m[1]) {
      const tag = m[1].toLowerCase();
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].tag === tag) { stack.length = k; break; }
      }
      continue;
    }
    if (!m[2]) continue; // comment / doctype
    const tag = m[2].toLowerCase();
    const el = { type: 'el', tag, attrs: parseAttrs(m[3] || ''), children: [] };
    top().children.push(el);
    if (RAW.has(tag)) {
      const close = src.toLowerCase().indexOf(`</${tag}`, last);
      const end = close < 0 ? src.length : close;
      el.text = src.slice(last, end);
      if (tag === 'textarea' || tag === 'title') el.children.push({ type: 'text', text: decodeEntities(el.text) });
      const gt = src.indexOf('>', end);
      last = re.lastIndex = gt < 0 ? src.length : gt + 1;
      continue;
    }
    if (!VOID.has(tag) && !m[4]) stack.push(el);
  }
  pushText(src.slice(last));
  return root;
}

export function walk(node, fn, parent = null) {
  fn(node, parent);
  for (const c of node.children || []) walk(c, fn, node);
}

export function find(node, pred) {
  let hit = null;
  walk(node, (n) => { if (!hit && n.type === 'el' && pred(n)) hit = n; });
  return hit;
}

export function textContent(node) {
  if (node.type === 'text') return node.text;
  if (node.tag === 'br') return '\n';
  if (node.tag === 'script' || node.tag === 'style') return '';
  return (node.children || []).map(textContent).join('');
}

export function collapse(s) {
  return s.replace(/[ \t\r\n\f]+/g, ' ').trim();
}
