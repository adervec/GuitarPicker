// Unified song catalog over built-in + user songs.
import { builtinSongs, getBuiltin } from "./songs.js";
import { Store } from "../state.js";
import { ensureMetadata } from "./song-format.js";

export function allSongs() {
  return [...builtinSongs(), ...Store.allUserSongs()].map(ensureMetadata);
}

export function findSong(id) {
  const s = getBuiltin(id) || Store.getSong(id) || null;
  return s ? ensureMetadata(s) : null;
}

export function isBuiltin(id) { return !!getBuiltin(id); }
