// Folder cowork through the maker's shared engine (https://adervec.github.io/cowork.js, fs mode).
// One panel for the whole app session, so schedules keep running while you play and a finished
// run can send itself for review. It sits hidden until the Progress view shows it.
//
// Channels:
//   coach            — the practice report out, coaching advice back (shown on Progress).
//   practice-review  — house standard 18: the runs finished since the last review, with their
//                      per-note detail and the app's own score; an AI grade comes back and is stored
//                      BESIDE the app's score on each session (never replacing it).
import { Store } from "./state.js";
import { localDay } from "./day.js";
import { buildProgressReport } from "./views/history.js";

const COACH_KEY = "gp-coach-reply";
const MAX_REVIEW = 10;   // runs per review request

// ---------- coach ----------
export function coachReplyText(reply) {
  return typeof reply === "string" ? reply : (reply?.reply ?? reply?.payload?.reply ?? JSON.stringify(reply, null, 2));
}
let showCoach = () => {};
export function onCoachReply(fn) { showCoach = fn || (() => {}); }
/** The coach channel: preview the advice, show it, undo back to the previous advice. */
export function coachChannel(storage, show) {
  const read = () => { try { return storage.getItem(COACH_KEY) || ""; } catch { return ""; } };
  const write = (text) => { try { storage.setItem(COACH_KEY, text); } catch { /* quota / private mode */ } show(text); };
  return {
    label: "Practice coach",
    preview: (reply) => [{ id: "reply", label: "Show this advice (replaces the current one)", detail: coachReplyText(reply).slice(0, 400) }],
    apply: (reply) => { const prev = read(); write(coachReplyText(reply)); return { summary: "new advice shown", undo: { prev } }; },
    undo: (data) => write(data?.prev || ""),
  };
}
/** BRIEF.md for agents: where practice stands, without being asked. */
export function coachBrief(hist) {
  const recent = hist.slice(0, 20);
  const avg = recent.length ? Math.round(recent.reduce((a, h) => a + (h.accuracy || 0), 0) / recent.length) : 0;
  const songs = [...new Set(recent.map((h) => h.songTitle).filter(Boolean))].slice(0, 5);
  const unreviewed = sessionsToReview(hist).length;
  return {
    markdown: `# GuitarPicker brief\n\n${hist.length} sessions logged. Last ${recent.length}: ${avg}% average accuracy.` +
      `${unreviewed ? ` ${unreviewed} run(s) waiting for an AI practice review (practice-review/).` : ""}\n\n` +
      `## Recently played\n\n${songs.map((s) => `- ${s}`).join("\n") || "- (nothing yet)"}\n`,
    data: { app: "guitarpicker", generatedAt: new Date().toISOString(), sessions: hist.length, recentAccuracy: avg, recentSongs: songs, unreviewed },
  };
}

// ---------- practice review (standard 18) ----------
/** Runs finished since the newest AI-reviewed one, newest first, at most MAX_REVIEW. */
export function sessionsToReview(hist) {
  const lastReviewed = hist.reduce((m, h) => (h.aiReview ? Math.max(m, h.ts) : m), 0);
  return hist.filter((h) => h.ts > lastReviewed && !h.aiReview).slice(0, MAX_REVIEW);
}
export function practiceReviewRequest(hist) {
  const sessions = sessionsToReview(hist).map((h) => ({
    sessionId: String(h.ts), when: new Date(h.ts).toISOString(), day: localDay(h.ts),
    song: h.songTitle || h.songId, songId: h.songId, instrument: h.instrument, durationSec: h.durationSec,
    // the app's own grading, so the review can agree or explain where it disagrees
    appScore: { score: h.score, accuracy: h.accuracy, grade: h.grade || null, passed: h.passed, maxStreak: h.maxStreak, notes: h.notes },
    judgments: h.judgments || null, trouble: h.trouble || [],
  }));
  const recent = hist.slice(0, 30).map((h) => ({ day: localDay(h.ts), song: h.songTitle || h.songId, instrument: h.instrument, accuracy: h.accuracy, passed: h.passed }));
  const payload = { sessions, recent };
  return { protocol: "guitarpicker-practice-review", protocolVersion: 1, kind: "practice-review-request",
    generatedAt: new Date().toISOString(), requestHash: djb2(JSON.stringify(payload)), payload };
}
const str = (v, n) => String(v ?? "").slice(0, n);
const list = (v) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => str(x, 300)).slice(0, 6);
/** The practice-review channel: one row per session, applying stores the AI review beside the app's score. */
export function reviewChannel(store = Store) {
  const byId = (id) => store.historyFor().find((h) => String(h.ts) === String(id));
  const reviews = (reply) => (Array.isArray(reply?.reviews) ? reply.reviews : []).filter((r) => r && byId(r.sessionId));
  return {
    label: "Practice review (AI)",
    schedule: "daily",
    preview: (reply) => reviews(reply).map((r) => {
      const h = byId(r.sessionId);
      return { id: String(r.sessionId), label: `${h.songTitle || h.songId}, ${localDay(h.ts)}: AI grade ${str(r.grade, 8)} (app: ${h.accuracy}%${h.grade ? ", " + h.grade : ""})`,
        detail: str(r.summary, 400) };
    }),
    apply: (reply, accepted) => {
      const ok = accepted ? new Set(accepted.map(String)) : null;
      const done = [];
      for (const r of reviews(reply)) {
        if (ok && !ok.has(String(r.sessionId))) continue;
        const h = byId(r.sessionId);
        const prev = h.aiReview || null;
        store.setAiReview(h.ts, { grade: str(r.grade, 8), summary: str(r.summary, 1200), strengths: list(r.strengths),
          fixes: list(r.fixes), next: str(r.next, 600), at: Date.now() });
        done.push({ ts: h.ts, prev });
      }
      return { summary: `${done.length} practice review(s) added`, undo: { done } };
    },
    undo: (data) => { for (const d of data?.done || []) store.setAiReview(d.ts, d.prev); },
  };
}

const COACH_INSTRUCTIONS = `# GuitarPicker — coach channel

Read \`coach/request.json\`: \`payload.report\` is the player's practice report (Markdown:
sessions, accuracy, per-song bests, streaks). Write \`coach/reply.json\`:

\`\`\`json
{ "requestHash": "<copy the request's requestHash verbatim>",
  "reply": "<coaching in markdown — what's improving, what to drill next (name songs / drills / instruments from the report), one concrete plan for the week. Encouraging, specific, short.>" }
\`\`\`
`;
export const REVIEW_INSTRUCTIONS = `# GuitarPicker — practice-review channel

Grade each finished run in \`practice-review/request.json\` → \`payload.sessions\` more deeply than
the app can. Each session has the app's own grading in \`appScore\` (accuracy = pitch-detection
grading of real playing; grade S/A/B/C/D/F), \`judgments\` (one letter per note in order:
p = perfect, g = good, o = off pitch, m = missed; null for older runs), and \`trouble\` (the notes
that went wrong most). \`payload.recent\` is the last 30 runs, for trend.

Rubric: grade A–F, judged on
1. **Accuracy**: how many notes landed (p+g) and how close (p vs g).
2. **Consistency**: where in the run mistakes cluster (read \`judgments\` as a timeline: a weak
   start, a falling-apart ending, one hard passage, or scattered slips).
3. **Trouble spots**: the notes in \`trouble\`; say what they suggest (a string change, a stretch,
   a register).
4. **Trend**: better or worse than this song's / instrument's recent runs.
Be specific and encouraging; never invent notes or songs that aren't in the request.

If you cannot do the job, write \`practice-review/error.json\` with \`{ "requestHash", "error" }\`.
Otherwise write \`practice-review/reply.json\`:

\`\`\`json
{ "requestHash": "<copy the request's requestHash verbatim>",
  "reviews": [ { "sessionId": "<from the request>", "grade": "B+",
    "summary": "<two or three sentences>",
    "strengths": ["…"], "fixes": ["…"], "next": "<one concrete thing to practise next>" } ] }
\`\`\`
One review per session in the request; skip none.
`;

const manifest = { protocol: "cowork-manifest", protocolVersion: 1, app: "guitarpicker", channels: [
  { name: "coach", request: ["coach/request.json"], instructions: "coach/INSTRUCTIONS.md", replyPath: "coach/reply.json" },
  { name: "practice-review", request: ["practice-review/request.json"], instructions: "practice-review/INSTRUCTIONS.md", replyPath: "practice-review/reply.json" },
] };

function config() {
  const storage = globalThis.localStorage;
  return {
    app: "guitarpicker", manifest,
    files: (ch) => {
      const hist = Store.historyFor();
      if (ch === "practice-review") return { "practice-review/request.json": practiceReviewRequest(hist), "practice-review/INSTRUCTIONS.md": REVIEW_INSTRUCTIONS };
      const payload = { report: buildProgressReport(hist) };
      return {
        "coach/request.json": { protocol: "guitarpicker-coach", protocolVersion: 1, kind: "coach-request",
          generatedAt: new Date().toISOString(), requestHash: djb2(JSON.stringify(payload)), payload },
        "coach/INSTRUCTIONS.md": COACH_INSTRUCTIONS,
      };
    },
    apply: (ch, reply) => (ch === "practice-review" ? reviewChannel() : coachChannel(storage, (t) => showCoach(t))).apply(reply),   // pre-v2 engines
    // cowork v2: review before applying (default on), undo from the history
    channels: { coach: coachChannel(storage, (t) => showCoach(t)), "practice-review": reviewChannel() },
    brief: () => coachBrief(Store.historyFor()),
  };
}

// ---------- the one panel ----------
let panelP = null, parking = null;
function loadScript() {
  if (window.cowork) return Promise.resolve(window.cowork);
  const head = document.head || document.documentElement;   // the DOM smoke test has no <head>
  if (!head || typeof head.appendChild !== "function") return Promise.resolve(null);
  return new Promise((res) => {
    try {
      const s = document.createElement("script"); s.src = "https://adervec.github.io/cowork.js"; s.async = true;
      s.onload = () => res(window.cowork || null); s.onerror = () => res(null);
      head.appendChild(s);
    } catch { res(null); }
  });
}
function ensurePanel() {
  return (panelP ||= loadScript().then((cw) => {
    if (!cw || !document.body) return null;
    parking = document.createElement("div"); parking.hidden = true; document.body.appendChild(parking);
    return cw.mount(parking, config());
  }));
}
/** Mount the hidden panel at startup, so the folder is reconnected and schedules run before any run ends. */
export const startCowork = () => ensurePanel();
/** Show the cowork panel inside `host` (Progress view); returns a function that parks it again. */
export function showCoworkIn(host) {
  ensurePanel().then((p) => { if (p && host.isConnected) host.appendChild(p); });
  return () => ensurePanel().then((p) => { if (p && parking && p.parentNode !== parking) parking.appendChild(p); });
}
/** A run just ended: write the practice-review request now (does nothing until a folder is connected). */
export async function sendPracticeReview() {
  try { const p = await ensurePanel(); await p?.push?.("practice-review"); } catch { /* cowork is optional */ }
}

function djb2(text) { let h = 5381; for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0; return h.toString(16); }
