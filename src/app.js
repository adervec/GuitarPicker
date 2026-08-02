// Bootstrap: theme, navigation, hash router, IO indicator, view lifecycle.
import { Store } from "./state.js";
import { el, clear } from "./ui/components.js";
import { Audio } from "./audio/engine.js";
import { SKINS } from "./cosmetics/skins.js";

const NAV = [
  { sep: "Play" },
  { route: "home", icon: "🏠", label: "Home" },
  { route: "library", icon: "🎵", label: "Songs" },
  { route: "karaoke", icon: "🎤", label: "Karaoke" },
  { route: "tuner", icon: "🎚️", label: "Tuner" },
  { sep: "Create" },
  { route: "editor", icon: "✏️", label: "Song Editor" },
  { route: "listen", icon: "🎤", label: "Listen & Make" },
  { sep: "Grow" },
  { route: "training", icon: "🏋️", label: "Training" },
  { route: "minigames", icon: "🎮", label: "Theory Games" },
  { route: "glossary", icon: "📖", label: "Glossary" },
  { route: "instruments", icon: "🎻", label: "Instruments" },
  { route: "history", icon: "📈", label: "Progress" },
  { sep: "You" },
  { route: "locker", icon: "🧑", label: "Locker" },
  { sep: "System" },
  { route: "settings", icon: "⚙️", label: "Settings" },
];

const VIEWS = {
  home: () => import("./views/home.js"),
  library: () => import("./views/library.js"),
  play: () => import("./views/play.js"),
  karaoke: () => import("./views/karaoke.js"),
  tuner: () => import("./views/tuner.js"),
  editor: () => import("./views/editor.js"),
  listen: () => import("./views/listen.js"),
  training: () => import("./views/training.js"),
  minigames: () => import("./views/minigames.js"),
  glossary: () => import("./views/glossary.js"),
  instruments: () => import("./views/instruments.js"),
  history: () => import("./views/history.js"),
  locker: () => import("./views/locker.js"),
  settings: () => import("./views/settings.js"),
};

const viewEl = () => document.getElementById("view");
let cleanup = null;

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function buildNav() {
  const nav = document.getElementById("nav");
  clear(nav);
  for (const item of NAV) {
    if (item.sep) { nav.appendChild(el("div.nav-sep", { text: item.sep })); continue; }
    const a = el("a.nav-item", { href: `#/${item.route}` }, [
      el("span.ico", { text: item.icon }), el("span", { text: item.label }),
    ]);
    a.dataset.route = item.route;
    nav.appendChild(a);
  }
}

function setActiveNav(route) {
  document.querySelectorAll(".nav-item").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === route);
  });
}

function buildThemePicker() {
  const sel = document.getElementById("theme-quick");
  clear(sel);
  for (const sk of SKINS) sel.appendChild(el("option", { value: sk.id, text: sk.name }));
  sel.value = Store.settings().theme;
  sel.addEventListener("change", () => { Store.setSetting("theme", sel.value); applyTheme(sel.value); });
}

export function navigate(hash) { location.hash = hash.startsWith("#") ? hash : "#" + hash; }

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  return { route: parts[0] || "home", params: parts.slice(1) };
}

async function router() {
  const { route, params } = parseHash();
  const loader = VIEWS[route] || VIEWS.home;
  setActiveNav(VIEWS[route] ? route : "home");

  // teardown previous view
  if (cleanup) { try { cleanup(); } catch (e) { console.warn(e); } cleanup = null; }
  const container = clear(viewEl());
  viewEl().classList.toggle("no-pad", route === "play" || route === "karaoke");

  try {
    const mod = await loader();
    const ctx = { el: container, params, navigate, store: Store, audio: Audio };
    cleanup = (await mod.default(ctx)) || null;
  } catch (e) {
    console.error(e);
    container.appendChild(el("div.panel", {}, [
      el("h2", { text: "View failed to load" }),
      el("pre", { text: String(e && e.stack || e) }),
    ]));
  }
}

// ---- IO indicator (kept in sync by the audio engine) ----
function refreshIO() {
  const inLabel = document.querySelector('[data-io="in"]');
  const outLabel = document.querySelector('[data-io="out"]');
  const dot = document.querySelector(".io-dot.in");
  const io = Audio.currentDevices();
  inLabel.textContent = io.input || "no mic";
  outLabel.textContent = io.output || "default out";
  dot.classList.toggle("live", io.micLive);
}
Audio.onChange(refreshIO);

// ---- coin counter (top bar) ----
function refreshCoins() {
  const chip = document.getElementById("coin-chip");
  if (chip) chip.innerHTML = `🪙 <b>${Store.coins().toLocaleString()}</b>`;
}
Store.on((e) => { if (e.type === "coins" || e.type === "history" || e.type === "unlocks") refreshCoins(); });

// crumb helper available to views via title attribute on #crumb
const crumbTitles = {
  home: "Home", library: "Songs", play: "Now Playing", karaoke: "Karaoke", tuner: "Tuner",
  editor: "Song Editor", listen: "Listen & Make", training: "Training",
  minigames: "Theory Games", glossary: "Glossary", instruments: "Instruments", history: "Progress",
  locker: "Locker", settings: "Settings",
};
function refreshCrumb() {
  const { route } = parseHash();
  document.getElementById("crumb").textContent = crumbTitles[route] || "GuitarPicker";
}

function init() {
  applyTheme(Store.settings().theme);
  buildNav();
  buildThemePicker();
  refreshIO();
  refreshCoins();
  window.addEventListener("hashchange", () => { refreshCrumb(); router(); });
  if (!location.hash) location.hash = "#/home";
  refreshCrumb();
  router();
}

init();
