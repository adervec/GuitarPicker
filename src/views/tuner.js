import { el, pageHead, select, toast } from "../ui/components.js";
import { Store } from "../state.js";
import { Audio } from "../audio/engine.js";
import { detectPitch, PitchTracker } from "../audio/pitch.js";
import { Synth } from "../audio/synth.js";
import { INSTRUMENTS, ALT_TUNINGS, STRING_LABELS, midiToFreq, midiToName, centsTo, freqToMidi } from "../music/notes.js";

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
    options: Object.entries(INSTRUMENTS).filter(([, i]) => i.strings.length).map(([id, i]) => ({ value: id, label: i.name })),
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

  rebuildStrings();

  function tuningOptions() {
    return Object.keys(ALT_TUNINGS[instrument] || { standard: 1 }).map((k) => ({ value: k, label: k }));
  }
  function rebuildTuning() {
    tuning = (ALT_TUNINGS[instrument] || {})[tuningName] || INSTRUMENTS[instrument].strings;
    tuningSel.selectEl.innerHTML = "";
    for (const o of tuningOptions()) { const opt = el("option", { value: o.value, text: o.label }); if (o.value === tuningName) opt.selected = true; tuningSel.selectEl.appendChild(opt); }
    targetIdx = null;
    rebuildStrings();
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
