// One-time move from GuitarPicker's old app skins to the house theme list (house standard 24).
// The old skin lived in settings.theme; the house choice lives in font.js. Each old skin goes to
// the nearest house theme once, then settings.theme is removed so the old code path is gone.
export const SKIN_TO_HOUSE = {
  midnight: "midnight", dark: "dark", light: "light", slate: "slate", mono: "slate",
  sunset: "ember", ember: "ember", crimson: "ember", mahogany: "ember", espresso: "ember",
  forest: "forest", borealis: "forest", peacock: "forest",
  ocean: "ocean", arctic: "ocean", coral: "ocean",
  neon: "synthwave", synthwave: "synthwave", vaporwave: "synthwave", bubblegum: "synthwave", royal: "synthwave",
  gold: "gold", terminal: "terminal", contrast: "contrast",
  parchment: "paper", sakura: "pastel",
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
