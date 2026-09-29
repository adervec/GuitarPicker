// Tiny DOM/chart helpers, ported (trimmed to what's actually used so far)
// from the vanilla app's src/ui/components.js.
//
// `el`/`slider`/`toast` back the ported Play and Karaoke engines
// (features/play-song, features/karaoke-song) — near-verbatim ports of
// views/play.js and views/karaoke.js's `stage()`, which build their own DOM
// subtree imperatively (a canvas game + HUD, not JSX), the same pattern
// you'd use to mount a Three.js scene or a Phaser game inside a React page.
// `download`/`lineChart`/`fmtTime`/`getVar` are plain utilities also used
// from ordinary React pages (e.g. views/history) — nothing here is
// imperative-DOM-only by nature, `el` et al. just happen to be.

// `el`'s props bag is inherently dynamic (arbitrary DOM properties, event
// handlers, and a few special keys below) — that dynamism is the point of a
// hyperscript builder, so this stays a loose record rather than a closed
// interface; the special keys are narrowed with runtime checks, same as the
// vanilla original.
export type ElProps = Record<string, unknown>;
export type ElChild = Node | string | number | null | false | undefined;
export type ElChildren = ElChild | ElChild[];

/** Hyperscript-ish element builder: el("div.card#x", { onclick }, [children]) */
export function el(tag: string, props: ElProps = {}, children: ElChildren = []): HTMLElement {
  let tagName = "div", id: string | null = null;
  const classes: string[] = [];
  tag.replace(/([#.][^#.]+)/g, (m) => {
    if (m[0] === "#") id = m.slice(1); else classes.push(m.slice(1));
    return m;
  });
  const base = tag.match(/^[a-z0-9]+/i);
  if (base) tagName = base[0];
  const node = document.createElement(tagName);
  if (id) node.id = id;
  if (classes.length) node.className = classes.join(" ");
  const dynNode = node as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") node.className += " " + String(v);
    else if (k === "html") node.innerHTML = String(v);
    else if (k === "text") node.textContent = String(v);
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k in node && k !== "list") { try { dynNode[k] = v; } catch { node.setAttribute(k, String(v)); } }
    else node.setAttribute(k, String(v));
  }
  for (const c of ([] as ElChild[]).concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  return node;
}

export interface SliderElement extends HTMLLabelElement {
  setValue: (v: number) => void;
}

export function slider({ label, min = 0, max = 1, step = 0.01, value = 0, fmt = (v: number) => String(v), oninput }: {
  label?: string; min?: number; max?: number; step?: number; value?: number;
  fmt?: (v: number) => string; oninput?: (v: number) => void;
}): SliderElement {
  const valEl = el("span.val", { text: fmt(value) });
  const input = el("input", { type: "range", min, max, step, value, oninput: (e: Event) => {
    const v = parseFloat((e.target as HTMLInputElement).value); valEl.textContent = fmt(v); oninput && oninput(v);
  } });
  const wrap = el("label.field", {}, [
    label ? el("span", { text: label }) : null,
    el("div.slider", {}, [input, valEl]),
  ]) as SliderElement;
  wrap.setValue = (v: number) => { (input as HTMLInputElement).value = String(v); valEl.textContent = fmt(v); };
  return wrap;
}

// Toasts append to #toast-host, same convention as the vanilla app — the
// Play page renders that host div once (see views/play/ui/PlayPage.tsx).
let toastHost: HTMLElement | null | undefined;
export function toast(msg: string, kind = ""): void {
  toastHost ||= document.getElementById("toast-host");
  if (!toastHost) return; // SSR / not mounted yet — nothing to show it in
  const t = el(`div.toast.${kind}`.replace(/\.$/, ""), { text: msg });
  toastHost.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity 300ms"; }, 2600);
  setTimeout(() => t.remove(), 2950);
}

export function getVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
}

export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function download(filename: string, text: string, mime = "application/json"): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface PickedFile {
  name: string;
  text: string;
  file: File;
}

/** Opens a file picker (an invisible <input type=file>) and resolves the text
 *  contents of whatever's chosen, or null on cancel. Used by the Song
 *  Editor's "Import .lrc" button. */
export function pickFile(accept = ".json"): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = el("input", { type: "file", accept, style: { display: "none" } }) as HTMLInputElement;
    input.addEventListener("change", () => {
      const f = input.files?.[0];
      if (!f) { resolve(null); return; }
      const r = new FileReader();
      r.onload = () => resolve({ name: f.name, text: String(r.result), file: f });
      r.readAsText(f);
    });
    document.body.appendChild(input); input.click(); setTimeout(() => input.remove(), 1000);
  });
}

export interface ChartSeries {
  color: string;
  points: { x: number; y: number }[];
}

/** Simple multi-series line chart onto a canvas. series: [{color, points:[{x,y}]}] */
export function lineChart(canvas: HTMLCanvasElement, series: ChartSeries[], opts: { minY?: number; maxY?: number } = {}): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 600, h = canvas.clientHeight || 220;
  canvas.width = w * dpr; canvas.height = h * dpr; ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  const pad = { l: 38, r: 12, t: 12, b: 24 };
  const all = series.flatMap((s) => s.points);
  if (!all.length) {
    ctx.fillStyle = getVar("--muted"); ctx.font = `13px ${getVar("--font")}`;
    ctx.fillText("No data yet — play a song to start trending.", pad.l, h / 2);
    return;
  }
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = opts.minY ?? Math.min(...ys, 0), maxY = opts.maxY ?? Math.max(...ys, 1);
  const X = (x: number) => pad.l + ((x - minX) / (maxX - minX || 1)) * (w - pad.l - pad.r);
  const Y = (y: number) => h - pad.b - ((y - minY) / (maxY - minY || 1)) * (h - pad.t - pad.b);
  ctx.strokeStyle = getVar("--line"); ctx.fillStyle = getVar("--muted");
  ctx.font = `10px ${getVar("--mono")}`; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const gy = pad.t + (i / 4) * (h - pad.t - pad.b);
    ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(w - pad.r, gy); ctx.stroke();
    ctx.globalAlpha = 1;
    const val = Math.round(maxY - (i / 4) * (maxY - minY));
    ctx.fillText(String(val), 4, gy + 3);
  }
  for (const s of series) {
    if (!s.points.length) continue;
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath();
    s.points.forEach((p, i) => { const x = X(p.x), y = Y(p.y); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    ctx.fillStyle = s.color;
    s.points.forEach((p) => { ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 2.5, 0, 7); ctx.fill(); });
  }
}
