"use client";

// Resolves an existing user song for /editor/[id] before handing off to
// EditorPage. A separate small component (rather than folding this into
// EditorPage itself) so EditorPage stays a plain, fully-controlled form
// over an already-known Song — the same split PlayPage/KaraokePage use
// between "resolve the song" and "render it".
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { getUserSong, subscribeUserSongs } from "@/entities/song/model/user-songs";
import { EditorPage } from "./EditorPage";
import styles from "./EditorPage.module.css";

export function EditSongLoader({ songId }: { songId: string }) {
  // getServerSnapshot: null — SSR never has localStorage, so a hard refresh
  // on /editor/<id> briefly shows "not found" until the client resolves the
  // real song, same hydration-safety tradeoff as History's initial empty
  // list. Client-side navigation from Library (the normal path) never hits
  // this, since nothing was server-rendered for that transition.
  const song = useSyncExternalStore(subscribeUserSongs, () => getUserSong(songId), () => null);

  if (!song) {
    return (
      <div className={styles.page}>
        <h2>Song not found</h2>
        <p className={styles.muted}>Only songs made in the Editor can be edited — built-in songs aren&apos;t.</p>
        <Link href="/library" className="btn">← Songs</Link>
      </div>
    );
  }

  return <EditorPage initial={song} isEditing />;
}
