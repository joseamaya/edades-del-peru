#!/usr/bin/env python3
"""Original cue for the 60 s trailer, synthesised from scratch and timed from `scripts/trailer60.json`.

Five acts that grow in intensity: a pad and an impact open each act, a brass stab and a whoosh mark every
shot cut, the Junín charge gets the biggest hit and a double-time drum run, the night in Cusco drops the
drums for a low drone, the gameplay montage hits on every word and the end card resolves. 120 BPM.

Usage: python3 scripts/trailer60_music.py [--out=review/trailer60_music.wav]
"""
import argparse
import json
import os
import numpy as np
from scipy import signal
from scipy.io import wavfile

PLAN = json.load(open(os.path.join(os.path.dirname(__file__), 'trailer60.json')))
SR = 48000
INTRO = PLAN['intro']['seconds']
ACTS = []
t = INTRO
for act in PLAN['acts']:
    shots = []
    for s in act['shots']:
        shots.append((s['name'], t, s['seconds']))
        t += s['seconds']
    ACTS.append((act['title'], shots[0][1], t, shots))
MONTAGE = []
for s in PLAN['montage']['shots']:
    MONTAGE.append((s['name'], t, s['seconds']))
    t += s['seconds']
END = t
DUR = END + PLAN['end']['seconds']
N = int(SR * DUR)
RNG = np.random.default_rng(1500)
MIX = np.zeros((N, 2), dtype=np.float64)
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

DRONE = [55.0, 82.41, 110.0, 164.81]
add(pad(DRONE, DUR, attack=2.0, release=3.0, cutoff=900, amp=1.5), 0.0, 1.6)

Am = [110.0, 130.81, 164.81, 220.0]
F = [87.31, 110.0, 130.81, 174.61]
G = [98.0, 123.47, 146.83, 196.0]
Dm = [73.42, 110.0, 146.83, 174.61]
E = [82.41, 123.47, 164.81, 207.65]
AmAdd9 = [110.0, 164.81, 220.0, 246.94, 329.63]
PROG = [(Am, F), (F, G), (Dm, E), (F, G), (AmAdd9, Am)]
NOTES = [220.0, 261.63, 329.63, 440.0]

# Intro: heartbeat into the first act.
for at in [0.0, 0.9, 1.25, 2.1, 2.45]:
    add(taiko(80), at, 0.6)
add(riser(1.5), INTRO - 1.5, 0.6)

for k, (title, t0, t1, shots) in enumerate(ACTS):
    level = k / 4.0
    span = t1 - t0
    a, b = PROG[k]
    add(pad(a, span / 2 + 0.4, attack=0.3, release=0.5, cutoff=2600 + 600 * k), t0, 1.6)
    add(pad(b, span / 2, attack=0.3, release=0.6, cutoff=2600 + 600 * k), t0 + span / 2, 1.6)
    add(impact(), t0, 1.0 + 0.12 * k)
    add(crash(), t0, 0.55 + 0.08 * k, pan=0.2 if k % 2 else -0.2)
    for i, (name, s0, sec) in enumerate(shots):
        s1 = s0 + sec
        night = name == 'cusco_llamas'
        charge = name == 'junin'
        if i:
            add(brass([55.0, 110.0] + ([164.81] if k >= 2 else []), 0.5), s0, 0.9 + 0.2 * level, pan=-0.15)
        add(whoosh(), s0 - 0.42, 0.45, pan=0.3 if i % 2 else -0.3)
        if night:
            # The city burns: drums out, a low cluster and a slow heartbeat.
            add(pad([41.2, 55.0, 61.74], sec, attack=0.2, release=0.4, cutoff=500, amp=1.4), s0, 1.4)
            for at in np.arange(s0, s1, BEAT * 2):
                add(taiko(70), at, 0.5)
            continue
        if charge:
            add(impact(3.0), s0, 1.7)
            add(crash(3.0), s0, 1.0)
            add(brass([55.0, 110.0, 164.81, 220.0], 0.9), s0, 1.4)
        # Ostinato from the second act on, denser towards the present.
        if k >= 1:
            step = BEAT / 2 if (k >= 2 or charge) else BEAT
            for j, at in enumerate(np.arange(s0, s1, step)):
                add(pluck(NOTES[j % 4] * (2 if k >= 4 else 1)), at, 0.22 + 0.2 * level, pan=0.25 * np.sin(j * 0.8))
        step = BEAT / 4 if charge else (BEAT if k < 2 else BEAT / 2)
        for at in np.arange(s0, s1, step):
            accent = (at - s0) % BAR < 1e-6
            add(taiko(92 + 3 * k), at, (0.65 if accent else 0.35) + 0.12 * level + (0.15 if charge else 0), pan=-0.2 * np.sin(at))
        if name == 'arica':
            add(impact(), s0, 1.4)
    # A snare build and a riser into the next act.
    build = min(2.0, span / 2)
    for at in np.arange(t1 - build, t1, BEAT / 4):
        add(snare(), at, 0.1 + 0.4 * ((at - (t1 - build)) / build) ** 2, pan=0.1)
    add(riser(build), t1 - build, 0.55 + 0.1 * level)

# Gameplay montage: one hit per word.
for i, (name, s0, sec) in enumerate(MONTAGE):
    add(impact(1.4), s0, 1.3 + 0.1 * i)
    add(brass([55.0, 110.0, 164.81] + ([220.0] if i == 2 else []), 0.6), s0, 1.3)
    for at in np.arange(s0, s0 + sec, BEAT / 2):
        add(taiko(100), at, 0.55)
add(riser(1.2), END - 1.2, 0.7)

# End card.
add(impact(3.0), END, 1.6)
add(crash(3.0), END, 0.9, pan=-0.2)
add(pad([110.0, 164.81, 220.0, 277.18, 329.63], DUR - END, attack=0.2, release=1.6, cutoff=3600), END, 1.8)
add(brass([55.0, 110.0, 164.81, 220.0], 0.9), END, 1.3)
for at in np.arange(END, END + 3.0, BEAT):
    add(taiko(100), at, 0.9 if (at - END) % BAR < 1e-6 else 0.5)


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
    # 0.79 peak (about -2 dBFS) leaves room for the AAC encoder, which overshot 0.89 to 0 dBFS.
    x *= 0.79 / (np.abs(x).max() + 1e-9)
    return x


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default='review/trailer60_music.wav')
    args = parser.parse_args()
    out = master(reverb(MIX, wet=0.3))
    wavfile.write(args.out, SR, out.astype(np.float32))
    peak = 20 * np.log10(np.abs(out).max() + 1e-12)
    print(f'[music] {args.out} {DUR:.1f}s peak {peak:.1f} dBFS')


if __name__ == '__main__':
    main()
