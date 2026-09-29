"use client";

// Thin wrapper mounting the imperative Karaoke engine into a ref — same
// pattern as views/play/ui/PlayPage.jsx (see its header comment).
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { findSong } from "@/entities/song/model/catalog";
import { getUserSong, subscribeUserSongs } from "@/entities/song/model/user-songs";
import { createKaraokeEngine } from "@/features/karaoke-song/model/createKaraokeEngine";
import { getSettings, setSetting, addHistory } from "@/shared/lib/player-settings";
import styles from "./KaraokePage.module.css";

export function KaraokePage({ songId }: { songId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // See PlayPage's identical split — built-in songs resolve synchronously,
  // Editor-made ones only client-side via useSyncExternalStore.
  const builtinSong = findSong(songId);
  const userSong = useSyncExternalStore(subscribeUserSongs, () => getUserSong(songId), () => null);
  const song = builtinSong || userSong;
  const [noLyrics, setNoLyrics] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!song || !container) return undefined;
    const cleanup = createKaraokeEngine(container, {
      song,
      settings: getSettings(),
      setSetting,
      addHistory,
      onBack: () => router.push("/karaoke"),
    });
    if (!cleanup) { setNoLyrics(true); return undefined; }
    setNoLyrics(false);
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
        <button className="btn" onClick={() => router.push("/karaoke")}>Back to karaoke songs</button>
      </div>
    );
  }

  if (noLyrics) {
    return (
      <div className={styles.notFound}>
        <h2>No lyrics to sing</h2>
        <p>This song has no lyric track.</p>
        <button className="btn" onClick={() => router.push("/karaoke")}>← Karaoke songs</button>
      </div>
    );
  }

  return <div ref={containerRef} className={styles.mount} />;
}
