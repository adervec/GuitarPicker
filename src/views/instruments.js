// Instruments guide view — renders src/music/instrument-guide.js (the same
// source that generates docs/INSTRUMENTS.md), with playable reference pitches.
import { el, pageHead, download, toast } from "../ui/components.js";
import { INSTRUMENTS, instrumentOptions } from "../music/notes.js";
import { GUIDE, instrumentFacts, harmonicaChart, buildInstrumentsMarkdown } from "../music/instrument-guide.js";
import { HARMONICA_BLOW, HARMONICA_DRAW } from "../music/notes.js";
import { Synth } from "../audio/synth.js";

export default function instruments(ctx) {
  const { el: root } = ctx;
  root.appendChild(pageHead("Instruments", "Every instrument the app models — specs, playing guides, and how GuitarPicker supports each. Click ▶ to hear reference pitches."));

  root.appendChild(el("div.panel.tight", { style: { marginBottom: "16px" } }, [
    el("div.row", {}, [
      el("span.muted", { style: { fontSize: "13px" }, text: "Facts below (tunings, ranges, hole charts) come from the app's own data — the guide can't drift from what the app plays." }),
      el("div", { style: { flex: "1" } }),
      el("button.btn", { title: "Save this whole guide as a Markdown file", onclick: () => {
        download("INSTRUMENTS.md", buildInstrumentsMarkdown(), "text/markdown");
        toast("Guide saved as INSTRUMENTS.md", "good");
      } }, ["⬇ Download as Markdown"]),
    ]),
  ]));

  // Grouped by family — a flat list of every instrument is a very long scroll.
  let lastGroup = null;
  for (const o of instrumentOptions()) {
    if (o.group !== lastGroup) {
      lastGroup = o.group;
      root.appendChild(el("h2", { text: o.group, style: { margin: "22px 0 10px" } }));
    }
    root.appendChild(panel(o.value));
  }

  function panel(id) {
    const g = GUIDE[id], f = instrumentFacts(id);
    const body = el("div", { style: { marginTop: "10px" } });

    // at a glance
    const glance = [
      ["Family", g.family],
      ["Range (as modeled)", f.range],
      f.strings.length ? ["Strings", `${f.strings.length} — ${f.strings.map((s) => s.note).join(" ")}`] : null,
      f.inst.frets ? ["Frets modeled", String(f.inst.frets)] : null,
      ["Tuner", f.tuner ? "yes" + (f.tunings.length > 1 ? ` (${f.tunings.map((t) => t.name).join(", ")})` : "") : "—"],
      ["Fingering hint", f.panel || "—"],
      ["Built-in songs", String(f.songs)],
    ].filter(Boolean);
    body.append(
      el("p", { text: g.overview }),
      el("table.data", {}, glance.map(([k, v]) => el("tr", {}, [el("th", { text: k }), el("td", { text: v })]))),
    );

    if (f.strings.length) {
      body.appendChild(el("h3", { style: { marginTop: "14px" }, text: "Strings (low string first)" }));
      body.appendChild(el("table.data", {}, [
        el("tr", {}, ["String", "Note", "MIDI", "Frequency", ""].map((h) => el("th", { text: h }))),
        ...f.strings.map((s) => el("tr", {}, [
          el("td", { text: s.label }), el("td", { text: s.note }), el("td", { text: s.midi }),
          el("td", { text: s.freq.toFixed(1) + " Hz" }),
          el("td", {}, [el("button.btn.ghost", { title: "Hear this open string", onclick: () => Synth.playMidi(s.midi, { dur: 1.2 }) }, ["▶"])]),
        ])),
      ]));
      const alts = f.tunings.filter((t) => t.name !== "standard");
      if (alts.length) body.appendChild(el("p.muted", { style: { fontSize: "13px" },
        text: "Alternate tunings: " + alts.map((t) => `${t.name} = ${t.notes}`).join(" · ") }));
    }

    if (id === "harmonica") {
      body.appendChild(el("h3", { style: { marginTop: "14px" }, text: "Hole chart (Richter-tuned C diatonic)" }));
      body.appendChild(el("table.data", {}, [
        el("tr", {}, [el("th", { text: "Hole" }), ...harmonicaChart().map((h) => el("th", { text: String(h.hole) }))]),
        el("tr", {}, [el("th", { text: "Blow ↑" }), ...HARMONICA_BLOW.map((m, i) => el("td", {}, [
          el("button.btn.ghost", { title: `Hear hole ${i + 1} blow`, onclick: () => Synth.playMidi(m, { dur: 0.8 }) }, [harmonicaChart()[i].blow]),
        ]))]),
        el("tr", {}, [el("th", { text: "Draw ↓" }), ...HARMONICA_DRAW.map((m, i) => el("td", {}, [
          el("button.btn.ghost", { title: `Hear hole ${i + 1} draw`, onclick: () => Synth.playMidi(m, { dur: 0.8 }) }, [harmonicaChart()[i].draw]),
        ]))]),
      ]));
    }

    const section = (title, items, ordered) => {
      if (!items || !items.length) return;
      body.append(el("h3", { style: { marginTop: "14px" }, text: title }),
        el(ordered ? "ol" : "ul", {}, items.map((t) => el("li", { text: t }))));
    };
    section("Anatomy", g.anatomy);
    section("How to play", g.playing, true);
    section("Techniques", g.techniques);
    section("Beginner tips", g.tips);
    if (g.care) { body.append(el("h3", { style: { marginTop: "14px" }, text: "Care" }), el("p", { text: g.care })); }
    section("In GuitarPicker", [
      f.panel ? `Play view shows a ${f.panel} fingering hint for every note.` : "Play view grades by pitch alone — no fingering hint for this instrument.",
      ...(g.inApp || []),
    ]);

    return el("details.panel", { style: { marginBottom: "14px" } }, [
      el("summary", { style: { cursor: "pointer" }, html: `<b style="font-size:17px">${INSTRUMENTS[id].name}</b> <span class="muted" style="font-size:13px"> — ${g.tagline}</span>` }),
      body,
    ]);
  }
}
