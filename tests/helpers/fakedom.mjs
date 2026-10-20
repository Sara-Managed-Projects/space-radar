// tests/helpers/fakedom.mjs -- a document just big enough to build a panel and press its buttons, in node.
//
//   const { install, walk, byText } = await import('./helpers/fakedom.mjs');
//   const document = install();            // sets globalThis.document (and window) and returns it
//
// It knows elements, text, attributes, `dataset`, `classList`, `append`, `cloneNode`, events (`click(node)`,
// `fire(node, type)`), `focus`, and `querySelector` / `querySelectorAll` for the simple selectors a panel's
// tests need: `.class`, `tag`, `tag.class`, `[attr]`, `[attr="value"]`, joined without spaces. It does NOT
// lay anything out, run CSS or know a real browser's quirks: what is held here is the tree a builder makes
// and what pressing a control does to it; the pictures (the `look` workflow) hold the rest.

const attrOf = (n, k) => (k.startsWith('data-') ? n.dataset[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] : n.attrs[k]);

function matches(n, sel) {
  if (!n || !n.tagName || n.tagName === '#TEXT') return false;
  const re = /^([a-z][\w-]*)?((?:\.[\w-]+)*)((?:\[[^\]]+\])*)$/i.exec(sel.trim());
  if (!re) throw new Error(`fakedom: unsupported selector ${sel}`);
  if (re[1] && n.localName !== re[1].toLowerCase()) return false;
  for (const c of re[2].split('.').filter(Boolean)) if (!n.classList.contains(c)) return false;
  for (const a of re[3].match(/\[[^\]]+\]/g) || []) {
    const m = /^\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]$/.exec(a);
    const v = attrOf(n, m[1]);
    const want = m[2] ?? m[3] ?? m[4];
    if (v === undefined || v === null) return false;
    if (want !== undefined && String(v) !== want) return false;
  }
  return true;
}

export class N {
  constructor(tag) {
    this.localName = String(tag).toLowerCase();
    this.tagName = tag === '#text' ? '#TEXT' : String(tag).toUpperCase();
    this.children = [];
    this.attrs = {};
    this.dataset = {};
    this.style = {};
    this.listeners = {};
    this.parentNode = null;
    this._text = '';
    this._classes = new Set();
    this.hidden = false;
    this.disabled = false;
    this._value = '';
    this.isConnected = true;
    const self = this;
    this.classList = {
      add: (...c) => c.forEach((x) => self._classes.add(x)),
      remove: (...c) => c.forEach((x) => self._classes.delete(x)),
      contains: (c) => self._classes.has(c),
      toggle: (c, on) => { const want = on === undefined ? !self._classes.has(c) : !!on; if (want) self._classes.add(c); else self._classes.delete(c); return want; },
    };
  }
  // A select answers with its selected option's value, as a browser does (the first if none is marked).
  get value() {
    if (this.localName !== 'select') return this._value;
    const opts = this.children.filter((c) => c.localName === 'option');
    const hit = opts.find((o) => o.selected) || opts[0];
    return hit ? hit.value : '';
  }
  set value(v) {
    if (this.localName !== 'select') { this._value = v; return; }
    for (const o of this.children.filter((c) => c.localName === 'option')) o.selected = o.value === String(v);
  }
  get className() { return [...this._classes].join(' '); }
  set className(v) { this._classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get id() { return this.attrs.id || ''; }
  set id(v) { this.attrs.id = String(v); }
  get type() { return this.attrs.type || ''; }
  set type(v) { this.attrs.type = String(v); }
  get title() { return this.attrs.title || ''; }
  set title(v) { this.attrs.title = String(v); }
  get textContent() { return this.tagName === '#TEXT' ? this._text : this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this.children = []; this._text = String(v); }
  get firstChild() { return this.children[0] || null; }
  get childNodes() { return this.children; }
  appendChild(c) { if (c.parentNode) c.parentNode.children = c.parentNode.children.filter((x) => x !== c); c.parentNode = this; this.children.push(c); return c; }
  append(...cs) { for (const c of cs) this.appendChild(typeof c === 'string' ? Object.assign(new N('#text'), { _text: c }) : c); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((x) => x !== this); this.parentNode = null; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = v; }
  getAttribute(k) { return k === 'class' ? this.className : (k in this.attrs ? this.attrs[k] : null); }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter((x) => x !== f); }
  focus() { globalThis.document.activeElement = this; }
  cloneNode(deep) {
    const c = new N(this.localName);
    c._classes = new Set(this._classes);
    c.attrs = { ...this.attrs };
    c.dataset = { ...this.dataset };
    c._text = this._text;
    if (deep) for (const k of this.children) c.appendChild(k.cloneNode(true));
    return c;
  }
  querySelectorAll(sel) { const out = []; walk(this, (n) => { if (n !== this && matches(n, sel)) out.push(n); }); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  closest(sel) { for (let n = this; n; n = n.parentNode) if (matches(n, sel)) return n; return null; }
}

export function walk(root, fn) { fn(root); for (const c of root.children) walk(c, fn); }
export const byText = (root, text) => { let hit = null; walk(root, (n) => { if (!hit && n.tagName !== '#TEXT' && n.children.every((c) => c.tagName === '#TEXT') && n.textContent === text) hit = n; }); return hit; };

/** Run a node's listeners for `type`, with a small event. */
export function fire(node, type, extra = {}) {
  const ev = { type, target: node, currentTarget: node, key: '', preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...extra };
  for (const f of node.listeners[type] || []) f(ev);
  return ev;
}
export const click = (node) => fire(node, 'click');

export function install() {
  const document = {
    activeElement: null,
    body: new N('body'),
    createElement: (t) => new N(t),
    createElementNS: (_ns, t) => new N(t),
    createTextNode: (s) => Object.assign(new N('#text'), { _text: String(s) }),
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.document = document;
  globalThis.window = globalThis.window || { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
  return document;
}
