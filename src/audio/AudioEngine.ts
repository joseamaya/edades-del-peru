import { Era } from '../core/types';
import {
  DEFAULT_VOLUMES,
  attenuationFor,
  clampVolume,
  musicLayerGains,
  panFor,
  type AmbienceKind,
  type Listener,
  type MusicIntensity,
  type SoundAt,
  type VolumeSettings,
} from './mix';

interface AmbiencePreset {
  filter: BiquadFilterType;
  frequency: number;
  lfoHz: number;
  depth: number;
  level: number;
}

const AMBIENCE_PRESETS: Record<Exclude<AmbienceKind, 'none'>, AmbiencePreset> = {
  coast: { filter: 'lowpass', frequency: 520, lfoHz: 0.14, depth: 0.06, level: 0.16 },
  andes: { filter: 'lowpass', frequency: 380, lfoHz: 0.08, depth: 0.04, level: 0.11 },
  altiplano: { filter: 'bandpass', frequency: 700, lfoHz: 0.05, depth: 0.05, level: 0.12 },
  jungle: { filter: 'bandpass', frequency: 2200, lfoHz: 4.5, depth: 0.05, level: 0.09 },
};

interface SfxMix {
  gain: number;
  pan: number;
}

/**
 * Procedural audio via WebAudio: synthesised SFX, generative music and ambience. No external files.
 * Four buses (master, effects, music, ambience) carry the player's volume settings; world sounds are
 * attenuated and panned from the camera, and the music mixes calm, tension and combat layers.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private melodyGain: GainNode | null = null;
  private percussionGain: GainNode | null = null;
  enabled = true;
  musicEnabled = true;
  private volumes: VolumeSettings = { ...DEFAULT_VOLUMES };
  private musicTimer: number | null = null;
  private musicStep = 0;
  private timers: number[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  private era = 0;
  private lastShot = 0;
  private lastHit = 0;
  private lastHarvest = -Infinity;
  private intensity: MusicIntensity = 'calm';
  private listener: Listener | null = null;
  private voiceEnds: number[] = [];
  private ambience: {
    kind: AmbienceKind;
    source: AudioBufferSourceNode;
    lfo: OscillatorNode;
    gain: GainNode;
  } | null = null;

  init(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volumes.master;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.enabled ? this.volumes.sfx : 0;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? this.volumes.music : 0;
      this.musicGain.connect(this.master);
      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.value = this.volumes.ambience;
      this.ambienceGain.connect(this.master);
      this.droneGain = this.layerGain();
      this.melodyGain = this.layerGain();
      this.percussionGain = this.layerGain();
      this.noiseBuffer = this.buildNoise();
      this.applyIntensity(this.intensity);
    } catch {
      this.ctx = null;
    }
  }

  private layerGain(): GainNode {
    const gain = this.ctx!.createGain();
    gain.gain.value = 0;
    gain.connect(this.musicGain!);
    return gain;
  }

  resume(): void {
    this.ctx?.resume();
  }

  /** Player volume settings, 0..1 per bus; unknown buses keep their current value. */
  setVolumes(volumes: Partial<VolumeSettings>): void {
    for (const key of Object.keys(volumes) as (keyof VolumeSettings)[]) {
      const value = volumes[key];
      if (typeof value === 'number') this.volumes[key] = clampVolume(value);
    }
    this.applyVolumes();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.applyVolumes();
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (enabled) this.startMusic();
    else this.stopMusic();
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.now();
    this.master?.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.sfxGain?.gain.setTargetAtTime(this.enabled ? this.volumes.sfx : 0, t, 0.05);
    this.musicGain?.gain.setTargetAtTime(this.musicEnabled ? this.volumes.music : 0, t, 0.08);
    this.ambienceGain?.gain.setTargetAtTime(this.volumes.ambience, t, 0.08);
  }

  /** Camera-relative frame used to place world sounds; the range matches the audible radius. */
  setListener(listener: Listener): void {
    this.listener = listener;
  }

  /** Music mood; the layers crossfade, they never cut. */
  setIntensity(intensity: MusicIntensity): void {
    if (intensity === this.intensity) return;
    this.intensity = intensity;
    this.applyIntensity(intensity);
  }

  private applyIntensity(intensity: MusicIntensity): void {
    if (!this.ctx || !this.droneGain || !this.melodyGain || !this.percussionGain) return;
    const gains = musicLayerGains(intensity);
    const t = this.now();
    this.droneGain.gain.setTargetAtTime(gains.drone, t, 1.2);
    this.melodyGain.gain.setTargetAtTime(gains.melody, t, 1.2);
    this.percussionGain.gain.setTargetAtTime(gains.percussion, t, 1.2);
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

  /** Distance gain and stereo pan of a world sound, from the current camera listener. */
  private mixFor(at?: SoundAt): SfxMix {
    if (!at || at.x === undefined || at.z === undefined || !this.listener) return { gain: 1, pan: 0 };
    const { x, z, rightX, rightZ, range } = this.listener;
    const dx = at.x - x;
    const dz = at.z - z;
    return { gain: attenuationFor(Math.hypot(dx, dz), range), pan: panFor(dx, dz, rightX, rightZ, range) };
  }

  /** Cap simultaneous voices so a large battle does not saturate the mixer. */
  private reserveVoice(duration: number): boolean {
    const t = this.now();
    if (this.voiceEnds.length > 0) this.voiceEnds = this.voiceEnds.filter((end) => end > t);
    if (this.voiceEnds.length >= 12) return false;
    this.voiceEnds.push(t + duration);
    return true;
  }

  /** Connect a voice to the effects bus, panning it when the sound came from world coordinates. */
  private route(node: AudioNode, mix: SfxMix): AudioNode {
    if (mix.pan === 0) return node;
    const panner = this.ctx!.createStereoPanner();
    panner.pan.value = mix.pan;
    node.connect(panner);
    return panner;
  }

  private blip(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, at?: SoundAt): void {
    if (!this.ctx || !this.sfxGain || !this.enabled) return;
    const mix = this.mixFor(at);
    const level = vol * mix.gain;
    if (level < 0.004 || !this.reserveVoice(dur)) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.now());
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.now() + dur);
    g.gain.setValueAtTime(level, this.now());
    g.gain.exponentialRampToValueAtTime(0.0001, this.now() + dur);
    o.connect(g);
    this.route(g, mix).connect(this.sfxGain);
    o.start();
    o.stop(this.now() + dur + 0.02);
  }

  private noise(dur: number, vol: number, filterFreq: number, type: BiquadFilterType = 'lowpass', at?: SoundAt): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer || !this.enabled) return;
    const mix = this.mixFor(at);
    const level = vol * mix.gain;
    if (level < 0.004 || !this.reserveVoice(dur)) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(level, this.now());
    g.gain.exponentialRampToValueAtTime(0.0001, this.now() + dur);
    src.connect(f);
    f.connect(g);
    this.route(g, mix).connect(this.sfxGain);
    src.start();
    src.stop(this.now() + dur + 0.02);
  }

  private harvestReady(): boolean {
    const t = this.now();
    if (t - this.lastHarvest < 0.6) return false;
    this.lastHarvest = t;
    return true;
  }

  shot(at?: SoundAt): void {
    const t = this.now();
    if (t - this.lastShot < 0.08) return;
    this.lastShot = t;
    this.noise(0.18, 0.5, 900, 'lowpass', at);
    this.blip(160, 0.12, 'square', 0.25, 60, at);
  }

  explosion(size = 1, at?: SoundAt): void {
    this.noise(0.7 * size, 0.8, 300, 'lowpass', at);
    this.blip(80, 0.4, 'sawtooth', 0.4, 30, at);
  }

  artillery(at?: SoundAt): void {
    this.noise(1.1, 0.9, 220, 'lowpass', at);
    this.blip(90, 0.8, 'sawtooth', 0.35, 25, at);
  }

  bow(at?: SoundAt): void {
    this.noise(0.12, 0.25, 1800, 'bandpass', at);
    this.blip(320, 0.1, 'triangle', 0.18, 180, at);
  }

  sling(at?: SoundAt): void {
    this.noise(0.16, 0.2, 900, 'highpass', at);
    this.blip(240, 0.08, 'sine', 0.12, 140, at);
  }

  hit(at?: SoundAt): void {
    const t = this.now();
    if (t - this.lastHit < 0.05) return;
    this.lastHit = t;
    this.noise(0.1, 0.3, 1400, 'bandpass', at);
  }

  woodChop(at?: SoundAt): void {
    // Several workers share one stroke: at most one gather sound every 0.6 s.
    if (!this.harvestReady()) return;
    this.noise(0.06, 0.35, 700, 'bandpass', at);
    this.blip(220, 0.05, 'triangle', 0.15, 180, at);
  }

  mineHit(at?: SoundAt): void {
    if (!this.harvestReady()) return;
    this.blip(500, 0.08, 'square', 0.2, 350, at);
  }

  build(at?: SoundAt): void {
    this.noise(0.25, 0.3, 1000, 'bandpass', at);
    this.blip(300, 0.15, 'triangle', 0.2, 450, at);
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

  /** Low, ceremonial hit used by the title and campaign prologues. */
  cinematicSting(): void {
    this.noise(0.5, 0.32, 220, 'lowpass');
    this.blip(98, 1.15, 'sine', 0.24);
    this.timers.push(setTimeout(() => this.blip(146.83, 1.25, 'sine', 0.16), 180));
    this.timers.push(setTimeout(() => this.blip(220, 1.4, 'triangle', 0.09), 380));
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

  death(at?: SoundAt): void {
    this.blip(300, 0.3, 'sawtooth', 0.2, 60, at);
  }

  // --- Ambience ---

  /**
   * One looping bed per biome, mixed under the ambience bus. `level` (0..1) follows how close the
   * camera is to the source (the Caral shoreline) or the scene's default, 0 keeps it silent.
   */
  setAmbience(kind: AmbienceKind, level: number): void {
    if (!this.ctx || !this.ambienceGain || !this.noiseBuffer) return;
    const audible = kind !== 'none' && level > 0.001;
    if (!this.ambience || this.ambience.kind !== kind) {
      this.stopAmbience();
      if (!audible) return;
      this.ambience = this.buildAmbience(kind);
    }
    const preset = kind === 'none' ? null : AMBIENCE_PRESETS[kind];
    const target = preset ? Math.max(0, Math.min(1, level)) * preset.level : 0;
    this.ambience.gain.gain.setTargetAtTime(target, this.now(), 1.2);
  }

  private buildAmbience(kind: AmbienceKind): NonNullable<AudioEngine['ambience']> {
    const preset = AMBIENCE_PRESETS[kind as Exclude<AmbienceKind, 'none'>];
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = preset.filter;
    filter.frequency.value = preset.frequency;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = preset.lfoHz;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = preset.depth;
    lfo.connect(lfoDepth);
    lfoDepth.connect(gain.gain);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambienceGain!);
    source.start();
    lfo.start();
    return { kind, source, lfo, gain };
  }

  private stopAmbience(): void {
    if (!this.ambience) return;
    this.ambience.source.stop();
    this.ambience.lfo.stop();
    this.ambience = null;
  }

  // --- Generative music ---

  startMusic(): void {
    if (!this.ctx || !this.musicEnabled) return;
    this.stopMusic();
    this.musicStep = 0;
    this.applyIntensity(this.intensity);
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

  /** Harmonic progression per era, split across the drone, melody and percussion layers. */
  private playMusicNote(): void {
    if (!this.ctx || !this.musicGain) return;
    const scales: Record<number, number[]> = {
      0: [220, 261.63, 293.66, 329.63, 392], // pentatonic (the ancient Andes: flute timbre)
      1: [196, 246.94, 293.66, 369.99, 440],
      2: [174.61, 220, 261.63, 311.13, 392], // martial
      3: [110, 164.81, 220, 261.63, 329.63],
      4: [130.81, 196, 246.94, 293.66, 392],
      5: [98, 146.83, 220, 293.66, 440],
    };
    const scale = scales[Math.min(this.era, 5)] ?? scales[0];
    const root = scale[this.musicStep % 2 === 0 ? 0 : 1];
    const step = this.musicStep;
    const freq = scale[step % scale.length];
    if (this.intensity !== 'calm' && step % 2 === 0) this.percussionHit(step % 8 === 0);
    // The ancient Andes (era 0): a breathy flute line in a pentatonic mode. Flutes and trumpets were
    // found in Caral's Amphitheatre; the melody itself is generative, not a reconstruction.
    if (this.era === 0 && step % 2 === 0) {
      this.fluteNote(freq * 2, step % 8 === 0 ? 1.6 : 1.1);
      this.musicStep++;
      return;
    }
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
      g.connect(this.melodyGain!);
      o.start(now);
      o.stop(now + 1.3);
    }
    const b = this.ctx.createOscillator();
    const bg = this.ctx.createGain();
    b.type = 'triangle';
    b.frequency.value = root / 2;
    const bn = this.now();
    bg.gain.setValueAtTime(0.0001, bn);
    bg.gain.linearRampToValueAtTime(0.2, bn + 0.04);
    bg.gain.exponentialRampToValueAtTime(0.0001, bn + 1.4);
    b.connect(bg);
    bg.connect(this.droneGain!);
    b.start(bn);
    b.stop(bn + 1.5);
    this.musicStep++;
  }

  /** Tinya-like drum: a short filtered noise burst; combat adds the answering stroke. */
  private percussionHit(strong: boolean): void {
    if (!this.ctx || !this.percussionGain || !this.noiseBuffer) return;
    const hit = (delay: number, level: number) => {
      const src = this.ctx!.createBufferSource();
      src.buffer = this.noiseBuffer;
      const f = this.ctx!.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 180;
      f.Q.value = 1.1;
      const g = this.ctx!.createGain();
      const t = this.now() + delay;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(level, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      src.connect(f);
      f.connect(g);
      g.connect(this.percussionGain!);
      src.start(t);
      src.stop(t + 0.24);
    };
    hit(0, strong ? 0.5 : 0.3);
    if (this.intensity === 'combat') hit(0.16, 0.22);
  }

  private fluteNote(freq: number, length: number): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const now = this.now();
    const tone = this.ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.value = freq;
    const vibrato = this.ctx.createOscillator();
    vibrato.frequency.value = 5.2;
    const vibratoDepth = this.ctx.createGain();
    vibratoDepth.gain.value = freq * 0.008;
    vibrato.connect(vibratoDepth);
    vibratoDepth.connect(tone.frequency);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    tone.connect(gain);
    const breath = this.ctx.createBufferSource();
    breath.buffer = this.noiseBuffer;
    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = freq;
    band.Q.value = 6;
    const breathGain = this.ctx.createGain();
    breathGain.gain.setValueAtTime(0.0001, now);
    breathGain.gain.linearRampToValueAtTime(0.05, now + 0.08);
    breathGain.gain.exponentialRampToValueAtTime(0.0001, now + length * 0.8);
    breath.connect(band);
    band.connect(breathGain);
    breathGain.connect(this.melodyGain!);
    gain.connect(this.melodyGain!);
    tone.start(now);
    vibrato.start(now);
    breath.start(now);
    tone.stop(now + length + 0.05);
    vibrato.stop(now + length + 0.05);
    breath.stop(now + length);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  dispose(): void {
    this.stopMusic();
    this.stopAmbience();
    for (const t of this.timers) clearTimeout(t);
    this.timers.length = 0;
    this.voiceEnds = [];
    this.ctx?.close();
    this.ctx = null;
  }
}
