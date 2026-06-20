import { el, pageHead, select, slider, toast, download } from "../ui/components.js";
import { Store } from "../state.js";
import { Audio } from "../audio/engine.js";
import { INSTRUMENTS } from "../music/notes.js";
import { SKINS } from "../cosmetics/skins.js";
import { syncConfigured, isSignedIn, signIn, signOut, syncNow, lastSync } from "../cloud/sync.js";

export default async function settings(ctx) {
  const { el: root } = ctx;
  const s = Store.settings();

  root.appendChild(pageHead("Settings", "Devices, sound, and appearance. GuitarPicker always shows the active input & output."));

  // --- Devices ---
  const devPanel = el("div.panel", {}, [el("h2", { text: "Audio devices" })]);
  root.appendChild(devPanel);

  const inputSel = select({ label: "Input (microphone)", options: [{ value: "", label: "System default" }], value: s.inputDeviceId,
    onchange: (v) => { Store.setSetting("inputDeviceId", v); if (Audio.micLive()) Audio.startMic(v); } });
  const outputSel = select({ label: "Output (speakers/headphones)", options: [{ value: "", label: "System default" }], value: s.outputDeviceId,
    onchange: (v) => Audio.setOutputDevice(v) });

  const micStatus = el("span.muted", { text: Audio.micLive() ? "Microphone live" : "Microphone off" });
  const testBtn = el("button.btn", { onclick: async () => {
    try {
      if (Audio.micLive()) { Audio.stopMic(); micStatus.textContent = "Microphone off"; testBtn.textContent = "Enable microphone"; }
      else { await Audio.startMic(s.inputDeviceId); micStatus.textContent = "Microphone live"; testBtn.textContent = "Disable microphone"; await refreshDevices(); }
    } catch (e) { toast("Mic access failed: " + e.message, "bad"); }
  }}, [Audio.micLive() ? "Disable microphone" : "Enable microphone"]);

  devPanel.append(
    el("div.grid", { style: { gridTemplateColumns: "1fr 1fr" } }, [inputSel, outputSel]),
    el("div.row", { style: { marginTop: "12px", alignItems: "center" } }, [testBtn, micStatus]),
    el("p.muted", { style: { marginTop: "8px", fontSize: "12px" },
      html: "Device names appear after you grant microphone permission. Output routing uses <code>setSinkId</code> where the browser supports it (Chrome/Edge)." }),
  );

  async function refreshDevices() {
    const { inputs, outputs } = await Audio.listDevices();
    fill(inputSel.selectEl, inputs, s.inputDeviceId, "System default");
    fill(outputSel.selectEl, outputs, s.outputDeviceId, "System default");
  }
  function fill(sel, list, current, defLabel) {
    sel.innerHTML = "";
    sel.appendChild(el("option", { value: "", text: defLabel }));
    for (const d of list) {
      const o = el("option", { value: d.deviceId, text: d.label });
      if (d.deviceId === current) o.selected = true;
      sel.appendChild(o);
    }
  }
  refreshDevices();

  // --- Sound ---
  const soundPanel = el("div.panel", {}, [el("h2", { text: "Sound & detection" })]);
  root.appendChild(soundPanel);
  soundPanel.append(
    el("div.grid", { style: { gridTemplateColumns: "1fr 1fr" } }, [
      slider({ label: "Backing track volume", value: s.backingVolume, fmt: (v) => Math.round(v * 100) + "%",
        oninput: (v) => Store.setSetting("backingVolume", v) }),
      slider({ label: "Vocal track volume", value: s.vocalVolume, fmt: (v) => Math.round(v * 100) + "%",
        oninput: (v) => Store.setSetting("vocalVolume", v) }),
      slider({ label: "Mic noise gate (sensitivity)", min: 0.002, max: 0.06, step: 0.002, value: s.micGate,
        fmt: (v) => v.toFixed(3), oninput: (v) => Store.setSetting("micGate", v) }),
      slider({ label: "A4 calibration (Hz)", min: 415, max: 466, step: 1, value: s.a4, fmt: (v) => v + " Hz",
        oninput: (v) => Store.setSetting("a4", v) }),
      slider({ label: "Note highway speed", min: 0.5, max: 2, step: 0.1, value: s.noteSpeed, fmt: (v) => v.toFixed(1) + "×",
        oninput: (v) => Store.setSetting("noteSpeed", v) }),
    ]),
  );

  // --- Appearance / defaults ---
  const apr = el("div.panel", {}, [el("h2", { text: "Appearance & defaults" })]);
  root.appendChild(apr);
  apr.append(
    el("div.grid", { style: { gridTemplateColumns: "1fr 1fr" } }, [
      select({ label: "Theme (app skin)", value: s.theme, options: SKINS.map((sk) => ({ value: sk.id, label: sk.name })),
        onchange: (v) => { Store.setSetting("theme", v); document.documentElement.setAttribute("data-theme", v);
          const q = document.getElementById("theme-quick"); if (q) q.value = v; } }),
      select({ label: "Default instrument", value: s.instrument,
        options: Object.entries(INSTRUMENTS).map(([id, i]) => ({ value: id, label: i.name })),
        onchange: (v) => Store.setSetting("instrument", v) }),
    ]),
    el("p.muted", { style: { margin: "12px 0 0", fontSize: "13px" },
      html: "Customise your <b>player avatar</b>, <b>guitar</b>, and more app skins in the Locker." }),
    el("div.row", { style: { marginTop: "8px" } }, [
      el("button.btn", { onclick: () => { location.hash = "#/locker"; } }, ["🎨 Open Locker"]),
    ]),
  );

  // --- Data ---
  const data = el("div.panel", {}, [el("h2", { text: "Data" })]);
  root.appendChild(data);
  data.append(el("div.row", {}, [
    el("button.btn", { onclick: () => download("guitarpicker-data.json", Store.exportAll()) }, ["Export all data"]),
    el("button.btn.danger", { onclick: () => {
      if (confirm("Clear all local data (songs, history, progress, settings)?")) {
        localStorage.removeItem("guitarpicker.v1"); location.reload();
      }
    }}, ["Reset everything"]),
  ]));

  // --- Cloud sync (Google Drive, opt-in) ---
  const cloud = el("div.panel", {}, [el("h2", { text: "Account & Sync (cloud)" })]);
  root.appendChild(cloud);
  if (!syncConfigured()) {
    cloud.append(el("p.muted", { style: { fontSize: "13px", lineHeight: "1.5" },
      html: "Cloud sync is <b>not configured</b> for this build — GuitarPicker is running 100% locally (no account, no network). " +
        "To sync your songs, history, and progress to your own Google Drive, follow <code>docs/CLOUD-SYNC-SETUP.md</code> and add a Google OAuth client ID." }));
  } else {
    const status = el("span.muted", {});
    const signinBtn = el("button.btn.primary", { onclick: doSignIn }, ["Sign in with Google"]);
    const syncBtn = el("button.btn", { onclick: doSync }, ["⟳ Sync now"]);
    const signoutBtn = el("button.btn.ghost", { onclick: doSignOut }, ["Sign out"]);
    cloud.append(
      el("p.muted", { style: { fontSize: "13px", lineHeight: "1.5" },
        html: "Sync your <b>songs, history, progress, and unlocks</b> to a hidden, app-private folder in your own Google Drive. " +
          "Device settings (mic/output, theme) stay local. Opt-in — nothing leaves your device until you sign in, and you can sign out anytime." }),
      el("div.row", { style: { alignItems: "center", gap: "10px" } }, [signinBtn, syncBtn, signoutBtn, status]),
    );
    function refresh() {
      const on = isSignedIn();
      signinBtn.classList.toggle("hidden", on);
      syncBtn.classList.toggle("hidden", !on);
      signoutBtn.classList.toggle("hidden", !on);
      status.textContent = on
        ? (lastSync() ? `Synced at ${new Date(lastSync()).toLocaleTimeString()}` : "Connected to Google Drive")
        : "Not signed in — your data stays on this device.";
    }
    async function doSignIn() {
      signinBtn.textContent = "Signing in…";
      try { const r = await signIn(); toast(`Synced — ${r.songs} songs${r.pulled ? " (merged)" : ""}`, "good"); }
      catch (e) { toast("Sign-in failed: " + e.message, "bad"); }
      finally { signinBtn.textContent = "Sign in with Google"; refresh(); }
    }
    async function doSync() {
      syncBtn.textContent = "Syncing…";
      try { const r = await syncNow(); toast(`Synced — ${r.songs} songs${r.pulled ? " (merged)" : ""}`, "good"); }
      catch (e) { toast("Sync failed: " + e.message, "bad"); }
      finally { syncBtn.textContent = "⟳ Sync now"; refresh(); }
    }
    function doSignOut() { signOut(); toast("Signed out"); refresh(); }
    refresh();
  }

  // --- About & disclaimers ---
  const about = el("div.panel", {}, [el("h2", { text: "About & disclaimers" })]);
  root.appendChild(about);
  about.append(
    el("p.muted", { style: { margin: "0 0 8px", fontSize: "13px", lineHeight: "1.5" },
      html: "<b>GuitarPicker</b> is a free, open-source hobby project, released under the MIT License and provided <b>as is</b>, without warranty of any kind." }),
    el("p.muted", { style: { margin: "0 0 8px", fontSize: "13px", lineHeight: "1.5" },
      html: "I'm a software developer — <b>not a doctor, music teacher, coach, or lawyer</b>. Nothing here is professional instruction or medical, hearing, or legal advice. Play at a comfortable volume and protect your hearing. Not affiliated with or endorsed by Yousician or any other company." }),
    el("p.muted", { style: { margin: "0 0 8px", fontSize: "13px", lineHeight: "1.5" },
      html: "<b>Privacy:</b> everything runs in your browser and works fully offline. No analytics, and no servers operated by this project. Microphone audio is analysed locally and never leaves your device. " +
        "<b>Cloud sync is optional and off by default</b> — if you enable it and sign in with Google, your songs/history/progress sync to a private folder in <i>your own</i> Google Drive (minimal <code>drive.appdata</code> scope); sign out anytime. Otherwise your data lives only in this browser." }),
    el("p.muted", { style: { margin: "0 0 10px", fontSize: "13px", lineHeight: "1.5" },
      html: "Built-in songs are traditional / public-domain works and the glossary is original. No third-party code, fonts, images, or audio are bundled." }),
    el("div.row", {}, [
      el("a.btn", { href: "https://github.com/adervec/GuitarPicker", target: "_blank", rel: "noopener" }, ["GitHub"]),
      el("a.btn", { href: "https://github.com/adervec/GuitarPicker/blob/main/LICENSE", target: "_blank", rel: "noopener" }, ["MIT License"]),
      el("a.btn", { href: "https://github.com/adervec/GuitarPicker/blob/main/CREDITS.md", target: "_blank", rel: "noopener" }, ["Credits"]),
    ]),
  );
}
