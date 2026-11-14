// Instruments guide view — renders src/music/instrument-guide.js (the same
// source that generates docs/INSTRUMENTS.md), with playable reference pitches.
import { el, pageHead, download, toast } from "../ui/components.js";
import { INSTRUMENTS, instrumentOptions } from "../music/notes.js";
import { GUIDE, instrumentFacts, harmonicaChart, buildInstrumentsMarkdown } from "../music/instrument-guide.js";
import { HARMONICA_BLOW, HARMONICA_DRAW } from "../music/notes.js";
import { Synth } from "../audio/synth.js";
import { t, fmt } from "../i18n.js";

export default function instruments(ctx) {
  const { el: root } = ctx;
  root.appendChild(pageHead(t("Instruments"), t("Every instrument the app models — specs, playing guides, and how GuitarPicker supports each. Click ▶ to hear reference pitches.")));

  root.appendChild(el("div.panel.tight", { style: { marginBottom: "16px" } }, [
    el("div.row", {}, [
      el("span.muted", { style: { fontSize: "13px" }, text: t("Facts below (tunings, ranges, hole charts) come from the app's own data — the guide can't drift from what the app plays.") }),
      el("div", { style: { flex: "1" } }),
      el("button.btn", { title: t("Save this whole guide as a Markdown file"), onclick: () => {
        download("INSTRUMENTS.md", buildInstrumentsMarkdown(), "text/markdown");
        toast(t("Guide saved as {file}", { file: "INSTRUMENTS.md" }), "good");
      } }, ["⬇ " + t("Download as Markdown")]),
    ]),
  ]));

  // Grouped by family — a flat list of every instrument is a very long scroll.
  let lastGroup = null;
  for (const o of instrumentOptions()) {
    if (o.group !== lastGroup) {
      lastGroup = o.group;
      // i18n-keys: Fretted | Plucked (fretless) | Bowed | Keyboard | Wind | Tuned percussion | Percussion | Voice
      root.appendChild(el("h2", { text: t(o.group), style: { margin: "22px 0 10px" } }));
    }
    root.appendChild(panel(o.value));
  }

  function panel(id) {
    const g = GUIDE[id], f = instrumentFacts(id);
    const body = el("div", { style: { marginTop: "10px" } });

    // at a glance
    const glance = [
      [t("Family"), g.family],
      [t("Range (as modeled)"), f.range],
      f.strings.length ? [t("Strings"), `${f.strings.length} — ${f.strings.map((s) => s.note).join(" ")}`] : null,
      f.inst.frets ? [t("Frets modeled"), String(f.inst.frets)] : null,
      [t("Tuner"), f.tuner ? t("yes") + (f.tunings.length > 1 ? ` (${f.tunings.map((tu) => tu.name).join(", ")})` : "") : "—"],
      [t("Fingering hint"), f.panel || "—"],
      [t("Built-in songs"), String(f.songs)],
    ].filter(Boolean);
    body.append(
      el("p", { text: g.overview }),
      el("table.data", {}, glance.map(([k, v]) => el("tr", {}, [el("th", { text: k }), el("td", { text: v })]))),
    );

    if (f.strings.length) {
      body.appendChild(el("h3", { style: { marginTop: "14px" }, text: t("Strings (low string first)") }));
      body.appendChild(el("table.data", {}, [
        el("tr", {}, [t("String"), t("Note"), "MIDI", t("Frequency"), ""].map((h) => el("th", { text: h }))),
        ...f.strings.map((s) => el("tr", {}, [
          el("td", { text: s.label }), el("td", { text: s.note }), el("td", { text: s.midi }),
          el("td", { text: fmt.number(s.freq, { max: 1, min: 1 }) + " Hz" }),
          el("td", {}, [el("button.btn.ghost", { title: t("Hear this open string"), onclick: () => Synth.playMidi(s.midi, { dur: 1.2, instrument: id }) }, ["▶"])]),
        ])),
      ]));
      const alts = f.tunings.filter((tu) => tu.name !== "standard");
      if (alts.length) body.appendChild(el("p.muted", { style: { fontSize: "13px" },
        text: t("Alternate tunings: {list}", { list: alts.map((tu) => `${tu.name} = ${tu.notes}`).join(" · ") }) }));
    }

    if (id === "harmonica") {
      body.appendChild(el("h3", { style: { marginTop: "14px" }, text: t("Hole chart (Richter-tuned C diatonic)") }));
      body.appendChild(el("table.data", {}, [
        el("tr", {}, [el("th", { text: t("Hole") }), ...harmonicaChart().map((h) => el("th", { text: String(h.hole) }))]),
        el("tr", {}, [el("th", { text: t("Blow") + " ↑" }), ...HARMONICA_BLOW.map((m, i) => el("td", {}, [
          el("button.btn.ghost", { title: t("Hear hole {n} blow", { n: i + 1 }), onclick: () => Synth.playMidi(m, { dur: 0.8, instrument: "harmonica" }) }, [harmonicaChart()[i].blow]),
        ]))]),
        el("tr", {}, [el("th", { text: t("Draw") + " ↓" }), ...HARMONICA_DRAW.map((m, i) => el("td", {}, [
          el("button.btn.ghost", { title: t("Hear hole {n} draw", { n: i + 1 }), onclick: () => Synth.playMidi(m, { dur: 0.8, instrument: "harmonica" }) }, [harmonicaChart()[i].draw]),
        ]))]),
      ]));
    }

    const section = (title, items, ordered) => {
      if (!items || !items.length) return;
      body.append(el("h3", { style: { marginTop: "14px" }, text: title }),
        el(ordered ? "ol" : "ul", {}, items.map((it) => el("li", { text: it }))));
    };
    section(t("Anatomy"), g.anatomy);
    section(t("How to play"), g.playing, true);
    section(t("Techniques"), g.techniques);
    section(t("Beginner tips"), g.tips);
    if (g.care) { body.append(el("h3", { style: { marginTop: "14px" }, text: t("Care") }), el("p", { text: g.care })); }
    section(t("In GuitarPicker"), [
      f.panel ? t("Play view shows a {panel} fingering hint for every note.", { panel: f.panel }) : t("Play view grades by pitch alone — no fingering hint for this instrument."),
      ...(g.inApp || []),
    ]);

    return el("details.panel", { style: { marginBottom: "14px" } }, [
      el("summary", { style: { cursor: "pointer" }, html: `<b style="font-size:17px">${INSTRUMENTS[id].name}</b> <span class="muted" style="font-size:13px"> — ${g.tagline}</span>` }),
      body,
    ]);
  }
}
