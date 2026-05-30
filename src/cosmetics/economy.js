// Cosmetics economy: coins + rarity-based pricing for unlocking items.
// Pure pricing / key helpers (no DOM, no Store) so this is safe everywhere.
// Persistence of coins + unlocks lives in state.js (Store.coins / Store.unlock).

// Price by rarity tier. Common items are always free (owned by default).
export const PRICES = {
  common: 0,
  uncommon: 60,
  rare: 180,
  epic: 450,
  legendary: 1200,
};

export function priceOf(rarityId) {
  return PRICES[rarityId] ?? 0;
}

// Stable unlock key for an item. `catKey` may be "" (e.g. for skins).
//   unlockKey("avatar", "hair", "mohawk") -> "avatar:hair:mohawk"
//   unlockKey("skin", "", "neon")         -> "skin:neon"
export function unlockKey(kind, catKey, id) {
  return [kind, catKey, id].filter(Boolean).join(":");
}
