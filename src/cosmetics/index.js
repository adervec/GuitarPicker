// Cosmetics registry — the single import surface for views.
// Loadouts live in settings (see state.js DEFAULTS):
//   settings.avatar  → player avatar loadout
//   settings.guitar  → guitar avatar loadout
//   settings.theme   → app skin id (matches a [data-theme] in themes.css)
import { Store } from "../state.js";
import { getVar } from "../ui/components.js";
import {
  composeAvatar, DEFAULT_AVATAR, AVATAR_PARTS, AVATAR_CATEGORY_ORDER,
} from "./avatars.js";
import {
  composeGuitar, DEFAULT_GUITAR, GUITAR_PARTS, GUITAR_CATEGORY_ORDER,
} from "./guitars.js";
import { SKINS, getSkin, skinIds } from "./skins.js";
import { priceOf, unlockKey, PRICES } from "./economy.js";

export {
  composeAvatar, composeGuitar,
  DEFAULT_AVATAR, DEFAULT_GUITAR,
  AVATAR_PARTS, AVATAR_CATEGORY_ORDER,
  GUITAR_PARTS, GUITAR_CATEGORY_ORDER,
  SKINS, getSkin, skinIds,
  priceOf, PRICES,
};
export { RARITIES, rarity, SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, GUITAR_COLORS } from "./parts.js";

// ---- live loadouts (merged with defaults so older saves stay valid) --------
export function avatarLoadout() { return { ...DEFAULT_AVATAR, ...(Store.settings().avatar || {}) }; }
export function guitarLoadout() { return { ...DEFAULT_GUITAR, ...(Store.settings().guitar || {}) }; }

export function setAvatarPart(key, value) {
  Store.setSetting("avatar", { ...avatarLoadout(), [key]: value });
}
export function setGuitarPart(key, value) {
  Store.setSetting("guitar", { ...guitarLoadout(), [key]: value });
}
export function setAvatarLoadout(lo) { Store.setSetting("avatar", { ...DEFAULT_AVATAR, ...lo }); }
export function setGuitarLoadout(lo) { Store.setSetting("guitar", { ...DEFAULT_GUITAR, ...lo }); }

// ---- convenience renderers (tint flair with the live theme accent) ---------
export function renderAvatar(loadout) { return composeAvatar(loadout || avatarLoadout(), accent()); }
export function renderGuitar(loadout) { return composeGuitar(loadout || guitarLoadout(), accent()); }

function accent() {
  try { return getVar("--accent"); } catch { return "#6ea8fe"; }
}

// ---- economy helpers (ownership-aware) -------------------------------------
export function coins() { return Store.coins(); }
export function priceFor(item) { return item ? priceOf(item.rarity) : 0; }

/** Is this item owned? Common (free) items and colours are always owned. */
export function ownsItem(kind, catKey, item) {
  if (!item) return true;
  if (priceOf(item.rarity) === 0) return true;
  return Store.isUnlocked(unlockKey(kind, catKey, item.id));
}

/**
 * Buy an item if needed. Returns:
 *   { ok:true, owned:true }     already owned
 *   { ok:true, bought:true }    purchased now
 *   { ok:false, reason:"coins", price }  not enough coins
 */
export function buyItem(kind, catKey, item) {
  const price = priceOf(item.rarity);
  if (ownsItem(kind, catKey, item)) return { ok: true, owned: true, price };
  if (!Store.spendCoins(price)) return { ok: false, reason: "coins", price };
  Store.unlock(unlockKey(kind, catKey, item.id));
  return { ok: true, bought: true, price };
}

/** How many cosmetics has the player unlocked (excludes free/common items). */
export function unlockedCount() {
  return Object.keys(Store.get().unlocks || {}).length;
}

/**
 * Collection completion across all unlockable items (avatar parts, guitar
 * parts, app skins). Free/common items and colours are not counted as
 * "collectible". Returns { total, owned, coins, byRarity:{ id:{total,owned} } }.
 */
export function collectionStats() {
  const byRarity = {};
  let total = 0, owned = 0;
  const tally = (kind, catKey, item) => {
    if (priceOf(item.rarity) === 0) return;            // free → not collectible
    total++;
    const r = (byRarity[item.rarity] ||= { total: 0, owned: 0 });
    r.total++;
    if (ownsItem(kind, catKey, item)) { owned++; r.owned++; }
  };
  for (const key of AVATAR_CATEGORY_ORDER) {
    const cat = AVATAR_PARTS[key];
    if (cat.kind !== "color") for (const it of cat.items) tally("avatar", cat.key, it);
  }
  for (const key of GUITAR_CATEGORY_ORDER) {
    const cat = GUITAR_PARTS[key];
    if (cat.kind !== "color") for (const it of cat.items) tally("guitar", cat.key, it);
  }
  for (const sk of SKINS) tally("skin", "", sk);
  return { total, owned, coins: Store.coins(), byRarity };
}
