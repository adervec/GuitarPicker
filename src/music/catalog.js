// Unified song catalog over built-in + user songs.
import { builtinSongs, getBuiltin } from "./songs.js";
import { Store } from "../state.js";

export function allSongs() {
  return [...builtinSongs(), ...Store.allUserSongs()];
}

export function findSong(id) {
  return getBuiltin(id) || Store.getSong(id) || null;
}

export function isBuiltin(id) { return !!getBuiltin(id); }
