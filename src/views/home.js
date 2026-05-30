import { el, pageHead, stat, tag, progressBar } from "../ui/components.js";
import { Store } from "../state.js";
import { allSongs } from "../music/catalog.js";
import { INSTRUMENTS } from "../music/notes.js";
import { fmtTime } from "../ui/components.js";

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

  root.appendChild(pageHead("Welcome back 🎸", "Pick up where you left off, or explore something new."));

  // hero / continue
  const recent = hist[0];
  const recentSong = recent && songs.find((s) => s.id === recent.songId);
  root.appendChild(el("div.panel", { style: { marginBottom: "16px" } }, [
    el("div.spread", {}, [
      el("div", {}, [
        el("h2", { text: `Current instrument: ${INSTRUMENTS[inst]?.name || inst}` }),
        el("div.muted", { text: `Level ${level} · ${prog.xp || 0} XP` }),
        el("div", { style: { width: "320px", marginTop: "8px" } }, [progressBar(levelFrac)]),
      ]),
      el("div.row", {}, [
        recentSong && el("button.btn.primary.lg", { onclick: () => navigate(`#/play/${recentSong.id}`) },
          [`▶ Continue: ${recentSong.title}`]),
        el("button.btn.lg", { onclick: () => navigate("#/library") }, ["Browse songs"]),
        el("button.btn.lg", { onclick: () => navigate("#/tuner") }, ["🎚️ Tune up"]),
      ]),
    ]),
  ]));

  // stats
  root.appendChild(el("div.grid.cards", { style: { marginBottom: "16px" } }, [
    stat(totalSessions, "Sessions"),
    stat(avgAcc + "%", "Avg accuracy"),
    stat(fmtTime(totalTime), "Time played"),
    stat(bestStreak, "Best streak"),
  ]));

  // quick start songs
  root.appendChild(el("h2", { text: "Jump back in" }));
  const featured = songs.slice(0, 6);
  root.appendChild(el("div.grid.cards", {}, featured.map((s) =>
    el("div.card", { onclick: () => navigate(`#/play/${s.id}`) }, [
      el("div.title", { text: s.title }),
      el("div.sub", { text: `${s.artist} · ${INSTRUMENTS[s.instrument]?.name || s.instrument}` }),
      el("div", {}, [tag(s.difficulty, s.difficulty)]),
    ])
  )));

  // tips
  root.appendChild(el("div.panel", { style: { marginTop: "16px" } }, [
    el("h3", { text: "Getting set up" }),
    el("ul.muted", {}, [
      el("li", { html: "Open <b>Settings</b> to pick your microphone & output device, and choose a theme." }),
      el("li", { html: "Use the <b>Tuner</b> before playing — GuitarPicker tells you when a string is out of tune." }),
      el("li", { html: "In a song, the <b>healthbar</b> dips on bad notes but you can keep playing to the end." }),
    ]),
  ]));
}
