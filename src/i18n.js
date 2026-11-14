// Interface text and formatting, through the house font.js (https://adervec.github.io/font.js):
//   t("Saved {n} songs", { n })          English is the key; locales/<lang>.json holds the rest
//   t.n("{n} song", "{n} songs", count)  plurals follow each language's rules
//   fmt.number / percent / date / time / dateTime / relative
// The 16 non-English languages are machine translated (house standard 20); font.js says so.
// Without font.js (the Node tests, or it failed to load) everything falls back to English.
const interp = (s, p) => (p ? String(s).replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(p, k) ? String(p[k]) : m)) : String(s));
const af = () => globalThis.appFont;

export function t(key, params) { return af()?.t ? af().t(key, params) : interp(key, params); }
t.n = (one, other, n, params) => (af()?.t?.n ? af().t.n(one, other, n, params) : interp(n === 1 ? one : other, { n, ...params }));

const loc = () => af()?.locale?.() || undefined;
export const fmt = {
  number: (n, o) => (af()?.fmt ? af().fmt.number(n, o) : String(+n.toFixed(o?.max ?? 2))),
  percent: (x, max) => (af()?.fmt ? af().fmt.percent(x, max) : Math.round(x * 100) + "%"),
  date: (d, style) => (af()?.fmt ? af().fmt.date(d, style) : new Date(d).toLocaleDateString(loc())),
  time: (d) => (af()?.fmt ? af().fmt.time(d) : new Date(d).toLocaleTimeString(loc(), { timeStyle: "short" })),
  dateTime: (d, style) => (af()?.fmt ? af().fmt.dateTime(d, style) : new Date(d).toLocaleString(loc())),
  relative: (d) => (af()?.fmt ? af().fmt.relative(d) : new Date(d).toLocaleString(loc())),
};

/** Resolves once the chosen language's text has loaded (at once in English or without font.js). */
export function i18nReady() {
  const r = af()?.ready;
  return r ? Promise.race([r, new Promise((res) => setTimeout(res, 3000))]).catch(() => {}) : Promise.resolve();
}
