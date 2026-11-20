// GuitarPicker's own colour themes, on top of the house base list (house standard 24: extras welcome).
// These are the old app skins that have no twin in the base list; the rest map to a base theme
// (src/theme-migrate.js). Colours, in font.js's order: bg surface surface2 line text dim accent
// on-accent good warn bad.
import { t } from "./i18n.js";

const KEYS = ["bg","surface","surface2","line","text","dim","accent","on-accent","good","warn","bad"];
export const EXTRA_THEMES = [
  // Sakura
  { id: "sakura", label: () => t("Sakura"), dark: false, colors: "fdf2f6 ffffff fdeef4 f0cfdd 3a2430 8a6577 d94f86 ffffff 2f8a5e c07a12 cf3b52" },
  // Sunset
  { id: "sunset", label: () => t("Sunset"), dark: true, colors: "1a0f1e 2a1730 371d40 4a2752 ffeef6 d9a7c4 ff7a59 2a0d12 43d6a0 ffcf5c ff5d80" },
  // Crimson
  { id: "crimson", label: () => t("Crimson"), dark: true, colors: "160608 280c0f 371115 50202a ffe8ec d09aa3 ff4757 220406 3fd68b ffc24b ff5d6c" },
  // Mahogany
  { id: "mahogany", label: () => t("Mahogany"), dark: true, colors: "1b100b 2c1a11 3a2417 56381f f6e6d6 c2a288 c87f43 1f0f06 6fc28b e3a64b e0685a" },
  // Espresso
  { id: "espresso", label: () => t("Espresso"), dark: true, colors: "17100c 261c15 31251b 4a3626 f3e6d5 b39a80 d9a05b 1a120c 6fc08a e0a83c e0645c" },
  // Aurora Borealis
  { id: "borealis", label: () => t("Aurora Borealis"), dark: true, colors: "050b16 0c1a2b 122438 1d3550 e6f6ff 8fb0c9 4dffa8 04140c 4dffa8 ffd166 ff6b8a" },
  // Peacock
  { id: "peacock", label: () => t("Peacock"), dark: true, colors: "071019 0f2333 153042 22475f e9f4fb 90aec4 17c9a3 032019 17c9a3 e3b23c f0616f" },
  // Arctic
  { id: "arctic", label: () => t("Arctic"), dark: true, colors: "0c1822 162a3a 1d3548 2c4961 eaf6ff 9cc0d6 7fd6ff 04141f 6fe6c0 ffd27a ff7d8f" },
  // Coral Reef
  { id: "coral", label: () => t("Coral Reef"), dark: true, colors: "06171a 0e2a31 14373f 205059 e8fbfb 8fb9bd ff7f6b 23120e 3fd6a8 ffc266 ff5f70" },
  // Neon Arcade
  { id: "neon", label: () => t("Neon Arcade"), dark: true, colors: "08060f 130f22 1b1530 34244f f4eaff a890d0 ff2bd6 15001a 25f4a0 ffd23f ff3b6b" },
  // Bubblegum
  { id: "bubblegum", label: () => t("Bubblegum"), dark: true, colors: "241320 381e32 46273f 5e3a55 ffeaf6 d0a6c2 ff7ec0 2a0c20 5fe0b0 ffce6a ff6f91" },
  // Royal
  { id: "royal", label: () => t("Royal"), dark: true, colors: "0f0a1f 1c1638 261d4a 3c2f63 efe9ff b0a0d6 9b6bff 100726 4be6a0 ffd267 ff6b8a" },
];

/** The extras in appFont.addThemes() shape; labels translated now (call after the language loads). */
export function extraThemes() {
  return EXTRA_THEMES.map((x) => ({
    id: x.id, label: x.label(), dark: x.dark,
    colors: Object.fromEntries(x.colors.split(" ").map((hex, i) => [KEYS[i], "#" + hex])),
  }));
}

/** Register the extras with font.js. Returns how many were added (0 without font.js). */
export function registerExtraThemes(house = globalThis.appFont) {
  return house?.addThemes ? house.addThemes(extraThemes()) : 0;
}
