// Lamplight Courier — every sound, synthesized with WebAudio. No audio
// files: footsteps, the alarm sting, pickups and jingles are all oscillators
// and filtered noise, so the game loads nothing over the network.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuffer = null;
    this.ambient = null;
  }

  /** Create the context on the first user gesture (browsers demand it). */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    const length = Math.floor(this.ctx.sampleRate * 0.5);
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    this.startAmbient();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.9;
  }

  /** A soft wind loop under everything, barely there. */
  startAmbient() {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.035;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    this.ambient = source;
  }

  /** A short filtered noise burst. pan -1..1, volume 0..1, low for a soft step. */
  thud(pan, volume, low) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = low ? 0.6 : 1.1;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = low ? 240 : 520;
    filter.Q.value = 1.2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(filter).connect(gain).connect(panner).connect(this.master);
    source.start(t, Math.random() * 0.3, 0.12);
  }

  /** The player's own step: quiet, centred. */
  playerStep(running) {
    this.thud(0, running ? 0.16 : 0.09, false);
  }

  /** A guard's step, panned by where the guard is and louder up close. */
  guardStep(pan, volume) {
    this.thud(pan, volume, true);
  }

  /** One oscillator note with a quick decay. */
  note(freq, seconds, type, volume, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  pickup() {
    this.note(880, 0.12, 'sine', 0.22);
    this.note(1318, 0.16, 'sine', 0.18, 0.07);
  }

  alert() {
    this.note(233, 0.16, 'square', 0.16);
    this.note(311, 0.22, 'square', 0.16, 0.13);
  }

  caught() {
    this.note(196, 0.5, 'sawtooth', 0.2);
    this.note(131, 0.7, 'sawtooth', 0.2, 0.18);
  }

  levelClear() {
    this.note(523, 0.14, 'sine', 0.2);
    this.note(659, 0.14, 'sine', 0.2, 0.11);
    this.note(784, 0.26, 'sine', 0.22, 0.22);
  }

  win() {
    [523, 659, 784, 1047].forEach((freq, i) => this.note(freq, 0.3, 'sine', 0.2, i * 0.12));
  }
}
