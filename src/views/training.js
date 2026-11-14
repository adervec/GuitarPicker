import { el, pageHead, stat, tag, progressBar, slider } from "../ui/components.js";
import { Store } from "../state.js";
import { COURSES, DRILLS, buildDrillSong } from "../music/drills.js";
import { INSTRUMENTS } from "../music/notes.js";
import { t } from "../i18n.js";

export default function training(ctx) {
  const { el: root, navigate } = ctx;
  const inst = Store.settings().instrument;
  const prog = Store.progressFor(inst);
  const hist = Store.historyFor();

  function bestFor(id) {
    const rows = hist.filter((h) => h.songId === id);
    if (!rows.length) return null;
    return {
      passed: rows.some((r) => r.passed),
      bestAcc: Math.max(...rows.map((r) => r.accuracy)),
      bestScore: Math.max(...rows.map((r) => r.score)),
      attempts: rows.length,
    };
  }

  const level = Math.floor(Math.sqrt(prog.xp || 0) / 3) + 1;
  root.appendChild(pageHead(t("Training"), t("Course progression and skill drills for {instrument}.", { instrument: INSTRUMENTS[inst]?.name || inst })));

  root.appendChild(el("div.grid.cards", { style: { marginBottom: "18px" } }, [
    stat(t("Lv {n}", { n: level }), t("Level")),
    stat(prog.xp || 0, t("XP")),
    stat(Object.values(prog.drills || {}).length || hist.filter((h) => h.songId?.startsWith("drill-")).length, t("Drills tried")),
    stat(hist.filter((h) => h.passed).length, t("Passes")),
  ]));

  // ---------- Courses ----------
  root.appendChild(el("h2", { text: t("Courses") }));
  for (const course of COURSES) {
    const done = course.steps.filter((st) => bestFor(st.ref)?.passed).length;
    const panel = el("div.panel", { style: { marginBottom: "14px" } }, [
      el("div.spread", {}, [
        el("div", {}, [el("h3", { text: course.title }), el("div.muted", { text: course.desc })]),
        el("div", {}, [tag(course.level)]),
      ]),
      el("div", { style: { margin: "10px 0" } }, [progressBar(done / course.steps.length)]),
      el("div.muted", { style: { fontSize: "12px", marginBottom: "8px" }, text: t("{done} / {total} steps passed", { done, total: course.steps.length }) }),
    ]);
    const stepList = el("div.col", { style: { gap: "6px" } });
    course.steps.forEach((st, i) => {
      const b = bestFor(st.ref);
      const locked = i > 0 && !bestFor(course.steps[i - 1].ref)?.passed;
      stepList.appendChild(el("div.spread", { style: { padding: "8px 10px", border: "1px solid var(--line)", borderRadius: "9px",
        opacity: locked ? 0.55 : 1, background: b?.passed ? "color-mix(in srgb, var(--good) 10%, var(--panel-2))" : "var(--panel-2)" } }, [
        el("div.row", { style: { alignItems: "center", gap: "10px" } }, [
          el("span", { text: b?.passed ? "✅" : locked ? "🔒" : "▷", style: { fontSize: "16px" } }),
          el("div", {}, [el("div", { text: st.title }), b && el("div.muted", { style: { fontSize: "11px" }, text: t("best {acc}% · {tries}", { acc: b.bestAcc, tries: t.n("{n} try", "{n} tries", b.attempts) }) })]),
        ]),
        el("button.btn", { onclick: () => launch(st.ref), disabled: locked }, [b?.passed ? t("Replay") : t("Start")]),
      ]));
    });
    panel.appendChild(stepList);
    root.appendChild(panel);
  }

  // ---------- Drills ----------
  root.appendChild(el("h2", { text: t("Skill drills"), style: { marginTop: "18px" } }));
  root.appendChild(el("p.muted", { text: t("Short, repeatable exercises. Adjust the tempo to grind a weak skill up to speed.") }));
  const grid = el("div.grid.cards");
  for (const d of DRILLS) {
    let bpm = d.bpm;
    const best = bestFor(d.id);
    const bpmCtl = slider({ label: t("Tempo"), min: 50, max: 180, step: 5, value: bpm, fmt: (v) => t("{bpm} BPM", { bpm: v }), oninput: (v) => bpm = v });
    grid.appendChild(el("div.card", { style: { cursor: "default" } }, [
      el("div.spread", {}, [el("div.title", { text: d.title }), tag(t(d.difficulty), d.difficulty)]), // i18n-keys: beginner | intermediate | advanced
      el("div.sub", { text: d.desc }),
      best ? el("div.muted", { style: { fontSize: "12px" }, text: t("best {acc}% · score {score}", { acc: best.bestAcc, score: best.bestScore }) }) : el("div.muted", { style: { fontSize: "12px" }, text: t("not attempted yet") }),
      bpmCtl,
      el("button.btn.primary", { style: { marginTop: "auto" }, onclick: () => launchDrill(d, bpm) }, ["▶ " + t("Start drill")]),
    ]));
  }
  root.appendChild(grid);

  function launch(refId) {
    const drill = DRILLS.find((d) => d.id === refId);
    if (drill) { launchDrill(drill, drill.bpm); return; }
    navigate(`#/play/${refId}`);
  }
  function launchDrill(drill, bpm) {
    const song = buildDrillSong(drill, bpm);
    Store.saveSong(song);
    navigate(`#/play/${song.id}`);
  }
}
