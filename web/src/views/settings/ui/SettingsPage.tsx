"use client";

// Ported (as JSX — plain form controls, no canvas-game-loop reason to stay
// imperative like Play/Karaoke) from the vanilla app's views/settings.js.
// Dropped entirely: theming (this pilot is dark-only, no `data-theme`
// switcher), the Locker link (cosmetics aren't ported), and the whole
// "Account & Sync (cloud)" section — Google sign-in is built but disabled
// for now (see entities/cloud-account), by request, so there's nothing to
// configure here either.
import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { audioEngine } from "@/shared/lib/audio-engine";
import { Synth } from "@/shared/lib/synth";
import { toast, download } from "@/shared/lib/dom";
import { instrumentOptions } from "@/entities/instrument/model/data";
import { getSettings, setSetting, subscribeSettings, exportAll, resetAll, DEFAULTS } from "@/shared/lib/player-settings";
import styles from "./SettingsPage.module.css";

// `getSettings()` reflects localStorage, which doesn't exist during SSR —
// reading it straight in render would make server and client disagree on
// the first paint (same hazard as widgets/cloud-account-badge and
// views/history). `useSyncExternalStore`'s `getServerSnapshot` returns
// `DEFAULTS` itself: value-identical to what the server's own `getSettings()`
// produces (no persisted overrides exist there), so SSR and the client's
// first (hydration) render agree; `subscribeSettings` then makes this page
// re-render live on every `setSetting` — including its own handlers below.
function useSettings() {
  return useSyncExternalStore(subscribeSettings, getSettings, () => DEFAULTS);
}

const DEVICES_KEY = ["audio-devices"];
const EMPTY_DEVICES = { inputs: [], outputs: [] };

export function SettingsPage() {
  const s = useSettings();
  const queryClient = useQueryClient();
  // `enumerateDevices()` is a genuine async browser call (unlike settings/
  // history, which are synchronous localStorage) — TanStack Query is the
  // right tool here, and sidesteps the newer `react-hooks/set-state-in-effect`
  // lint rule, which flags a plain `useEffect(() => { asyncFn() }, [])`
  // fetch-on-mount regardless of the setState happening after an `await`.
  const devicesQuery = useQuery({ queryKey: DEVICES_KEY, queryFn: () => audioEngine.listDevices() });
  const { inputs, outputs } = devicesQuery.data || EMPTY_DEVICES;
  const [micLive, setMicLive] = useState(false);

  useEffect(() => () => { if (audioEngine.micLive()) audioEngine.stopMic(); }, []);

  async function toggleMicTest() {
    if (audioEngine.micLive()) { audioEngine.stopMic(); setMicLive(false); return; }
    try {
      await audioEngine.startMic(s.inputDeviceId);
      setMicLive(true);
      queryClient.invalidateQueries({ queryKey: DEVICES_KEY }); // device labels only appear post-permission
    } catch (e) { toast("Mic access failed: " + (e instanceof Error ? e.message : String(e)), "bad"); }
  }

  // Lets you hear the Backing/Vocal volume balance and A4 calibration
  // together while dragging the sliders, rather than only seeing numbers —
  // a sustained chord ("backing", at s.backingVolume) plus a short melodic
  // phrase on top ("vocal", at s.vocalVolume), both tuned to s.a4. Note
  // highway speed and the mic noise gate aren't audio-output settings, so
  // there's nothing of theirs to preview here.
  function previewMix() {
    const { a4, backingVolume, vocalVolume, instrument } = s;
    [48, 52, 55].forEach((m) => Synth.playMidi(m, { dur: 1.6, gain: 0.85 * backingVolume, a4, instrument }));
    [72, 74, 76].forEach((m, i) => setTimeout(
      () => Synth.playMidi(m, { dur: 0.5, gain: 0.9 * vocalVolume, a4, instrument: "voice" }),
      200 + i * 350,
    ));
  }

  function exportData() {
    const d = new Date().toISOString().slice(0, 10);
    download(`guitarpicker-web-data-${d}.json`, exportAll());
    toast("Data exported", "good");
  }
  function resetData() {
    if (!confirm("Clear all local data for this pilot (settings, session history)?")) return;
    resetAll();
    location.reload();
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>
      <p className={styles.subtitle}>Devices, sound, and defaults for this pilot.</p>

      <section className={styles.panel}>
        <h2>Audio devices</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span>Input (microphone)</span>
            <select value={s.inputDeviceId} onChange={(e) => {
              setSetting("inputDeviceId", e.target.value);
              if (audioEngine.micLive()) audioEngine.startMic(e.target.value);
            }}>
              <option value="">System default</option>
              {inputs.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Output (speakers/headphones)</span>
            <select value={s.outputDeviceId} onChange={(e) => {
              setSetting("outputDeviceId", e.target.value);
              audioEngine.setOutputDevice(e.target.value);
            }}>
              <option value="">System default</option>
              {outputs.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
            </select>
          </label>
        </div>
        <div className={styles.row}>
          <button className="btn" onClick={toggleMicTest}>{micLive ? "Disable microphone" : "Enable microphone"}</button>
          <span className={styles.muted}>{micLive ? "Microphone live" : "Microphone off"}</span>
        </div>
        <p className={styles.hint}>
          Device names appear after you grant microphone permission. Output routing uses <code>setSinkId</code> where the browser supports it (Chrome/Edge).
        </p>
      </section>

      <section className={styles.panel}>
        <h2>Sound &amp; detection</h2>
        <div className={styles.grid2}>
          <SliderField label="Backing track volume" min={0} max={1} step={0.01} value={s.backingVolume}
            fmt={(v) => Math.round(v * 100) + "%"} onChange={(v) => setSetting("backingVolume", v)} />
          <SliderField label="Vocal track volume" min={0} max={1} step={0.01} value={s.vocalVolume}
            fmt={(v) => Math.round(v * 100) + "%"} onChange={(v) => setSetting("vocalVolume", v)} />
          <SliderField label="Mic noise gate (sensitivity)" min={0.002} max={0.06} step={0.002} value={s.micGate}
            fmt={(v) => v.toFixed(3)} onChange={(v) => setSetting("micGate", v)} />
          <SliderField label="A4 calibration (Hz)" min={415} max={466} step={1} value={s.a4}
            fmt={(v) => v + " Hz"} onChange={(v) => setSetting("a4", v)} />
          <SliderField label="Note highway speed" min={0.5} max={2} step={0.1} value={s.noteSpeed}
            fmt={(v) => v.toFixed(1) + "×"} onChange={(v) => setSetting("noteSpeed", v)} />
        </div>
        <div className={styles.row}>
          <button className="btn primary" onClick={previewMix}>▶ Preview mix</button>
          <span className={styles.muted}>Backing chord + vocal phrase at your current volumes and A4</span>
        </div>
        <p className={styles.hint}>
          Adjust a slider above, then preview again to compare — the preview reflects Backing/Vocal volume and A4 calibration.
          Note highway speed and the mic noise gate aren&apos;t audio-output settings, so they have nothing to preview here.
        </p>
      </section>

      <section className={styles.panel}>
        <h2>Defaults</h2>
        <div className={styles.grid2}>
          <label className={styles.field}>
            <span>Default instrument</span>
            <select value={s.instrument} onChange={(e) => setSetting("instrument", e.target.value)}>
              {instrumentOptions().map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>String labels (fretboard &amp; tuner)</span>
            <select value={s.stringLabels} onChange={(e) => setSetting("stringLabels", e.target.value)}>
              <option value="notes">Note names (E A D G B e)</option>
              <option value="numbers">Numbers (1–6, high to low)</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Song player</span>
            <select value={s.playerVersion} onChange={(e) => setSetting("playerVersion", e.target.value as "new" | "classic")}>
              <option value="new">New — Guitar tab note highway</option>
              <option value="classic">Classic — pitch highway &amp; grading</option>
            </select>
          </label>
        </div>
        <p className={styles.hint}>
          The new player shows the same string/fret/finger-color view the Song Editor&apos;s Guitar
          tab uses, synced to audio playback, with the same live-grading, healthbar, strict mode
          (Repeat till right), and Learn mode Classic has, plus its own Free mode &mdash; practice
          note by note at your own pace, with no auto-playback at all. Classic keeps the original
          continuous-pitch note highway instead of string lanes. Falls back to Classic automatically
          for instruments without strings (piano, voice, and so on).
        </p>
      </section>

      <section className={styles.panel}>
        <h2>Data</h2>
        <div className={styles.row}>
          <button className="btn" onClick={exportData}>Export all data</button>
          <button className={`btn ${styles.danger}`} onClick={resetData}>Reset everything</button>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>About</h2>
        <p className={styles.hint}>
          This is the <b>FSD + Next.js + TanStack Query pilot</b> of GuitarPicker — a scoped port
          of a subset of the vanilla app (see the project&apos;s <code>web/README.md</code>), not
          the deployed app itself.
        </p>
        <p className={styles.hint}>
          <b>Privacy:</b> everything runs in your browser. No analytics, no servers operated by
          this project. Microphone audio is analysed locally and never leaves your device.
          Settings and session history are stored only in this browser&apos;s <code>localStorage</code>.
        </p>
        <div className={styles.row}>
          <a className="btn" href="https://github.com/adervec/GuitarPicker" target="_blank" rel="noopener">GitHub</a>
          <a className="btn" href="https://github.com/adervec/GuitarPicker/blob/main/LICENSE" target="_blank" rel="noopener">MIT License</a>
        </div>
      </section>
    </div>
  );
}

function SliderField({ label, min, max, step, value, fmt, onChange }: {
  label: string; min: number; max: number; step: number; value: number;
  fmt: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <div className={styles.slider}>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))} />
        <span className={styles.val}>{fmt(value)}</span>
      </div>
    </label>
  );
}
