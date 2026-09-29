// AudioContext + microphone capture, module-singleton (one shared analyser per
// tab, same reasoning as the vanilla app's src/audio/engine.js: several
// features can want mic/pitch at once, so this lives outside React state).
// Deliberately framework-agnostic — features/tune-string wraps it in a hook.

let ctx: AudioContext | null = null;
let micStream: MediaStream | null = null;
let micSource: MediaStreamAudioSourceNode | null = null;
let analyser: AnalyserNode | null = null;
let micDeviceLabel = "";
// The chosen output device, applied to every <audio> element TrackPlayer
// creates (see applySink below) — mirrors the vanilla engine.js, which reads
// this from its settings Store internally rather than taking it as a param
// on every call site. Settings' page sets it (and also persists it to
// player-settings.js); Play/Karaoke's engines re-apply the persisted value
// here on mount, since this module-singleton doesn't survive a full page load.
let outputDeviceId = "";

export interface AudioDevice {
  deviceId: string;
  label: string;
}

// ----- change notifications, for widgets/app-shell's sidebar IO indicator -----
// Mirrors the vanilla engine.js's onChange()/notify() — mic start/stop and
// output-device changes all fire it, same triggers as there.
const changeListeners = new Set<() => void>();
function notify(): void { changeListeners.forEach((fn) => fn()); }

export interface CurrentDevices {
  input: string;
  output: string;
  micLive: boolean;
}

// A cached, stable-reference-until-change snapshot — same reasoning as
// player-settings.ts's historyCache: useSyncExternalStore needs the same
// object back between notifications, or it loops.
let devCache: { inputs: AudioDevice[]; outputs: AudioDevice[] } = { inputs: [], outputs: [] };
export const DEFAULT_CURRENT_DEVICES: CurrentDevices = { input: "", output: "System default", micLive: false };
let currentDevicesSnapshot: CurrentDevices = DEFAULT_CURRENT_DEVICES;

function refreshCurrentDevices(): void {
  const outLabel = devCache.outputs.find((d) => d.deviceId === outputDeviceId)?.label;
  currentDevicesSnapshot = {
    input: micStream ? (micDeviceLabel || "Microphone") : "",
    output: outputDeviceId ? (outLabel || "Selected output") : "System default",
    micLive: !!micStream,
  };
}

export const audioEngine = {
  ctx(): AudioContext {
    if (!ctx) {
      const AudioCtor = window.AudioContext
        || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) throw new Error("Web Audio API not supported");
      ctx = new AudioCtor();
    }
    return ctx;
  },
  async resume(): Promise<AudioContext> {
    const c = this.ctx();
    if (c.state === "suspended") await c.resume();
    return c;
  },
  micLive(): boolean { return !!micStream; },
  micLabel(): string { return micDeviceLabel; },

  /** Subscribe to mic start/stop and output-device changes (sidebar IO indicator). */
  onChange(fn: () => void): () => void {
    changeListeners.add(fn);
    return () => changeListeners.delete(fn);
  },
  /** Stable-reference snapshot for useSyncExternalStore — see the caching note above. */
  currentDevices(): CurrentDevices { return currentDevicesSnapshot; },

  /** Both directions at once, like the vanilla engine.js's listDevices(). */
  async listDevices(): Promise<{ inputs: AudioDevice[]; outputs: AudioDevice[] }> {
    let devices: MediaDeviceInfo[] = [];
    try { devices = await navigator.mediaDevices.enumerateDevices(); }
    catch { /* permission not granted yet — labels stay blank until it is */ }
    const inputs = devices.filter((d) => d.kind === "audioinput")
      .map((d) => ({ deviceId: d.deviceId, label: d.label || "Microphone" }));
    const outputs = devices.filter((d) => d.kind === "audiooutput")
      .map((d) => ({ deviceId: d.deviceId, label: d.label || "Speaker" }));
    devCache = { inputs, outputs };
    refreshCurrentDevices(); notify();
    return { inputs, outputs };
  },

  async startMic(deviceId?: string): Promise<AnalyserNode> {
    await this.resume();
    this.stopMic();
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false, noiseSuppression: false, autoGainControl: false,
      },
    };
    micStream = await navigator.mediaDevices.getUserMedia(constraints);
    const track = micStream.getAudioTracks()[0];
    micDeviceLabel = track ? track.label : "Microphone";
    micSource = this.ctx().createMediaStreamSource(micStream);
    analyser = this.ctx().createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;
    micSource.connect(analyser);
    refreshCurrentDevices(); notify();
    return analyser;
  },

  stopMic(): void {
    if (micStream) micStream.getTracks().forEach((t) => t.stop());
    if (micSource) { try { micSource.disconnect(); } catch { /* already gone */ } }
    micStream = null; micSource = null; analyser = null; micDeviceLabel = "";
    refreshCurrentDevices(); notify();
  },

  /** Read the current time-domain buffer (Float32) for analysis. */
  readTimeDomain(buf: Float32Array<ArrayBuffer>): boolean {
    if (!analyser) return false;
    analyser.getFloatTimeDomainData(buf);
    return true;
  },

  setOutputDevice(id: string): void { outputDeviceId = id; refreshCurrentDevices(); notify(); },

  /** Apply the chosen output device to a media element (<audio>/<video>),
   *  where the browser supports setSinkId (Chrome/Edge). */
  async applySink(mediaEl: HTMLMediaElement): Promise<void> {
    if (outputDeviceId && typeof mediaEl.setSinkId === "function") {
      try { await mediaEl.setSinkId(outputDeviceId); } catch { /* unsupported device/browser */ }
    }
  },
};
