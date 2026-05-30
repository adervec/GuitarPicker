// Headless smoke test: mount every view against a minimal DOM shim and assert
// they render (and tear down) without throwing. Not a browser — a sanity net.

// ---- minimal DOM ----
const allEls = [];
const ctx2d = new Proxy({}, {
  get(t, p) {
    if (p === "createLinearGradient" || p === "createRadialGradient") return () => ({ addColorStop() {} });
    if (p === "measureText") return () => ({ width: 0 });
    if (p in t) return t[p];
    return typeof p === "string" ? () => {} : undefined;
  },
  set(t, p, v) { t[p] = v; return true; },
});

class El {
  constructor(tag = "div") {
    this.tagName = String(tag).toUpperCase(); this.id = ""; this.className = "";
    this.children = []; this.attributes = {}; this.style = {}; this.dataset = {};
    this._html = ""; this._text = ""; this.parentNode = null;
    const set = new Set();
    this.classList = {
      add: (...c) => c.forEach((x) => set.add(x)),
      remove: (...c) => c.forEach((x) => set.delete(x)),
      toggle: (c, f) => { const on = f === undefined ? !set.has(c) : f; on ? set.add(c) : set.delete(c); return on; },
      contains: (c) => set.has(c),
    };
    allEls.push(this);
  }
  appendChild(c) { if (c == null) return c; if (typeof c !== "object") c = new Text(c); c.parentNode = this; this.children.push(c); return c; }
  append(...cs) { cs.forEach((c) => c != null && this.appendChild(c)); }
  prepend(c) { this.children.unshift(c); }
  insertBefore(n, ref) { const i = this.children.indexOf(ref); i < 0 ? this.children.push(n) : this.children.splice(i, 0, n); return n; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; }
  remove() { this.parentNode && this.parentNode.removeChild(this); }
  get firstChild() { return this.children[0] || null; }
  set innerHTML(v) { this._html = v; if (v === "") this.children = []; }
  get innerHTML() { return this._html; }
  set textContent(v) { this._text = v; this.children = []; }
  get textContent() { return this._text; }
  setAttribute(k, v) { this.attributes[k] = v; if (k === "id") this.id = v; }
  getAttribute(k) { return this.attributes[k]; }
  addEventListener() {} removeEventListener() {}
  getContext() { return ctx2d; }
  getBoundingClientRect() { return { left: 0, top: 0, right: 300, bottom: 150, width: 300, height: 150 }; }
  get clientWidth() { return 800; } get clientHeight() { return 400; }
  focus() {} click() {} play() { return Promise.resolve(); } pause() {} load() {}
  setSinkId() { return Promise.resolve(); }
  querySelector(sel) { return search(this, sel, false); }
  querySelectorAll(sel) { return search(this, sel, true) || []; }
}
class Text { constructor(t) { this.nodeType = 3; this._text = String(t); } get textContent() { return this._text; } set textContent(v) { this._text = v; } }
function match(el, sel) {
  if (!(el instanceof El)) return false;
  if (sel.startsWith("#")) return el.id === sel.slice(1);
  if (sel.startsWith(".")) return el.className.split(/\s+/).includes(sel.slice(1));
  return el.tagName === sel.toUpperCase();
}
function search(root, sel, all) {
  const out = [];
  const visit = (n) => { for (const c of n.children || []) { if (match(c, sel)) { if (!all) return c; out.push(c); } const r = visit(c); if (r && !all) return r; } return null; };
  const r = visit(root);
  return all ? out : r;
}

const documentEl = new El("html");
global.document = {
  createElement: (t) => new El(t),
  createTextNode: (t) => new Text(t),
  getElementById: (id) => [...allEls].reverse().find((e) => e.id === id) || null,
  querySelector: (sel) => search({ children: allEls }, sel, false),
  querySelectorAll: (sel) => search({ children: allEls }, sel, true),
  documentElement: documentEl,
  body: new El("body"),
};
global.window = global;
global.addEventListener = () => {}; global.removeEventListener = () => {};
global.devicePixelRatio = 1;
global.requestAnimationFrame = (cb) => { try { cb(16); } catch (e) { throw e; } return 1; };
global.cancelAnimationFrame = () => {};
global.getComputedStyle = () => ({ getPropertyValue: () => "#888888" });
global.matchMedia = () => ({ matches: false, addEventListener() {} });
class ResizeObserver { constructor(cb) { this.cb = cb; } observe() { this.cb([]); } unobserve() {} disconnect() {} }
global.ResizeObserver = ResizeObserver;
const store = new Map();
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear(),
};
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    mediaDevices: {
      enumerateDevices: async () => [],
      getUserMedia: async () => ({ getTracks: () => [], getAudioTracks: () => [{ label: "Mic", stop() {} }] }),
      getDisplayMedia: async () => ({ getTracks: () => [], getVideoTracks: () => [{ addEventListener() {}, stop() {} }] }),
    },
  },
});
const audioNode = new Proxy({ gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} }, frequency: { value: 0 } },
  { get(t, p) { return p in t ? t[p] : () => {}; } });
global.AudioContext = class { constructor() { this.currentTime = 0; this.state = "running"; this.destination = {}; this.sampleRate = 44100; } resume() { return Promise.resolve(); } createGain() { return audioNode; } createOscillator() { return audioNode; } createAnalyser() { return new Proxy({ fftSize: 2048, smoothingTimeConstant: 0 }, { get(t, p) { return p in t ? t[p] : () => {}; }, set(t, p, v) { t[p] = v; return true; } }); } createMediaStreamSource() { return audioNode; } createMediaElementSource() { return audioNode; } };
global.webkitAudioContext = global.AudioContext;
global.Audio = class extends El { constructor() { super("audio"); } };
global.Image = class { set src(v) {} get complete() { return false; } };
global.URL = { createObjectURL: () => "blob:x", revokeObjectURL() {} };
global.Blob = class {};
global.FileReader = class { readAsText() {} readAsDataURL() {} };
global.confirm = () => true; global.alert = () => {};
global.structuredClone = global.structuredClone || ((o) => JSON.parse(JSON.stringify(o)));

// ---- run ----
const { Store } = await import("./src/state.js");
const { builtinSongs } = await import("./src/music/songs.js");
const songId = builtinSongs()[0].id;

// seed a little history so the Progress view exercises charts/table
Store.addHistory({ ts: Date.now() - 86400000, songId, songTitle: "Test", instrument: "acoustic-guitar", score: 5000, accuracy: 82, maxStreak: 12, passed: true, durationSec: 60, notes: { perfect: 20, good: 5, off: 2, miss: 1 } });
Store.addHistory({ ts: Date.now(), songId, songTitle: "Test", instrument: "acoustic-guitar", score: 8000, accuracy: 91, maxStreak: 20, passed: true, durationSec: 70, notes: { perfect: 28, good: 3, off: 1, miss: 0 } });

const views = [
  ["home", []], ["library", []], ["tuner", []], ["settings", []],
  ["editor", []], ["editor(copy)", [songId], "editor"], ["listen", []],
  ["training", []], ["minigames", []], ["glossary", []], ["history", []],
  ["play", [songId], "play"],
];

let pass = 0, fail = 0;
for (const [name, params, modName] of views) {
  const mod = await import(`./src/views/${modName || name}.js`);
  const root = new El("div");
  const ctx = { el: root, params, navigate: () => {}, store: Store, audio: (await import("./src/audio/engine.js")).Audio };
  try {
    const cleanup = await mod.default(ctx);
    if (typeof cleanup === "function") cleanup();
    if (!root.children.length) throw new Error("view rendered no content");
    console.log(`  ✓ ${name} rendered (${root.children.length} root nodes)`);
    pass++;
  } catch (e) {
    console.log(`  ✗ ${name} FAILED: ${e.message}`);
    console.log(String(e.stack).split("\n").slice(1, 4).join("\n"));
    fail++;
  }
}
console.log(`\n${pass} views OK, ${fail} failed.`);
process.exit(fail ? 1 : 0);
