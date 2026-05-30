// Locker — customise the player avatar, the guitar avatar, and the app skin.
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
  SKINS, getSkin, rarity,
  coins, priceFor, ownsItem, buyItem,
} from "../cosmetics/index.js";

export default function locker(ctx) {
  const { el: root } = ctx;
  const head = pageHead(
    "Locker",
    "Build your player, customise a guitar, and pick an app skin. Earn 🪙 coins by playing; spend them to unlock rare gear."
  );
  // coin balance chip in the page header
  const coinChip = el("div.coin-chip", { title: "Coins — earn by playing songs" });
  head.querySelector(".row")?.appendChild(coinChip);
  root.appendChild(head);
  const paintCoins = () => { coinChip.innerHTML = `🪙 <b>${coins().toLocaleString()}</b>`; };
  paintCoins();
  const offCoins = Store.on((e) => { if (e.type === "coins" || e.type === "unlocks") paintCoins(); });

  const TABS = [["player", "🧑 Player"], ["guitar", "🎸 Guitar"], ["skin", "🎨 App Skin"]];
  let active = "player";
  const tabBar = el("div.pill-row", { style: { marginBottom: "18px" } });
  const body = el("div");
  root.append(tabBar, body);

  function renderTabs() {
    clear(tabBar);
    for (const [id, label] of TABS) {
      tabBar.appendChild(el(`div.pill${active === id ? ".active" : ""}`,
        { onclick: () => { active = id; renderTabs(); renderBody(); } }, [label]));
    }
  }

  function renderBody() {
    const scroller = document.getElementById("view");
    const sc = scroller ? scroller.scrollTop : 0;
    clear(body);
    if (active === "skin") buildSkinTab(body);
    else buildCharacterTab(body, active === "player" ? "avatar" : "guitar");
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
      el("h3", { text: isAvatar ? "Your Player" : "Your Guitar" }),
      previewBox,
      el("div.row", { style: { marginTop: "12px" } }, [
        el("button.btn", { onclick: randomize }, ["🎲 Randomize"]),
        el("button.btn.ghost", { onclick: () => { setLoadout({}); renderBody(); } }, ["↺ Reset"]),
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
      opts.appendChild(el("div.panel.tight", {}, [el("h3", { text: cat.label }), grid]));
    }

    container.appendChild(el("div.row", { style: { alignItems: "flex-start", gap: "20px" } }, [previewPanel, opts]));
  }

  function partOption(kind, key, item, loadout, setPart, compose) {
    const isActive = loadout[key] === item.id;
    const owned = ownsItem(kind, key, item);
    const price = priceFor(item);
    const r = rarity(item.rarity);

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
      title: owned ? `${item.name} · ${r.name}` : `${item.name} · ${r.name} — unlock for ${price} coins`,
      style: optStyle(isActive),
      onclick: () => {
        if (owned) { setPart(key, item.id); renderBody(); return; }
        const res = buyItem(kind, key, item);
        if (res.ok) { toast(`Unlocked ${item.name}! 🪙 −${res.price}`, "good"); setPart(key, item.id); renderBody(); }
        else { toast(`Need ${res.price} coins (you have ${coins()}). Play songs to earn more.`, "bad"); }
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

  // ---- app skin tab ----
  function buildSkinTab(container) {
    const cur = Store.settings().theme;
    const grid = el("div.grid.cards");
    for (const sk of SKINS) {
      const isActive = cur === sk.id;
      const owned = ownsItem("skin", "", sk);
      const price = priceFor(sk);
      const [bg, ac, ac2] = sk.swatch;
      const r = rarity(sk.rarity);
      const mock = el("div", {
        style: { height: "64px", borderRadius: "8px", overflow: "hidden", display: "flex", background: bg, border: "1px solid rgba(255,255,255,0.08)", marginBottom: "10px", opacity: owned ? "1" : "0.85" },
      }, [
        el("div", { style: { width: "7px", background: ac } }),
        el("div", { style: { flex: "1", padding: "10px", display: "flex", flexDirection: "column", gap: "7px" } }, [
          el("div", { style: { height: "10px", width: "62%", borderRadius: "3px", background: ac } }),
          el("div", { style: { height: "8px", width: "44%", borderRadius: "3px", background: ac2 } }),
          el("div", { style: { height: "8px", width: "30%", borderRadius: "3px", background: "rgba(255,255,255,0.18)" } }),
        ]),
      ]);
      grid.appendChild(el("div.card", {
        onclick: () => onSkin(sk, owned, price),
        style: { border: `2px solid ${isActive ? ac : "var(--line)"}` },
      }, [
        mock,
        el("div.spread", {}, [
          el("div.title", { text: sk.name }),
          el("span", { style: { fontSize: "10px", color: r.color, border: `1px solid ${r.color}`, borderRadius: "999px", padding: "1px 8px" }, text: r.name }),
        ]),
        el("div.sub", { text: sk.desc }),
        isActive
          ? el("div", { style: { fontSize: "11px", color: ac, marginTop: "6px", fontWeight: "600" }, text: "✓ Active" })
          : (owned ? null : el("div", { style: { fontSize: "11px", color: "var(--warn)", marginTop: "6px", fontWeight: "700" }, text: `🔒 Unlock · 🪙 ${price}` })),
      ]));
    }
    container.appendChild(grid);
  }

  function onSkin(sk, owned, price) {
    if (!owned) {
      const res = buyItem("skin", "", sk);
      if (!res.ok) { toast(`Need ${res.price} coins (you have ${coins()}). Play songs to earn more.`, "bad"); return; }
      toast(`Unlocked “${sk.name}” skin! 🪙 −${res.price}`, "good");
    }
    Store.setSetting("theme", sk.id);
    document.documentElement.setAttribute("data-theme", sk.id);
    const quick = document.getElementById("theme-quick");
    if (quick) quick.value = sk.id;
    if (owned) toast(`Applied “${getSkin(sk.id).name}” skin`);
    renderBody();
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
