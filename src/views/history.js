import { el, pageHead, stat, select, lineChart, getVar, fmtTime, clear } from "../ui/components.js";
import { Store } from "../state.js";
import { INSTRUMENTS } from "../music/notes.js";

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
    summary.append(
      stat(rows.length, "Sessions"),
      stat(avgAcc + "%", "Avg accuracy"),
      stat(passes, "Passes"),
      stat(best, "Best streak"),
      stat(fmtTime(totalTime), "Time played"),
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
