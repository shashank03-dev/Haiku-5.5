#!/usr/bin/env python3
"""Original 30 s score and sound design for the Claude Haiku 5.5 launch film.

Everything is synthesised here with numpy: sine oscillators, noise bursts,
one-pole filters, a seeded procedural impulse response for the reverb, and a
soft ceiling on the output. No samples, no downloaded audio, no copyrighted
material.

Cue times come from DESIGN.md ("Timeline"). The picture was built against
them, so every event is placed at its absolute second.

Output: out/score.wav, 48 kHz, 24-bit PCM, stereo, exactly 1,440,000 samples.
Run from the project root:  python3 audio/make_score.py
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
BEAT = 0.5                               # 120 BPM, 4/4: one beat = 0.5 s
EIGHTH = 0.25
SIXTEENTH = 0.125
SEED = 20261008                          # fixed seed: the score is reproducible
SOFT_CEILING = 0.95                      # tanh ceiling, the output never reaches it
TARGET_PEAK = 0.891                      # -1.0 dBFS
REVERB_LEVEL = 0.45
PAD_LEVEL = 0.15

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PATH = os.path.join(ROOT_DIR, "out", "score.wav")

rng = np.random.default_rng(SEED)
DRY = np.zeros((2, N))                   # dry stereo bus
SEND = np.zeros((2, N))                  # reverb send bus

# ---------------------------------------------------------------------------
# Harmony, melody and tile pitches
# ---------------------------------------------------------------------------
# (start, end, chord). Chords cross-fade over 0.35 s at each boundary.
CHORD_PLAN = [
    (0.0, 2.0, "Am9"), (2.0, 4.0, "Fmaj7"), (4.0, 6.0, "Cmaj7"), (6.0, 8.0, "G6"),
    (8.0, 10.0, "Am9"), (10.0, 12.0, "Fmaj7"), (12.0, 14.0, "Cmaj7"), (14.0, 16.0, "G6"),
    (16.0, 19.0, "Am9"),
    (19.0, 21.0, "Fmaj7"), (21.0, 23.0, "G6"),          # chord change at 19.0
    (23.0, 25.0, "Cmaj7"), (25.0, 26.6, "G6"),
    (26.6, 29.0, "Fmaj7"), (29.0, 31.0, "Am9"),          # outro hit 26.6, final chord 29.0
]
CHORD_NOTES = {                          # MIDI pitches of the pad voicings
    "Am9": [57, 60, 64, 67, 71],
    "Fmaj7": [53, 57, 60, 64, 67],
    "Cmaj7": [48, 55, 59, 64],
    "G6": [55, 59, 62, 64],
}
CHORD_ROOT = {"Am9": 33, "Fmaj7": 29, "Cmaj7": 36, "G6": 31}   # sub bass: A1 F1 C2 G1

# Plucked motif: (offset in seconds inside an 8 s loop, MIDI pitch).
# Every note is a chord tone of the chord sounding at that moment.
MOTIF = [(0.0, 76), (1.0, 72), (2.5, 69), (3.5, 77),
         (4.0, 72), (5.5, 79), (6.0, 74), (7.0, 71)]
# (start, end, level): sparse intro, full return at the drop, quiet in s06.
MOTIF_WINDOWS = [(3.0, 6.0, 0.22), (7.0, 11.0, 0.33), (15.0, 19.0, 0.25),
                 (19.0, 23.0, 0.12), (26.6, 28.6, 0.16)]

# Syllable tiles (DESIGN.md TILE cues): 5 + 7 + 5 = 17 clicks.
TILE_TIMES = [3.25, 3.375, 3.50, 3.625, 3.75,
              4.00, 4.125, 4.25, 4.375, 4.50, 4.625, 4.75,
              5.25, 5.375, 5.50, 5.625, 5.75]
TILE_ROWS = [(0, 5), (5, 12), (12, 17)]
PENTATONIC = [69, 72, 74, 76, 79, 81, 84]      # A4 C5 D5 E5 G5 A5 C6


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------
def t_axis(n):
    return np.arange(n) / SR


def midi_hz(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


def attack(n, ms):
    """Linear fade-in: the first sample is zero, so one-shots never click on start."""
    return np.minimum(1.0, np.arange(n) / max(1.0, ms * 1e-3 * SR))


def release(n, ms):
    """Linear fade-out over the last `ms` milliseconds: one-shots end at zero."""
    return np.minimum(1.0, (n - 1 - np.arange(n)) / max(1.0, ms * 1e-3 * SR))


def noise(n):
    return rng.standard_normal(n)


def lp1(x, fc):
    """One-pole lowpass. `fc` in Hz, scalar or per-sample. Used on short segments."""
    x = np.asarray(x, dtype=float)
    a = (1.0 - np.exp(-2.0 * np.pi * np.broadcast_to(np.asarray(fc, dtype=float), x.shape) / SR)).tolist()
    out, s = [], 0.0
    for i, xi in enumerate(x.tolist()):
        s += a[i] * (xi - s)
        out.append(s)
    return np.array(out)


def hp1(x, fc):
    x = np.asarray(x, dtype=float)
    return x - lp1(x, fc)


def moving_average(x, w):
    c = np.cumsum(np.concatenate(([0.0], x)))
    y = np.zeros(len(x))
    m = len(x) - w + 1
    y[:m] = (c[w:w + m] - c[:m]) / w
    return y


def steps(t0, t1, step):
    """(index, time) pairs on a grid of `step` seconds with t0 <= t < t1."""
    k0 = math.ceil(t0 / step - 1e-9)
    k1 = math.ceil(t1 / step - 1e-9)
    return [(k, k * step) for k in range(k0, k1)]


def chord_at(t):
    for a, b, name in CHORD_PLAN:
        if a <= t < b:
            return name
    return CHORD_PLAN[-1][2]


def root_at(t):
    return CHORD_ROOT[chord_at(t)]


def place(t0, sig, pan=0.0, send=0.0):
    """Add a mono one-shot to the buses, starting at time t0 (seconds).

    pan in [-1, 1] (constant power). `send` feeds the reverb bus.
    """
    sig = np.asarray(sig, dtype=float)
    ang = (pan + 1.0) * np.pi / 4.0
    i0 = int(round(t0 * SR))
    a = max(0, -i0)
    b = min(len(sig), N - i0)
    if b <= a:
        return
    s = sig[a:b]
    left, right = math.cos(ang) * s, math.sin(ang) * s
    DRY[0, i0 + a:i0 + b] += left
    DRY[1, i0 + a:i0 + b] += right
    if send:
        SEND[0, i0 + a:i0 + b] += send * left
        SEND[1, i0 + a:i0 + b] += send * right


# ---------------------------------------------------------------------------
# Sound generators (mono, one-shot). Each returns a float array.
# ---------------------------------------------------------------------------
def snd_kick(level):
    """Punchy sine kick: pitch falls from 150 Hz to 46 Hz, plus a tiny beater click."""
    n = int(0.45 * SR)
    t = t_axis(n)
    tau_p = 0.035
    phase = 2 * np.pi * (46.0 * t + (150.0 - 46.0) * tau_p * (1.0 - np.exp(-t / tau_p)))
    body = np.sin(phase) * np.exp(-t / 0.16)
    bn = int(0.02 * SR)                                   # the beater click lasts 20 ms
    beater = np.zeros(n)
    beater[:bn] = lp1(hp1(noise(bn), 2500.0), 7000.0) * np.exp(-t[:bn] / 0.004) * 0.3
    return level * (body + beater) * attack(n, 0.5) * release(n, 10.0)


def snd_sub(midi, level, dur=0.25, tau=0.12):
    """Sub bass note: sine with soft 2nd and 3rd harmonics so it reads on small speakers."""
    n = int(dur * SR)
    t = t_axis(n)
    w = 2 * np.pi * midi_hz(midi) * t
    tone = np.sin(w) + 0.30 * np.sin(2 * w) + 0.10 * np.sin(3 * w)
    return level * tone * np.exp(-t / tau) * attack(n, 3.0) * release(n, 10.0)


def snd_clap(level):
    """Clap: band-passed noise with three flam bursts and a short tail."""
    n = int(0.25 * SR)
    t = t_axis(n)
    body = lp1(hp1(noise(n), 900.0), 3200.0)
    env = np.zeros(n)
    for t_k in (0.0, 0.011, 0.023):
        env += np.where(t >= t_k, np.exp(-(t - t_k) / 0.006), 0.0)
    env += np.where(t >= 0.03, 0.6 * np.exp(-(t - 0.03) / 0.10), 0.0)
    return level * body * env * attack(n, 0.3) * release(n, 8.0)


def snd_snare(level):
    """Tight snare: short pitched body (185 Hz) plus high-passed noise crack."""
    n = int(0.2 * SR)
    t = t_axis(n)
    tau_p = 0.02
    phase = 2 * np.pi * (185.0 * t + 60.0 * tau_p * (1.0 - np.exp(-t / tau_p)))
    body = 0.6 * np.sin(phase) * np.exp(-t / 0.06)
    crack = lp1(hp1(noise(n), 1500.0), 9000.0) * np.exp(-t / 0.085) * 0.8
    return level * (body + crack) * attack(n, 0.3) * release(n, 8.0)


def snd_hat(level, tau=0.035):
    """Closed hat: high-passed noise, very short."""
    n = int(0.09 * SR)
    t = t_axis(n)
    x = lp1(hp1(hp1(noise(n), 6000.0), 6000.0), 13000.0)
    return level * x * np.exp(-t / tau) * attack(n, 0.3) * release(n, 5.0)


def snd_tick(level, freq, noise_fc=2500.0):
    """Small tick: a short sine blip plus band-limited noise. Used for the grid, the seal and typing."""
    n = int(0.025 * SR)
    t = t_axis(n)
    x = lp1(hp1(noise(n), noise_fc), 7000.0)
    tone = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.003)
    return level * (0.6 * x * np.exp(-t / 0.0045) + 0.5 * tone) * attack(n, 0.3) * release(n, 3.0)


def snd_tile(midi, level):
    """Woody syllable click, about 60 ms: a sine with a fast pitch settle, plus a noise knock."""
    n = int(0.07 * SR)
    t = t_axis(n)
    f = midi_hz(midi)
    tau_g = 0.01
    phase = 2 * np.pi * (f * t + f * 0.02 * tau_g * (1.0 - np.exp(-t / tau_g)))
    tone = np.sin(phase) * np.exp(-t / 0.018)
    knock = hp1(noise(n), 2500.0) * np.exp(-t / 0.005) * 0.5
    return level * (0.8 * tone + knock) * attack(n, 0.4) * release(n, 8.0)


def snd_pluck(midi, tau=0.22):
    """Plucked motif note: sine with a faster-decaying 2nd and 3rd partial."""
    n = int(0.9 * SR)
    t = t_axis(n)
    w = 2 * np.pi * midi_hz(midi) * t
    x = np.sin(w) + 0.25 * np.sin(2 * w) * np.exp(-t / 0.06) + 0.08 * np.sin(3 * w) * np.exp(-t / 0.03)
    return x * np.exp(-t / tau) * attack(n, 3.0) * release(n, 30.0)


def snd_chime(midi, level, dur=1.6, tau=0.45):
    """Soft bell chime: sine plus a faint inharmonic partial."""
    n = int(dur * SR)
    t = t_axis(n)
    w = 2 * np.pi * midi_hz(midi) * t
    x = np.sin(w) + 0.20 * np.sin(2.01 * w) * np.exp(-t / 0.2)
    return level * x * np.exp(-t / tau) * attack(n, 4.0) * release(n, 40.0)


def snd_pop(midi, level):
    """Icon pop: short sine with a tiny pitch fall (6 percent, settling in 20 ms)."""
    n = int(0.18 * SR)
    t = t_axis(n)
    f = midi_hz(midi)
    tau_g = 0.02
    phase = 2 * np.pi * (f * t + f * 0.06 * tau_g * (1.0 - np.exp(-t / tau_g)))
    return level * np.sin(phase) * np.exp(-t / 0.035) * attack(n, 1.0) * release(n, 10.0)


def snd_thud(f_start, f_end, level, dur=0.35):
    """Low mark thud: a fast downward sine sweep plus a small low-passed impact."""
    n = int(dur * SR)
    t = t_axis(n)
    tau_p = 0.035
    phase = 2 * np.pi * (f_end * t + (f_start - f_end) * tau_p * (1.0 - np.exp(-t / tau_p)))
    body = np.sin(phase) * np.exp(-t / 0.11)
    impact = lp1(noise(n), 350.0) * np.exp(-t / 0.02) * 3.0
    return level * (body + impact) * attack(n, 1.0) * release(n, 30.0)


def snd_thump(level, dur=0.8):
    """Seal impact (deep thump): sine sweep from about 115 Hz down to 40 Hz, plus a low impact."""
    n = int(dur * SR)
    t = t_axis(n)
    tau_p = 0.05
    phase = 2 * np.pi * (40.0 * t + 75.0 * tau_p * (1.0 - np.exp(-t / tau_p)))
    body = np.sin(phase) * np.exp(-t / 0.20)
    impact = lp1(noise(n), 260.0) * np.exp(-t / 0.035) * 4.0
    return level * (body + impact) * attack(n, 1.0) * release(n, 40.0)


def snd_sweep_up(level):
    """WORDMARK: bright, short rising sweep (log frequency glide plus a rising air layer)."""
    dur = 0.5
    n = int(dur * SR)
    t = t_axis(n)
    u = t / dur
    f0, f1 = 420.0, 3600.0
    r = f1 / f0
    phase = 2 * np.pi * f0 * dur / np.log(r) * (r ** u - 1.0)
    tone = np.sin(phase) + 0.3 * np.sin(2 * phase)
    air = hp1(noise(n), 3000.0) * u
    env = (1.0 - np.exp(-t / 0.01)) * np.exp(-t / 0.2)
    return level * (0.75 * tone + 0.5 * air) * env * release(n, 15.0)


def snd_riser(dur, f_lo, f_hi, level, power, tone=None, cut=True):
    """Filtered-noise riser: the lowpass cutoff sweeps up exponentially.

    `tone` = (lo_hz, hi_hz, level) adds a sine glide. `cut=True` ends with a
    short hard-edged cut (a deliberate cut, not a fade).
    """
    n = int(dur * SR)
    t = t_axis(n)
    u = t / dur
    fc = f_lo * (f_hi / f_lo) ** u
    sig = lp1(noise(n), fc) * (level * u ** power)
    if tone is not None:
        t_lo, t_hi, t_level = tone
        r = t_hi / t_lo
        phase = 2 * np.pi * t_lo * dur / np.log(r) * (r ** u - 1.0)
        sig = sig + t_level * np.sin(phase) * u ** power
    return sig * attack(n, 5.0) * release(n, 3.0 if cut else 40.0)


def snd_chord(notes, level, tau, dur):
    """Warm chord hit: sine-additive stack with a soft 2nd partial and a long decay."""
    n = int(dur * SR)
    t = t_axis(n)
    x = np.zeros(n)
    for m in notes:
        w = 2 * np.pi * midi_hz(m) * t
        x += np.sin(w) + 0.2 * np.sin(2 * w)
    x /= len(notes)
    return level * x * np.exp(-t / tau) * attack(n, 15.0) * release(n, 40.0)


# ---------------------------------------------------------------------------
# Event helpers (grid-based groove parts)
# ---------------------------------------------------------------------------
def hats(t0, t1, step, level, accent=1.25, taper=None):
    """Closed hats on a grid. `level` may be a function of t. Odd grid steps get `accent`.

    `taper=(a, b)` fades the hats linearly to zero between a and b.
    """
    for k, t in steps(t0, t1, step):
        lv = level(t) if callable(level) else level
        if accent != 1.0 and k % 2 == 1:
            lv *= accent
        if taper is not None and t >= taper[0]:
            lv *= float(np.clip(1.0 - (t - taper[0]) / (taper[1] - taper[0]), 0.0, 1.0))
        place(t, snd_hat(lv), pan=float(rng.uniform(-0.35, 0.35)))


def kick_grid(t0, t1, level):
    """Kick on every beat, centred (mono-compatible)."""
    for _, t in steps(t0, t1, BEAT):
        place(t, snd_kick(level), pan=0.0)


def claps(t0, t1, level):
    """Clap on beats 2 and 4 (the odd half-beats), centred."""
    for k, t in steps(t0, t1, BEAT):
        if k % 2 == 1:
            place(t, snd_clap(level), pan=0.0, send=0.12)


def sub_hits(t0, t1, step, level, offbeat):
    """Sub bass that follows the chord roots. `offbeat=True` plays only the off 8ths."""
    for k, t in steps(t0, t1, step):
        if offbeat and k % 2 == 0:
            continue
        place(t, snd_sub(root_at(t), level, dur=0.25, tau=0.12), pan=0.0)


def stamp(t0):
    """Seal impact: deep thump plus a short high tick (STAMP at 0.50, STAMP2 at 27.00)."""
    place(t0, snd_thump(0.9), pan=0.0, send=0.05)
    place(t0, snd_tick(0.35, 3400.0), pan=0.0)


# ---------------------------------------------------------------------------
# Pad (continuous, follows CHORD_PLAN)
# ---------------------------------------------------------------------------
def build_pad():
    """Soft pad: sine-additive chords, detuned left and right, cross-faded per CHORD_PLAN."""
    last = len(CHORD_PLAN) - 1
    xf = 0.35
    for i, (a, b, name) in enumerate(CHORD_PLAN):
        t_lo = 0.0 if i == 0 else a - xf / 2
        t_hi = 31.0 if i == last else b + xf / 2
        lo, hi = int(round(t_lo * SR)), min(N, int(round(t_hi * SR)))
        t = np.arange(lo, hi) / SR
        rise_end = 1.6 if i == 0 else a + xf / 2      # the pad enters slowly at 0.0
        env = smoothstep((t - t_lo) / (rise_end - t_lo))
        if i != last:
            env = env * (1.0 - smoothstep((t - (b - xf / 2)) / xf))
        notes = CHORD_NOTES[name]
        for ch, cents in ((0, -4.0), (1, 4.0)):
            s = np.zeros(hi - lo)
            for m in notes:
                w = 2 * np.pi * midi_hz(m) * 2 ** (cents / 1200.0) * t
                s += np.sin(w) + 0.22 * np.sin(2 * w)
            s = s / len(notes) * env * PAD_LEVEL
            DRY[ch, lo:hi] += s
            SEND[ch, lo:hi] += 0.25 * s


# ---------------------------------------------------------------------------
# Sections, one per scene. Cue times as in DESIGN.md.
# ---------------------------------------------------------------------------
def scene_seal():
    """0.0 to 3.0: pad enters, a very quiet 16th tick grid, STAMP at 0.50."""
    for i, (_, t) in enumerate(steps(0.0, 3.0, SIXTEENTH)):
        place(t, snd_tick(0.05, 2000.0), pan=0.25 if i % 2 else -0.25)
    stamp(0.50)                                       # STAMP


def scene_syllables():
    """3.0 to 7.0: rhythm enters (8th hats, light kick and sub on the beat), 17 TILE clicks.

    The 6.0 to 7.0 riser lifts into the drop.
    """
    hats(3.0, 7.0, EIGHTH, 0.42)
    kick_grid(3.0, 7.0, 0.42)
    sub_hits(3.0, 7.0, BEAT, 0.30, offbeat=False)
    for i0, i1 in TILE_ROWS:
        pans = np.linspace(-0.5, 0.5, i1 - i0)
        for j, i in enumerate(range(i0, i1)):
            place(TILE_TIMES[i], snd_tile(PENTATONIC[(i * 3) % 7], 0.45), pan=float(pans[j]), send=0.12)
    place(6.0, snd_riser(1.0, 200.0, 5000.0, 0.18, power=2.5, cut=True))   # lead-in to the drop


def scene_title():
    """7.0 to 11.0: TITLE_KICK drop (kick, sub hit, clap), motif returns, groove holds."""
    place(7.0, snd_kick(1.1), pan=0.0)                                   # TITLE_KICK
    place(7.0, snd_sub(root_at(7.0), 1.0, dur=0.9, tau=0.35), pan=0.0)
    place(7.0, snd_clap(0.9), pan=0.0, send=0.25)
    kick_grid(7.5, 11.0, 0.8)
    claps(7.5, 11.0, 0.5)
    hats(7.0, 11.0, EIGHTH, 0.6)
    sub_hits(7.0, 11.0, EIGHTH, 0.6, offbeat=True)


def scene_particles():
    """11.0 to 15.0: gather swell, a hold, a tight snare roll and a riser cut at 14.9."""
    place(11.0, snd_riser(1.0, 200.0, 7000.0, 0.35, power=2.2, cut=False), send=0.2)  # PARTICLE_GATHER
    hats(11.0, 13.0, EIGHTH, 0.30)
    for _, t in steps(13.0, 14.0, SIXTEENTH):                              # PARTICLE_FLOW: roll
        place(t, snd_snare(0.35 + 0.25 * (t - 13.0)), pan=0.0, send=0.15)
    for _, t in steps(14.0, 14.9, SIXTEENTH / 2):                          # 32nd-note acceleration
        place(t, snd_snare(0.60 + 0.30 * (t - 14.0) / 0.9), pan=0.0, send=0.15)
    place(13.0, snd_riser(1.9, 300.0, 9000.0, 0.40, power=2.0,           # RISER, cut at 14.9
                          tone=(220.0, 1760.0, 0.12), cut=True))


def scene_code():
    """15.0 to 19.0: groove, keyboard ticks from 15.40 to 17.60, two-note chime at 17.80."""
    place(15.0, snd_kick(0.9), pan=0.0)                                  # reset after the cut
    kick_grid(15.5, 19.0, 0.55)
    sub_hits(15.0, 19.0, EIGHTH, 0.45, offbeat=True)
    claps(15.0, 19.0, 0.30)
    hats(15.0, 19.0, EIGHTH, 0.5)
    # CODE_TYPE: 18 ticks, one every 0.125 s from 15.40, +-6 ms jitter, seeded.
    jitter = rng.uniform(-0.006, 0.006, 18)
    amp = rng.uniform(0.6, 1.0, 18)
    pan = rng.uniform(-0.5, 0.5, 18)
    for i in range(18):
        t = min(max(15.40 + 0.125 * i + jitter[i], 15.40), 17.60)
        place(t, amp[i] * snd_tick(0.09, 2400.0, noise_fc=1500.0), pan=float(pan[i]))
    # OUTPUT_IN: two soft chime notes, A5 then E6 (a rising fifth).
    place(17.80, snd_chime(81, 0.22), pan=-0.2, send=0.4)
    place(18.00, snd_chime(88, 0.20), pan=0.2, send=0.4)


def scene_promises():
    """19.0 to 23.0: chord change at 19.0, three icon pops, a lighter groove, motif quiet."""
    for t, midi, pan in ((19.20, 81, -0.3), (19.70, 84, 0.0), (20.20, 88, 0.3)):   # ICON pops
        place(t, snd_pop(midi, 0.22), pan=pan, send=0.25)
    kick_grid(19.0, 23.0, 0.5)
    claps(19.0, 23.0, 0.30)
    sub_hits(19.0, 23.0, EIGHTH, 0.40, offbeat=True)
    hats(19.0, 23.0, EIGHTH, 0.55)


def scene_mark():
    """23.0 to 26.5: three low bar thuds, WORDMARK sweep at 24.50, build to 26.5."""
    for t, f0, f1 in ((23.00, 70.0, 42.0), (23.25, 78.0, 46.0), (23.50, 88.0, 52.0)):   # BAR
        place(t, snd_thud(f0, f1, 0.5), pan=0.0)
    hats(23.0, 24.5, EIGHTH, 0.4)
    place(24.5, snd_sweep_up(0.30), pan=0.0, send=0.2)                  # WORDMARK
    # Build: 16th hats and snare ticks rise, with a riser that is cut at 26.5.
    hats(24.5, 26.5, SIXTEENTH, lambda t: 0.25 + 0.35 * (t - 24.5) / 2.0, accent=1.0)
    for _, t in steps(25.0, 26.5, SIXTEENTH):
        place(t, snd_snare(0.12 + 0.30 * (t - 25.0) / 1.5), pan=0.0, send=0.08)
    place(25.0, snd_riser(1.5, 250.0, 8000.0, 0.35, power=2.0, cut=True))


def scene_outro():
    """26.5 to 30.0: warm chord hit at 26.60, STAMP2 at 27.00, groove thins from 28.6,
    final Am9 at 29.0 with a long tail that is faded to silence by 30.0.
    """
    place(26.60, snd_chord([53, 57, 60, 64, 67], 0.22, tau=1.6, dur=3.0), send=0.5)   # OUTRO_TEXT
    place(26.60, snd_sub(29, 0.45, dur=2.0, tau=0.9), pan=0.0)
    stamp(27.00)                                                        # STAMP2
    kick_grid(27.5, 28.6, 0.6)
    claps(27.0, 28.6, 0.32)
    sub_hits(27.0, 28.6, EIGHTH, 0.40, offbeat=True)
    hats(27.0, 28.8, EIGHTH, 0.5, taper=(28.6, 29.0))
    place(29.00, snd_chord([57, 60, 64, 67, 71], 0.25, tau=1.1, dur=2.4), send=0.6)   # final chord
    place(29.00, snd_sub(33, 0.8, dur=2.0, tau=0.9), pan=0.0)


def play_motif():
    """Plucked motif on an 8 s loop, with dotted-eighth echoes. Windows set the level per section."""
    for start, end, level in MOTIF_WINDOWS:
        for loop in range(4):
            for offset, midi in MOTIF:
                t = 8.0 * loop + offset
                if not (start <= t < end):
                    continue
                pan = -0.25 if loop % 2 == 0 else 0.25
                p = snd_pluck(midi)
                place(t, level * p, pan=pan, send=0.35)
                place(t + 0.375, 0.30 * level * p, pan=-pan, send=0.35)
                place(t + 0.750, 0.09 * level * p, pan=pan, send=0.35)


# ---------------------------------------------------------------------------
# Reverb, master, output
# ---------------------------------------------------------------------------
def make_reverb_ir(length_s=2.6):
    """Procedural stereo impulse response: a bright early tail, a darker late tail, sparse early taps."""
    n = int(length_s * SR)
    t = t_axis(n)
    irs = []
    for ch in range(2):
        x = noise(n)
        bright = hp1(x, 400.0) * np.exp(-t / 0.12)
        dark = moving_average(x, 40) * np.exp(-t / 0.35)
        ir = 0.5 * bright + dark
        for ms in (9.0, 14.0, 21.0, 31.0, 43.0):
            i = int((ms + 1.3 * ch) * 1e-3 * SR)
            ir[i] += (0.8 if ms < 25.0 else 0.5) * rng.choice((-1.0, 1.0))
        irs.append(ir / np.sqrt(np.sum(ir ** 2)))
    return np.array(irs)


def convolve(x, h):
    nfft = 1 << int(math.ceil(math.log2(len(x) + len(h) - 1)))
    return np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(h, nfft), nfft)[:len(x)]


def remove_dc(x, fc=8.0):
    """Zero-phase high-pass with a smooth edge at fc Hz. Removes the DC left by decaying sines."""
    freqs = np.fft.rfftfreq(x.shape[-1], 1.0 / SR)
    gain = 1.0 - np.exp(-(freqs / fc) ** 4)
    return np.fft.irfft(np.fft.rfft(x, axis=-1) * gain, n=x.shape[-1], axis=-1)


def master(ir):
    """Reverb, DC removal, deliberate silences, and the start and end fades."""
    wet = np.stack([convolve(SEND[0], ir[0]), convolve(SEND[1], ir[1])])
    mix = remove_dc(DRY + REVERB_LEVEL * wet)
    t = t_axis(N)
    gate = np.ones(N)
    for a, b in ((14.90, 15.00), (26.50, 26.60)):          # short silences before 15.0 and 26.6
        box = np.clip((t - a) / 0.002, 0.0, 1.0) * np.clip((b - t) / 0.002, 0.0, 1.0)
        gate *= 1.0 - box
    fade_in = np.minimum(1.0, t / 0.005)
    fade_out = 1.0 - smoothstep((t - 29.4) / 0.6)            # silent by 30.0
    return mix * (gate * fade_in * fade_out)


def soft_limit(x):
    """Smooth ceiling y = C * tanh(g * x / C). The gain g is solved so the peak is TARGET_PEAK."""
    lo, hi = 1e-4, 1e4
    for _ in range(60):
        g = math.sqrt(lo * hi)
        if SOFT_CEILING * np.max(np.abs(np.tanh(g * x / SOFT_CEILING))) > TARGET_PEAK:
            hi = g
        else:
            lo = g
    return SOFT_CEILING * np.tanh(lo * x / SOFT_CEILING)


def write_wav(path, stereo):
    """24-bit PCM, stereo, 48 kHz."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pcm = np.round(np.clip(stereo, -1.0, 1.0).T * 8388607.0).astype("<i4")
    pcm = np.ascontiguousarray(pcm)
    frames = pcm.view(np.uint8).reshape(-1, 2, 4)[:, :, :3].tobytes()
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(frames)


def report(stereo):
    assert stereo.shape == (2, N), stereo.shape
    assert np.isfinite(stereo).all(), "NaN or inf in output"
    peak = float(np.max(np.abs(stereo)))
    print(f"samples per channel: {N}  duration: {N / SR:.3f} s")
    print(f"peak: {peak:.4f} ({20 * math.log10(peak):.2f} dBFS)  mean: {stereo.mean():+.2e}")
    edges = [0.0, 3.0, 7.0, 11.0, 15.0, 19.0, 23.0, 26.5, 30.0]
    for a, b in zip(edges[:-1], edges[1:]):
        seg = stereo[:, int(a * SR):int(b * SR)]
        rms = math.sqrt(float(np.mean(seg ** 2)))
        print(f"  {a:5.1f} to {b:5.1f} s   rms {20 * math.log10(rms + 1e-12):7.1f} dBFS")


def main():
    build_pad()
    scene_seal()          # 0.0 to 3.0
    scene_syllables()     # 3.0 to 7.0
    scene_title()         # 7.0 to 11.0
    scene_particles()     # 11.0 to 15.0
    scene_code()          # 15.0 to 19.0
    scene_promises()      # 19.0 to 23.0
    scene_mark()          # 23.0 to 26.5
    scene_outro()         # 26.5 to 30.0
    play_motif()          # motif windows span the sections above

    ir = make_reverb_ir()
    stereo = soft_limit(master(ir))
    report(stereo)
    write_wav(OUT_PATH, stereo)
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
