// User-created songs from the Song Editor — a trimmed, localStorage-backed
// counterpart to the vanilla app's Store.saveSong()/deleteSong()/songs. Kept
// separate from the built-in catalog (catalog.ts stays pure/SSR-safe) so
// components that only need the built-in list never pay a hydration-safety
// tax; anything that needs user songs too reads through the
// useSyncExternalStore-friendly functions below, same pattern as
// player-settings.ts's history store.
import { ensureMetadata, uid, type Song } from "./song-format";

const KEY = "guitarpicker-web.user-songs.v1";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Same stable-reference-until-write caching as player-settings.ts's
// historyCache — required for useSyncExternalStore to not loop.
let cache: Song[] | null = null;
const listeners = new Set<() => void>();

function write(songs: Song[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(songs)); } catch { /* storage unavailable/full */ }
  cache = songs;
  listeners.forEach((fn) => fn());
}

export function getUserSongs(): Song[] {
  if (cache === null) cache = readJSON<Song[]>(KEY, []);
  return cache;
}

export function subscribeUserSongs(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// getUserSong() is read through useSyncExternalStore (PlayPage, EditSongLoader)
// — its getSnapshot MUST return a referentially-stable value while nothing
// has actually changed, or React throws "Maximum update depth exceeded"
// (error #185): every render calls getSnapshot again, sees a "different"
// value, and re-renders forever. A single-slot memo, keyed on both `id` and
// the source array's own identity (itself already stable-until-write, see
// `cache` above), makes repeated calls for the same id return the exact
// same object until a real write happens — same idea as this file's own
// `cache`, just for the resolved single-song shape `ensureMetadata`
// produces.
let resolvedId: string | null = null;
let resolvedSrc: Song[] | null = null;
let resolvedResult: Song | null = null;

export function getUserSong(id: string): Song | null {
  const songs = getUserSongs();
  if (resolvedId === id && resolvedSrc === songs) return resolvedResult;
  const s = songs.find((x) => x.id === id);
  resolvedId = id;
  resolvedSrc = songs;
  resolvedResult = s ? ensureMetadata({ ...s }) : null;
  return resolvedResult;
}

/** Upserts by id — replaces an existing user song with the same id, else appends. */
export function saveUserSong(song: Song): void {
  const songs = getUserSongs().filter((s) => s.id !== song.id);
  write([...songs, song]);
}

export function deleteUserSong(id: string): void {
  write(getUserSongs().filter((s) => s.id !== id));
}

/** Clones any song (a read-only built-in, or an existing user song) into a
 *  brand-new, independently editable copy — a fresh id, so saving changes
 *  can never overwrite the original, plus a "(draft)" suffix on the title
 *  so it's obvious at a glance in Library/History that this isn't the
 *  original track. Requested for the Player's "Edit" button (change a
 *  couple of notes, or set/adjust finger assignments, without touching the
 *  track you were actually playing). A real deep clone (`JSON.parse(
 *  JSON.stringify(...))`, same as `serialize()`'s own round-trip — a Song
 *  is plain JSON data throughout this pilot) rather than a shallow
 *  `{...song}`: a shallow copy still shares nested objects/arrays
 *  (`notes`, `lyrics`, `background.value`, …) with whatever `song` came
 *  from, which for a built-in is a module-level singleton shared by every
 *  request this server process ever handles — editing the draft could
 *  otherwise corrupt the built-in catalog itself if anything ever mutates
 *  one of those nested values in place. Pure — doesn't save it; the caller
 *  decides when, then navigates to /editor/[id] with the new id. */
export function cloneSongAsDraft(song: Song): Song {
  const clone = JSON.parse(JSON.stringify(song)) as Song;
  clone.id = uid();
  if (!/\(draft\)\s*$/i.test(clone.title)) clone.title = `${clone.title} (draft)`;
  return ensureMetadata(clone);
}
