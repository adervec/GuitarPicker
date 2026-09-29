// Song catalog. Ported (trimmed — no user/imported songs, since the Song
// Editor/Library aren't part of this pilot) from the vanilla app's
// src/music/catalog.js.
import { builtinSongs, getBuiltin } from "./songs-data";
import { ensureMetadata, type Song } from "./song-format";

export function allSongs(): Song[] {
  return builtinSongs().map(ensureMetadata);
}

export function findSong(id: string): Song | null {
  const s = getBuiltin(id) || null;
  return s ? ensureMetadata(s) : null;
}
