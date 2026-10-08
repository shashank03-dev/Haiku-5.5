#!/usr/bin/env python3
"""Original 30 s score for variation v3-terminal ("Terminal") of the Haiku 5.5 launch film.

numpy only. Everything is synthesised in this file: sine oscillators, decaying noise
clicks, a detuned D-major pad, sub pulses, and a look-ahead gain limiter on the bus.
No samples, no downloaded audio, nothing copyrighted.

Timing (120 BPM, beat 0.5 s). Typing ticks sit on the 0.125 s grid, output-line tones
on the 0.5 s grid, pattern interrupts at 10.0 and 20.0 s.
  0.00 accent stab      0.25 window opens     0.5-2.0 command types, 2.0 enter
  2.5 ready line        5.0-6.5 prompt types, 6.5 enter
  7.0 summary line, then 7.5 / 8.0 / 8.5 three short lines
  10.0 split: pings fan out left and right; 10.5-14.5 window bursts every 0.5 s
  15.5-18.0 diff lines (two removed, four added)
  19.5-20.0 collapse; 20.5 seal stamp and chime
  22.0-23.5 "Built for everyday work." types; 25.0 terminal clears
  25.5-27.0 "Meet Haiku 5.5." types; 27.0 caption line
  Sub pulse on every beat 5.0-27.0. Pad changes every 5 s. Fade in 0.0-0.3 s,
  fade out 28.5-30.0 s.

Output: out/variations/v3-terminal/score.wav, 48 kHz, 24-bit PCM, stereo, 1,440,000 samples.
Run from anywhere:  python3 variations/v3-terminal/audio/make_score.py
"""

import math
import os
import wave

import numpy as np

# ---------------------------------------------------------------------------
# Global setup
# ---------------------------------------------------------------------------
SR = 48_000
DURATION = 30.0
N = int(round(DURATION * SR))            # 1,440,000 samples = 30.000 s
BEAT = 0.5                               # 120 BPM, one beat = 0.5 s
GRID = 0.125                             # typing-tick grid
SEED = 20261008                          # fixed seed: the score is reproducible
CEILING = 0.89                           # limiter ceiling, -1.01 dBFS (1.0 dBFS = 0.891)
MASTER = 1.0                             # bus gain before the limiter
PAD_X = 0.6                              # chord crossfade half-width (s)

TICK_LEVEL = 0.10                        # typing ticks: quiet
ENTER_LEVEL = 0.15
PING_LEVEL = 0.10                        # split pings
SUB_LEVEL = 0.28
PAD_GAIN = 0.03                          # per pad voice
COLLAPSE_LEVEL = 0.14

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
OUT_DIR = os.path.join(ROOT_DIR, "out", "variations", "v3-terminal")
OUT_PATH = os.path.join(OUT_DIR, "score.wav")

rng = np.random.default_rng(SEED)
BUS = np.zeros((2, N))                   # stereo bus, float64


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------
def hz(midi):
    return 440.0 * 2.0 ** ((midi - 69) / 12.0)


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


def ramp_in(n, ms):
    """Linear fade-in over `ms`. The first sample is 0, so one-shots never click on start."""
    return np.minimum(1.0, np.arange(n) / max(1.0, ms * 1e-3 * SR))


def ramp_out(n, ms):
    """Linear fade-out over the last `ms`. One-shots end at 0."""
    return np.minimum(1.0, (n - 1 - np.arange(n)) / max(1.0, ms * 1e-3 * SR))


def peak_to(x, level):
    """Scale a one-shot so that its absolute peak equals `level`."""
    m = float(np.max(np.abs(x)))
    return x * (level / m) if m > 0.0 else x


def hp_noise(n):
    """White noise differentiated once: a bright, high-passed click source."""
    return np.diff(rng.standard_normal(n), prepend=0.0)


def grid_times(t0, t1, step=GRID):
    """Times on a `step` grid with t0 <= t < t1, counted in whole steps (no float drift)."""
    k0, k1 = round(t0 / step), round(t1 / step)
    return [k * step for k in range(k0, k1)]


def place(t0, sig, pan=0.0):
    """Add a mono one-shot starting at t0 (seconds), constant-power pan in [-1, 1]."""
    i0 = int(round(t0 * SR))
    a = max(0, -i0)
    b = min(len(sig), N - i0)
    if b <= a:
        return
    ang = (pan + 1.0) * np.pi / 4.0
    s = sig[a:b]
    BUS[0, i0 + a:i0 + b] += math.cos(ang) * s
    BUS[1, i0 + a:i0 + b] += math.sin(ang) * s


# ---------------------------------------------------------------------------
# Sound generators (mono, one-shot)
# ---------------------------------------------------------------------------
def snd_tick(level, body_hz=1400.0):
    """Typing tick: 12 ms of bright noise click over a faint body tone. Dry and quiet."""
    n = int(0.012 * SR)
    t = np.arange(n) / SR
    x = hp_noise(n) * np.exp(-t / 0.0025)
    x += 0.35 * np.sin(2 * np.pi * body_hz * t) * np.exp(-t / 0.006)
    x = np.convolve(x, np.ones(3) / 3.0, mode="same")      # soften the very top
    x *= ramp_in(n, 0.4) * ramp_out(n, 2.0)
    return peak_to(x, level)


def snd_tone(midi, level, dur=0.32, tau=0.09):
    """Soft output-line tone: a sine with a light octave, quick decay."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    w = 2 * np.pi * hz(midi) * t
    x = (np.sin(w) + 0.22 * np.sin(2 * w)) * np.exp(-t / tau)
    x *= ramp_in(n, 4.0) * ramp_out(n, 12.0)
    return peak_to(x, level)


def snd_chime(midi, level, dur=2.2):
    """Seal chime: a bell-like tone (fundamental plus octave and twelfth), long decay."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(midi)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.9)
         + 0.40 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t / 0.45)
         + 0.15 * np.sin(2 * np.pi * 3.0 * f * t) * np.exp(-t / 0.22))
    x *= ramp_in(n, 2.0) * ramp_out(n, 80.0)
    return peak_to(x, level)


def snd_thump(level, dur=0.30):
    """Seal stamp: a short sine whose pitch falls from about 120 Hz to 52 Hz."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 52.0 + 70.0 * np.exp(-t / 0.03)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.07)
    x *= ramp_in(n, 0.5) * ramp_out(n, 10.0)
    return peak_to(x, level)


def snd_sub(midi, level, dur=0.40, tau=0.14):
    """Sub pulse: a sine with soft 2nd and 3rd harmonics so it reads on small speakers."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    w = 2 * np.pi * hz(midi) * t
    x = (np.sin(w) + 0.30 * np.sin(2 * w) + 0.10 * np.sin(3 * w)) * np.exp(-t / tau)
    x *= ramp_in(n, 3.0) * ramp_out(n, 15.0)
    return peak_to(x, level)


def snd_ping(freq, level, dur=0.05):
    """Split tick: a quick high ping with a small click at the front."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.012)
         + 0.40 * np.sin(2 * np.pi * 1.5 * freq * t) * np.exp(-t / 0.005)
         + 0.50 * hp_noise(n) * np.exp(-t / 0.0015))
    x *= ramp_in(n, 0.3) * ramp_out(n, 3.0)
    return peak_to(x, level)


def snd_collapse(level, dur=0.5):
    """Collapse into the 20.0 cut: pitch falls from 1.4 kHz to 180 Hz as the level rises."""
    n = int(dur * SR)
    u = np.arange(n) / n
    f = 1400.0 * (180.0 / 1400.0) ** u
    env = u * u
    x = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * hp_noise(n)) * env
    x *= ramp_out(n, 8.0)
    return peak_to(x, level)


def snd_swish(level, dur=0.30):
    """Clear at 25.0: a falling sine glide under a soft noise wash, shaped to zero at both ends."""
    n = int(dur * SR)
    u = np.arange(n) / n
    f = 2400.0 * (500.0 / 2400.0) ** u
    env = np.sin(np.pi * u) ** 2
    x = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * hp_noise(n)) * env
    return peak_to(x, level)


# ---------------------------------------------------------------------------
# Harmony: D major throughout (Dadd9, Bm7, G, A, D, G, D)
# ---------------------------------------------------------------------------
# (start, end, MIDI voicing, sub-bass root in MIDI)
PAD = [
    (0.0, 5.0, [62, 66, 69, 76], 38),     # Dadd9
    (5.0, 10.0, [59, 62, 66, 69], 35),    # Bm7
    (10.0, 15.0, [55, 59, 62, 67], 31),   # G
    (15.0, 20.0, [57, 64, 69, 73], 33),   # A
    (20.0, 25.0, [62, 69, 74, 78], 38),   # D, open voicing after the collapse
    (25.0, 27.5, [55, 62, 67, 71], 31),   # G
    (27.5, 30.0, [50, 57, 62, 66], 38),   # D, resolution
]
PAD_PAN = [-0.35, 0.25, -0.15, 0.40]      # static spread of the four voices


def root_at(t):
    for a, b, _, root in PAD:
        if a <= t < b:
            return root
    return PAD[-1][3]


def add_pad():
    for a, b, notes, _ in PAD:
        lo = max(0, int(math.floor((a - PAD_X) * SR)))
        hi = min(N, int(math.ceil((b + PAD_X) * SR)))
        t = np.arange(lo, hi) / SR
        env = (smoothstep((t - (a - PAD_X)) / (2 * PAD_X))
               * (1.0 - smoothstep((t - (b - PAD_X)) / (2 * PAD_X))))
        shimmer = 0.8 + 0.2 * np.sin(2 * np.pi * 0.15 * t)   # slow movement in the 2nd partial
        for i, m in enumerate(notes):
            ang = (PAD_PAN[i % len(PAD_PAN)] + 1.0) * np.pi / 4.0
            f = hz(m)
            # Left and right use slightly different detuning, so the pad has width.
            vl = np.sin(2 * np.pi * f * 0.9982 * t) + 0.35 * shimmer * np.sin(4 * np.pi * f * 0.9982 * t) \
                + 0.12 * np.sin(6 * np.pi * f * 0.9982 * t)
            vr = np.sin(2 * np.pi * f * 1.0018 * t) + 0.35 * shimmer * np.sin(4 * np.pi * f * 1.0018 * t) \
                + 0.12 * np.sin(6 * np.pi * f * 1.0018 * t)
            g = PAD_GAIN * env
            BUS[0, lo:hi] += g * math.cos(ang) * vl
            BUS[1, lo:hi] += g * math.sin(ang) * vr


def add_sub_pulses():
    """Sub pulse on every beat from 5.0 to 27.0, pitched to the chord underneath."""
    for k in range(45):
        t = 5.0 + k * BEAT
        place(t, snd_sub(root_at(t), SUB_LEVEL))


# ---------------------------------------------------------------------------
# Terminal events
# ---------------------------------------------------------------------------
# (start, end, base pan): one tick per 0.125 s grid step while the line types.
TYPED = [
    (0.5, 2.0, -0.10),      # $ claude --model claude-haiku-5-5
    (5.0, 6.5, 0.08),       # summarize this release note
    (22.0, 23.5, -0.06),    # Built for everyday work.
    (25.5, 27.0, 0.06),     # Meet Haiku 5.5.
]
ENTERS = [2.0, 6.5]         # enter keys that close the two commands

# (time, MIDI pitch, level): one soft tone per output line, on the 0.5 s grid.
OUTPUT = [
    (2.5, 81, 0.09),        # Haiku 5.5 ready (A5)
    (7.0, 74, 0.09),        # Summary ready in one pass. (D5)
    (7.5, 78, 0.08),        # short line (F#5)
    (8.0, 81, 0.08),        # short line (A5)
    (8.5, 86, 0.08),        # short line (D6)
    (15.5, 57, 0.06),       # removed diff line: low and muted (A3)
    (16.0, 55, 0.06),       # removed diff line (G3)
    (16.5, 81, 0.08),       # added diff line (A5)
    (17.0, 83, 0.08),       # added diff line (B5)
    (17.5, 86, 0.08),       # added diff line (D6)
    (18.0, 90, 0.08),       # added diff line (F#6)
    (27.0, 74, 0.07),       # caption claude-haiku-5-5 (D5)
]


def add_intro():
    # 0.0 accent stab (D6 with A6), then a soft tick as the window opens at 0.25.
    place(0.0, snd_tone(86, 0.12, dur=0.6, tau=0.16))
    place(0.0, snd_tone(93, 0.06, dur=0.6, tau=0.16))
    place(0.25, snd_tick(0.05, body_hz=2600.0))


def add_typing():
    for a, b, pan in TYPED:
        for t in grid_times(a, b):
            place(t, snd_tick(TICK_LEVEL * rng.uniform(0.75, 1.0)), pan + rng.uniform(-0.05, 0.05))
    for t in ENTERS:
        place(t, snd_tick(ENTER_LEVEL * rng.uniform(0.9, 1.0), body_hz=700.0), 0.0)


def add_outputs():
    for t, midi, level in OUTPUT:
        place(t, snd_tone(midi, level))


def add_split():
    """10.0 pattern interrupt: quick high pings fan out left and right in pairs."""
    for j, (dt, spread) in enumerate([(0.0, 0.25), (0.0625, 0.5), (0.125, 0.75), (0.1875, 1.0)]):
        f = 3200.0 + 600.0 * j
        place(10.0 + dt, snd_ping(f, PING_LEVEL), -spread)
        place(10.0 + dt, snd_ping(f, PING_LEVEL), spread)
    # 10.5 to 14.5: every 0.5 s a different window types four ticks, panned to its column.
    columns = [-0.50, -0.15, 0.15, 0.50]
    for k in range(9):
        c = 10.5 + k * 0.5
        for t in grid_times(c, c + 0.5):
            place(t, snd_tick(TICK_LEVEL * rng.uniform(0.75, 1.0)), columns[k % 4] + rng.uniform(-0.05, 0.05))


def add_seal():
    place(19.5, snd_collapse(COLLAPSE_LEVEL))          # collapse into the 20.0 cut
    place(20.5, snd_thump(0.30))                       # seal stamp
    place(20.5, snd_chime(86, 0.14))                   # accent chime: D6
    place(20.5, snd_chime(93, 0.06))                   # with A6 for a major shimmer
    place(25.0, snd_swish(0.08))                       # terminal clears


# ---------------------------------------------------------------------------
# Master: limiter, fades, output
# ---------------------------------------------------------------------------
def limit(x, ceiling, half_s=0.005):
    """Look-ahead gain limiter. Gain is pulled down ahead of each peak and released smoothly.

    r = ceiling / stereo peak where the peak exceeds the ceiling, else 1. A min filter over
    +-5 ms, then a mean over +-5 ms, gives a smooth gain that never rises above r at any
    sample, so no output sample exceeds the ceiling.
    """
    W = int(round(half_s * SR))
    peak = np.max(np.abs(x), axis=0)
    r = np.minimum(1.0, ceiling / np.maximum(peak, 1e-12))
    padded = np.concatenate([np.ones(W), r, np.ones(W)])
    gmin = np.ones(N)
    for d in range(2 * W + 1):
        gmin = np.minimum(gmin, padded[d:d + N])
    c = np.concatenate([[0.0], np.cumsum(np.concatenate([np.ones(W), gmin, np.ones(W)]))])
    width = 2 * W + 1
    gs = (c[width:width + N] - c[:N]) / width
    return x * gs


def fade_curve():
    """Raised-cosine fade in over 0.0-0.3 s and fade out over 28.5-30.0 s. Zero at both ends."""
    g = np.ones(N)
    i_in = int(round(0.30 * SR))
    g[:i_in] = 0.5 - 0.5 * np.cos(np.pi * np.arange(i_in) / i_in)
    i0 = int(round(28.5 * SR))
    k = np.arange(i0, N)
    g[i0:] = 0.5 + 0.5 * np.cos(np.pi * (k - i0) / (N - i0))
    return g


def write_wav(path, x):
    """24-bit PCM, stereo, interleaved. x has shape (2, N) in [-1, 1]."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scaled = np.round(np.clip(x.T, -1.0, 1.0 - 2.0 ** -23) * 8_388_607.0).astype("<i4")
    raw = np.ascontiguousarray(scaled).view(np.uint8).reshape(-1, 4)[:, :3]
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(raw.tobytes())


def report(x):
    peak = float(np.max(np.abs(x)))
    rms = float(np.sqrt(np.mean(x * x)))
    print(f"wrote {OUT_PATH}")
    print(f"samples={x.shape[1]} duration={x.shape[1] / SR:.6f} s")
    print(f"peak={peak:.4f} ({20 * math.log10(max(peak, 1e-12)):.2f} dBFS)  "
          f"rms={20 * math.log10(max(rms, 1e-12)):.1f} dBFS  nan={bool(np.isnan(x).any())}")


def main():
    add_pad()
    add_sub_pulses()
    add_intro()
    add_typing()
    add_outputs()
    add_split()
    add_seal()

    mix = limit(BUS * MASTER, CEILING)
    mix *= fade_curve()
    assert np.all(np.isfinite(mix))
    write_wav(OUT_PATH, mix)
    report(mix)


if __name__ == "__main__":
    main()
