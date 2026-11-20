// One-time move from GuitarPicker's old app skins to the house themes (house standard 24).
// The old skin lived in settings.theme; the choice now lives in font.js. A skin with a twin in the
// base list goes to that twin; one without stays as GuitarPicker's own extra (src/theme-extras.js,
// registered before this runs). Then settings.theme is removed so the old code path is gone.
export const SKIN_TO_HOUSE = {
  // twins in the base list
  midnight: "midnight", dark: "dark", light: "light", slate: "slate", mono: "slate",
  ember: "ember", forest: "forest", ocean: "ocean", synthwave: "synthwave", vaporwave: "synthwave",
  gold: "gold", terminal: "terminal", contrast: "contrast", parchment: "paper",
  // no twin: kept as extras, under their own ids
  sakura: "sakura", sunset: "sunset", crimson: "crimson", mahogany: "mahogany", espresso: "espresso",
  borealis: "borealis", peacock: "peacock", arctic: "arctic", coral: "coral", neon: "neon",
  bubblegum: "bubblegum", royal: "royal",
};

/**
 * `settings` is the store's settings object, `house` is appFont (or a stub in tests).
 * Returns the house theme chosen, or null when the reader stays on System.
 * The old default skin ("midnight") was saved for everyone whether or not they chose it, and a
 * device-derived default was never a choice, so neither becomes a saved house theme.
 */
export function migrateTheme(settings, house) {
  if (!settings || !("theme" in settings)) return null;
  const old = settings.theme, chosen = settings.themeChosen !== false && old !== "midnight";
  delete settings.theme; delete settings.themeChosen;
  const id = SKIN_TO_HOUSE[old];
  if (!chosen || !id || !house?.setTheme) return null;
  if (house.theme && house.theme() !== "system") return null;   // already picked a house theme: theirs wins
  house.setTheme(id);
  return id;
}
