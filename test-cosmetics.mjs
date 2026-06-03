// Cosmetics + coin-economy tests — the two areas dom-smoke.mjs can't reach
// (it shims the DOM but never parses the SVG strings the cosmetics build, and
// it doesn't exercise the economy).
//
//   (1) SVG composition: every avatar/guitar part renders to *well-formed* SVG
//       with no broken interpolation (an undefined colour or NaN coordinate
//       would otherwise sail straight into innerHTML unnoticed). Validated by a
//       tiny dependency-free tag-nesting parser.
//   (2) Coin economy: pricing, earning, spending, unlocks, ownership, and
//       collection stats, exercised against the real Store.
import assert from "node:assert";

// Pure cosmetic modules — no DOM, no Store — safe to import statically.
import { composeAvatar, AVATAR_PARTS, AVATAR_CATEGORY_ORDER, DEFAULT_AVATAR } from "./src/cosmetics/avatars.js";
import { composeGuitar, GUITAR_PARTS, GUITAR_CATEGORY_ORDER, DEFAULT_GUITAR } from "./src/cosmetics/guitars.js";
import { SKINS, getSkin, skinIds } from "./src/cosmetics/skins.js";
import { shadeColor, mixColor, pickById } from "./src/cosmetics/parts.js";
import { PRICES, priceOf, unlockKey } from "./src/cosmetics/economy.js";

let pass = 0;
const ok = (name, cond) => { assert.ok(cond, "FAILED: " + name); console.log("  ✓ " + name); pass++; };

const AVATAR_VB = "0 0 120 140";
const GUITAR_VB = "0 0 160 384";

// ---- tiny SVG well-formedness validator (no deps) --------------------------
// Returns a list of problems ([] === valid). Checks the root, viewBox, balanced
// angle brackets, no undefined/NaN leakage, and correct tag nesting with <svg>
// as the single root. The generated markup never puts < or > inside attribute
// values, so a regex tokenizer is sufficient.
function svgProblems(svg, viewBox) {
  const p = [];
  if (typeof svg !== "string" || !svg) return ["not a non-empty string"];
  if (!svg.startsWith("<svg ")) p.push("missing <svg> root");
  if (!svg.endsWith("</svg>")) p.push("missing </svg> close");
  if (viewBox && !svg.includes(`viewBox="${viewBox}"`)) p.push(`wrong/missing viewBox (want ${viewBox})`);
  for (const bad of ["undefined", "NaN"]) if (svg.includes(bad)) p.push(`contains "${bad}"`);
  const lt = (svg.match(/</g) || []).length, gt = (svg.match(/>/g) || []).length;
  if (lt !== gt) p.push(`unbalanced angle brackets (${lt} '<' vs ${gt} '>')`);

  const stack = [];
  const re = /<(\/)?([a-zA-Z][\w:-]*)\b[^>]*?(\/)?>/g;
  let m, root = null;
  while ((m = re.exec(svg))) {
    const closing = m[1] === "/", selfClose = m[3] === "/", tag = m[2];
    if (closing) {
      const top = stack.pop();
      if (top !== tag) { p.push(`</${tag}> closes <${top || "nothing"}>`); break; }
    } else if (!selfClose) {
      if (stack.length === 0) { if (root) p.push("more than one root element"); root = tag; }
      stack.push(tag);
    }
  }
  if (stack.length) p.push(`unclosed: ${stack.join(",")}`);
  if (root !== "svg") p.push(`root is <${root}>, expected <svg>`);
  return p;
}
function assertSvg(name, svg, viewBox) {
  const probs = svgProblems(svg, viewBox);
  assert.ok(probs.length === 0, `FAILED: ${name} -> ${probs.join("; ")}`);
  console.log("  ✓ " + name);
  pass++;
}

// ---- 0. validator self-check (no false greens) ----------------------------
ok("validator accepts a minimal valid svg", svgProblems("<svg ><g></g></svg>") .length === 0);
ok("validator flags a non-svg root", svgProblems("<div >x</div>").length > 0);
ok("validator flags undefined leakage", svgProblems('<svg ><g fill="undefined"></g></svg>').length > 0);
ok("validator flags broken nesting", svgProblems("<svg ><g></svg>").length > 0);

// ---- 1a. baseline + resilience --------------------------------------------
assertSvg("composeAvatar(defaults) is well-formed SVG", composeAvatar(DEFAULT_AVATAR), AVATAR_VB);
assertSvg("composeGuitar(defaults) is well-formed SVG", composeGuitar(DEFAULT_GUITAR), GUITAR_VB);
assertSvg("composeAvatar() with no args falls back to defaults", composeAvatar(), AVATAR_VB);
assertSvg("composeGuitar() with no args falls back to defaults", composeGuitar(), GUITAR_VB);
assertSvg("composeAvatar tolerates unknown part ids", composeAvatar({ hair: "nope", top: "nope", hat: "???", expression: "" }), AVATAR_VB);
assertSvg("composeGuitar tolerates unknown part ids", composeGuitar({ shape: "nope", finish: "???", hardware: "" }), GUITAR_VB);

// ---- 1b. exhaustive: render EVERY part variant against the defaults --------
const variantFails = [];
let variantCount = 0;
function renderAll(kind, compose, parts, order, vb) {
  for (const key of order) {
    const cat = parts[key];
    const variants = cat.kind === "color" ? cat.colors : cat.items;
    for (const v of variants) {
      variantCount++;
      const probs = svgProblems(compose({ [key]: v.id }), vb);
      if (probs.length) variantFails.push(`${kind}.${key}=${v.id}: ${probs.join("; ")}`);
    }
  }
}
renderAll("avatar", composeAvatar, AVATAR_PARTS, AVATAR_CATEGORY_ORDER, AVATAR_VB);
renderAll("guitar", composeGuitar, GUITAR_PARTS, GUITAR_CATEGORY_ORDER, GUITAR_VB);
assert.ok(variantFails.length === 0, `FAILED: ${variantFails.length} cosmetic variant(s) produced bad SVG:\n  ${variantFails.slice(0, 12).join("\n  ")}`);
ok(`every cosmetic variant renders to well-formed SVG (${variantCount} variants)`, true);

// ---- 1c. skins + colour helpers -------------------------------------------
ok("SKINS list is valid", Array.isArray(SKINS) && SKINS.length >= 10 &&
  SKINS.every((s) => s.id && s.name && s.rarity && Array.isArray(s.swatch) && s.swatch.length === 3 &&
    s.swatch.every((h) => typeof h === "string" && h.startsWith("#"))));
ok("getSkin resolves known id and falls back to SKINS[0]", getSkin(SKINS[0].id).id === SKINS[0].id && getSkin("does-not-exist").id === SKINS[0].id);
ok("skinIds covers the whole catalog", skinIds().length === SKINS.length && skinIds().includes(SKINS[0].id));
ok("shadeColor identity and extremes", shadeColor("#808080", 0) === "#808080" && shadeColor("#808080", 1) === "#ffffff" && shadeColor("#808080", -1) === "#000000");
ok("mixColor midpoint of black/white", mixColor("#000000", "#ffffff", 0.5) === "#808080");
ok("pickById falls back to first item", pickById([{ id: "a" }, { id: "b" }], "zzz").id === "a");

// ---- 2a. pricing + unlock keys (pure) -------------------------------------
ok("PRICES tiers as specified", PRICES.common === 0 && PRICES.uncommon === 60 && PRICES.rare === 180 && PRICES.epic === 450 && PRICES.legendary === 1200);
ok("priceOf unknown rarity is free", priceOf("mythic") === 0 && priceOf(undefined) === 0);
ok("priceOf increases with rarity", priceOf("common") < priceOf("uncommon") && priceOf("uncommon") < priceOf("rare") && priceOf("rare") < priceOf("epic") && priceOf("epic") < priceOf("legendary"));
ok("unlockKey joins parts", unlockKey("avatar", "hair", "mohawk") === "avatar:hair:mohawk");
ok("unlockKey drops an empty category (skins)", unlockKey("skin", "", "neon") === "skin:neon");

// ---- 2b. economy against the real Store -----------------------------------
// Store reads localStorage at module-eval time, so install a shim BEFORE the
// dynamic import (static imports above are pure and need no globals).
const _ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (_ls.has(k) ? _ls.get(k) : null),
  setItem: (k, v) => _ls.set(k, String(v)),
  removeItem: (k) => _ls.delete(k),
  clear: () => _ls.clear(),
};
const { Store } = await import("./src/state.js");
const cos = await import("./src/cosmetics/index.js");

ok("fresh balance is 0", Store.coins() === 0);
ok("addCoins credits the balance", Store.addCoins(100) === 100 && Store.coins() === 100);
ok("spendCoins refuses when short", Store.spendCoins(1000) === false && Store.coins() === 100);
ok("spendCoins deducts when affordable", Store.spendCoins(60) === true && Store.coins() === 40);
ok("addCoins never drives the balance negative", Store.addCoins(-100000) === 0 && Store.coins() === 0);

ok("unknown unlock key reads false", Store.isUnlocked("test:unit:key") === false);
Store.unlock("test:unit:key");
Store.unlock("test:unit:key"); // idempotent
ok("unlock then isUnlocked is true", Store.isUnlocked("test:unit:key") === true);

// addHistory awards coins = round(accuracy/5) + (passed ? 15 : 0)
{
  const before = Store.coins();
  const pass1 = { ts: 1700000000000, instrument: "acoustic-guitar", score: 1000, accuracy: 80, passed: true };
  Store.addHistory(pass1);
  ok("passing run awards round(80/5)+15 = 31 coins", pass1.coins === 31 && Store.coins() === before + 31);

  const before2 = Store.coins();
  const fail1 = { ts: 1700000000000, instrument: "acoustic-guitar", score: 500, accuracy: 50, passed: false };
  Store.addHistory(fail1);
  ok("failed run still awards round(50/5) = 10 coins", fail1.coins === 10 && Store.coins() === before2 + 10);
}

// ---- 2c. ownership + purchase flow (real cosmetics API) -------------------
const crown = AVATAR_PARTS.hat.items.find((i) => i.id === "crown"); // legendary, 1200
const tee = AVATAR_PARTS.top.items.find((i) => i.id === "tee");     // common, free
ok("crown is a paid legendary item", crown && priceOf(crown.rarity) === 1200);
ok("free/common items are owned by default", cos.ownsItem("avatar", "top", tee) === true);
ok("paid item is not owned until bought", cos.ownsItem("avatar", "hat", crown) === false);

Store.addCoins(-100000); // drain to 0
const broke = cos.buyItem("avatar", "hat", crown);
ok("buyItem fails with insufficient coins", broke.ok === false && broke.reason === "coins" && broke.price === 1200);
ok("failed purchase leaves item unowned", cos.ownsItem("avatar", "hat", crown) === false);

Store.addCoins(1200);
const bought = cos.buyItem("avatar", "hat", crown);
ok("buyItem succeeds once funded", bought.ok === true && bought.bought === true && bought.price === 1200);
ok("purchase debits the price", Store.coins() === 0);
ok("item is owned after purchase", cos.ownsItem("avatar", "hat", crown) === true);
const again = cos.buyItem("avatar", "hat", crown);
ok("re-buying an owned item is a free no-op", again.ok === true && again.owned === true && Store.coins() === 0);

// ---- 2d. collection stats invariants --------------------------------------
const stats = cos.collectionStats();
ok("collectionStats has the documented shape", stats && typeof stats.total === "number" && typeof stats.owned === "number" && stats.byRarity && typeof stats.coins === "number");
ok("owned is within [1, total]", stats.owned >= 1 && stats.owned <= stats.total);
ok("collectionStats.coins matches the Store", stats.coins === Store.coins());
{
  let t = 0, o = 0;
  for (const r of Object.values(stats.byRarity)) { t += r.total; o += r.owned; }
  ok("byRarity totals reconcile with the grand totals", t === stats.total && o === stats.owned);
}

console.log(`\n${pass} cosmetics checks passed.`);
