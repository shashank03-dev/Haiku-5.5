#!/usr/bin/env python3
"""Original 30 s score for variation v1-beat-cut ("Beat Cut") of the Haiku 5.5 launch film.

Punchy and rhythmic: 120 BPM (one beat = 0.5 s, one bar = 2.0 s), A minor, hard cuts.
Everything is synthesised here with numpy: sine kicks, additive saws, filtered noise,
a one-pole filter, a ping-pong echo and a soft ceiling. The RNG is seeded. No samples,
no downloaded audio, no copyrighted material.

Cue list (matches variations/PLAN.md, section v1-beat-cut):
  0.0, 0.5, 25.0   single white-noise strobe click
  10.0, 20.0       0.1 s white-noise strobe train (8 clicks)
  every 0.5 s      short bass stab on every cut, 0.0 to 27.5 s (Am, F, C, G, one bar each)
  0.5 + 1.0 k      kick and clap on beats 2 and 4, 0.5 to 27.5 s
  8.4 to 9.9       noise riser, cut clean; gate closed 9.90 to 10.00 before the 10.0 interrupt
  18.4 to 19.9     noise riser, cut clean; gate closed 19.90 to 20.00 before the 20.0 interrupt
  25.0             bright A minor stab for "Haiku 5.5", with a ping-pong echo and a sub hit
  28.0             final tonic (A1) sub, faded to silence by 30.0

Output: out/variations/v1-beat-cut/score.wav, 48 kHz, 24-bit PCM, stereo, 1,440,000 samples.
Run from anywhere:  python3 variations/v1-beat-cut/audio/make_score.py
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
BEAT = 0.5                               # 120 BPM, quarter note
BAR = 4 * BEAT                           # 2.0 s
SEED = 20261008                          # fixed seed: the score is reproducible
TARGET_PEAK = 0.885                      # about -1.06 dBFS (ceiling is -1.0 dBFS)
CEILING = 0.95                           # soft-limit asymptote, below the 0.99 cap
ECHO_TIME = 0.375                        # dotted eighth at 120 BPM
ECHO_FEEDBACK = 0.42
ECHO_REPEATS = 6

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OUT_PATH = os.path.join(ROOT_DIR, "out", "variations", "v1-beat-cut", "score.wav")

rng = np.random.default_rng(SEED)
MIX = np.zeros((2, N))                   # the single stereo bus

# Bass (root, fifth) in MIDI for Am, F, C, G: one bar each, the loop repeats every 8 s.
BASS_BARS = [(33, 40), (29, 36), (36, 43), (31, 38)]   # A1 E2 | F1 C2 | C2 G2 | G1 D2


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


def lp1(x, fc):
    """One-pole lowpass. `fc` in Hz, scalar or per-sample (for sweeps)."""
    x = np.asarray(x, dtype=float)
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape)
    a = (1.0 - np.exp(-2.0 * np.pi * fc / SR)).tolist()
    out, s = [], 0.0
    for ai, xi in zip(a, x.tolist()):
        s += ai * (xi - s)
        out.append(s)
    return np.array(out)


def hp1(x, fc):
    x = np.asarray(x, dtype=float)
    return x - lp1(x, fc)


def smooth_gate(t, closes, reopen_ms=2.0):
    """Gain curve: 0 between each (close, reopen) pair, 2 ms ramps at both edges."""
    g = np.ones_like(t)
    for a, b in closes:
        closed = np.clip((t - a) / (reopen_ms * 1e-3), 0.0, 1.0) * \
            (1.0 - np.clip((t - b) / (reopen_ms * 1e-3), 0.0, 1.0))
        g *= 1.0 - closed
    return g


# ---------------------------------------------------------------------------
# Placement: mono or stereo one-shots onto the bus
# ---------------------------------------------------------------------------
def place_stereo(t0, sig2):
    """Add a (2, n) one-shot to the bus starting at t0 (seconds)."""
    sig2 = np.asarray(sig2, dtype=float)
    i0 = int(round(t0 * SR))
    a = max(0, -i0)
    b = min(sig2.shape[1], N - i0)
    if b <= a:
        return
    MIX[:, i0 + a:i0 + b] += sig2[:, a:b]


def place(t0, sig, pan=0.0):
    """Add a mono one-shot. pan = 0 gives identical left and right (mono-compatible)."""
    sig = np.asarray(sig, dtype=float)
    ang = (pan + 1.0) * np.pi / 4.0          # constant power
    place_stereo(t0, np.stack([math.cos(ang) * sig, math.sin(ang) * sig]))


def place_echoed(t0, sig2):
    """Stereo one-shot with a ping-pong echo: each repeat is 0.375 s later, quieter, swapped L/R."""
    place_stereo(t0, sig2)
    gain = 1.0
    for k in range(1, ECHO_REPEATS + 1):
        gain *= ECHO_FEEDBACK
        rep = sig2 if k % 2 == 0 else sig2[::-1]
        place_stereo(t0 + k * ECHO_TIME, gain * rep)


# ---------------------------------------------------------------------------
# Sound generators. Mono unless noted. Each returns a float array.
# ---------------------------------------------------------------------------
def snd_kick(level):
    """Sine kick: pitch falls from 150 Hz to 45 Hz, plus a 12 ms beater click."""
    n = int(0.36 * SR)
    t = t_axis(n)
    tau_p = 0.03
    phase = 2 * np.pi * (45.0 * t + 105.0 * tau_p * (1.0 - np.exp(-t / tau_p)))
    body = np.sin(phase) * np.exp(-t / 0.13)
    bn = int(0.012 * SR)
    click = np.zeros(n)
    click[:bn] = hp1(rng.uniform(-1.0, 1.0, bn), 2000.0) * np.exp(-t[:bn] / 0.003) * 0.35
    return level * (body + click) * attack(n, 0.3) * release(n, 8.0)


def snd_sub(midi, level, dur, tau):
    """Sub note: sine plus a soft 2nd harmonic, exponential decay."""
    n = int(dur * SR)
    t = t_axis(n)
    w = 2 * np.pi * midi_hz(midi) * t
    tone = np.sin(w) + 0.25 * np.sin(2 * w)
    return level * tone * np.exp(-t / tau) * attack(n, 2.0) * release(n, 10.0)


def snd_bass_stab(midi, level, dur=0.24):
    """Bass stab: band-limited saw through a one-pole low-pass whose cutoff falls from 1.2 kHz to 170 Hz."""
    n = int(dur * SR)
    t = t_axis(n)
    f = midi_hz(midi)
    saw = np.zeros(n)
    for k in range(1, 13):
        saw += np.sin(2 * np.pi * k * f * t) / k
    saw *= 0.6
    fc = 170.0 + 1050.0 * np.exp(-t / 0.05)
    env = np.exp(-t / 0.09) * attack(n, 1.0) * release(n, 6.0)
    return level * lp1(saw, fc) * env


def snd_clap(level):
    """Clap: band-passed noise with three flam bursts and a short tail."""
    n = int(0.28 * SR)
    t = t_axis(n)
    body = lp1(hp1(rng.standard_normal(n), 900.0), 4000.0)
    env = np.zeros(n)
    for t_k in (0.0, 0.009, 0.019):
        env += np.where(t >= t_k, np.exp(-(t - t_k) / 0.005), 0.0)
    env += np.where(t >= 0.025, 0.7 * np.exp(-(t - 0.025) / 0.09), 0.0)
    return level * body * env * attack(n, 0.3) * release(n, 8.0)


def snd_hat(level):
    """Closed hat: short high-passed noise."""
    n = int(0.07 * SR)
    t = t_axis(n)
    x = hp1(rng.standard_normal(n), 6500.0)
    return level * x * np.exp(-t / 0.022) * attack(n, 0.2) * release(n, 4.0)


def snd_strobe(level):
    """White-noise strobe click: uniform (white) noise, 2.5 ms attack, 4.5 ms decay."""
    n = int(0.02 * SR)
    t = t_axis(n)
    x = rng.uniform(-1.0, 1.0, n)
    env = np.minimum(1.0, t / 0.0025) * np.exp(-t / 0.0045)
    return level * x * env * release(n, 2.0)


def snd_riser(dur, f_lo, f_hi, level):
    """Noise riser: high-passed noise through a one-pole low-pass whose cutoff rises
    exponentially, with a rising sine glide. Ends in a hard cut (3 ms release)."""
    n = int(dur * SR)
    t = t_axis(n)
    u = t / dur
    fc = f_lo * (f_hi / f_lo) ** u
    air = lp1(hp1(rng.standard_normal(n), 300.0), fc)
    t_lo, t_hi = 180.0, 1400.0
    r = t_hi / t_lo
    glide = np.sin(2 * np.pi * t_lo * dur / np.log(r) * (r ** u - 1.0))
    sig = level * (air + 0.15 * glide) * u ** 2.2
    return sig * attack(n, 4.0) * release(n, 3.0)


def snd_bright_stab(level, dur=1.0):
    """Bright A minor stab (stereo, returns (2, n)): detuned saw stacks with a falling
    low-pass that opens the top for the first moment, then closes into a 2 ms attack and decay."""
    n = int(dur * SR)
    t = t_axis(n)
    notes = (57, 64, 69, 72, 76)             # A3 E4 A4 C5 E5
    out = np.zeros((2, n))
    for ch, cents in ((0, -7.0), (1, 7.0)):
        s = np.zeros(n)
        for m in notes:
            f = midi_hz(m) * 2 ** (cents / 1200.0)
            for k in range(1, 1 + min(16, int(9000 / f))):
                s += np.sin(2 * np.pi * k * f * t) / k
        s *= 0.12
        fc = 1600.0 + 7400.0 * np.exp(-t / 0.18)
        out[ch] = lp1(s, fc)
    env = np.exp(-t / 0.3) * attack(n, 2.0) * release(n, 30.0)
    return level * out * env


# ---------------------------------------------------------------------------
# Groove and cues (times in seconds, all on the 0.5 s cut grid)
# ---------------------------------------------------------------------------
def bass_stabs(last_beat):
    """A stab on every 0.5 s cut. Within each bar: root, octave, root, fifth."""
    for b in range(last_beat + 1):
        root, fifth = BASS_BARS[(b // 4) % 4]
        midi, lvl = [(root, 1.0), (root + 12, 0.7), (root, 0.8), (fifth, 0.8)][b % 4]
        place(b * BEAT, snd_bass_stab(midi, 0.5 * lvl), pan=0.0)


def kick_clap(last_beat):
    """Kick and clap on beats 2 and 4 (the odd half-beats), from 0.5 s."""
    for b in range(1, last_beat + 1, 2):
        place(b * BEAT, snd_kick(0.85), pan=0.0)
        place(b * BEAT, snd_clap(0.42), pan=0.0)


def hats(last_beat):
    """Closed hats on the off-beats, between the cuts, with a seeded pan."""
    for b in range(last_beat + 1):
        place(b * BEAT + BEAT / 2, snd_hat(0.12), pan=float(rng.uniform(-0.3, 0.3)))


def flashes():
    """White-noise strobe clicks: single clicks at 0.0, 0.5 and 25.0, 0.1 s trains at 10.0 and 20.0."""
    for t in (0.0, 0.5, 25.0):
        place(t, snd_strobe(0.45), pan=0.0)
    for t0 in (10.0, 20.0):
        for k in range(8):                   # 8 clicks, 12.5 ms apart, easing off
            place(t0 + k * 0.0125, snd_strobe(0.42 * (1.0 - 0.5 * k / 7.0)), pan=0.0)


def risers():
    """Noise risers into the interrupts. Each ends on the cut at 9.9 and 19.9 s."""
    place(8.4, snd_riser(1.5, 300.0, 9000.0, 0.34), pan=0.0)
    place(18.4, snd_riser(1.5, 300.0, 9000.0, 0.34), pan=0.0)


def payoff():
    """25.0: bright stab for the wordmark, echoed, with a sub hit under it. 28.0: final tonic."""
    place_echoed(25.0, snd_bright_stab(0.34))
    place(25.0, snd_sub(33, 0.55, dur=1.2, tau=0.4), pan=0.0)
    place(28.0, snd_sub(33, 0.50, dur=2.0, tau=0.7), pan=0.0)


# ---------------------------------------------------------------------------
# Master: gate, start and end fades, soft ceiling, output
# ---------------------------------------------------------------------------
def master(mix):
    """Brief silences before the 10.0 and 20.0 interrupts, 3 ms start fade, silent by 30.0."""
    t = t_axis(N)
    gate = smooth_gate(t, [(9.90, 10.00), (19.90, 20.00)], reopen_ms=2.0)
    fade_in = np.minimum(1.0, t / 0.003)
    fade_out = 1.0 - smoothstep((t - 28.0) / 2.0)        # 1 until 28.0, 0 at 30.0
    return mix * (gate * fade_in * fade_out)


def soft_limit(x):
    """Soft ceiling y = C * tanh(g * x / C), one static gain g. tanh is monotonic, so the
    gain is solved in closed form to put the loudest sample at TARGET_PEAK. The output
    magnitude never exceeds CEILING (0.95), so it stays under the 0.99 cap."""
    m = float(np.max(np.abs(x)))
    g = CEILING * math.atanh(TARGET_PEAK / CEILING) / m
    return CEILING * np.tanh(g * x / CEILING)


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
    assert peak <= 0.99, peak
    print(f"samples per channel: {N}  duration: {N / SR:.3f} s")
    print(f"peak: {peak:.4f} ({20 * math.log10(peak):.2f} dBFS)")
    print(f"first sample: {stereo[0, 0]:+.2e} {stereo[1, 0]:+.2e}   last sample: {stereo[0, -1]:+.2e} {stereo[1, -1]:+.2e}")
    edges = [0.0, 2.0, 8.0, 10.0, 12.0, 18.0, 20.0, 22.0, 25.0, 28.0, 30.0]
    for a, b in zip(edges[:-1], edges[1:]):
        seg = stereo[:, int(a * SR):int(b * SR)]
        rms = math.sqrt(float(np.mean(seg ** 2)))
        print(f"  {a:5.1f} to {b:5.1f} s   rms {20 * math.log10(rms + 1e-12):7.1f} dBFS")


def main():
    flashes()                  # 0.0, 0.5, 10.0, 20.0, 25.0 strobe clicks
    bass_stabs(55)             # every 0.5 s cut, 0.0 to 27.5 s
    kick_clap(55)              # beats 2 and 4, 0.5 to 27.5 s
    hats(55)                   # off-beats
    risers()                   # riser into 10.0 and 20.0
    payoff()                   # 25.0 bright stab, 28.0 final tonic

    stereo = soft_limit(master(MIX))
    report(stereo)
    write_wav(OUT_PATH, stereo)
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
