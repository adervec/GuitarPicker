// Web MIDI note input: a keyboard, e-kit or MIDI guitar gives exact notes with
// no mic noise. Opt-in (Settings), since Chrome asks permission for MIDI.
const held = new Map();   // midi note -> performance.now() it went down
let access = null;

export const Midi = {
  supported: () => typeof navigator !== "undefined" && !!navigator.requestMIDIAccess,
  lastHit: 0,             // performance.now() of the latest note-on (percussion onsets)
  async start() {
    if (access) return true;
    if (!this.supported()) return false;
    access = await navigator.requestMIDIAccess();
    const hook = () => access.inputs.forEach((i) => { i.onmidimessage = (e) => onMessage(e.data); });
    hook(); access.onstatechange = hook;
    return true;
  },
  /** Most recently pressed note still held, or -1. */
  latest() {
    let best = -1, at = -1;
    for (const [m, t] of held) if (t > at) { at = t; best = m; }
    return best;
  },
  held: () => [...held.keys()],
};

/** Raw MIDI bytes in. Exported for the test suite. */
export function onMessage([status, note, vel]) {
  const cmd = status & 0xf0;
  if (cmd === 0x90 && vel > 0) { held.set(note, performance.now()); Midi.lastHit = performance.now(); }
  else if (cmd === 0x80 || cmd === 0x90) held.delete(note);   // note-off, or note-on velocity 0
}
