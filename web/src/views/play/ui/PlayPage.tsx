"use client";

// FSD "pages" (views/) layer: owns the route's lifecycle and mounts the
// imperative Play engine into a ref, the same way you'd mount a Three.js
// scene or a Phaser game — React just owns when it exists.
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { findSong } from "@/entities/song/model/catalog";
import { getUserSong, subscribeUserSongs, saveUserSong, cloneSongAsDraft } from "@/entities/song/model/user-songs";
import { createPlayEngine } from "@/features/play-song/model/createPlayEngine";
import { createPerformanceEngine } from "@/features/play-song/model/createPerformanceEngine";
import { pickPart } from "@/entities/song/model/song-format";
import { INSTRUMENTS, type InstrumentDef } from "@/entities/instrument/model/data";
import { getSettings, setSetting, addHistory } from "@/shared/lib/player-settings";
import styles from "./PlayPage.module.css";

export function PlayPage({ songId }: { songId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // Built-in songs resolve synchronously (pure data, SSR-safe); Editor-made
  // songs live in localStorage, so they're only resolved client-side, via
  // useSyncExternalStore, same hydration-safety reasoning as Settings/History.
  const builtinSong = findSong(songId);
  const userSong = useSyncExternalStore(subscribeUserSongs, () => getUserSong(songId), () => null);
  const song = builtinSong || userSong;
  const isBuiltin = !!builtinSong;

  useEffect(() => {
    const container = containerRef.current;
    if (!song || !container) return undefined;
    const settings = getSettings();
    const host = {
      song, settings, setSetting, addHistory,
      onBack: () => router.push("/library"),
      // Built-ins are read-only data — "Edit" opens an independent draft
      // copy instead, so it can never overwrite the track being played.
      // An already-editable user song (Editor/Training/Listen & Make-made)
      // just opens directly, same id, normal edit-in-place.
      onEdit: () => {
        if (isBuiltin) {
          const draft = cloneSongAsDraft(song);
          saveUserSong(draft);
          router.push(`/editor/${draft.id}`);
        } else {
          router.push(`/editor/${song.id}`);
        }
      },
    };
    // Performance Mode's whole model is string+fret — fall back to the
    // classic engine for non-fretted instruments (piano/voice/wind/bowed/
    // percussion) regardless of the setting, same "tabAvailable" gating
    // the Song Editor's Piano roll/Guitar tab toggle already uses.
    const { lead } = pickPart(song, settings.instrument);
    const tabStrings = (INSTRUMENTS as Record<string, InstrumentDef>)[lead.instrument]?.strings ?? [];
    const useNew = settings.playerVersion !== "classic" && tabStrings.length > 0;
    const cleanup = (useNew ? createPerformanceEngine : createPlayEngine)(container, host);
    return () => {
      cleanup();
      container.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-mount only when the song id actually changes
  }, [songId]);

  if (!song) {
    return (
      <div className={styles.notFound}>
        <h2>Song not found</h2>
        <button className="btn" onClick={() => router.push("/library")}>Back to songs</button>
      </div>
    );
  }

  return <div ref={containerRef} className={styles.mount} />;
}
