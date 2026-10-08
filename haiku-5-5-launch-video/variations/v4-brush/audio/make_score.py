#!/usr/bin/env python3
"""Original 30 s score for variation v4-brush ("Ink Brush") of the Haiku 5.5 film.

Everything is synthesised here with numpy: band-passed noise brush swishes on a
0.5 s grid (60 BPM feel, 1.0 s beat), a Karplus-Strong koto pluck, a sine taiko
with a pitch drop and a noise attack, a warm additive bell, a minor drone and a
closing chord. A seeded procedural reverb, a soft-knee limiter and a trim to
-1.0 dBFS finish the mix. No samples, no downloaded audio, nothing copyrighted.

Cues (variations/PLAN.md, v4-brush):
  brush swishes    every 0.5 s, each stroke travelling across the stereo field
  koto plucks      0.0, 1.0, 5.0, 7.0 (poem lines)
  taiko            10.0 (splash) and 20.0 (ink fill)
  bell             20.5 (seal stamp)
  closing chord    25.0, faded out by 29.8 s
  master           fade in at 0.0, fade out to silence by 30.0

Output: out/variations/v4-brush/score.wav, 48 kHz, 24-bit PCM, stereo,
exactly 1,440,000 samples. Run from anywhere:
    python3 variations/v4-brush/audio/make_score.py
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
N = int(round(DURATION * SR))                 # 1,440,000 samples = 30.000 s
BEAT = 1.0                                    # 60 BPM: one beat = 1.0 s
GRID = 0.5                                    # brush swish grid
SEED = 20261004                               # fixed seed: the score is reproducible
KNEE = 0.60                                   # soft limiter: linear below the knee
CEILING = 0.95                                # soft limiter asymptote (always < 0.99)
PCM_MAX = 8388607                             # 24-bit full scale
TARGET_PEAK = math.floor(10.0 ** (-1.0 / 20.0) * PCM_MAX) / PCM_MAX   # <= -1.0 dBFS
REVERB_LEVEL = 0.35

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)))))
OUT_PATH = os.path.join(ROOT_DIR, "out", "variations", "v4-brush", "score.wav")

rng = np.random.default_rng(SEED)
DRY = np.zeros((2, N))                        # dry stereo bus
SEND = np.zeros((2, N))                       # reverb send bus


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def t_axis(n):
    return np.arange(n) / SR


def midi_hz(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


def edge_in(n, ms):
    """Linear ramp 0 to 1 over `ms`: one-shots never start with a click."""
    return np.minimum(1.0, np.arange(n) / max(1.0, ms * 1e-3 * SR))


def edge_out(n, ms):
    """Linear ramp 1 to 0 over the last `ms`: one-shots end at zero."""
    return np.minimum(1.0, (n - 1 - np.arange(n)) / max(1.0, ms * 1e-3 * SR))


def lp1(x, fc):
    """One-pole lowpass, scalar cutoff in Hz."""
    a = 1.0 - math.exp(-2.0 * math.pi * fc / SR)
    x = np.asarray(x, dtype=float).tolist()
    out = [0.0] * len(x)
    s = 0.0
    for i, xi in enumerate(x):
        s += a * (xi - s)
        out[i] = s
    return np.array(out)


def bandpass_noise(n, fc, octaves):
    """White noise shaped by a Gaussian band in log-frequency, normalised to unit peak."""
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1.0 / SR)
    sigma = octaves / 2.3548                  # octaves = full width at half maximum
    mask = np.zeros_like(f)
    ok = f > 20.0
    mask[ok] = np.exp(-0.5 * (np.log2(f[ok] / fc) / sigma) ** 2)
    x = np.fft.irfft(spec * mask, n)
    return x / max(np.max(np.abs(x)), 1e-12)


def add_stereo(t0, left, right, send=0.0):
    """Add a stereo one-shot to the buses, starting at t0 seconds."""
    i0 = int(round(t0 * SR))
    a = max(0, -i0)
    b = min(len(left), N - i0)
    if b <= a:
        return
    sl, sr = left[a:b], right[a:b]
    DRY[0, i0 + a:i0 + b] += sl
    DRY[1, i0 + a:i0 + b] += sr
    if send:
        SEND[0, i0 + a:i0 + b] += send * sl
        SEND[1, i0 + a:i0 + b] += send * sr


def add_mono(t0, sig, pan=0.0, send=0.0):
    """Constant-power pan of a mono one-shot, pan in [-1, 1]."""
    ang = (pan + 1.0) * np.pi / 4.0
    add_stereo(t0, math.cos(ang) * sig, math.sin(ang) * sig, send)


# ---------------------------------------------------------------------------
# Brush layer: one swish every 0.5 s
# ---------------------------------------------------------------------------
def swish_centre(t):
    """Band centre (Hz), width (octaves) and decay (s) of the brush, by act."""
    if t < 5.0:
        return 1700.0, 1.6, 0.26
    if t < 10.0:
        return 2000.0, 1.6, 0.28
    if t < 15.0:
        return 2400.0, 1.8, 0.32
    if t < 20.0:                              # the eight rapid sweeps
        return 2900.0, 1.5, 0.38
    if t < 25.0:
        return 2200.0, 1.7, 0.30
    return 1600.0, 1.6, 0.26


def swish_level(t):
    if t < 5.0:
        base = 0.16
    elif t < 10.0:
        base = 0.19
    elif t < 15.0:
        base = 0.22
    elif t < 20.0:
        base = 0.32                           # the eight sweeps carry the most energy
    elif t < 25.0:
        base = 0.22
    elif t < 27.0:
        base = 0.18
    else:
        base = 0.18 * min(1.0, max(0.0, (29.5 - t) / 2.5))
    if t in (10.0, 20.0):                     # the two pattern interrupts
        return base * 1.5
    if abs(t - round(t)) < 1e-9:              # whole-second beats sit a little higher
        return base * 1.2
    return base


def brush_swish(t0, level, fc, octaves, decay, pan_from, pan_to, send):
    """One brush stroke: band-passed noise, fast attack, exponential decay, and a pan that travels across it."""
    dur = 0.45
    n = int(round(dur * SR))
    t = t_axis(n)
    grit = bandpass_noise(n, fc, octaves)
    grit = grit / math.sqrt(np.mean(grit ** 2))               # unit RMS: level is an RMS level
    knots = rng.uniform(-1.0, 1.0, int(dur * 150) + 2)        # bristle texture at ~150 Hz
    tex = 0.7 + 0.3 * np.interp(t, np.linspace(0.0, dur, len(knots)), knots)
    tau = decay / 6.9                                         # -60 dB after `decay` seconds
    env = (1.0 - np.exp(-t / 0.004)) * np.exp(-t / tau) * edge_out(n, 6.0)
    sig = level * grit * tex * env
    pan = pan_from + (pan_to - pan_from) * smoothstep(t / dur)
    ang = (pan + 1.0) * np.pi / 4.0
    add_stereo(t0, np.cos(ang) * sig, np.sin(ang) * sig, send)


def brush_layer():
    for k in range(59):                       # 0.0 to 29.0 s, every 0.5 s
        t0 = k * GRID
        fc, octaves, decay = swish_centre(t0)
        decay += rng.uniform(-0.02, 0.02)
        direction = 1.0 if k % 2 == 0 else -1.0     # downbeats travel left to right
        span = 0.95 if 15.0 <= t0 < 20.0 else 0.85
        send = 0.20 if 10.0 <= t0 < 25.0 else 0.10
        brush_swish(t0, swish_level(t0), fc, octaves, decay,
                    -span * direction, span * direction, send)


# ---------------------------------------------------------------------------
# Voices
# ---------------------------------------------------------------------------
def koto(t0, midi, level, pan, send, dur=1.6, damping=0.994):
    """Karplus-Strong pluck: a filtered noise burst circulating in a damped delay line.

    The loop length is fractional (two taps with complementary weights), so the
    pitch is tuned to the requested note rather than to the nearest sample.
    """
    period = SR / midi_hz(midi)
    p = int(math.ceil(period))                # taps at delays p and p - 1
    w_short = p - period                      # weight on the p - 1 tap, in [0, 1)
    w_long = 1.0 - w_short
    n = int(dur * SR)
    burst = lp1(rng.standard_normal(p), 4200.0)
    burst = burst / np.max(np.abs(burst))
    ys = burst.tolist() + [0.0] * (n - p)
    for i in range(p, n):
        ys[i] = damping * (w_long * ys[i - p] + w_short * ys[i - p + 1])
    sig = np.array(ys) * level * edge_in(n, 2.0) * edge_out(n, 80.0)
    ang = (pan + 1.0) * np.pi / 4.0
    add_stereo(t0, math.cos(ang) * sig, math.sin(ang) * sig, send)


def taiko(t0, level, send):
    """Taiko-like drum: a sine with a fast pitch drop, a second partial for skin, and a noise attack."""
    n = int(1.6 * SR)
    t = t_axis(n)
    tau_p = 0.035
    f_lo, f_hi = 46.0, 120.0
    phase = 2.0 * np.pi * (f_lo * t + (f_hi - f_lo) * tau_p * (1.0 - np.exp(-t / tau_p)))
    body = np.sin(phase) * np.exp(-t / 0.42)
    skin = 0.20 * np.sin(2.0 * phase) * np.exp(-t / 0.12)
    stick = bandpass_noise(n, 1500.0, 1.4) * np.exp(-t / 0.012) * 0.6
    sig = level * (body + skin + stick) * edge_in(n, 0.5) * edge_out(n, 30.0)
    add_mono(t0, sig, 0.0, send)


def bell(t0, midi, level, pan, send):
    """Warm bell: inharmonic partials with a slow decay and a faint beating pair on each."""
    n = int(4.0 * SR)
    t = t_axis(n)
    f = midi_hz(midi)
    sig = np.zeros(n)
    for ratio, amp, tau in [(1.0, 1.0, 1.9), (2.0, 0.38, 1.1), (2.76, 0.20, 0.7),
                            (3.0, 0.12, 0.55), (5.4, 0.05, 0.22)]:
        fp = f * ratio
        sig += amp * np.exp(-t / tau) * 0.5 * (np.sin(2 * np.pi * fp * t)
                                               + np.sin(2 * np.pi * (fp + 1.2) * t))
    strike = bandpass_noise(n, 3500.0, 1.5) * np.exp(-t / 0.006) * 0.15
    sig = level * (sig + strike) * edge_in(n, 2.0) * edge_out(n, 200.0)
    ang = (pan + 1.0) * np.pi / 4.0
    add_stereo(t0, math.cos(ang) * sig, math.sin(ang) * sig, send)


def drone(level):
    """Low A minor drone (A1, E2, A2, C3), slightly detuned between the ears, swelling from 1 s to 27 s."""
    t = t_axis(N)
    swell = smoothstep((t - 1.0) / 3.0) * (1.0 - smoothstep((t - 24.0) / 3.0))
    breath = 0.9 + 0.1 * np.sin(2.0 * np.pi * 0.11 * t)
    env = level * swell * breath
    left = np.zeros(N)
    right = np.zeros(N)
    for f, amp in [(55.0, 1.0), (82.41, 0.55), (110.0, 0.34), (130.81, 0.18)]:
        left += amp * np.sin(2.0 * np.pi * f * (1.0 - 0.0025) * t)
        right += amp * np.sin(2.0 * np.pi * f * (1.0 + 0.0025) * t)
    DRY[0] += env * left
    DRY[1] += env * right


def closing_chord(t0, level, send):
    """Am(add9) voicing: a slow bloom, a short hold, then a smooth fade that is silent by t0 + 4.8 s."""
    n = int(5.0 * SR)
    t = t_axis(n)
    env = smoothstep(t / 0.8) * (1.0 - smoothstep((t - 1.4) / 3.4))
    voices = [(45, -0.45), (52, 0.35), (57, -0.20), (60, 0.25), (64, -0.10), (71, 0.40)]
    for midi, pan in voices:
        f = midi_hz(midi)
        tone = 0.5 * (np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * (f + 0.6) * t))
        tone += 0.2 * np.sin(2 * np.pi * 2.0 * f * t)
        sig = level / len(voices) * tone * env
        ang = (pan + 1.0) * np.pi / 4.0
        add_stereo(t0, math.cos(ang) * sig, math.sin(ang) * sig, send)


# ---------------------------------------------------------------------------
# Space and master
# ---------------------------------------------------------------------------
def make_reverb_ir(length_s=2.4, tau=0.42, pre_ms=14.0):
    """Procedural stereo impulse response: darkened decaying noise with a short pre-delay, unit energy."""
    n = int(length_s * SR)
    pre = int(pre_ms * 1e-3 * SR)
    t = t_axis(n)
    irs = []
    for _ in range(2):
        ir = lp1(rng.standard_normal(n) * np.exp(-t / tau), 5000.0)
        ir[:pre] = 0.0
        irs.append(ir / np.sqrt(np.sum(ir ** 2)))
    return irs


def convolve_stereo(x, irs):
    n_full = N + len(irs[0]) - 1
    nfft = 1 << (n_full - 1).bit_length()
    out = np.zeros((2, N))
    for c in range(2):
        y = np.fft.irfft(np.fft.rfft(x[c], nfft) * np.fft.rfft(irs[c], nfft), nfft)
        out[c] = y[:N]
    return out


def master_fades(stereo):
    """Fade in over 0.2 s from silence, fade out over 28.8 to 30.0 s to silence."""
    t = t_axis(N)
    fin = 0.5 - 0.5 * np.cos(np.pi * np.clip(t / 0.2, 0.0, 1.0))
    fout = 0.5 + 0.5 * np.cos(np.pi * np.clip((t - 28.8) / 1.2, 0.0, 1.0))
    return stereo * (fin * fout)


def soft_limit(x):
    """Memoryless soft knee: linear below KNEE, then a tanh curve that approaches CEILING (< 0.99)."""
    a = np.abs(x)
    y = a.copy()
    over = a > KNEE
    span = CEILING - KNEE
    y[over] = KNEE + span * np.tanh((a[over] - KNEE) / span)
    return np.sign(x) * y


def write_wav(path, stereo):
    """24-bit PCM, stereo, 48 kHz."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pcm = np.round(np.clip(stereo, -1.0, 1.0).T * PCM_MAX).astype("<i4")
    pcm = np.ascontiguousarray(pcm)
    frames = pcm.view(np.uint8).reshape(-1, 2, 4)[:, :, :3].tobytes()
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(frames)


def report(mix, final):
    assert np.all(np.isfinite(final)), "NaN or inf in the output"
    peak = float(np.max(np.abs(final)))
    assert peak <= TARGET_PEAK + 1e-12 and peak < 0.99, "peak above -1.0 dBFS"
    print(f"{final.shape[1]} samples ({final.shape[1] / SR:.3f} s), "
          f"peak {peak:.6f} ({20 * np.log10(peak):.3f} dBFS)")
    print(f"pre-limit peak {np.max(np.abs(mix)):.3f}, "
          f"samples above knee {100.0 * np.mean(np.abs(mix) > KNEE):.2f}%")
    for a in range(0, 30, 5):
        seg = final[:, a * SR:(a + 5) * SR]
        rms = math.sqrt(float(np.mean(seg ** 2)))
        print(f"  {a:>2}-{a + 5:<2} s  rms {20 * np.log10(rms + 1e-12):7.2f} dBFS")


def main():
    drone(0.045)                              # minor drone, 1 s to 27 s
    brush_layer()                             # 0.5 s grid, 0.0 to 29.0 s
    koto(0.0, 69, 0.50, -0.35, 0.35)          # A4
    koto(1.0, 72, 0.45, 0.35, 0.35)           # C5
    koto(5.0, 76, 0.45, -0.20, 0.30)          # E5
    koto(7.0, 81, 0.42, 0.25, 0.30)           # A5
    taiko(10.0, 0.85, 0.25)                   # splash
    taiko(20.0, 0.85, 0.30)                   # ink fill
    bell(20.5, 69, 0.22, 0.15, 0.40)          # seal stamp
    closing_chord(25.0, 0.80, 0.45)           # Am(add9), silent by 29.8 s

    irs = make_reverb_ir()
    wet = convolve_stereo(SEND, irs)
    mix = DRY + REVERB_LEVEL * wet
    mix = master_fades(mix)
    limited = soft_limit(mix)
    final = limited * (TARGET_PEAK / np.max(np.abs(limited)))
    report(mix, final)
    write_wav(OUT_PATH, final)
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
