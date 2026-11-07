import { el, pageHead, stat, tag, progressBar, getVar, toast, select, clear } from "../ui/components.js";
import { Store } from "../state.js";
import { allSongs } from "../music/catalog.js";
import { INSTRUMENTS, instrumentOptions } from "../music/notes.js";
import { fmtTime } from "../ui/components.js";
import { dailyActivities, todayKey, streakStatus } from "../music/daily.js";
import { composeAvatar, composeGuitar, avatarLoadout, guitarLoadout } from "../cosmetics/index.js";
import { Synth } from "../audio/synth.js";

export default function home(ctx) {
  const { el: root, navigate } = ctx;
  const hist = Store.historyFor();
  const songs = allSongs();
  const inst = Store.settings().instrument;
  const prog = Store.progressFor(inst);
  const level = Math.floor(Math.sqrt(prog.xp || 0) / 3) + 1;
  const nextLevelXp = Math.pow((level) * 3, 2);
  const prevLevelXp = Math.pow((level - 1) * 3, 2);
  const levelFrac = (prog.xp - prevLevelXp) / (nextLevelXp - prevLevelXp || 1);

  const totalSessions = hist.length;
  const avgAcc = hist.length ? Math.round(hist.reduce((a, h) => a + h.accuracy, 0) / hist.length) : 0;
  const totalTime = hist.reduce((a, h) => a + (h.durationSec || 0), 0);
  const bestStreak = hist.reduce((a, h) => Math.max(a, h.maxStreak || 0), 0);

  // The tuner only handles instruments with open strings — same test it uses itself.
  const tunable = (INSTRUMENTS[inst]?.strings.length || 0) > 0;
  const fretted = INSTRUMENTS[inst]?.kind === "fretted";

  root.appendChild(pageHead("Welcome back 🎵", "Pick up where you left off, or explore something new."));

  // hero / continue
  const recent = hist[0];
  const recentSong = recent && songs.find((s) => s.id === recent.songId);
  // Switching instrument here (not buried in Settings) is what keeps this page
  // about whatever you actually play; everything below keys off it.
  const instSel = select({
    label: "Current instrument", value: inst,
    options: instrumentOptions(),
    onchange: (v) => { Store.setSetting("instrument", v); clear(root); home(ctx); },
  });
  root.appendChild(el("div.panel", { style: { marginBottom: "16px" } }, [
    el("div.spread", {}, [
      el("div", {}, [
        instSel,
        el("div.muted", { style: { marginTop: "8px" }, text: `Level ${level} · ${prog.xp || 0} XP` }),
        el("div", { style: { maxWidth: "320px", marginTop: "8px" } }, [progressBar(levelFrac)]),
      ]),
      el("div.row", {}, [
        recentSong && el("button.btn.primary.lg", { onclick: () => navigate(`#/play/${recentSong.id}`) },
          [`▶ Continue: ${recentSong.title}`]),
        el("button.btn.lg", { onclick: () => navigate("#/library") }, ["Browse songs"]),
        tunable
          ? el("button.btn.lg", { onclick: () => navigate("#/tuner") }, ["🎚️ Tune up"])
          : el("button.btn.lg", { onclick: () => navigate("#/instruments") }, ["📖 Instrument guide"]),
      ]),
    ]),
  ]));

  // today's recommended practice
  root.appendChild(buildDailyPanel(navigate, inst));
  root.appendChild(buildTimerPanel());

  // your setup (avatar + guitar + app skin)
  root.appendChild(el("div.panel", { style: { marginBottom: "16px" } }, [
    el("div.spread", {}, [
      el("div.row", { style: { alignItems: "center", gap: "18px" } }, [
        el("div", { style: { width: "92px", height: "108px", flex: "none" }, html: composeAvatar(avatarLoadout(), getVar("--accent")) }),
        // The only instrument art the Locker has is a guitar, so don't show it to
        // a drummer and call it "your instrument".
        fretted ? el("div", { style: { width: "66px", height: "150px", flex: "none" }, html: composeGuitar(guitarLoadout(), getVar("--accent")) }) : null,
        el("div", {}, [
          el("h3", { text: "Your setup" }),
          el("div.muted", { text: fretted
            ? "Personalise your avatar, your guitar, and the app skin."
            : "Personalise your avatar and the app skin." }),
        ]),
      ]),
      el("button.btn.primary", { onclick: () => navigate("#/locker") }, ["🎨 Customize"]),
    ]),
  ]));

  // stats
  root.appendChild(el("div.grid.cards", { style: { marginBottom: "16px" } }, [
    stat(totalSessions, "Sessions"),
    stat(avgAcc + "%", "Avg accuracy"),
    stat(fmtTime(totalTime), "Time played"),
    stat(bestStreak, "Best streak"),
  ]));

  // quick start songs — yours first, topped up with the rest so the row is never
  // empty for an instrument with only a song or two.
  root.appendChild(el("h2", { text: "Jump back in" }));
  const forInst = songs.filter((s) => (s.instrument || "acoustic-guitar") === inst);
  const featured = [...forInst, ...songs.filter((s) => !forInst.includes(s))].slice(0, 6);
  root.appendChild(el("div.grid.cards", {}, featured.map((s) =>
    el("div.card", { onclick: () => navigate(`#/play/${s.id}`) }, [
      el("div.title", { text: s.title }),
      el("div.sub", { text: `${s.artist} · ${INSTRUMENTS[s.instrument]?.name || s.instrument}` }),
      el("div.row", { style: { gap: "6px", flexWrap: "wrap" } }, [tag(s.difficulty, s.difficulty), s.genre ? tag(s.genre) : null]),
    ])
  )));

  // tips
  root.appendChild(el("div.panel", { style: { marginTop: "16px" } }, [
    el("h3", { text: "Getting set up" }),
    el("ul.muted", {}, [
      el("li", { html: "Open <b>Settings</b> to pick your microphone & output device, and choose a theme." }),
      el("li", { html: tunable
        ? "Use the <b>Tuner</b> before playing — it tells you when a string is out of tune."
        : "New to this one? The <b>Instruments</b> guide covers how to hold it, first notes, and care." }),
      el("li", { html: "Build a character and pick an app skin in the <b>Locker</b>." }),
    ]),
  ]));
}

// Workout-style practice timer: a routine of timed blocks, a chime between
// them, and today's practice minutes kept in settings.practiceLog[YYYY-MM-DD].
// ponytail: one fixed routine; make the blocks editable if anyone asks.
const ROUTINE = [
  { name: "Warm-up", min: 5 }, { name: "Technique / drills", min: 10 },
  { name: "Songs", min: 10 }, { name: "Free play", min: 5 },
];
function buildTimerPanel() {
  const today = todayKey();
  const logged = () => Math.round((Store.settings().practiceLog || {})[today] || 0);
  const status = el("div", { style: { fontSize: "18px", fontWeight: "700" } });
  const sub = el("div.muted", { style: { fontSize: "12px" } });
  const btn = el("button.btn.primary", { onclick: toggle }, ["▶ Start routine"]);
  let timer = null, block = 0, left = 0, lock = null, lastTick = 0;

  function paint() {
    status.textContent = timer ? `${ROUTINE[block].name} — ${fmtTime(left)}` : `${ROUTINE.map((b) => `${b.name} ${b.min}′`).join(" · ")}`;
    sub.textContent = `Practiced today: ${Math.round(logged() + pending / 60)} min` + (timer ? ` · block ${block + 1} of ${ROUTINE.length}` : "");
  }
  let pending = 0;   // seconds not yet saved — persisting rewrites all state, so batch it
  function flush() {
    if (pending < 1) return;
    const pl = { ...(Store.settings().practiceLog || {}) }; pl[today] = (pl[today] || 0) + pending / 60;
    pending = 0; Store.setSetting("practiceLog", pl);
  }
  function stop(msg) {
    clearInterval(timer); timer = null; lock?.release?.(); lock = null; flush();
    btn.textContent = "▶ Start routine"; if (msg) toast(msg, "good"); paint();
  }
  async function toggle() {
    if (timer) return stop();
    block = 0; left = ROUTINE[0].min * 60; lastTick = Date.now();
    try { lock = await navigator.wakeLock?.request("screen"); } catch { /* no wake lock — fine */ }
    btn.textContent = "■ Stop";
    timer = setInterval(() => {
      if (!btn.isConnected) return stop();          // left the page
      const now = Date.now(), dt = (now - lastTick) / 1000; lastTick = now;
      left -= dt; pending += dt;
      if (pending >= 30) flush();
      if (left <= 0) {
        Synth.click({ accent: true });
        if (++block >= ROUTINE.length) return stop("Routine complete 💪");
        left = ROUTINE[block].min * 60; toast(`Next: ${ROUTINE[block].name}`, "");
      }
      paint();
    }, 1000);
    paint();
  }
  paint();
  return el("div.panel", { style: { marginBottom: "16px" } }, [
    el("div.spread", {}, [
      el("div", {}, [el("h2", { text: "⏱️ Practice timer", style: { margin: "0 0 4px" } }), status, sub]), btn,
    ]),
  ]);
}

// Date-seeded daily practice checklist with per-day completion tracking.
// Each activity pays a few coins the first time it's checked off today, with a
// bonus when the whole list is finished. `reward` records what's been paid so
// re-checking can't farm coins.
const DAILY_COIN = 12, DAILY_BONUS = 40;
function buildDailyPanel(navigate, instrument) {
  const today = todayKey();
  const acts = dailyActivities(today, instrument, Store.historyFor());
  const saved = Store.settings().daily;
  const fresh = saved && saved.date === today;
  const done = new Set(fresh ? (saved.done || []) : []);
  const rewarded = new Set(fresh ? (saved.rewarded || []) : []);
  let bonusPaid = !!(fresh && saved.bonusPaid);

  const counter = el("span.muted");
  const bar = progressBar(0);
  const list = el("div.col", { style: { gap: "10px", marginTop: "12px" } });
  const streakChip = el("span.streak-chip");

  function paintStreak() {
    const ss = streakStatus(Store.settings().streak, today);
    streakChip.innerHTML = ss.count > 0
      ? `🔥 <b>${ss.count}</b>-day streak${ss.best > ss.count ? ` · best ${ss.best}` : ""}`
      : "🔥 Start your streak today!";
    streakChip.title = ss.practicedToday
      ? "Practiced today — streak secured! Come back tomorrow to extend it."
      : "Play a song today — even a failed run counts — to keep your streak alive. Ticking activities doesn't.";
    streakChip.classList.toggle("cold", ss.count === 0);
  }

  function persist() { Store.setSetting("daily", { date: today, done: [...done], rewarded: [...rewarded], bonusPaid }); }
  function refresh() {
    // Count only today's actual activities: switching instrument can drop "Tune up"
    // from the list while it's still ticked in storage, which would read "5 / 4".
    const n = acts.filter((a) => done.has(a.id)).length;
    counter.textContent = `${n} / ${acts.length} done`;
    if (bar.firstChild) bar.firstChild.style.width = (acts.length ? n / acts.length : 0) * 100 + "%";
    paintStreak();
  }
  function toggle(a, paint) {
    if (done.has(a.id)) { done.delete(a.id); }
    else {
      done.add(a.id);
      // NB: ticking an activity gives coins but does NOT touch the streak — only
      // actually playing a song does (Store.addHistory). Keeps it un-gameable.
      if (!rewarded.has(a.id)) { rewarded.add(a.id); Store.addCoins(DAILY_COIN); toast(`+${DAILY_COIN} 🪙 — ${a.title}`, "good"); }
      if (acts.every((x) => done.has(x.id)) && !bonusPaid) { bonusPaid = true; Store.addCoins(DAILY_BONUS); toast(`Daily complete! +${DAILY_BONUS} 🪙 bonus`, "good"); }
    }
    persist(); paint(); refresh();
  }

  for (const a of acts) {
    const check = el("button.btn");
    const paint = () => { check.textContent = done.has(a.id) ? "✓ Done" : `Mark done +${DAILY_COIN}🪙`; check.classList.toggle("primary", done.has(a.id)); };
    check.addEventListener("click", () => toggle(a, paint));
    paint();
    list.appendChild(el("div.row", { style: { alignItems: "center", gap: "12px" } }, [
      el("div", { style: { flex: "1", minWidth: "180px" } }, [
        el("div", { html: `${a.icon} <b>${a.title}</b>` }),
        el("div.muted", { style: { fontSize: "12px" }, text: a.desc }),
      ]),
      el("button.btn.primary", { onclick: () => navigate(a.hash) }, ["Go"]),
      check,
    ]));
  }
  refresh();

  return el("div.panel", { style: { marginBottom: "16px" } }, [
    el("div.spread", {}, [
      el("div.row", { style: { alignItems: "center", gap: "10px" } }, [
        el("h2", { text: "🗓️ Today's Practice", style: { margin: "0" } }), streakChip,
      ]),
      el("span.muted", {}, [counter, el("span", { html: ` · complete all for +${DAILY_BONUS} 🪙` })]),
    ]),
    bar, list,
  ]);
}
