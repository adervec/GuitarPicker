// App skins = selectable colour themes. Each skin's `id` matches a
// `[data-theme="id"]` block in styles/themes.css. This module is the single
// source of truth for the theme list (used by Settings, the top-bar quick
// picker, and the Locker). `swatch` = [background, accent, accent2] preview.

export const SKINS = [
  // ---- originals -----------------------------------------------------------
  { id: "midnight", name: "Midnight", rarity: "common", desc: "Deep blue after-hours calm.", swatch: ["#0b0f1a", "#6ea8fe", "#b388ff"] },
  { id: "dark", name: "Dark Slate", rarity: "common", desc: "Neutral graphite with green pop.", swatch: ["#121212", "#4caf50", "#80e27e"] },
  { id: "light", name: "Daylight", rarity: "common", desc: "Clean paper-bright workspace.", swatch: ["#f3f5fb", "#2d6cdf", "#7a4ddb"] },
  { id: "sunset", name: "Sunset", rarity: "uncommon", desc: "Warm dusk oranges over plum.", swatch: ["#1a0f1e", "#ff7a59", "#ffb84d"] },
  { id: "forest", name: "Forest", rarity: "uncommon", desc: "Mossy greens and citrus.", swatch: ["#0c1410", "#4fd18b", "#c4e86a"] },
  { id: "contrast", name: "High Contrast", rarity: "rare", desc: "Maximum-legibility accessibility set.", swatch: ["#000000", "#ffe600", "#00e5ff"] },

  // ---- new skins -----------------------------------------------------------
  { id: "neon", name: "Neon Arcade", rarity: "epic", desc: "Electric magenta + cyan on jet.", swatch: ["#08060f", "#ff2bd6", "#19f0ff"] },
  { id: "synthwave", name: "Synthwave", rarity: "epic", desc: "Retro sunset grid vibes.", swatch: ["#1a0b2e", "#ff5f9e", "#ffb14e"] },
  { id: "vaporwave", name: "Vaporwave", rarity: "epic", desc: "Pastel pink and aqua haze.", swatch: ["#1f1633", "#f59ecb", "#7ef0e0"] },
  { id: "ocean", name: "Deep Ocean", rarity: "rare", desc: "Abyssal teal and current blue.", swatch: ["#04161d", "#22c1c9", "#4aa3ff"] },
  { id: "arctic", name: "Arctic", rarity: "rare", desc: "Icy whites and glacier blue.", swatch: ["#0c1822", "#7fd6ff", "#cfe9ff"] },
  { id: "ember", name: "Ember", rarity: "rare", desc: "Glowing coals over charcoal.", swatch: ["#160a08", "#ff6a3d", "#ffc24b"] },
  { id: "crimson", name: "Crimson", rarity: "rare", desc: "Stage-blood red and gold.", swatch: ["#160608", "#ff4757", "#ffb454"] },
  { id: "royal", name: "Royal", rarity: "epic", desc: "Regal violet trimmed in gold.", swatch: ["#0f0a1f", "#9b6bff", "#e7c25a"] },
  { id: "gold", name: "Black Gold", rarity: "legendary", desc: "Obsidian with molten gold.", swatch: ["#0c0b07", "#e7b53a", "#f6e27a"] },
  { id: "mahogany", name: "Mahogany", rarity: "uncommon", desc: "Warm luthier woodshop tones.", swatch: ["#1b100b", "#c87f43", "#e0b06a"] },
  { id: "bubblegum", name: "Bubblegum", rarity: "uncommon", desc: "Sweet pink and mint pop.", swatch: ["#241320", "#ff7ec0", "#5fe0c0"] },
  { id: "terminal", name: "Terminal", rarity: "rare", desc: "Green phosphor CRT readout.", swatch: ["#020a02", "#33ff66", "#9dff7a"] },
  { id: "mono", name: "Mono Ink", rarity: "uncommon", desc: "Quiet greyscale, zero distraction.", swatch: ["#101012", "#d8d8de", "#9a9aa2"] },
  { id: "slate", name: "Blue Slate", rarity: "common", desc: "Soft steel-blue and amber.", swatch: ["#10151d", "#5e9bd6", "#e0a85a"] },

  // ---- daylight & warm sets ------------------------------------------------
  { id: "parchment", name: "Parchment", rarity: "common", desc: "Warm paper and sienna ink.", swatch: ["#f7f1e3", "#a3612b", "#2f6f5e"] },
  { id: "sakura", name: "Sakura", rarity: "uncommon", desc: "Blossom pink over sage.", swatch: ["#fdf2f6", "#d94f86", "#5f9e7d"] },
  { id: "espresso", name: "Espresso", rarity: "rare", desc: "Dark roast with a crema top.", swatch: ["#17100c", "#d9a05b", "#7fb08a"] },
  { id: "borealis", name: "Aurora Borealis", rarity: "epic", desc: "Northern lights over polar night.", swatch: ["#050b16", "#4dffa8", "#a86bff"] },
  { id: "coral", name: "Coral Reef", rarity: "rare", desc: "Shallow-water teal and coral.", swatch: ["#06171a", "#ff7f6b", "#ffd8a8"] },
  { id: "peacock", name: "Peacock", rarity: "legendary", desc: "Plumage emerald trimmed in gold.", swatch: ["#071019", "#17c9a3", "#e3b23c"] },
];

const BY_ID = Object.fromEntries(SKINS.map((s) => [s.id, s]));

export function getSkin(id) { return BY_ID[id] || SKINS[0]; }
export function skinIds() { return SKINS.map((s) => s.id); }
