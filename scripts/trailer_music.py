#!/usr/bin/env python3
"""Original 30 s trailer cue for Los hijos de Tambotoco.

Synthesised from scratch (no samples, no third-party licences): a low Andean drone, taiko-style
drums, a string ostinato, brass stabs, risers and two impacts, with a convolution reverb. The hit
times are the trailer's cut points, so the edit lands on the music.

Usage: python3 scripts/trailer_music.py [--out=review/trailer_music.wav]
"""
import argparse
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DUR = 30.0
N = int(SR * DUR)
RNG = np.random.default_rng(1200)
MIX = np.zeros((N, 2), dtype=np.float64)

# 120 BPM: the trailer cuts on half-second marks, so every accent is a shared grid point.
BEAT = 0.5
BAR = 4 * BEAT


def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N or i < 0:
        return
    part = sig[: N - i]
    left = np.cos((pan + 1) * np.pi / 4)
    right = np.sin((pan + 1) * np.pi / 4)
    MIX[i : i + len(part), 0] += part * gain * left
    MIX[i : i + len(part), 1] += part * gain * right


def decay_env(n, attack, decay, curve=1.0):
    x = np.arange(n) / SR
    return np.minimum(1.0, x / max(attack, 1e-4)) * np.exp(-np.maximum(0.0, x - attack) * decay) ** curve


def band(sig, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), min(0.99, hi / (SR / 2))], 'band')
    return signal.lfilter(b, a, sig)


def taiko(f0=95.0, dur=0.9, pan=0.0):
    n = int(dur * SR)
    x = np.arange(n) / SR
    f = f0 * (1 + 0.55 * np.exp(-x * 16))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 4.2)
    thump = np.sin(2 * np.pi * 52 * x) * np.exp(-x * 5.5)
    skin = band(RNG.standard_normal(n) * np.exp(-x * 45), 220, 1400) * 0.4
    return 0.85 * body + 0.55 * thump + skin


def impact(dur=2.6, pan=0.0):
    n = int(dur * SR)
    x = np.arange(n) / SR
    low = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-x * 5) + 30) / SR) * np.exp(-x * 1.9)
    crack = band(RNG.standard_normal(n) * np.exp(-x * 8), 80, 3200) * 0.55
    return low * 0.95 + crack


def crash(dur=3.2, pan=0.0):
    n = int(dur * SR)
    x = np.arange(n) / SR
    hiss = band(RNG.standard_normal(n), 2200, 9000) * np.exp(-x * 1.8)
    return hiss * 0.22


def pad(freqs, dur, attack=0.9, release=0.8, cutoff=2400.0, amp=1.0):
    n = int(dur * SR)
    x = np.arange(n) / SR
    sig = np.zeros(n)
    for f in freqs:
        for det in (-0.5, 0.0, 0.5):
            ff = f * (1 + det / 100)
            for k in range(1, 7):
                sig += (1.0 / k) * np.sin(2 * np.pi * ff * k * x + RNG.uniform(0, 6.28))
    sig *= 1 + 0.12 * np.sin(2 * np.pi * 4.3 * x + RNG.uniform(0, 6))
    env = np.minimum(1.0, x / attack) * np.minimum(1.0, np.maximum(0.0, (dur - x) / release))
    out = signal.lfilter(*signal.butter(2, cutoff / (SR / 2)), sig * env)
    return out / (len(freqs) * 18) * amp


def pluck(freq, dur=0.6):
    n = int(dur * SR)
    x = np.arange(n) / SR
    sig = np.zeros(n)
    for k in range(1, 9):
        sig += (1.0 / k) * np.sin(2 * np.pi * freq * k * x) * np.exp(-x * (5 + 2.4 * k))
    return sig * 0.3


def brass(freqs, dur=0.45):
    n = int(dur * SR)
    x = np.arange(n) / SR
    sig = np.zeros(n)
    for f in freqs:
        sig += signal.sawtooth(2 * np.pi * f * x + RNG.uniform(0, 6))
    env = np.minimum(1.0, x / 0.05) * np.exp(-x * 3.5)
    return signal.lfilter(*signal.butter(2, 850 / (SR / 2)), sig * env) * 0.12


def riser(dur=2.0):
    n = int(dur * SR)
    x = np.arange(n) / SR
    noise = RNG.standard_normal(n)
    out = np.zeros(n)
    chunks = 32
    for c in range(chunks):
        s = slice(c * n // chunks, (c + 1) * n // chunks)
        fc = min(2600.0, 260 * 2 ** (c / chunks * 4.2))
        out[s] = band(noise[s], fc * 0.55, fc * 1.8)
    sweep = np.sin(2 * np.pi * np.cumsum(180 * 2 ** (x / dur * 2.4)) / SR)
    env = (x / dur) ** 2
    return (out * 0.55 + sweep * 0.35) * env


def whoosh(dur=0.7):
    n = int(dur * SR)
    x = np.arange(n) / SR
    noise = RNG.standard_normal(n)
    out = np.zeros(n)
    for c in range(12):
        s = slice(c * n // 12, (c + 1) * n // 12)
        fc = 3000 * 2 ** (-c / 12 * 2.2)
        out[s] = band(noise[s], fc * 0.6, fc * 1.7)
    return out * np.sin(np.pi * np.clip(x / dur, 0, 1)) * 0.5


def snare(dur=0.18):
    n = int(dur * SR)
    x = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 190 * x) * np.exp(-x * 30) * 0.35
    hiss = band(RNG.standard_normal(n), 700, 5000) * np.exp(-x * 22)
    return tone + hiss * 0.5


# --- the cue ------------------------------------------------------------------------------------

DRONE = [55.0, 82.41, 110.0, 164.81]  # A1 E2 A2 E3
add(pad(DRONE, 30.0, attack=3.0, release=2.5, cutoff=900, amp=1.5), 0.0, 1.7)

CHORDS = [
    (0.0, 8.0, [110.0, 130.81, 164.81, 220.0]),           # Am
    (8.0, 4.0, [87.31, 110.0, 130.81, 174.61]),           # F
    (12.0, 4.0, [98.0, 123.47, 146.83, 196.0]),           # G
    (16.0, 6.5, [110.0, 130.81, 164.81, 220.0]),          # Am
    (22.5, 3.5, [110.0, 164.81, 220.0, 246.94, 329.63]),  # Am add9
    (26.0, 4.0, [110.0, 164.81, 220.0, 277.18, 329.63]),  # Am add9 (wider)
]
for at, dur, freqs in CHORDS:
    add(pad(freqs, dur, attack=0.35, release=0.6, cutoff=3200), at, 1.7)

# Ostinato: A-C-E-A eighth notes, opening up between 8 s and 16 s.
rng_notes = [220.0, 261.63, 329.63, 440.0]
for i, at in enumerate(np.arange(8.0, 22.5, BEAT / 2)):
    if 22.0 <= at < 22.5:
        continue
    gain = 0.28 + 0.22 * min(1.0, (at - 8.0) / 8.0)
    add(pluck(rng_notes[i % 4]), at, gain, pan=0.25 * np.sin(i * 0.8))

# Brass stabs on the bar line.
for at, freqs in [
    (10.0, [55.0, 110.0]),
    (12.0, [43.65, 87.31]),
    (14.0, [49.0, 98.0]),
    (16.0, [55.0, 110.0]),
    (18.0, [55.0, 110.0]),
    (20.0, [55.0, 110.0, 164.81]),
    (22.5, [55.0, 110.0, 164.81, 220.0]),
    (24.0, [55.0, 110.0, 164.81]),
    (26.0, [55.0, 110.0, 164.81, 220.0]),
]:
    add(brass(freqs, 0.5), at, 1.2, pan=-0.15)

# Taiko: sparse heartbeat, then quarter notes, then a driving pattern.
for at in [0.0, 2.0, 2.35]:
    add(taiko(80), at, 0.5 if at else 0.75)
for at in np.arange(4.0, 16.0, BEAT):
    accent = (at - 4.0) % BAR < 1e-6
    add(taiko(96, pan=-0.2 * np.sin(at)), at, 0.7 if accent else 0.4, pan=-0.2 * np.sin(at))
for at in np.arange(16.0, 22.5, BEAT / 2):
    accent = (at - 16.0) % BEAT < 1e-6
    add(taiko(102, pan=0.3 * np.cos(at)), at, 0.75 if accent else 0.42, pan=0.3 * np.cos(at))

# Snare roll into the first impact.
for i, at in enumerate(np.arange(18.0, 22.5, BEAT / 4)):
    add(snare(), at, 0.12 + 0.5 * ((at - 18.0) / 4.5) ** 2, pan=0.1)

# Break, then the two impacts and the end card.
add(riser(2.0), 20.5, 0.8)
add(impact(), 22.5, 1.35)
add(crash(), 22.5, 0.75, pan=0.2)
add(riser(1.5), 24.5, 0.7)
add(impact(), 26.0, 1.55)
add(crash(), 26.0, 0.85, pan=-0.2)
add(impact(2.2), 27.5, 0.9)
for at in np.arange(22.5, 26.0, BEAT):
    add(taiko(104, pan=-0.25 * np.sin(at)), at, 0.8, pan=-0.25 * np.sin(at))
for at in np.arange(26.0, 29.5, BEAT):
    accent = (at - 26.0) % BAR < 1e-6
    add(taiko(100), at, 1.0 if accent else 0.6)
add(crash(2.0), 26.0, 0.5, pan=0.35)

# Transition whooshes exactly on the picture cuts.
# `--cuts=3.5,6,...` moves the whooshes onto another edit's cut points (default: Tambotoco's).
_cuts_arg = next((a.split('=', 1)[1] for a in __import__('sys').argv[1:] if a.startswith('--cuts=')), None)
CUTS = [float(c) for c in _cuts_arg.split(',')] if _cuts_arg else [7.5, 12.5, 18.5, 21.5, 24.0]
for at in CUTS:
    add(whoosh(), at - 0.42, 0.5, pan=0.3 if int(at) % 2 else -0.3)


# --- mix ----------------------------------------------------------------------------------------

def reverb(x, seconds=2.4, wet=0.32):
    n = int(seconds * SR)
    ir = RNG.standard_normal(n) * np.exp(-np.arange(n) / SR * 2.4)
    ir = signal.lfilter(*signal.butter(1, 6500 / (SR / 2)), ir)
    ir /= np.abs(ir).max()
    out = np.zeros_like(x)
    for ch in range(2):
        out[:, ch] = signal.fftconvolve(x[:, ch], ir)[: len(x)]
    out /= np.abs(out).max() + 1e-9
    out *= np.abs(x).max()
    return x * (1 - wet) + out * wet


def master(x):
    b, a = signal.butter(2, 32 / (SR / 2), 'high')
    x = signal.lfilter(b, a, x, axis=0)
    b, a = signal.butter(2, 12000 / (SR / 2), 'low')
    x = signal.lfilter(b, a, x, axis=0)
    x = np.tanh(x * 1.35) * 0.92
    fade = int(0.25 * SR)
    x[:fade] *= np.linspace(0, 1, fade)[:, None]
    x[-int(0.6 * SR) :] *= np.linspace(1, 0, int(0.6 * SR))[:, None]
    x *= 0.89 / (np.abs(x).max() + 1e-9)
    return x


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default='review/trailer_music.wav')
    parser.add_argument('--cuts', default=None)
    args = parser.parse_args()
    wet = reverb(MIX, wet=0.32)
    out = master(wet)
    wavfile.write(args.out, SR, out.astype(np.float32))
    peak = 20 * np.log10(np.abs(out).max() + 1e-12)
    rms = np.sqrt(np.mean(out**2))
    print(f'[music] {args.out} {DUR:.0f}s peak {peak:.1f} dBFS rms {20 * np.log10(rms + 1e-12):.1f} dBFS')
    per_second = [
        f'{20 * np.log10(np.sqrt(np.mean(out[i * SR : (i + 1) * SR] ** 2)) + 1e-12):.0f}' for i in range(int(DUR))
    ]
    print('[music] rms/s ' + ' '.join(per_second))


if __name__ == '__main__':
    main()
