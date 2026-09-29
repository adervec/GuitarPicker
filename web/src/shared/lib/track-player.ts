// Backing-track + vocal-track playback with independent gains. Ported from
// the vanilla app's src/audio/player.js — one behavioural change: `load()`
// takes the initial volumes as parameters instead of reading a global
// settings singleton, so this stays decoupled from any particular store.
import { audioEngine } from "./audio-engine";
import type { Song } from "@/entities/song/model/song-format";

// `preservesPitch` has vendor-prefixed cousins on older Firefox/Safari that
// aren't in lib.dom.d.ts.
interface PitchPreservingAudio extends HTMLAudioElement {
  mozPreservesPitch?: boolean;
  webkitPreservesPitch?: boolean;
}

export class TrackPlayer {
  backing: PitchPreservingAudio | null = null;
  vocal: PitchPreservingAudio | null = null;
  private _gainB: GainNode | null = null;
  private _gainV: GainNode | null = null;
  private _speed = 1;

  private _make(dataUrl: string | null, volume: number): { audioEl: PitchPreservingAudio; gain: GainNode } | null {
    if (!dataUrl) return null;
    const audioEl = new window.Audio() as PitchPreservingAudio;
    audioEl.src = dataUrl;
    audioEl.crossOrigin = "anonymous";
    applySpeed(audioEl, this._speed);
    audioEngine.applySink(audioEl);
    const ctx = audioEngine.ctx();
    const src = ctx.createMediaElementSource(audioEl);
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain); gain.connect(ctx.destination);
    return { audioEl, gain };
  }

  load(song: Song, backingVolume = 0.6, vocalVolume = 0.7): void {
    this.stop();
    const a = song.audio || {};
    if (a.backing) { const r = this._make(a.backing, backingVolume); if (r) { this.backing = r.audioEl; this._gainB = r.gain; } }
    if (a.vocal)   { const r = this._make(a.vocal, vocalVolume);   if (r) { this.vocal = r.audioEl;   this._gainV = r.gain; } }
  }

  setBackingVolume(v: number): void { if (this._gainB) this._gainB.gain.value = v; }
  setVocalVolume(v: number): void { if (this._gainV) this._gainV.gain.value = v; }

  /** Practice tempo: 1 = normal, <1 slows the track down. Pitch stays put
   *  (`preservesPitch`) so a slowed-down song still sounds in the right key. */
  setSpeed(rate: number): void {
    this._speed = rate;
    for (const el of [this.backing, this.vocal]) if (el) applySpeed(el, rate);
  }

  async play(fromSec = 0): Promise<void> {
    await audioEngine.resume();
    for (const el of [this.backing, this.vocal]) {
      if (el) { try { el.currentTime = fromSec; await el.play(); } catch (e) { console.warn("play blocked", e); } }
    }
  }
  pause(): void { for (const el of [this.backing, this.vocal]) el && el.pause(); }
  seek(sec: number): void { for (const el of [this.backing, this.vocal]) el && (el.currentTime = sec); }
  stop(): void {
    for (const el of [this.backing, this.vocal]) { if (el) { el.pause(); el.src = ""; } }
    this.backing = this.vocal = null;
    this._gainB = this._gainV = null;
  }
  hasAudio(): boolean { return !!(this.backing || this.vocal); }
}

function applySpeed(audioEl: PitchPreservingAudio, rate: number): void {
  audioEl.playbackRate = rate;
  audioEl.preservesPitch = true;
  audioEl.mozPreservesPitch = true;
  audioEl.webkitPreservesPitch = true;
}
