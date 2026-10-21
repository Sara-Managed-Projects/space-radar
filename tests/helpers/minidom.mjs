// tests/helpers/minidom.mjs -- the small DOM the UI tests share (the one tests/test_whattoshow.mjs and
// test_tripframe.mjs use, with `checked`, `value` and events that carry their name). Not a test: nothing
// runs it by itself. `installDom()` puts `document` and `window` on globalThis and returns { Node, fire }.
export function installDom() {
  class Node {
    constructor(tag) {
      this.tagName = String(tag).toUpperCase();
      this._kids = [];
      this.parentNode = null;
      this.attrs = {};
      this.dataset = {};
      this.style = { setProperty() {}, removeProperty() {} };
      this.hidden = false;
      this.disabled = false;
      this.inert = false;
      this.className = '';
      this.id = '';
      this.type = '';
      this.title = '';
      this._text = '';
      this.offsetWidth = 1;
      this.isContentEditable = false;
      const self = this;
      this.classList = {
        add: (...c) => { const s = new Set(self.className.split(/\s+/).filter(Boolean)); c.forEach((x) => s.add(x)); self.className = [...s].join(' '); },
        remove: (...c) => { self.className = self.className.split(/\s+/).filter((x) => x && !c.includes(x)).join(' '); },
        toggle: (c, on) => { const has = self.classList.contains(c); const want = on === undefined ? !has : !!on; if (want && !has) self.classList.add(c); if (!want && has) self.classList.remove(c); return want; },
        contains: (c) => self.className.split(/\s+/).includes(c),
      };
      this.listeners = {};
    }
    get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === document.body || n === document.documentElement; }
    get firstChild() { return this._kids[0] || null; }
    get childElementCount() { return this._kids.length; }
    get children() { return this._kids; }
    append(...cs) { for (const c of cs) this.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this._kids.push(c); return c; }
    insertBefore(c, ref) {
      if (c.parentNode) c.parentNode.removeChild(c);
      c.parentNode = this;
      const i = this._kids.indexOf(ref);
      if (i < 0) this._kids.push(c); else this._kids.splice(i, 0, c);
      return c;
    }
    removeChild(c) { this._kids = this._kids.filter((x) => x !== c); c.parentNode = null; return c; }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    set textContent(v) { this._kids = []; this._text = String(v ?? ''); }
    get textContent() { return this._text + this._kids.map((c) => c.textContent).join(''); }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); if (k === 'class') this.className = String(v); }
    getAttribute(k) { return k === 'class' ? this.className : k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    removeEventListener() {}
    click() { if (this.disabled) return; for (const fn of this.listeners.click || []) fn({ target: this }); }
    focus() { document.activeElement = this; }
    closest() { return null; }
    contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
    all() { return [this, ...this._kids.flatMap((c) => c.all())]; }
    matches(sel) {
      if (sel.startsWith('#')) return this.id === sel.slice(1);
      if (sel.startsWith('.')) return sel.slice(1).split('.').every((c) => this.classList.contains(c));
      return this.tagName === sel.toUpperCase();
    }
    querySelector(sel) { return this.all().slice(1).find((n) => n.matches(sel)) || null; }
    querySelectorAll(sel) { return this.all().slice(1).filter((n) => n.matches(sel)); }
  }

  globalThis.document = {
    body: new Node('body'),
    documentElement: new Node('html'),
    activeElement: null,
    createElement: (tag) => new Node(tag),
    createElementNS: (_ns, tag) => new Node(tag),
    createTextNode: (text) => { const n = new Node('#text'); n.textContent = text; return n; },
    getElementById: (id) => document.body.all().find((n) => n.id === id) || null,
    querySelector: (sel) => document.body.querySelector(sel),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
  };
  document.activeElement = document.body;
  globalThis.window = globalThis;
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  if (typeof globalThis.CustomEvent === 'undefined') globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
  const fire = (node, type) => { for (const fn of node.listeners[type] || []) fn({ target: node, type }); };

  return { Node, fire };
}
