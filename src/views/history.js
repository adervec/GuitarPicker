import { el, pageHead, stat, select, lineChart, getVar, fmtTime, clear, progressBar } from "../ui/components.js";
import { Store } from "../state.js";
import { INSTRUMENTS } from "../music/notes.js";
import { collectionStats, RARITIES } from "../cosmetics/index.js";

export default function history(ctx) {
  const { el: root, navigate } = ctx;
  let instFilter = "all", viewMode = "all";

  root.appendChild(pageHead("Progress", "Track your improvement across instruments and sessions."));

  const all = Store.historyFor();
  if (!all.length) {
    root.appendChild(el("div.panel.center", {}, [
      el("h2", { text: "No sessions yet" }),
      el("p.muted", { text: "Play a song or a drill and your results will trend here." }),
      el("button.btn.primary", { onclick: () => navigate("#/library") }, ["Browse songs"]),
    ]));
    root.appendChild(buildCollectionPanel(navigate));
    return;
  }

  const usedInstruments = [...new Set(all.map((h) => h.instrument))];
  const instSel = select({ label: "Instrument", value: instFilter,
    options: [{ value: "all", label: "All instruments" }, ...usedInstruments.map((i) => ({ value: i, label: INSTRUMENTS[i]?.name || i }))],
    onchange: (v) => { instFilter = v; renderAll(); } });
  const viewSel = select({ label: "View", value: viewMode,
    options: [["all", "All sessions"], ["today", "Today"], ["bysong", "By song (best)"]].map(([v, l]) => ({ value: v, label: l })),
    onchange: (v) => { viewMode = v; renderAll(); } });
  root.appendChild(el("div.panel.tight", { style: { marginBottom: "16px" } }, [
    el("div.row", {}, [instSel, viewSel]),
  ]));

  // cosmetics collection progress (independent of the session filters)
  root.appendChild(buildCollectionPanel(navigate));

  const summary = el("div.grid.cards", { style: { marginBottom: "16px" } });
  root.appendChild(summary);

  const charts = el("div.panel", {}, [el("h2", { text: "Trends" })]);
  const accCanvas = el("canvas.chart");
  const scoreCanvas = el("canvas.chart");
  charts.append(
    el("div.legend", {}, [
      el("span", { html: `<i style="background:${getVar("--good")}"></i>Accuracy %` }),
      el("span", { html: `<i style="background:${getVar("--accent")}"></i>Score (scaled)` }),
    ]),
    accCanvas, scoreCanvas,
  );
  root.appendChild(charts);

  const tableWrap = el("div.panel", {}, [el("h2", { text: "Sessions" })]);
  const table = el("div");
  tableWrap.appendChild(table);
  root.appendChild(tableWrap);

  renderAll();

  function filtered() {
    let rows = instFilter === "all" ? all : all.filter((h) => h.instrument === instFilter);
    if (viewMode === "today") {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      rows = rows.filter((h) => h.ts >= start.getTime());
    }
    return rows;
  }

  function renderAll() {
    const rows = filtered();
    // summary
    clear(summary);
    const avgAcc = rows.length ? Math.round(rows.reduce((a, h) => a + h.accuracy, 0) / rows.length) : 0;
    const totalTime = rows.reduce((a, h) => a + (h.durationSec || 0), 0);
    const best = rows.reduce((a, h) => Math.max(a, h.maxStreak || 0), 0);
    const passes = rows.filter((h) => h.passed).length;
    const coinsThis = rows.reduce((a, h) => a + (h.coins || 0), 0);
    summary.append(
      stat(rows.length, "Sessions"),
      stat(avgAcc + "%", "Avg accuracy"),
      stat(passes, "Passes"),
      stat(best, "Best streak"),
      stat(fmtTime(totalTime), "Time played"),
      stat("🪙 " + coinsThis, "Coins earned"),
    );

    // charts (chronological)
    const chrono = rows.slice().sort((a, b) => a.ts - b.ts);
    const accPts = chrono.map((h, i) => ({ x: i, y: h.accuracy }));
    const scorePts = chrono.map((h, i) => ({ x: i, y: Math.min(100, h.score / 50) }));
    requestAnimationFrame(() => {
      lineChart(accCanvas, [{ color: getVar("--good"), points: accPts }], { minY: 0, maxY: 100 });
      lineChart(scoreCanvas, [{ color: getVar("--accent"), points: scorePts }], { minY: 0, maxY: 100 });
    });

    // table
    clear(table);
    let display = rows.slice().sort((a, b) => b.ts - a.ts);
    if (viewMode === "bysong") {
      const bySong = new Map();
      for (const h of rows) {
        const cur = bySong.get(h.songId);
        if (!cur || h.score > cur.score) bySong.set(h.songId, h);
      }
      display = [...bySong.values()].sort((a, b) => b.score - a.score);
    }
    const t = el("table.data", {}, [
      el("tr", {}, ["When", "Song", "Instrument", "Score", "Accuracy", "Streak", "Result"].map((h) => el("th", { text: h }))),
      ...display.slice(0, 200).map((h) => el("tr", {}, [
        el("td", { text: new Date(h.ts).toLocaleString() }),
        el("td", { text: h.songTitle || h.songId }),
        el("td", { text: INSTRUMENTS[h.instrument]?.name || h.instrument }),
        el("td", { text: h.score.toLocaleString() }),
        el("td", { text: h.accuracy + "%" }),
        el("td", { text: h.maxStreak }),
        el("td", { html: h.passed ? `<span style="color:${getVar("--good")}">Pass</span>` : `<span style="color:${getVar("--bad")}">—</span>` }),
      ])),
    ]);
    table.appendChild(t);
  }

  // re-draw charts on resize
  const onResize = () => renderAll();
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}

// Cosmetics collection summary: coin balance, overall completion bar, and a
// per-rarity breakdown. Links to the Locker to spend coins.
function buildCollectionPanel(navigate) {
  const cs = collectionStats();
  const frac = cs.total ? cs.owned / cs.total : 0;
  const tiers = Object.values(RARITIES).filter((r) => r.id !== "common").sort((a, b) => a.order - b.order);

  const chips = el("div.row", { style: { gap: "8px", flexWrap: "wrap", marginTop: "12px" } });
  for (const r of tiers) {
    const b = cs.byRarity[r.id] || { total: 0, owned: 0 };
    if (!b.total) continue;
    chips.appendChild(el("span", {
      style: { fontSize: "12px", padding: "4px 10px", borderRadius: "999px",
        border: `1px solid ${r.color}`, color: r.color },
      text: `${r.name} ${b.owned}/${b.total}`,
    }));
  }

  return el("div.panel", { style: { marginBottom: "16px" } }, [
    el("div.spread", {}, [
      el("h2", { text: "🎨 Collection" }),
      el("div.row", { style: { gap: "12px", alignItems: "center" } }, [
        el("span.muted", { html: `🪙 <b style="color:var(--warn)">${cs.coins.toLocaleString()}</b> coins` }),
        navigate ? el("button.btn", { onclick: () => navigate("#/locker") }, ["Open Locker"]) : null,
      ]),
    ]),
    el("div.muted", { style: { margin: "4px 0 8px", fontSize: "13px" },
      text: `${cs.owned} of ${cs.total} unlockable items collected (${Math.round(frac * 100)}%)` }),
    progressBar(frac),
    chips,
  ]);
}
