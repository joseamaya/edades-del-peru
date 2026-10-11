import { Era } from '../core/types';

/**
 * 100% procedural audio via WebAudio: synthesized SFX and generative
 * music per era. No external files.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  enabled = true;
  musicEnabled = true;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private timers: number[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  private era = 0;
  private lastShot = 0;

  init(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.25;
      this.musicGain.connect(this.master);
      this.noiseBuffer = this.buildNoise();
    } catch {
      this.ctx = null;
    }
  }

  resume(): void {
    this.ctx?.resume();
  }

  private buildNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 1.5;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  setEra(era: Era): void {
    this.era = era;
  }

  private now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // --- SFX ---

  private blip(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.now());
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.now() + dur);
    g.gain.setValueAtTime(vol, this.now());
    g.gain.exponentialRampToValueAtTime(0.0001, this.now() + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start();
    o.stop(this.now() + dur + 0.02);
  }

  private noise(dur: number, vol: number, filterFreq: number, type: BiquadFilterType = 'lowpass'): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, this.now());
    g.gain.exponentialRampToValueAtTime(0.0001, this.now() + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start();
    src.stop(this.now() + dur + 0.02);
  }

  shot(): void {
    const t = this.now();
    if (t - this.lastShot < 0.08) return;
    this.lastShot = t;
    // shot: low noise + crack
    this.noise(0.18, 0.5, 900, 'lowpass');
    this.blip(160, 0.12, 'square', 0.25, 60);
  }

  explosion(size = 1): void {
    this.noise(0.7 * size, 0.8, 300, 'lowpass');
    this.blip(80, 0.4, 'sawtooth', 0.4, 30);
  }

  artillery(): void {
    this.noise(1.1, 0.9, 220, 'lowpass');
    this.blip(90, 0.8, 'sawtooth', 0.35, 25);
  }

  laser(): void {
    this.blip(1200, 0.12, 'sawtooth', 0.2, 200);
    this.noise(0.08, 0.15, 3000, 'highpass');
  }

  hit(): void {
    this.noise(0.1, 0.3, 1400, 'bandpass');
  }

  woodChop(): void {
    this.noise(0.06, 0.35, 700, 'bandpass');
    this.blip(220, 0.05, 'triangle', 0.15, 180);
  }

  mineHit(): void {
    this.blip(500, 0.08, 'square', 0.2, 350);
  }

  build(): void {
    this.noise(0.25, 0.3, 1000, 'bandpass');
    this.blip(300, 0.15, 'triangle', 0.2, 450);
  }

  select(): void {
    this.blip(600, 0.07, 'sine', 0.15, 750);
  }

  order(): void {
    this.blip(480, 0.06, 'sine', 0.12, 420);
  }

  uiClick(): void {
    this.blip(880, 0.04, 'sine', 0.12, 700);
  }

  eraAdvance(): void {
    this.blip(392, 0.4, 'sine', 0.3);
    this.timers.push(setTimeout(() => this.blip(523, 0.4, 'sine', 0.3), 160));
    this.timers.push(setTimeout(() => this.blip(659, 0.5, 'sine', 0.3), 320));
  }

  alarm(): void {
    this.blip(700, 0.2, 'square', 0.25, 700);
    this.timers.push(setTimeout(() => this.blip(520, 0.2, 'square', 0.25, 520), 260));
  }

  convert(): void {
    this.blip(420, 0.5, 'sine', 0.25, 840);
  }

  death(): void {
    this.blip(300, 0.3, 'sawtooth', 0.2, 60);
  }

  // --- Generative music ---

  startMusic(): void {
    if (!this.ctx || !this.musicEnabled) return;
    this.stopMusic();
    this.musicStep = 0;
    this.scheduleMusic();
  }

  private scheduleMusic(): void {
    if (!this.ctx || !this.musicGain || !this.musicEnabled) return;
    const interval = this.musicStep % 8 === 0 ? 1600 : 800;
    this.musicTimer = window.setTimeout(() => {
      this.playMusicNote();
      this.scheduleMusic();
    }, interval);
  }

  /** Harmonic progression per era. */
  private playMusicNote(): void {
    if (!this.ctx || !this.musicGain) return;
    // modes per era
    const scales: Record<number, number[]> = {
      0: [220, 261.63, 293.66, 329.63, 392], // The smallest (classic)
      1: [196, 246.94, 293.66, 369.99, 440],
      2: [174.61, 220, 261.63, 311.13, 392], // martial
      3: [110, 164.81, 220, 261.63, 329.63],
      4: [130.81, 196, 246.94, 293.66, 392],
      5: [98, 146.83, 220, 293.66, 440], // stellar
    };
    const scale = scales[Math.min(this.era, 5)] ?? scales[0];
    const root = scale[this.musicStep % 2 === 0 ? 0 : 1];
    // pulsing low
    const step = this.musicStep;
    const idx = step % scale.length;
    const freq = scale[idx];
    // occasional melodic note
    if (step % 2 === 0) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = step % 8 === 0 ? 'triangle' : 'sine';
      o.frequency.value = freq * 2;
      const now = this.now();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.14, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      o.connect(g);
      g.connect(this.musicGain);
      o.start(now);
      o.stop(now + 1.3);
    }
    // low
    const b = this.ctx.createOscillator();
    const bg = this.ctx.createGain();
    b.type = 'triangle';
    b.frequency.value = root / 2;
    const bn = this.now();
    bg.gain.setValueAtTime(0.0001, bn);
    bg.gain.linearRampToValueAtTime(0.2, bn + 0.04);
    bg.gain.exponentialRampToValueAtTime(0.0001, bn + 1.4);
    b.connect(bg);
    bg.connect(this.musicGain);
    b.start(bn);
    b.stop(bn + 1.5);
    this.musicStep++;
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  dispose(): void {
    this.stopMusic();
    for (const t of this.timers) clearTimeout(t);
    this.timers.length = 0;
    this.ctx?.close();
    this.ctx = null;
  }
}
