"use client";

// Minimal song picker — just enough for Play's "← Songs" to land somewhere
// real. The vanilla app's Library (import/export/transpose/capo suggestions,
// genre filters) isn't ported; this is only a list + links into /play/[id]
// (and, for songs with lyrics, /karaoke/[id]) — plus, since the Song Editor
// exists now, a "Your songs" section for what it's saved (edit/delete),
// above the read-only built-in catalog.
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { allSongs } from "@/entities/song/model/catalog";
import { getUserSongs, subscribeUserSongs, deleteUserSong } from "@/entities/song/model/user-songs";
import type { Song } from "@/entities/song/model/song-format";
import { toast } from "@/shared/lib/dom";
import styles from "./LibraryPage.module.css";

const EMPTY_SONGS: Song[] = [];
const noSubscribe = () => () => {};
function useUserSongs() {
  return useSyncExternalStore(noSubscribe, getUserSongs, () => EMPTY_SONGS);
}

export function LibraryPage() {
  const songs = allSongs();
  const userSongs = useUserSongs();

  function handleDelete(s: Song) {
    if (!confirm(`Delete "${s.title}"? This can't be undone.`)) return;
    deleteUserSong(s.id!);
    toast(`Deleted "${s.title}"`, "good");
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🎵 Songs</h1>
          <p className={styles.subtitle}>
            {songs.length} built-in, public-domain songs — ported from the vanilla app&apos;s library.
          </p>
        </div>
        <Link href="/editor" className="btn primary">✎ New song</Link>
      </div>

      {userSongs.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Your songs</h2>
          <div className={styles.grid}>
            {userSongs.map((s) => (
              <div key={s.id} className={styles.card}>
                <Link href={`/play/${s.id}`} className={styles.cardMain}>
                  <div className={styles.cardTitle}>{s.title}</div>
                  <div className={styles.cardSub}>{s.artist} · key {s.key} · {s.bpm} BPM</div>
                  <div className={styles.tags}>
                    <span className={styles.tag}>{s.difficulty}</span>
                    {s.genre ? <span className={styles.tag}>{s.genre}</span> : null}
                  </div>
                </Link>
                <div className={styles.ownerRow}>
                  <Link href={`/editor/${s.id}`} className={styles.ownerLink}>✎ Edit</Link>
                  <button className={styles.ownerDelete} onClick={() => handleDelete(s)}>✕ Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className={styles.sectionTitle}>Library</h2>
      <div className={styles.grid}>
        {songs.map((s) => (
          // A <div>, not a <Link>, so the optional Karaoke link below doesn't
          // nest one <a> inside another — Play stays the card's main click target.
          <div key={s.id} className={styles.card}>
            <Link href={`/play/${s.id}`} className={styles.cardMain}>
              <div className={styles.cardTitle}>{s.title}</div>
              <div className={styles.cardSub}>{s.artist} · key {s.key} · {s.bpm} BPM</div>
              <div className={styles.tags}>
                <span className={styles.tag}>{s.difficulty}</span>
                {s.genre ? <span className={styles.tag}>{s.genre}</span> : null}
              </div>
            </Link>
            {s.lyrics?.length ? (
              <Link href={`/karaoke/${s.id}`} className={styles.karaokeLink}>🎤 Karaoke</Link>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
