import { el, pageHead, select, toast } from "../ui/components.js";
import { Store } from "../state.js";
import { Audio } from "../audio/engine.js";
import { detectPitch, PitchTracker } from "../audio/pitch.js";
import { Synth } from "../audio/synth.js";
import { INSTRUMENTS, instrumentOptions, ALT_TUNINGS, STRING_LABELS, midiToFreq, midiToName, centsTo, freqToMidi } from "../music/notes.js";

export default async function tuner(ctx) {
  const { el: root } = ctx;
  const s = Store.settings();
  let instrument = INSTRUMENTS[s.instrument]?.strings.length ? s.instrument : "acoustic-guitar";
  let tuningName = "standard";
  let tuning = (ALT_TUNINGS[instrument] || {})[tuningName] || INSTRUMENTS[instrument].strings;
  let targetIdx = null; // null = auto-detect nearest string
  let refStop = null;
  let running = false;
  const tracker = new PitchTracker();
  const buf = new Float32Array(2048);

  root.appendChild(pageHead("Tuner", "Play one string at a time. GuitarPicker detects pitch and tells you when you're out of tune."));

  // controls
  const instSel = select({ label: "Instrument", value: instrument,
    options: instrumentOptions((i) => i.strings.length),
    onchange: (v) => { instrument = v; tuningName = "standard"; rebuildTuning(); } });
  const tuningSel = select({ label: "Tuning", value: tuningName, options: tuningOptions(),
    onchange: (v) => { tuningName = v; rebuildTuning(); } });

  const startBtn = el("button.btn.primary", { onclick: toggle }, ["Start tuning"]);
  root.appendChild(el("div.panel", {}, [
    el("div.grid", { style: { gridTemplateColumns: "1fr 1fr auto" } }, [instSel, tuningSel,
      el("div.col", { style: { justifyContent: "flex-end" } }, [startBtn])]),
  ]));

  // display
  const noteEl = el("div.tuner-note", { html: "—" });
  const freqEl = el("div.tuner-freq", { text: "Play a note…" });
  const needle = el("div.tuner-needle");
  const verdict = el("div.tuner-verdict", { text: "" });
  const meter = el("div.tuner-meter", {}, [
    needle, el("div.tuner-scale"), el("div.tuner-center"),
    scaleTick(-50), scaleTick(-25), scaleTick(25), scaleTick(50),
  ]);
  const strings = el("div.string-row");

  root.appendChild(el("div.panel.tuner-display", {}, [noteEl, freqEl, meter, verdict,
    el("p.muted", { style: { marginTop: "14px" }, text: "Select a string to lock the target, or leave on Auto." }),
    strings,
  ]));

  // live fretboard: every place the note you're playing lives on the neck, plus a
  // "find the note" game — a random string+fret lights up, play it to score.
  const fbWrap = el("div", { style: { overflowX: "auto" } });
  const gameInfo = el("span.muted");
  let game = null;   // { target:{string,fret,midi}, score, heldSince }
  const gameBtn = el("button.btn", { onclick: () => {
    game = game ? null : { score: 0, target: null, heldSince: 0 };
    if (game) nextTarget();
    gameBtn.textContent = game ? "Stop game" : "🎯 Find the note";
    gameBtn.classList.toggle("primary", !!game);
    if (game && !running) toggle();
    paintFretboard(-1);
  } }, ["🎯 Find the note"]);
  const fbPanel = el("div.panel", { style: { marginTop: "16px" } }, [
    el("div.spread", {}, [el("h3", { text: "Fretboard", style: { margin: 0 } }), el("div.row", { style: { alignItems: "center", gap: "10px" } }, [gameInfo, gameBtn])]),
    el("p.muted", { style: { fontSize: "12px" }, text: "Lights up every spot on the neck for the note you're playing. The game shows a random fret — play that exact note." }),
    fbWrap,
  ]);
  root.appendChild(fbPanel);
  let lastPainted = null;
  function nextTarget() {
    const string = Math.floor(Math.random() * tuning.length), fret = Math.floor(Math.random() * 13);
    game.target = { string, fret, midi: tuning[string] + fret };
    game.heldSince = 0;
    gameInfo.textContent = `Score ${game.score} · play ${midiToName(game.target.midi).full} (string ${tuning.length - string}, fret ${fret})`;
  }
  function paintFretboard(midi) {
    const fretted = INSTRUMENTS[instrument]?.kind === "fretted";
    fbPanel.classList.toggle("hidden", !fretted);
    const key = midi + "|" + (game?.target ? game.target.string + "," + game.target.fret : "") + "|" + tuning.join();
    if (!fretted || key === lastPainted) return;
    lastPainted = key;
    fbWrap.innerHTML = fretboardSVG(tuning, midi, game?.target);
  }
  paintFretboard(-1);

  function tuningOptions() {
    return Object.keys(ALT_TUNINGS[instrument] || { standard: 1 }).map((k) => ({ value: k, label: k }));
  }
  function rebuildTuning() {
    tuning = (ALT_TUNINGS[instrument] || {})[tuningName] || INSTRUMENTS[instrument].strings;
    tuningSel.selectEl.innerHTML = "";
    for (const o of tuningOptions()) { const opt = el("option", { value: o.value, text: o.label }); if (o.value === tuningName) opt.selected = true; tuningSel.selectEl.appendChild(opt); }
    targetIdx = null;
    rebuildStrings();
    if (game) nextTarget();
    paintFretboard(-1);
  }
  function rebuildStrings() {
    strings.innerHTML = "";
    const labels = STRING_LABELS[instrument] || tuning.map((m) => midiToName(m).name);
    strings.appendChild(stringChip("Auto", null));
    tuning.forEach((m, i) => strings.appendChild(stringChip(labels[i] ?? midiToName(m).name, i)));
  }
  function stringChip(label, idx) {
    const b = el("button.string-btn", { text: label, onclick: () => {
      targetIdx = idx;
      [...strings.children].forEach((c, i) => c.classList.toggle("target", i === (idx == null ? 0 : idx + 1)));
      if (refStop) { refStop(); refStop = null; }
      if (idx != null) refStop = Synth.reference(midiToFreq(tuning[idx], s.a4));
      if (idx != null) setTimeout(() => { if (refStop) { refStop(); refStop = null; } }, 1500);
    }});
    if ((idx == null && targetIdx == null) || idx === targetIdx) b.classList.add("target");
    b.dataset.idx = idx == null ? "auto" : idx;
    return b;
  }

  async function toggle() {
    if (running) { stop(); return; }
    try { await Audio.startMic(s.inputDeviceId); }
    catch (e) { toast("Mic access failed: " + e.message, "bad"); return; }
    running = true; startBtn.textContent = "Stop"; startBtn.classList.remove("primary");
    loop();
  }
  function stop() {
    running = false; startBtn.textContent = "Start tuning"; startBtn.classList.add("primary");
    if (refStop) { refStop(); refStop = null; }
  }

  function loop() {
    if (!running) return;
    if (Audio.readTimeDomain(buf)) {
      const { freq } = detectPitch(buf, Audio.ctx().sampleRate, s.micGate);
      const f = tracker.push(freq, s.a4);
      if (f > 0) render(f);
      else idle();
      const m = f > 0 ? freqToMidi(f, s.a4) : -1;
      paintFretboard(m);
      if (game?.target) {
        // exact pitch, held ~¼ s, so a passing slide doesn't count
        if (m === game.target.midi) {
          if (!game.heldSince) game.heldSince = performance.now();
          else if (performance.now() - game.heldSince > 250) { game.score++; toast(`✓ ${midiToName(m).full}`, "good"); nextTarget(); }
        } else game.heldSince = 0;
      }
    }
    requestAnimationFrame(loop);
  }

  function idle() {
    noteEl.style.opacity = "0.4";
    verdict.textContent = "Listening…"; verdict.className = "tuner-verdict";
    needle.style.transform = "rotate(0deg)";
    needle.style.background = "var(--muted)";
  }

  function render(freq) {
    noteEl.style.opacity = "1";
    // choose reference midi: target string if locked, else nearest note
    let refMidi;
    if (targetIdx != null) refMidi = tuning[targetIdx];
    else {
      refMidi = freqToMidi(freq, s.a4);
      // also highlight which string is closest
      let best = 0, bestD = Infinity;
      tuning.forEach((m, i) => { const d = Math.abs(m - refMidi); if (d < bestD) { bestD = d; best = i; } });
      [...strings.children].forEach((c, i) => c.classList.toggle("target", i === best + 1));
    }
    const cents = centsTo(freq, refMidi, s.a4);
    const nm = midiToName(refMidi);
    noteEl.innerHTML = `${nm.name}<small>${nm.octave}</small>`;
    freqEl.textContent = `${freq.toFixed(1)} Hz · target ${midiToFreq(refMidi, s.a4).toFixed(1)} Hz`;

    const clamped = Math.max(-50, Math.min(50, cents));
    needle.style.transform = `rotate(${clamped * 0.9}deg)`;

    if (Math.abs(cents) <= 5) {
      verdict.textContent = "✓ In tune"; verdict.className = "tuner-verdict intune";
      needle.style.background = "var(--good)";
      markChip(refMidi, true);
    } else if (cents < 0) {
      verdict.textContent = `♭ ${Math.abs(cents)}¢ flat — tune up`; verdict.className = "tuner-verdict flat";
      needle.style.background = "var(--warn)"; markChip(refMidi, false);
    } else {
      verdict.textContent = `♯ ${cents}¢ sharp — tune down`; verdict.className = "tuner-verdict sharp";
      needle.style.background = "var(--warn)"; markChip(refMidi, false);
    }
  }

  function markChip(refMidi, inTune) {
    const idx = tuning.indexOf(refMidi);
    if (idx < 0) return;
    const chip = strings.children[idx + 1];
    if (chip) chip.classList.toggle("intune", inTune);
  }

  function scaleTick(c) {
    return el("div", { style: { position: "absolute", bottom: "0", left: `${50 + c * 0.9}%`,
      width: "1px", height: "10px", background: "var(--line)" } });
  }

  return () => { stop(); Audio.stopMic(); };
}

/** SVG neck (frets 0–12): dots for every position of `midi`, a ring on the game target. */
export function fretboardSVG(tuning, midi, target) {
  const FRETS = 12, cw = 46, rh = 22, x0 = 34, y0 = 14, n = tuning.length;
  const w = x0 + cw * (FRETS + 0.5), h = y0 * 2 + rh * (n - 1) + 14;
  const sy = (si) => y0 + (n - 1 - si) * rh;   // highest string on top, like tab
  const fx = (f) => (f === 0 ? x0 - 14 : x0 + (f - 0.5) * cw);
  let out = `<svg viewBox="0 0 ${w} ${h}" width="${w}" style="max-width:100%;display:block" role="img" aria-label="Fretboard">`;
  for (const f of [3, 5, 7, 9]) out += `<circle cx="${fx(f)}" cy="${h - 7}" r="3" fill="var(--muted)"/>`;
  out += `<circle cx="${fx(12) - 5}" cy="${h - 7}" r="3" fill="var(--muted)"/><circle cx="${fx(12) + 5}" cy="${h - 7}" r="3" fill="var(--muted)"/>`;
  for (let f = 0; f <= FRETS; f++) out += `<line x1="${x0 + f * cw}" y1="${sy(n - 1)}" x2="${x0 + f * cw}" y2="${sy(0)}" stroke="var(--line)" stroke-width="${f ? 1 : 4}"/>`;
  tuning.forEach((open, si) => {
    out += `<line x1="${x0}" y1="${sy(si)}" x2="${x0 + FRETS * cw}" y2="${sy(si)}" stroke="var(--muted)" stroke-width="${1 + (n - si) * 0.25}"/>`;
    out += `<text x="2" y="${sy(si) + 4}" font-size="11" fill="var(--muted)">${midiToName(open).name}</text>`;
    for (let f = 0; f <= FRETS; f++) {
      const m = open + f, hit = m === midi, tgt = target && target.string === si && target.fret === f;
      if (tgt) out += `<circle cx="${fx(f)}" cy="${sy(si)}" r="10" fill="none" stroke="var(--warn)" stroke-width="3"/>`;
      if (hit) out += `<circle cx="${fx(f)}" cy="${sy(si)}" r="8" fill="var(--accent)"/><text x="${fx(f)}" y="${sy(si) + 4}" font-size="9" text-anchor="middle" fill="#000">${midiToName(m).name}</text>`;
    }
  });
  return out + "</svg>";
}
