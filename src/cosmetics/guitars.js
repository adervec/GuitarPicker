// Guitar avatars, composed from independent SVG layers: body shape, finish,
// colour, pickguard, hardware, fretboard inlays and decals. Like avatars.js
// every part is a data object returning an SVG fragment string. A per-compose
// counter makes gradient/clip ids unique so many thumbnails coexist on a page.
import { GUITAR_COLORS, pickById, shadeColor, mixColor, svgDoc } from "./parts.js";

const VB = "0 0 160 384";
const WOOD_NECK = "#d8b27a";
const FRETBOARD = "#3a2415";
const STRING_COL = "#dfe3ea";

// Symmetric guitar-body outline (returns SVG path `d`). Tuned by bout widths.
function bodyPath(top, bottom, uW, wW, lW, cx = 80) {
  const h = bottom - top;
  const upY = top + h * 0.24, wY = top + h * 0.52, loY = top + h * 0.76;
  const L = (w) => (cx - w).toFixed(1), R = (w) => (cx + w).toFixed(1);
  const f = (n) => n.toFixed(1);
  return [
    `M ${cx} ${f(top)}`,
    `C ${L(uW * 0.75)} ${f(top)} ${L(uW)} ${f(top + h * 0.06)} ${L(uW)} ${f(upY)}`,
    `C ${L(uW)} ${f(wY - h * 0.07)} ${L(wW)} ${f(wY - h * 0.05)} ${L(wW)} ${f(wY)}`,
    `C ${L(wW)} ${f(wY + h * 0.05)} ${L(lW)} ${f(loY - h * 0.07)} ${L(lW)} ${f(loY)}`,
    `C ${L(lW)} ${f(bottom - h * 0.02)} ${L(lW * 0.55)} ${f(bottom)} ${cx} ${f(bottom)}`,
    `C ${R(lW * 0.55)} ${f(bottom)} ${R(lW)} ${f(bottom - h * 0.02)} ${R(lW)} ${f(loY)}`,
    `C ${R(lW)} ${f(loY - h * 0.07)} ${R(wW)} ${f(wY + h * 0.05)} ${R(wW)} ${f(wY)}`,
    `C ${R(wW)} ${f(wY - h * 0.05)} ${R(uW)} ${f(wY - h * 0.07)} ${R(uW)} ${f(upY)}`,
    `C ${R(uW)} ${f(top + h * 0.06)} ${R(uW * 0.75)} ${f(top)} ${cx} ${f(top)}`,
    "Z",
  ].join(" ");
}

// ---- categories ------------------------------------------------------------

export const SHAPES = [
  { id: "dreadnought", name: "Dreadnought", rarity: "common", acoustic: true, path: bodyPath(196, 374, 44, 33, 52) },
  { id: "classical", name: "Classical", rarity: "common", acoustic: true, path: bodyPath(202, 372, 40, 32, 47) },
  { id: "jumbo", name: "Jumbo", rarity: "uncommon", acoustic: true, path: bodyPath(190, 376, 48, 37, 56) },
  { id: "strat", name: "Single-Cut S", rarity: "common", acoustic: false, path: bodyPath(206, 368, 45, 38, 50) },
  { id: "tele", name: "Classic T", rarity: "common", acoustic: false, path: bodyPath(208, 366, 43, 39, 47) },
  { id: "lespaul", name: "Solid Single-Cut", rarity: "uncommon", acoustic: false, path: bodyPath(204, 370, 44, 37, 52) },
  { id: "hollow", name: "Hollow Body", rarity: "rare", acoustic: false, holes: true, path: bodyPath(196, 374, 46, 35, 53) },
  { id: "bass", name: "Bass", rarity: "uncommon", acoustic: false, bass: true, path: bodyPath(198, 376, 42, 35, 50) },
  { id: "flyingv", name: "Flying V", rarity: "epic", acoustic: false, path: "M 64 202 L 96 202 L 150 360 L 112 360 L 80 286 L 48 360 L 10 360 Z" },
  { id: "explorer", name: "Explorer", rarity: "epic", acoustic: false, path: "M 58 200 L 152 248 L 124 360 L 92 322 L 60 366 L 36 300 L 58 262 Z" },
];

const HARDWARE = {
  chrome: { id: "chrome", name: "Chrome", rarity: "common", metal: "#cfd3db", dark: "#878d99" },
  black: { id: "black", name: "Black", rarity: "common", metal: "#34363d", dark: "#1a1b20" },
  gold: { id: "gold", name: "Gold", rarity: "rare", metal: "#e7c25a", dark: "#a8842f" },
  brass: { id: "brass", name: "Brass", rarity: "uncommon", metal: "#c7a24a", dark: "#8a6f2d" },
};
export const HARDWARES = Object.values(HARDWARE);

export const PICKGUARDS = [
  { id: "none", name: "None", rarity: "common", fill: null },
  { id: "white", name: "White", rarity: "common", fill: "#eef1f6" },
  { id: "black", name: "Black", rarity: "common", fill: "#16171c" },
  { id: "tortoise", name: "Tortoise", rarity: "uncommon", fill: "#5e3416" },
  { id: "pearl", name: "Pearloid", rarity: "rare", fill: "#dde7ea" },
  { id: "mint", name: "Mint", rarity: "uncommon", fill: "#d4e9cf" },
  { id: "gold", name: "Gold Sparkle", rarity: "epic", fill: "#d8b24a" },
];

export const INLAYS = [
  { id: "none", name: "None", rarity: "common", draw: () => "" },
  { id: "dots", name: "Dots", rarity: "common", draw: (col) =>
    `<g fill="${col}">${[92, 120, 148, 176].map((y) => `<circle cx="80" cy="${y}" r="2.4"/>`).join("")}</g>` },
  { id: "blocks", name: "Blocks", rarity: "uncommon", draw: (col) =>
    `<g fill="${col}">${[88, 116, 144, 172].map((y) => `<rect x="75" y="${y}" width="10" height="6" rx="1"/>`).join("")}</g>` },
  { id: "sharkfin", name: "Shark Fin", rarity: "rare", draw: (col) =>
    `<g fill="${col}">${[92, 120, 148, 176].map((y) => `<path d="M75 ${y + 5} L80 ${y - 4} L85 ${y + 5} Z"/>`).join("")}</g>` },
  { id: "stars", name: "Stars", rarity: "epic", draw: (col) =>
    `<g fill="${col}">${[92, 120, 148, 176].map((y) => gstar(80, y, 4)).join("")}</g>` },
  { id: "vine", name: "Vine", rarity: "epic", draw: (col) =>
    `<path d="M80 60 Q88 90 80 120 Q72 150 80 188" stroke="${col}" stroke-width="1.6" fill="none"/>` +
    `<g fill="${col}">${[80, 110, 140, 170].map((y, i) => `<ellipse cx="${i % 2 ? 86 : 74}" cy="${y}" rx="3.2" ry="1.6"/>`).join("")}</g>` },
];

export const FINISHES = [
  { id: "solid", name: "Solid", rarity: "common", overlay: (c) =>
    `<ellipse cx="70" cy="250" rx="46" ry="60" fill="#fff" opacity="0.06"/>` },
  { id: "gloss", name: "Gloss", rarity: "common", overlay: (c) =>
    `<path d="M52 210 q-18 70 6 150 q10 -78 24 -150 z" fill="#fff" opacity="0.14"/>` },
  { id: "matte", name: "Matte", rarity: "uncommon", overlay: (c) =>
    `<rect x="20" y="190" width="120" height="200" fill="#000" opacity="0.07"/>` },
  { id: "sunburst", name: "Sunburst", rarity: "rare", overlay: (c) =>
    `<defs><radialGradient id="gf${c.uid}" cx="50%" cy="48%" r="58%">` +
    `<stop offset="40%" stop-color="${shadeColor(c.body, 0.12)}" stop-opacity="0"/>` +
    `<stop offset="100%" stop-color="${shadeColor(c.body, -0.55)}" stop-opacity="0.95"/></radialGradient></defs>` +
    `<rect x="20" y="186" width="120" height="200" fill="url(#gf${c.uid})"/>` },
  { id: "wood", name: "Natural Wood", rarity: "uncommon", overlay: (c) =>
    `<g stroke="${shadeColor(c.body, -0.22)}" stroke-width="1.4" fill="none" opacity="0.5">` +
    `${[58, 70, 82, 94].map((x) => `<path d="M${x} 196 q-6 90 0 180"/>`).join("")}` +
    `${[100, 112].map((x) => `<path d="M${x} 196 q6 90 0 180"/>`).join("")}</g>` },
  { id: "metallic", name: "Metallic Flake", rarity: "rare", overlay: (c) =>
    `<g stroke="#fff" stroke-width="2" opacity="0.16">${[0, 1, 2, 3].map((i) => `<path d="M${36 + i * 26} 200 l30 170"/>`).join("")}</g>` },
  { id: "relic", name: "Road Worn", rarity: "epic", overlay: (c) =>
    `<g opacity="0.5"><path d="M108 300 q14 6 18 22" stroke="${shadeColor(c.body, -0.4)}" stroke-width="2" fill="none"/>` +
    `<ellipse cx="62" cy="332" rx="12" ry="6" fill="${shadeColor(c.body, -0.35)}" opacity="0.4"/>` +
    `<path d="M40 250 l10 5 m-6 14 l9 3" stroke="${shadeColor(c.body, 0.3)}" stroke-width="1.5"/></g>` },
  { id: "twotone", name: "Two-Tone", rarity: "rare", overlay: (c) =>
    `<rect x="20" y="186" width="120" height="92" fill="${shadeColor(c.body, 0.22)}" opacity="0.55"/>` },
];

export const DECALS = [
  { id: "none", name: "None", rarity: "common", draw: () => "" },
  { id: "racing", name: "Racing Stripe", rarity: "uncommon", draw: (c) =>
    `<g fill="#f4f5f8" opacity="0.9"><rect x="74" y="196" width="5" height="178"/><rect x="83" y="196" width="5" height="178"/></g>` },
  { id: "star", name: "Big Star", rarity: "rare", draw: (c) =>
    `<g fill="${c.accent}" opacity="0.92">${gstar(80, 286, 26)}</g>` },
  { id: "flames", name: "Flames", rarity: "epic", draw: (c) =>
    `<g fill="${c.accent}" opacity="0.85"><path d="M52 360 q-2 -40 18 -64 q-4 18 6 24 q2 -16 14 -26 q-4 36 -14 50 q14 -6 16 -22 q8 24 -8 42 z"/></g>` },
  { id: "lightning", name: "Lightning", rarity: "rare", draw: (c) =>
    `<path d="M92 210 L66 296 L84 296 L60 372 L108 280 L88 280 Z" fill="${c.accent}" opacity="0.9"/>` },
  { id: "polka", name: "Polka Dots", rarity: "uncommon", draw: (c) =>
    `<g fill="#f4f5f8" opacity="0.85">${[230, 270, 310, 350].flatMap((y, r) => [60, 80, 100].map((x) => `<circle cx="${x + (r % 2 ? 10 : 0)}" cy="${y}" r="3.4"/>`)).join("")}</g>` },
  { id: "floral", name: "Floral", rarity: "epic", draw: (c) =>
    `<g fill="${c.accent}" opacity="0.85">${[[66, 250], [96, 300], [70, 330]].map(([x, y]) => flower(x, y)).join("")}</g>` },
  { id: "sticker", name: "Sticker Bomb", rarity: "legendary", draw: (c) =>
    `<g opacity="0.92"><rect x="58" y="250" width="20" height="14" rx="3" transform="rotate(-12 58 250)" fill="#ff4757"/>` +
    `<circle cx="96" cy="280" r="9" fill="#19f0ff"/><rect x="70" y="300" width="22" height="12" rx="3" transform="rotate(8 70 300)" fill="#ffe27a"/>` +
    `${gstar(64, 326, 8)}</g>` },
];

// ---- catalog index ---------------------------------------------------------

export const GUITAR_PARTS = {
  shape: { label: "Body Shape", kind: "part", items: SHAPES, key: "shape" },
  color: { label: "Body Colour", kind: "color", colors: GUITAR_COLORS, key: "color" },
  finish: { label: "Finish", kind: "part", items: FINISHES, key: "finish" },
  pickguard: { label: "Pickguard", kind: "part", items: PICKGUARDS, key: "pickguard" },
  hardware: { label: "Hardware", kind: "part", items: HARDWARES, key: "hardware" },
  inlay: { label: "Inlays", kind: "part", items: INLAYS, key: "inlay" },
  decal: { label: "Decal", kind: "part", items: DECALS, key: "decal" },
};
export const GUITAR_CATEGORY_ORDER = ["shape", "color", "finish", "pickguard", "hardware", "inlay", "decal"];
export const DEFAULT_GUITAR = {
  shape: "dreadnought", color: "wood-honey", finish: "wood",
  pickguard: "none", hardware: "chrome", inlay: "dots", decal: "none",
};

// ---- composition -----------------------------------------------------------

let UID = 0;
function part(items, id) { for (const i of items) if (i.id === id) return i; return items[0]; }

/** Compose a full guitar SVG string from a loadout. `accent` tints decals. */
export function composeGuitar(loadout = {}, accent) {
  const lo = { ...DEFAULT_GUITAR, ...loadout };
  const shape = part(SHAPES, lo.shape);
  const body = pickById(GUITAR_COLORS, lo.color).hex;
  const hw = HARDWARE[lo.hardware] || HARDWARE.chrome;
  const uid = ++UID;
  const c = { body, hw, accent: accent || "#6ea8fe", uid };
  const inlayCol = "#e8eef0";
  const L = [];

  // headstock + tuners
  L.push(`<path d="M66 46 L94 46 L92 12 Q80 5 68 12 Z" fill="${shadeColor(WOOD_NECK, -0.18)}"/>`);
  L.push(`<g fill="${hw.metal}">${[16, 26, 36].flatMap((y) => [`<circle cx="63" cy="${y}" r="2.6"/>`, `<circle cx="97" cy="${y}" r="2.6"/>`]).join("")}</g>`);
  // neck + fretboard + frets + nut
  L.push(`<rect x="72" y="44" width="16" height="160" fill="${WOOD_NECK}"/>`);
  L.push(`<rect x="73" y="46" width="14" height="156" fill="${FRETBOARD}"/>`);
  L.push(`<g stroke="${hw.metal}" stroke-width="1.2" opacity="0.85">${fretYs().map((y) => `<path d="M73 ${y} h14"/>`).join("")}</g>`);
  L.push(`<rect x="72" y="44" width="16" height="3" fill="#ece6d6"/>`);
  // inlays on fretboard
  L.push(part(INLAYS, lo.inlay).draw(inlayCol));
  // body fill + clipped finish/pickguard/decal
  L.push(`<defs><clipPath id="gb${uid}"><path d="${shape.path}"/></clipPath></defs>`);
  L.push(`<path d="${shape.path}" fill="${body}" stroke="${shadeColor(body, -0.4)}" stroke-width="1.5"/>`);
  L.push(`<g clip-path="url(#gb${uid})">`);
  L.push(part(FINISHES, lo.finish).overlay(c));
  const pg = part(PICKGUARDS, lo.pickguard);
  if (pg.fill) L.push(pickguardShape(shape, pg.fill));
  L.push(part(DECALS, lo.decal).draw(c));
  L.push(`</g>`);
  // features (soundhole / pickups / bridge / knobs / f-holes)
  L.push(features(shape, c));
  // strings (over everything)
  L.push(strings(shape));

  return svgDoc(VB, L.join(""), "cos-guitar");
}

// ---- feature + helper shapes ----------------------------------------------

function fretYs() {
  const ys = [];
  for (let y = 60; y < 200; y += 13) ys.push(y);
  return ys;
}

function pickguardShape(shape, fill) {
  if (shape.acoustic) {
    // teardrop beside the soundhole
    return `<path d="M104 280 q16 26 8 54 q-16 8 -28 -2 q-6 -26 6 -48 q6 -8 14 -4 z" fill="${fill}" opacity="0.95"/>`;
  }
  // larger electric scratchplate
  return `<path d="M52 256 q-10 40 4 84 q34 16 64 0 q10 -10 4 -26 q-18 -8 -22 -28 q-2 -22 -22 -28 q-18 -4 -32 22 z" fill="${fill}" opacity="0.95"/>`;
}

function features(shape, c) {
  if (shape.acoustic) {
    return `<circle cx="80" cy="296" r="21" fill="#1b130c"/>` +
      `<circle cx="80" cy="296" r="21" fill="none" stroke="${c.hw.metal}" stroke-width="2" opacity="0.55"/>` +
      `<circle cx="80" cy="296" r="25" fill="none" stroke="${shadeColor(c.body, -0.3)}" stroke-width="1" opacity="0.5"/>` +
      `<rect x="62" y="334" width="36" height="9" rx="2" fill="#241608"/>` +
      `<rect x="64" y="333" width="32" height="2" fill="${c.hw.metal}"/>`;
  }
  const pus = shape.bass
    ? `<rect x="58" y="288" width="44" height="13" rx="2" fill="#15151b"/>`
    : `<rect x="58" y="266" width="44" height="11" rx="2" fill="#15151b"/><rect x="58" y="292" width="44" height="11" rx="2" fill="#15151b"/>`;
  const fholes = shape.holes
    ? `<g fill="#15110c">${[48, 112].map((x) => `<path d="M${x} 250 q6 0 5 14 q-1 16 -8 22 q5 -16 3 -22 q-2 -10 0 -14 z"/>`).join("")}</g>`
    : "";
  const bridge = `<rect x="62" y="320" width="36" height="11" rx="2" fill="${c.hw.metal}"/>` +
    `<rect x="62" y="320" width="36" height="3" fill="${c.hw.dark}"/>`;
  const knobs = `<g fill="${c.hw.metal}" stroke="${c.hw.dark}" stroke-width="0.6">` +
    `<circle cx="112" cy="336" r="4.4"/><circle cx="124" cy="346" r="4.4"/><circle cx="100" cy="346" r="4.4"/></g>`;
  return fholes + pus + bridge + knobs;
}

function strings(shape) {
  const n = shape.bass ? 4 : 6;
  const span = n === 4 ? 12 : 16;
  const x0 = 80 - span / 2;
  const bottomY = shape.acoustic ? 339 : 326;
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + (span / (n - 1)) * i;
    const w = 0.6 + (1 - i / (n - 1)) * 1.4; // low strings thicker
    out.push(`<path d="M${x.toFixed(1)} 45 L${x.toFixed(1)} ${bottomY}" stroke="${STRING_COL}" stroke-width="${w.toFixed(2)}" opacity="0.9"/>`);
  }
  return `<g>${out.join("")}</g>`;
}

// 5-point star centred at (cx,cy), outer radius r.
function gstar(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.45 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}"/>`;
}

function flower(cx, cy) {
  let s = "";
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 / 5) * i;
    s += `<circle cx="${(cx + 5 * Math.cos(a)).toFixed(1)}" cy="${(cy + 5 * Math.sin(a)).toFixed(1)}" r="3"/>`;
  }
  return s + `<circle cx="${cx}" cy="${cy}" r="2.6" fill="#fff"/>`;
}
