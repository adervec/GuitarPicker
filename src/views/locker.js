// Locker — customise the player avatar and the guitar avatar. (App colours are the house theme
// list, chosen in Settings; they are not Locker items.)
// Selections save automatically; items above Common rarity must be unlocked
// with coins earned by playing. Colours are always free.
import { el, pageHead, clear, getVar, toast } from "../ui/components.js";
import { Store } from "../state.js";
import {
  composeAvatar, composeGuitar,
  avatarLoadout, guitarLoadout, setAvatarPart, setGuitarPart,
  setAvatarLoadout, setGuitarLoadout,
  AVATAR_PARTS, AVATAR_CATEGORY_ORDER,
  GUITAR_PARTS, GUITAR_CATEGORY_ORDER,
  rarity,
  coins, priceFor, ownsItem, buyItem, unlockedCount,
} from "../cosmetics/index.js";
import { t, fmt } from "../i18n.js";

export default function locker(ctx) {
  const { el: root } = ctx;
  const head = pageHead(
    t("Locker"),
    t("Build your player and customise a guitar. Earn 🪙 coins by playing; spend them to unlock rare gear.")
  );
  // coin balance chip in the page header
  const coinChip = el("div.coin-chip", { title: t("Coins — earn by playing songs") });
  head.querySelector(".row")?.appendChild(coinChip);
  root.appendChild(head);
  const paintCoins = () => { coinChip.innerHTML = `🪙 <b>${fmt.number(coins())}</b>`; };
  paintCoins();

  // First-unlock nudge — shown until the player unlocks their first item or dismisses it.
  let tipEl = null;
  if (unlockedCount() === 0 && !Store.settings().lockerTipDismissed) {
    tipEl = el("div.panel.tight", { style: { borderColor: "var(--accent)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "12px" } }, [
      el("div", { style: { flex: "1", fontSize: "13px" },
        html: "💡 " + t("<b>New here?</b> Items marked 🔒 unlock with coins you earn by playing songs and finishing daily practice. Tap a locked item to unlock it — colours are always free.") }),
      el("button.btn.ghost", { onclick: () => { Store.setSetting("lockerTipDismissed", true); if (tipEl) { tipEl.remove(); tipEl = null; } } }, [t("Got it") + " ✕"]),
    ]);
    root.appendChild(tipEl);
  }

  const offCoins = Store.on((e) => {
    if (e.type === "coins" || e.type === "unlocks") paintCoins();
    if (e.type === "unlocks" && tipEl) { tipEl.remove(); tipEl = null; }   // first unlock dismisses the nudge
  });

  // i18n-keys: Player | Guitar
  const TABS = [["player", "🧑", "Player"], ["guitar", "🎸", "Guitar"]];
  let active = "player";
  const tabBar = el("div.pill-row", { style: { marginBottom: "18px" } });
  const body = el("div");
  root.append(tabBar, body);

  function renderTabs() {
    clear(tabBar);
    for (const [id, icon, label] of TABS) {
      tabBar.appendChild(el(`div.pill${active === id ? ".active" : ""}`,
        { onclick: () => { active = id; renderTabs(); renderBody(); } }, [`${icon} ${t(label)}`]));
    }
  }

  function renderBody() {
    const scroller = document.getElementById("view");
    const sc = scroller ? scroller.scrollTop : 0;
    clear(body);
    buildCharacterTab(body, active === "player" ? "avatar" : "guitar");
    if (scroller) scroller.scrollTop = sc;
  }

  // ---- avatar / guitar tabs (shared) ----
  function buildCharacterTab(container, kind) {
    const isAvatar = kind === "avatar";
    const loadout = isAvatar ? avatarLoadout() : guitarLoadout();
    const parts = isAvatar ? AVATAR_PARTS : GUITAR_PARTS;
    const order = isAvatar ? AVATAR_CATEGORY_ORDER : GUITAR_CATEGORY_ORDER;
    const compose = isAvatar ? composeAvatar : composeGuitar;
    const setPart = isAvatar ? setAvatarPart : setGuitarPart;
    const setLoadout = isAvatar ? setAvatarLoadout : setGuitarLoadout;

    const previewBox = el("div", { style: { width: "100%", height: isAvatar ? "300px" : "340px" } });
    previewBox.innerHTML = compose(loadout, getVar("--accent"));

    // Randomize only among owned items (colours always allowed).
    const randomize = () => {
      const lo = {};
      for (const key of order) {
        const cat = parts[key];
        if (cat.kind === "color") { const l = cat.colors; lo[cat.key] = l[Math.floor(Math.random() * l.length)].id; }
        else {
          const owned = cat.items.filter((it) => ownsItem(kind, cat.key, it));
          const l = owned.length ? owned : cat.items;
          lo[cat.key] = l[Math.floor(Math.random() * l.length)].id;
        }
      }
      setLoadout(lo); renderBody();
    };

    const previewPanel = el("div.panel", { style: { width: "300px", flex: "none" } }, [
      el("h3", { text: isAvatar ? t("Your Player") : t("Your Guitar") }),
      previewBox,
      el("div.row", { style: { marginTop: "12px" } }, [
        el("button.btn", { onclick: randomize }, ["🎲 " + t("Randomize")]),
        el("button.btn.ghost", { onclick: () => { setLoadout({}); renderBody(); } }, ["↺ " + t("Reset")]),
      ]),
    ]);

    const opts = el("div", { style: { flex: "1", minWidth: "300px", display: "flex", flexDirection: "column", gap: "16px" } });
    for (const key of order) {
      const cat = parts[key];
      const grid = el("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(82px, 1fr))", gap: "8px" } });
      if (cat.kind === "color") {
        for (const col of cat.colors) grid.appendChild(colorOption(cat.key, col, loadout, setPart));
      } else {
        for (const item of cat.items) grid.appendChild(partOption(kind, cat.key, item, loadout, setPart, compose));
      }
      // i18n-keys: Skin Tone | Expression | Hair | Hair Colour | Facial Hair | Clothing | Clothing Colour | Tattoo | Eyewear | Headwear | Headwear Colour | Jewellery | Frame | Body Shape | Body Colour | Finish | Pickguard | Hardware | Inlays | Decal
      opts.appendChild(el("div.panel.tight", {}, [el("h3", { text: t(cat.label) }), grid]));
    }

    container.appendChild(el("div.row", { style: { alignItems: "flex-start", gap: "20px" } }, [previewPanel, opts]));
  }

  function partOption(kind, key, item, loadout, setPart, compose) {
    const isActive = loadout[key] === item.id;
    const owned = ownsItem(kind, key, item);
    const price = priceFor(item);
    const r = rarity(item.rarity);
    const rName = t(r.name); // i18n-keys: Common | Uncommon | Rare | Epic | Legendary

    const thumb = el("div", { style: { width: "100%", height: "58px", pointerEvents: "none", opacity: owned ? "1" : "0.5", filter: owned ? "none" : "grayscale(0.6)" } });
    thumb.innerHTML = compose({ ...loadout, [key]: item.id }, getVar("--accent"));

    const footer = owned
      ? el("div", { style: { display: "flex", alignItems: "center", gap: "5px", marginTop: "4px" } }, [
          el("span", { style: { width: "7px", height: "7px", borderRadius: "50%", background: r.color, flex: "none" } }),
          el("span", { style: labelStyle(), text: item.name }),
        ])
      : el("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px", marginTop: "4px" } }, [
          el("span", { style: { ...labelStyle(), color: r.color }, text: `🔒 ${item.name}` }),
          el("span", { style: { fontSize: "10px", fontWeight: "700", color: "var(--warn)", whiteSpace: "nowrap" }, text: `🪙${price}` }),
        ]);

    return el("div", {
      title: owned ? `${item.name} · ${rName}` : t("{item} · {rarity} — unlock for {price} coins", { item: item.name, rarity: rName, price }),
      style: optStyle(isActive),
      onclick: () => {
        if (owned) { setPart(key, item.id); renderBody(); return; }
        const res = buyItem(kind, key, item);
        if (res.ok) { toast(t("Unlocked {item}!", { item: item.name }) + ` 🪙 −${res.price}`, "good"); setPart(key, item.id); renderBody(); }
        else { toast(t("Need {price} coins (you have {coins}). Play songs to earn more.", { price: res.price, coins: coins() }), "bad"); }
      },
    }, [thumb, footer]);
  }

  function colorOption(key, col, loadout, setPart) {
    const isActive = loadout[key] === col.id;
    return el("div", {
      onclick: () => { setPart(key, col.id); renderBody(); },
      title: col.name,
      style: optStyle(isActive),
    }, [
      el("div", { style: { width: "100%", height: "42px", borderRadius: "7px", background: col.hex, border: "1px solid rgba(0,0,0,0.25)" } }),
      el("div", { style: { ...labelStyle(), marginTop: "5px" }, text: col.name }),
    ]);
  }

  renderTabs();
  renderBody();
  return () => offCoins();
}

// ---- small style helpers ----
function optStyle(active) {
  return {
    cursor: "pointer", borderRadius: "10px", padding: "5px", background: "var(--panel-2)",
    border: `2px solid ${active ? getVar("--accent") : "transparent"}`, transition: "var(--speed)",
  };
}
function labelStyle() {
  return { fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" };
}
