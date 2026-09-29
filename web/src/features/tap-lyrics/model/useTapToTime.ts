"use client";

// Tap-to-time: play along (the backing track, if the song has one) and tap
// (or press Space) on each word as you sing/say it, capturing word-level
// karaoke timing. Ported from the vanilla app's views/editor.js's tap-to-time
// half. State that `stamp()` needs read-fresh every call (the word queue,
// the in-progress draft lyrics, the current position) lives in refs rather
// than state, since a stale closure over `useState` values inside the
// keydown listener/rAF loop would stamp against outdated data — only the
// values actually rendered (position, elapsed clock, current/next word) are
// mirrored into state.
import { useCallback, useEffect, useRef, useState } from "react";
import { TrackPlayer } from "@/shared/lib/track-player";
import type { Song, LyricLine } from "@/entities/song/model/song-format";

export interface TapWord {
  text: string;
  lineIndex: number;
  first: boolean;
}

export function useTapToTime() {
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState(0);
  const [total, setTotal] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [current, setCurrent] = useState<TapWord | null>(null);
  const [next, setNext] = useState<TapWord | null>(null);

  const flatRef = useRef<TapWord[]>([]);
  const draftRef = useRef<LyricLine[]>([]);
  const posRef = useRef(0);
  const playerRef = useRef<TrackPlayer | null>(null);
  const startMsRef = useRef(0);
  const doneRef = useRef<((lyrics: LyricLine[]) => void) | null>(null);

  const tapNow = useCallback((): number => {
    const p = playerRef.current;
    if (p?.backing && !p.backing.paused) return p.backing.currentTime;
    return (performance.now() - startMsRef.current) / 1000;
  }, []);

  const updateDisplay = useCallback(() => {
    setCurrent(flatRef.current[posRef.current] ?? null);
    setNext(flatRef.current[posRef.current + 1] ?? null);
  }, []);

  const stop = useCallback((silent = false) => {
    setActive(false);
    if (playerRef.current) { try { playerRef.current.stop(); } catch { /* already gone */ } playerRef.current = null; }
    if (!silent) doneRef.current?.(draftRef.current);
  }, []);

  const stamp = useCallback(() => {
    const item = flatRef.current[posRef.current];
    if (item) {
      const t = +tapNow().toFixed(3);
      const line = draftRef.current[item.lineIndex];
      const words = [...(line.words || []), { t, text: item.text }];
      draftRef.current = draftRef.current.map((l, i) => i === item.lineIndex
        ? { ...l, words, ...(item.first ? { time: t } : {}) }
        : l);
    }
    posRef.current += 1;
    setPos(posRef.current);
    if (posRef.current >= flatRef.current.length) { stop(); return; }
    updateDisplay();
  }, [tapNow, updateDisplay, stop]);

  useEffect(() => {
    if (!active) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space") { e.preventDefault(); stamp(); }
    }
    window.addEventListener("keydown", onKey);
    let alive = true;
    let raf: number;
    function tick() {
      if (!alive) return;
      setElapsed(tapNow());
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => { alive = false; window.removeEventListener("keydown", onKey); cancelAnimationFrame(raf); };
  }, [active, stamp, tapNow]);

  // stop everything on unmount (leaving the Editor mid-tap)
  useEffect(() => () => stop(true), [stop]);

  function start(song: Song, onDone: (lyrics: LyricLine[]) => void): boolean {
    const lines = song.lyrics || [];
    if (!lines.length) return false;
    const flat: TapWord[] = [];
    lines.forEach((line, lineIndex) => String(line.text || "").trim().split(/\s+/).filter(Boolean)
      .forEach((tok, w) => flat.push({ text: tok, lineIndex, first: w === 0 })));
    if (!flat.length) return false;

    flatRef.current = flat;
    draftRef.current = lines.map((l) => ({ ...l, words: [] }));
    posRef.current = 0;
    doneRef.current = onDone;
    startMsRef.current = performance.now();
    playerRef.current = null;
    if (song.audio.backing) {
      try {
        const player = new TrackPlayer();
        player.load(song);
        player.play(0);
        playerRef.current = player;
      } catch { /* audio optional */ }
    }
    setTotal(flat.length);
    setPos(0);
    setElapsed(0);
    updateDisplay();
    setActive(true);
    return true;
  }

  return { active, pos, total, elapsed, current, next, start, stamp, stop: () => stop(false) };
}
