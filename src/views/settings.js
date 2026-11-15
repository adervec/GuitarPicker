import { el, pageHead, select, slider, toast, download } from "../ui/components.js";
import { Store } from "../state.js";
import { Audio } from "../audio/engine.js";
import { INSTRUMENTS, instrumentOptions } from "../music/notes.js";
import { syncConfigured, isSignedIn, signIn, signOut, syncNow, lastSync, account } from "../cloud/sync.js";
import { eraseLocalData, CACHE_NAME } from "../erase.js";
import { t, fmt } from "../i18n.js";

export default async function settings(ctx) {
  const { el: root } = ctx;
  const s = Store.settings();

  root.appendChild(pageHead(t("Settings"), t("Devices, sound, and appearance. GuitarPicker always shows the active input & output.")));

  // --- Devices ---
  const devPanel = el("div.panel", {}, [el("h2", { text: t("Audio devices") })]);
  root.appendChild(devPanel);

  const inputSel = select({ label: t("Input (microphone)"), options: [{ value: "", label: t("System default") }], value: s.inputDeviceId,
    onchange: (v) => { Store.setSetting("inputDeviceId", v); if (Audio.micLive()) Audio.startMic(v); } });
  const outputSel = select({ label: t("Output (speakers/headphones)"), options: [{ value: "", label: t("System default") }], value: s.outputDeviceId,
    onchange: (v) => Audio.setOutputDevice(v) });

  const micStatus = el("span.muted", { text: Audio.micLive() ? t("Microphone live") : t("Microphone off") });
  const testBtn = el("button.btn", { onclick: async () => {
    try {
      if (Audio.micLive()) { Audio.stopMic(); micStatus.textContent = t("Microphone off"); testBtn.textContent = t("Enable microphone"); }
      else { await Audio.startMic(s.inputDeviceId); micStatus.textContent = t("Microphone live"); testBtn.textContent = t("Disable microphone"); await refreshDevices(); }
    } catch (e) { toast(t("Mic access failed: {error}", { error: e.message }), "bad"); }
  }}, [Audio.micLive() ? t("Disable microphone") : t("Enable microphone")]);

  devPanel.append(
    el("div.grid", { style: { gridTemplateColumns: "1fr 1fr" } }, [inputSel, outputSel]),
    el("div.row", { style: { marginTop: "12px", alignItems: "center" } }, [testBtn, micStatus]),
    el("p.muted", { style: { marginTop: "8px", fontSize: "12px" },
      html: t("Device names appear after you grant microphone permission. Output routing uses <code>setSinkId</code> where the browser supports it (Chrome/Edge).") }),
  );

  async function refreshDevices() {
    const { inputs, outputs } = await Audio.listDevices();
    fill(inputSel.selectEl, inputs, s.inputDeviceId, t("System default"));
    fill(outputSel.selectEl, outputs, s.outputDeviceId, t("System default"));
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
  const soundPanel = el("div.panel", {}, [el("h2", { text: t("Sound & detection") })]);
  root.appendChild(soundPanel);
  soundPanel.append(
    el("div.grid", { style: { gridTemplateColumns: "1fr 1fr" } }, [
      slider({ label: t("Backing track volume"), value: s.backingVolume, fmt: (v) => fmt.percent(v, 0),
        oninput: (v) => Store.setSetting("backingVolume", v) }),
      slider({ label: t("Vocal track volume"), value: s.vocalVolume, fmt: (v) => fmt.percent(v, 0),
        oninput: (v) => Store.setSetting("vocalVolume", v) }),
      slider({ label: t("Mic noise gate (sensitivity)"), min: 0.002, max: 0.06, step: 0.002, value: s.micGate,
        fmt: (v) => fmt.number(v, { max: 3, min: 3 }), oninput: (v) => Store.setSetting("micGate", v) }),
      slider({ label: t("A4 calibration (Hz)"), min: 415, max: 466, step: 1, value: s.a4, fmt: (v) => fmt.number(v, { max: 0 }) + " Hz",
        oninput: (v) => Store.setSetting("a4", v) }),
      slider({ label: t("Note highway speed"), min: 0.5, max: 2, step: 0.1, value: s.noteSpeed, fmt: (v) => fmt.number(v, { max: 1, min: 1 }) + "×",
        oninput: (v) => Store.setSetting("noteSpeed", v) }),
      select({ label: t("MIDI input (keyboard / e-kit)"), value: s.midiInput ? "on" : "off",
        options: [{ value: "off", label: t("Off — listen with the mic") }, { value: "on", label: t("On — grade MIDI notes when a device is plugged in") }],
        onchange: (v) => Store.setSetting("midiInput", v === "on") }),
    ]),
  );

  // --- Appearance / defaults ---
  const apr = el("div.panel", {}, [el("h2", { text: t("Appearance & defaults") })]);
  root.appendChild(apr);
  apr.append(
    el("div.grid", { style: { gridTemplateColumns: "1fr 1fr" } }, [
      // the house theme list (font.js, standard 24): System follows the device, the choice is kept for this app
      el("div.field", {}, [document.createElement("app-theme-picker")]),
      select({ label: t("Default instrument"), value: s.instrument,
        options: instrumentOptions(),
        onchange: (v) => Store.setSetting("instrument", v) }),
    ]),
    // shared picker from https://adervec.github.io/font.js (el() cannot make hyphenated tags)
    el("div", { style: { marginTop: "12px" } }, [document.createElement("app-font-picker")]),
    el("p.muted", { style: { margin: "12px 0 0", fontSize: "13px" },
      html: t("Customise your <b>player avatar</b> and <b>guitar</b> in the Locker.") }),
    el("div.row", { style: { marginTop: "8px" } }, [
      el("button.btn", { onclick: () => { location.hash = "#/locker"; } }, ["🎨 " + t("Open Locker")]),
    ]),
  );

  // --- Data ---
  const data = el("div.panel", {}, [el("h2", { text: t("Data") })]);
  root.appendChild(data);
  data.append(el("div.row", {}, [
    el("button.btn", { onclick: () => download("guitarpicker-data.json", Store.exportAll()) }, [t("Export all data")]),
    el("button.btn.danger", { onclick: async () => {
      if (!confirm(t("Erase everything GuitarPicker keeps on this device — songs, history, progress, coins, unlocks and settings? This can't be undone (use Export all data first if you want a copy). Cloud sync will be disconnected; the copy in your Google Drive is not touched."))) return;
      signOut();
      eraseLocalData(localStorage);
      try { await caches?.delete(CACHE_NAME); } catch { /* no Cache API */ }
      location.reload();
    }}, [t("Erase everything")]),
  ]));
  data.append(el("p.muted", { style: { fontSize: "12px", marginTop: "8px" },
    text: t("Erase removes only GuitarPicker's data from this browser (other apps on this site keep theirs) and signs out of sync. Your Google Drive copy stays until you delete it there.") }));

  // --- Cloud sync (Google Drive, opt-in) ---
  const cloud = el("div.panel", {}, [el("h2", { text: t("Account & Sync (cloud)") })]);
  root.appendChild(cloud);
  // The built-in client ID is origin-gated, so a fork deployed elsewhere lands here
  // and can paste its own ID rather than editing source and redeploying.
  const clientIdField = el("input.input", {
    type: "text", placeholder: "1234-abc.apps.googleusercontent.com",
    value: Store.settings().driveClientId || "",
    onchange: (e) => { Store.setSetting("driveClientId", e.target.value.trim()); location.reload(); },
  });
  const clientIdRow = el("details", { style: { marginTop: "12px" } }, [
    el("summary.muted", { style: { fontSize: "12px", cursor: "pointer" }, text: t("Use your own Google OAuth client ID (forks & self-hosting)") }),
    el("p.muted", { style: { fontSize: "12px", lineHeight: "1.5", margin: "8px 0" },
      html: t("The built-in ID only works on the official site and on localhost. Running your own copy elsewhere? Create a free OAuth <b>Web</b> client (see <code>docs/CLOUD-SYNC-SETUP.md</code>), authorise your origin, and paste the ID here. Blank uses the built-in one.") }),
    clientIdField,
  ]);

  if (!syncConfigured()) {
    cloud.append(el("p.muted", { style: { fontSize: "13px", lineHeight: "1.5" },
      html: t("Cloud sync is <b>not available on this origin</b> — GuitarPicker is running 100% locally (no account, no network). The built-in Google client ID is restricted to the official site; add your own below to enable sync on this deployment.") }), clientIdRow);
  } else {
    const status = el("span.muted", {});
    const signinBtn = el("button.btn.primary", { onclick: doSignIn }, [t("Sign in with Google")]);
    const syncBtn = el("button.btn", { onclick: doSync }, ["⟳ " + t("Sync now")]);
    const signoutBtn = el("button.btn.ghost", { onclick: doSignOut }, [t("Sign out")]);
    // One whole sentence per case, so a translation never has to be glued together.
    const syncedMsg = (r) => (r.pulled
      ? t.n("Synced — {n} song (merged)", "Synced — {n} songs (merged)", r.songs)
      : t.n("Synced — {n} song", "Synced — {n} songs", r.songs));
    cloud.append(
      el("p.muted", { style: { fontSize: "13px", lineHeight: "1.5" },
        html: t("Sync your <b>songs, history, progress, and unlocks</b> to a hidden, app-private folder in your own Google Drive. Device settings (mic/output, theme) stay local. Opt-in — nothing leaves your device until you sign in, and you can sign out anytime.") }),
      el("div.row", { style: { alignItems: "center", gap: "10px" } }, [signinBtn, syncBtn, signoutBtn, status]),
      clientIdRow,
    );
    function refresh() {
      const on = isSignedIn();
      signinBtn.classList.toggle("hidden", on);
      syncBtn.classList.toggle("hidden", !on);
      signoutBtn.classList.toggle("hidden", !on);
      // signOut() clears the profile, so the picture goes with it
      status.innerHTML = "";
      status.appendChild(on
        ? accountChip(account(), lastSync() ? " — " + t("synced {time}", { time: fmt.time(lastSync()) }) : "")
        : el("span", { text: t("Not signed in — your data stays on this device.") }));
    }
    async function doSignIn() {
      signinBtn.textContent = t("Signing in…");
      try { const r = await signIn(); toast(syncedMsg(r), "good"); }
      catch (e) { toast(t("Sign-in failed: {error}", { error: e.message }), "bad"); }
      finally { signinBtn.textContent = t("Sign in with Google"); refresh(); }
    }
    async function doSync() {
      syncBtn.textContent = t("Syncing…");
      try { const r = await syncNow(); toast(syncedMsg(r), "good"); }
      catch (e) { toast(t("Sync failed: {error}", { error: e.message }), "bad"); }
      finally { syncBtn.textContent = "⟳ " + t("Sync now"); refresh(); }
    }
    function doSignOut() { signOut(); toast(t("Signed out")); refresh(); }
    refresh();
  }

  // --- About & disclaimers ---
  const about = el("div.panel", {}, [el("h2", { text: t("About & disclaimers") })]);
  root.appendChild(about);
  about.append(
    el("p.muted", { style: { margin: "0 0 8px", fontSize: "13px", lineHeight: "1.5" },
      html: t("<b>GuitarPicker</b> is a free, open-source hobby project, released under the MIT License and provided <b>as is</b>, without warranty of any kind.") }),
    el("p.muted", { style: { margin: "0 0 8px", fontSize: "13px", lineHeight: "1.5" },
      html: t("I'm a software developer — <b>not a doctor, music teacher, coach, or lawyer</b>. Nothing here is professional instruction or medical, hearing, or legal advice. Play at a comfortable volume and protect your hearing. Not affiliated with or endorsed by Yousician or any other company.") }),
    el("p.muted", { style: { margin: "0 0 8px", fontSize: "13px", lineHeight: "1.5" },
      html: t("<b>Privacy:</b> everything runs in your browser and works fully offline. No analytics, and no servers operated by this project. Microphone audio is analysed locally and never leaves your device. <b>Cloud sync is optional and off by default</b> — if you enable it and sign in with Google, your songs/history/progress sync to a private folder in <i>your own</i> Google Drive (minimal <code>drive.appdata</code> scope, plus your name and email so this page can show which account is connected); sign out anytime. Otherwise your data lives only in this browser.") }),
    el("p.muted", { style: { margin: "0 0 10px", fontSize: "13px", lineHeight: "1.5" },
      html: t("Built-in songs are traditional / public-domain works and the glossary is original. No third-party code, fonts, images, or audio are bundled.") }),
    el("div.row", {}, [
      el("a.btn", { href: "https://github.com/adervec/GuitarPicker", target: "_blank", rel: "noopener" }, ["GitHub"]),
      el("a.btn", { href: "https://github.com/adervec/GuitarPicker/blob/main/LICENSE", target: "_blank", rel: "noopener" }, [t("MIT License")]),
      el("a.btn", { href: "https://github.com/adervec/GuitarPicker/blob/main/CREDITS.md", target: "_blank", rel: "noopener" }, [t("Credits")]),
      el("a.btn", { href: "https://adervec.github.io", target: "_blank", rel: "noopener" }, [t("More apps by this maker")]),
    ]),
  );
}

/** The connected Google account: round profile picture (when there is one) + name/email. */
export function accountChip(who, suffix = "") {
  const label = (who ? `${who.name}${who.email && who.email !== who.name ? ` (${who.email})` : ""}` : t("Connected to Google Drive")) + suffix;
  return el("span", { style: { display: "inline-flex", alignItems: "center", gap: "8px" } }, [
    who?.picture ? el("img", { src: who.picture, alt: "", referrerpolicy: "no-referrer", width: 24, height: 24,
      style: { width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", flex: "none" } }) : null,
    el("span", { text: label }),
  ]);
}
