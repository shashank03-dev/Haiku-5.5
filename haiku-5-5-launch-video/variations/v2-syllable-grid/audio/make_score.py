#!/usr/bin/env python3
"""Original 30 s score for variation v2-syllable-grid ("Syllable Grid").

Hypnotic and metronomic at 120 BPM (one beat = 0.5 s, one wave step = 0.5 s).
Cue times follow variations/PLAN.md:

    0.0 - 10.0   sine-bass pulse on every beat, soft tick on every wave step,
                 an airy D-minor pad and breath that open across the act
    1.0          soft chime as the centre cells part
    5.0 - 9.75   syllable plucks on the 0.25 s grid, counted 5 - 7 - 5
    8.0 - 10.0   long downward filtered sweep, into a deep hit at 10.0
    10.0 - 20.0  parallax arpeggio: a near layer, and a far layer an octave down
    15.0 - 19.75 three hard-cut cards (click + chord stab) and a soft hi-hat build
    20.0         invert impact, then a hi-hat strobe on 0.25 s steps
    25.0         hi-hats cut hard at the frame, seal thud
    26.5         bell for "Meet Haiku 5.5."
    27.5         warm Dm9 chord under the caption, fading to silence by 30.0

Everything is synthesised here with numpy: sines, FFT-filtered noise, a seeded
impulse response for the reverb and a look-ahead limiter. No samples, no
downloaded audio, no copyrighted material.

Output: out/variations/v2-syllable-grid/score.wav, 48 kHz, 24-bit PCM, stereo,
exactly 1,440,000 frames. Run from anywhere:
    python3 variations/v2-syllable-grid/audio/make_score.py
"""

import math
import os
import wave

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

# ---------------------------------------------------------------------------
# Global setup
# ---------------------------------------------------------------------------
SR = 48_000
DURATION = 30.0
N = int(round(DURATION * SR))            # 1,440,000 frames = 30.000 s
SEED = 20261002                          # fixed seed: the score is reproducible
CEILING = 0.885                          # limiter ceiling, -1.06 dBFS (spec: at or below -1.0)
BEAT = 0.5                               # 120 BPM: one beat, and one wave step, is 0.5 s
GRID = 0.25                              # 0.25 s grid: syllables, arpeggio, hi-hat run

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT_PATH = os.path.join(ROOT, "out", "variations", "v2-syllable-grid", "score.wav")

rng = np.random.default_rng(SEED)
T = np.arange(N) / SR
DRY = np.zeros((2, N))                   # dry stereo bus
WET = np.zeros((2, N))                   # reverb send bus
HATS = np.zeros((2, N))                  # hi-hat bus, gated hard at 25.0

SECTIONS = [0.0, 5.0, 10.0, 15.0, 20.0, 25.0, 27.5, 30.0]

# ---------------------------------------------------------------------------
# Harmony and cue tables (D minor)
# ---------------------------------------------------------------------------
# (start, end, chord name). Chords crossfade over XFADE at each boundary.
CHORDS = [
    (0.0, 2.0, "Dm"), (2.0, 4.0, "Bb"), (4.0, 6.0, "Gm"), (6.0, 10.0, "A"),
    (10.0, 12.0, "Dm"), (12.0, 14.0, "Bb"), (14.0, 16.0, "Gm"), (16.0, 18.0, "Dm"),
    (18.0, 20.0, "Bb"), (20.0, 22.0, "Gm"), (22.0, 24.0, "A"), (24.0, 26.0, "Bb"),
    (26.0, 27.5, "A"), (27.5, 30.0, "Dm"),
]
XFADE = 0.25
PAD_VOICES = {                                   # airy pad voicings (Hz)
    "Dm": [146.83, 174.61, 220.00, 261.63],      # D3 F3 A3 C4
    "Bb": [116.54, 146.83, 174.61, 220.00],      # Bb2 D3 F3 A3
    "Gm": [98.00, 146.83, 196.00, 233.08],       # G2 D3 G3 Bb3
    "A": [110.00, 164.81, 220.00, 277.18],       # A2 E3 A3 C#4
}
BASS_ROOT = {"Dm": 73.42, "Bb": 58.27, "Gm": 49.00, "A": 55.00}   # D2 Bb1 G1 A1
ARP_TONES = {                                    # arpeggio tones, octaves 4 to 6 (Hz)
    "Dm": [587.33, 698.46, 880.00, 1174.66],     # D5 F5 A5 D6
    "Bb": [466.16, 587.33, 698.46, 932.33],      # Bb4 D5 F5 Bb5
    "Gm": [392.00, 466.16, 587.33, 783.99],      # G4 Bb4 D5 G5
    "A": [440.00, 554.37, 659.26, 880.00],       # A4 C#5 E5 A5
}
ARP_ORDER = [0, 2, 1, 3]
STAB_TONES = {                                   # card chord stabs (Hz)
    "Dm": [293.66, 349.23, 440.00],
    "Bb": [233.08, 293.66, 349.23],
    "Gm": [196.00, 233.08, 293.66],
    "A": [220.00, 277.18, 329.63],
}
# Syllable rows (start, pitches, pan). Counts are 5, 7, 5: one pluck per syllable.
SYLLABLE_ROWS = [
    (5.0, [587.33, 698.46, 880.00, 1046.50, 880.00], -0.35),
    (6.5, [783.99, 880.00, 1174.66, 1046.50, 880.00, 698.46, 587.33], 0.0),
    (8.5, [698.46, 587.33, 880.00, 698.46, 587.33], 0.35),
]
AIR_GRID = np.geomspace(400.0, 6000.0, 12)      # cutoffs for the breath layer
SWEEP_GRID = np.geomspace(110.0, 7000.0, 16)    # cutoffs for the downward sweep


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def chord_at(t):
    for a, b, name in CHORDS:
        if a <= t < b:
            return name
    return CHORDS[-1][2]


def smooth_up(t, lo, hi):
    """0 before lo, 1 after hi, raised-cosine in between."""
    return 0.5 - 0.5 * np.cos(np.pi * np.clip((t - lo) / (hi - lo), 0.0, 1.0))


def fade(n, attack_s, release_s):
    """Linear in and out ramps: a one-shot starts and ends at zero, so it never clicks."""
    i = np.arange(n)
    a = np.minimum(1.0, i / max(1.0, attack_s * SR))
    r = np.minimum(1.0, (n - 1 - i) / max(1.0, release_s * SR))
    return a * r


def put(t0, sig, pan=0.0, send=0.0, bus=None):
    """Add a mono one-shot starting at t0 (seconds). Constant-power pan in [-1, 1].

    `send` feeds the reverb bus. `bus` defaults to the dry bus.
    """
    bus = DRY if bus is None else bus
    sig = np.asarray(sig, dtype=float)
    i0 = int(round(t0 * SR))
    a, b = max(0, -i0), min(len(sig), N - i0)
    if b <= a:
        return
    ang = (pan + 1.0) * np.pi / 4.0
    seg = sig[a:b]
    left, right = math.cos(ang) * seg, math.sin(ang) * seg
    bus[0, i0 + a:i0 + b] += left
    bus[1, i0 + a:i0 + b] += right
    if send:
        WET[0, i0 + a:i0 + b] += send * left
        WET[1, i0 + a:i0 + b] += send * right


def lp_mask(freqs, fc):
    """Frequency-domain low-pass: 1 below fc, 0 above, with a 0.6 octave transition."""
    x = np.log2(np.maximum(freqs, 1.0) / fc)
    return 0.5 + 0.5 * np.cos(np.pi * np.clip((x + 0.3) / 0.6, 0.0, 1.0))


def swept_lowpass(x, fc_t, grid):
    """Low-pass whose cutoff varies per sample (fc_t, Hz).

    Built as a crossfade between fixed FFT low-passes at the cutoffs in `grid`,
    interpolated linearly in log-frequency. Vectorised, so it runs on the whole timeline.
    """
    m = len(x)
    nfft = 1 << int(np.ceil(np.log2(2 * m)))
    spec = np.fft.rfft(x, nfft)
    freqs = np.fft.rfftfreq(nfft, 1.0 / SR)
    g = np.log(grid)
    lf = np.log(np.maximum(fc_t, 1.0))
    idx = np.clip(np.searchsorted(g, lf, side="right") - 1, 0, len(g) - 2)
    frac = np.clip((lf - g[idx]) / (g[idx + 1] - g[idx]), 0.0, 1.0)
    out = np.zeros(m)
    for k, fc in enumerate(grid):
        w = np.where(idx == k, 1.0 - frac, 0.0) + np.where(idx == k - 1, frac, 0.0)
        if np.any(w):
            out += w * np.fft.irfft(spec * lp_mask(freqs, fc), nfft)[:m]
    return out


def fft_convolve(x, h):
    n = len(x) + len(h) - 1
    nfft = 1 << int(np.ceil(np.log2(n)))
    return np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(h, nfft), nfft)[: len(x)]


# ---------------------------------------------------------------------------
# Sound generators (mono, one-shot). Each returns a float array.
# ---------------------------------------------------------------------------
def sine_bass(f0, level, dur=0.9, tau=0.24):
    """Sine-bass pulse with a short pitch drop for punch."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    drop, dtau = 0.12, 0.02
    phase = 2 * np.pi * (f0 * t + f0 * drop * dtau * (1.0 - np.exp(-t / dtau)))
    body = np.sin(phase) + 0.06 * np.sin(2.0 * phase)
    return level * body * np.exp(-t / tau) * fade(n, 0.002, 0.01)


def sub_hit(f0, level, tau, drop=1.2, dtau=0.12, dur=3.0):
    """Deep hit: a sine that falls from (1 + drop) times f0, with a soft low thump."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    phase = 2 * np.pi * (f0 * t + f0 * drop * dtau * (1.0 - np.exp(-t / dtau)))
    body = np.sin(phase) + 0.25 * np.sin(2.0 * phase) * np.exp(-t / 0.25)
    thump = 0.3 * np.convolve(rng.standard_normal(n), np.ones(24) / 24, mode="same") * np.exp(-t / 0.05)
    return level * (body * np.exp(-t / tau) + thump) * fade(n, 0.002, 0.03)


def tick(level, f=2400.0):
    """Soft wood-like tick for each wave step."""
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.004)
    click = 0.4 * rng.standard_normal(n) * np.exp(-t / 0.0012)
    return level * (tone + click) * fade(n, 0.001, 0.004)


def pluck(f, level, tau=0.14, bright=0.3):
    """Plucked sine with a faster-dying second partial."""
    n = int(min(6.0 * tau, 1.5) * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * f * t
    body = np.sin(ph) + bright * np.sin(2.0 * ph) * np.exp(-t / (0.4 * tau))
    return level * body * np.exp(-t / tau) * fade(n, 0.002, 0.005)


def hat(level, tau, dur=None):
    """Filtered noise burst: a second difference of white noise is a steep high-pass."""
    n = int((dur if dur else min(6.0 * tau, 0.5)) * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    y = x - np.concatenate(([0.0], x[:-1]))
    y = y - np.concatenate(([0.0], y[:-1]))
    return level * (y / 2.45) * np.exp(-t / tau) * fade(n, 0.001, 0.003)


def bell(f, level, dur=3.0):
    """Inharmonic bell: the root plus two quieter partials that decay faster."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    body = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.6)
            + 0.35 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.25)
            + 0.12 * np.sin(2 * np.pi * 5.40 * f * t) * np.exp(-t / 0.10))
    return level * body * fade(n, 0.002, 0.05)


def warm_chord(level, dur):
    """Warm Dm9 voicing: sines with a soft second harmonic, slow attack."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    tones = [(73.42, 0.5), (146.83, 1.0), (174.61, 0.8), (220.00, 0.9), (261.63, 0.7), (329.63, 0.6)]
    s = sum(a * (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(4 * np.pi * f * t)) for f, a in tones) / 4.0
    return level * s * fade(n, 0.25, 0.01)


def downward_sweep(dur, level):
    """Long downward filtered sweep: a saw whose pitch falls from 330 to 55 Hz, with a
    low-pass that closes from 7 kHz to 120 Hz, swelling into the deep hit."""
    n = int(dur * SR)
    u = np.arange(n) / n
    f = 330.0 * (55.0 / 330.0) ** u
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = sum(np.sin(h * ph) / h for h in range(1, 11)) / 1.6
    src = 0.6 * saw + 0.3 * rng.standard_normal(n)
    cutoff = 7000.0 * (120.0 / 7000.0) ** u
    body = swept_lowpass(src, cutoff, SWEEP_GRID)
    swell = 0.1 + 0.9 * u ** 1.5
    return level * body * swell * fade(n, 0.01, 0.01)


# ---------------------------------------------------------------------------
# Continuous layers (pad, breath)
# ---------------------------------------------------------------------------
def chord_weights():
    """Summed crossfade weight per chord name. The weights add up to 1 at every instant."""
    w = {}
    last = len(CHORDS) - 1
    for i, (a, b, name) in enumerate(CHORDS):
        up = smooth_up(T, a - XFADE / 2, a + XFADE / 2) if i > 0 else 1.0
        down = smooth_up(T, b - XFADE / 2, b + XFADE / 2) if i < last else 0.0
        w[name] = w.get(name, 0.0) + up * (1.0 - down)
    return w


def pad_layer():
    """Airy pad: detuned sine voices, crossfaded per chord. Opens across the first 10 s."""
    weights = chord_weights()
    env = np.interp(T, [0.0, 10.0, 20.0, 25.0, 27.5, 30.0], [0.0, 0.42, 0.34, 0.30, 0.36, 0.0])
    omega = 2 * np.pi * 0.23                      # slow 0.23 Hz vibrato
    out = np.zeros((2, N))
    for ch, phi in enumerate((0.0, 1.9)):         # a different vibrato phase per ear
        acc = np.zeros(N)
        for name, g in weights.items():
            voice = np.zeros(N)
            for i, f in enumerate(PAD_VOICES[name]):
                depth = f * 0.0025 / 0.23         # 0.25 % pitch wobble, in radians
                ph = 2 * np.pi * f * T - depth * np.cos(omega * T + phi + 1.3 * i)
                voice += np.sin(ph) + 0.25 * np.sin(2.0 * ph)
            acc += g * voice
        out[ch] = env * 0.0625 * acc
    return out


def breath_layer():
    """Band-limited noise: a cutoff that opens from 450 Hz to 5 kHz over the first 10 s."""
    cutoff = 450.0 * (5000.0 / 450.0) ** (np.minimum(T, 10.0) / 10.0)
    env = np.interp(T, [0.0, 10.0, 20.0, 30.0], [0.0, 0.10, 0.06, 0.0])
    out = np.zeros((2, N))
    for ch in range(2):
        out[ch] = env * swept_lowpass(rng.standard_normal(N), cutoff, AIR_GRID)
    return out


# ---------------------------------------------------------------------------
# Score sections, placed on their cue times
# ---------------------------------------------------------------------------
def bass_level(t):
    if t < 10.0:
        return 0.50
    if t < 20.0:
        return 0.58
    if t < 25.0:
        return 0.50
    return 0.42


def add_pulse_and_ticks():
    """Sine-bass pulse on every beat (0.0 to 27.5), ticks on the wave steps."""
    for k in range(56):
        t0 = k * BEAT
        accent = 1.0 if k % 4 == 0 else 0.82
        put(t0, sine_bass(BASS_ROOT[chord_at(t0)], bass_level(t0) * accent))
    for k in range(60):
        t0 = k * BEAT
        if t0 < 15.0 or 25.0 <= t0 < 27.5:
            put(t0, tick(0.20), pan=0.35 * math.sin(2 * math.pi * k / 10), send=0.1)


def add_hook_and_syllables():
    """1.0 soft chime as the centre cells part. 5.0 to 9.75 syllable plucks, 5 - 7 - 5."""
    put(1.0, pluck(587.33, 0.16, tau=0.4), send=0.35)
    for start, tones, pan in SYLLABLE_ROWS:
        for i, f in enumerate(tones):
            put(start + i * GRID, pluck(f, 0.22, tau=0.10), pan=pan, send=0.2)


def add_sweep_and_hit():
    """8.0 to 10.0 long downward sweep, into a deep hit (D1) at the 10.0 interrupt."""
    put(8.0, downward_sweep(2.0, 0.30), send=0.25)
    put(10.0, sub_hit(36.71, 0.70, tau=0.8, drop=1.2, dtau=0.12, dur=3.0), send=0.35)


def add_arpeggio():
    """10.0 to 20.0 parallax arpeggio. Near layer at full level; far layer an octave
    down, echoed 0.125 s later, so the grid reads at two depths."""
    for j in range(40):
        t0 = 10.0 + j * GRID
        f = ARP_TONES[chord_at(t0)][ARP_ORDER[j % 4]]
        side = 1.0 if j % 2 == 0 else -1.0
        put(t0, pluck(f, 0.085, tau=0.16), pan=0.25 * side, send=0.2)
        put(t0 + GRID / 2, pluck(f / 2, 0.05, tau=0.24), pan=-0.4 * side, send=0.4)


def add_cards():
    """15.0 to 20.0: three cards on 1.5 s hard cuts (click + chord stab), soft hats on 0.25 s."""
    for j in range(20):
        t0 = 15.0 + j * GRID
        put(t0, hat(0.10 if j % 2 == 0 else 0.06, 0.035, dur=0.16),
            pan=0.2 * (-1) ** j, bus=HATS)
    for t0 in (15.0, 16.5, 18.0):
        put(t0, hat(0.25, 0.008, dur=0.04))
        for f in STAB_TONES[chord_at(t0)]:
            put(t0, pluck(f, 0.09, tau=0.35), send=0.3)


def add_strobe():
    """20.0 invert impact, then a hi-hat run on 0.25 s steps. Cut hard at 25.0 (see gate)."""
    put(20.0, sub_hit(49.00, 0.55, tau=0.35, drop=1.6, dur=1.6), send=0.2)
    put(20.0, hat(0.16, 0.5, dur=1.4), send=0.3)                    # crash
    for j in range(20):
        t0 = 20.0 + j * GRID
        ramp = 0.75 + 0.45 * j / 19
        accent = 1.25 if j % 2 == 0 else 0.8
        tau = 0.11 if j % 4 == 3 else 0.06
        put(t0, hat(0.20 * ramp * accent, tau, dur=0.3), pan=0.45 * (-1) ** j, bus=HATS)


def add_ending():
    """25.0 seal thud on the cut, 26.5 bell for the line, 27.5 warm chord under the caption."""
    put(25.0, sub_hit(58.27, 0.50, tau=0.45, drop=0.9, dtau=0.08, dur=2.0), send=0.2)
    put(25.0, hat(0.12, 0.012, dur=0.06))
    put(26.5, bell(880.0, 0.16), pan=0.1, send=0.5)
    put(27.5, warm_chord(0.14, dur=2.5), send=0.45)


# ---------------------------------------------------------------------------
# Master: reverb, limiter, fades, WAV
# ---------------------------------------------------------------------------
def make_ir(length_s=2.4, tau=0.42, predelay_s=0.015):
    """Seeded exponential-noise impulse response, lightly darkened, normalised to unit energy."""
    n = int(length_s * SR)
    t = np.arange(n) / SR
    h = rng.standard_normal(n) * np.exp(-t / tau)
    h = np.convolve(h, np.ones(6) / 6, mode="same")
    h[: int(predelay_s * SR)] = 0.0
    return h / np.sqrt(np.sum(h * h))


def reverb(wet):
    out = np.zeros_like(wet)
    for ch in range(2):
        out[ch] = 0.5 * fft_convolve(wet[ch], make_ir())
    return out


def soft_limit(x, ceiling, look_s=0.006):
    """Look-ahead peak limiter with a smooth gain curve.

    The required gain is the minimum over +-look (so each peak is seen in advance),
    then averaged over +-look/2. Because the averaging half-width is at most the
    look-ahead, the smoothed gain never exceeds the raw requirement, so no sample
    goes above `ceiling`.
    """
    need = np.minimum(1.0, ceiling / np.maximum(np.max(np.abs(x), axis=0), 1e-12))
    w = int(round(look_s * SR))
    padded = np.concatenate([np.ones(w), need, np.ones(w)])
    gmin = sliding_window_view(padded, 2 * w + 1).min(axis=1)
    h = w // 2
    gain = np.convolve(gmin, np.ones(2 * h + 1) / (2 * h + 1), mode="same")
    return x * gain


def master_fades(x):
    """Fade in over the first 30 ms, out from 28.5 to silence at 30.0."""
    g = smooth_up(T, 0.0, 0.03) * (1.0 - smooth_up(T, 28.5, 30.0))
    return x * g[None, :]


def write_wav(path, stereo):
    """24-bit PCM, stereo, 48 kHz."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pcm = np.round(np.clip(stereo, -1.0, 1.0).T * 8388607.0).astype("<i4")
    raw = np.ascontiguousarray(pcm).view(np.uint8).reshape(-1, 2, 4)[:, :, :3]
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(raw.tobytes())


def report(stereo):
    assert stereo.shape == (2, N), stereo.shape
    assert np.isfinite(stereo).all(), "NaN or inf in output"
    peak = float(np.max(np.abs(stereo)))
    print(f"frames {stereo.shape[1]}  duration {stereo.shape[1] / SR:.3f} s")
    print(f"peak {peak:.4f} ({20 * math.log10(peak):.2f} dBFS)  "
          f"first sample {stereo[0, 0]:+.2e}  last sample {stereo[0, -1]:+.2e}")
    for a, b in zip(SECTIONS[:-1], SECTIONS[1:]):
        seg = stereo[:, int(a * SR):int(b * SR)]
        rms = math.sqrt(float(np.mean(seg ** 2)))
        print(f"  {a:5.1f} to {b:5.1f} s   rms {20 * math.log10(rms + 1e-12):7.1f} dBFS")


def main():
    # Continuous layers first: they sit under every event.
    pad = pad_layer()
    DRY[:] += pad
    WET[:] += 0.25 * pad
    air = breath_layer()
    DRY[:] += air
    WET[:] += 0.2 * air

    # Event layers, in cue order.
    add_pulse_and_ticks()
    add_hook_and_syllables()
    add_sweep_and_hit()
    add_arpeggio()
    add_cards()
    add_strobe()
    add_ending()

    # The hi-hats stop dead at 25.0: a 2 ms cosine gate, so the cut is hard but click-free.
    gate = 1.0 - smooth_up(T, 24.998, 25.0)
    mix = DRY + HATS * gate[None, :] + reverb(WET)

    stereo = master_fades(soft_limit(mix, CEILING))
    report(stereo)
    write_wav(OUT_PATH, stereo)
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
