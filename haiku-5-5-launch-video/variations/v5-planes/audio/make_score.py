#!/usr/bin/env python3
"""Original 30 s score for variation v5-planes ("Parallax Planes").

Everything is synthesised here with numpy: sine oscillators, band-passed noise
sweeps (a seeded state-variable filter), a procedural reverb and a soft knee
limiter. No samples, no downloaded audio, no copyrighted material.

Tempo 120 BPM (one beat = 0.5 s). Cues follow variations/PLAN.md, section v5-planes:

  0.0, 2.0, 5.0, 9.0           camera moves: rising band-passed sweeps, panned so the camera turns
  9.5 to 10.0                  10.0 pass-through whoosh, resolving into a dry hit at 10.0
  1.0, 5.0, 10.0, 15.0, 20.0   card lands: deep sub hits (10.0 also gets the dry hit)
  9.0                          tile lock: one tight tick per row (5, 7, 5), left, centre, right
  17.8, 18.0                   output chip: soft two-note chime, B5 then D6
  18.5 to 20.0                 collapse: reversed swell, ending in a click at 20.0
  23.0, 23.25, 23.5            the three mark bars: low thuds
  24.0                         the seal: deeper thud and stamp tick
  25.5                         final chord, held, faded to silence by 30.0

Harmony is A minor: the pad moves Am, F, C, G, Em, Am. Its upper partials and
octave shimmer open up across the whole film.

Output: out/variations/v5-planes/score.wav, 48 kHz, 24-bit PCM, stereo, 1,440,000 frames.
Run from anywhere:  python3 variations/v5-planes/audio/make_score.py
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
N = int(round(DURATION * SR))            # 1,440,000 frames = 30.000 s
SEED = 20261008                          # fixed seed: the score is reproducible
XF = 0.4                                 # chord cross-fade, seconds
PAD_LEVEL = 0.10
REVERB_WET = 0.3
KNEE = 0.60                              # soft limiter: linear below the knee
CEILING = 0.95                           # soft limiter: output approaches this, never exceeds it
TARGET_PEAK = 0.891                      # -1.0 dBFS

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
OUT_PATH = os.path.join(ROOT_DIR, "out", "variations", "v5-planes", "score.wav")

rng = np.random.default_rng(SEED)
DRY = np.zeros((2, N))                   # dry stereo bus
SEND = np.zeros((2, N))                  # reverb send bus


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


def attack(n, ms):
    """Linear fade-in over `ms`: the first sample is zero, so one-shots never click on start."""
    return np.minimum(1.0, np.arange(n) / max(1.0, ms * 1e-3 * SR))


def release(n, ms):
    """Linear fade-out over the last `ms`: one-shots end at zero."""
    return np.minimum(1.0, (n - 1 - np.arange(n)) / max(1.0, ms * 1e-3 * SR))


def noise(n):
    return rng.standard_normal(n)


def moving_average(x, w):
    """Causal moving average over w samples, zero before the start."""
    c = np.concatenate(([0.0], np.cumsum(x)))
    idx = np.arange(1, len(x) + 1)
    lo = np.maximum(0, idx - w)
    return (c[idx] - c[lo]) / w


def phase_of(freq):
    """Phase of a sine whose instantaneous frequency is `freq` (an array in Hz)."""
    return 2.0 * np.pi * np.cumsum(freq) / SR


def svf_bandpass(x, fc, q):
    """Chamberlin state-variable band-pass with a per-sample cutoff `fc` in Hz.

    The cutoff is capped at 0.15 SR, where the filter stays stable.
    """
    x = np.asarray(x, dtype=float)
    fc = np.minimum(np.broadcast_to(np.asarray(fc, dtype=float), x.shape), 0.15 * SR)
    f = (2.0 * np.sin(np.pi * fc / SR)).tolist()
    d = 1.0 / q
    xs = x.tolist()
    out = [0.0] * len(xs)
    low = band = 0.0
    for i, xi in enumerate(xs):
        fi = f[i]
        low += fi * band
        high = xi - low - d * band
        band += fi * high
        out[i] = band
    return np.array(out)


def _add(t0, left, right, send):
    i0 = int(round(t0 * SR))
    a = max(0, -i0)
    b = min(len(left), N - i0)
    if b <= a:
        return
    lo, hi = i0 + a, i0 + b
    DRY[0, lo:hi] += left[a:b]
    DRY[1, lo:hi] += right[a:b]
    if send:
        SEND[0, lo:hi] += send * left[a:b]
        SEND[1, lo:hi] += send * right[a:b]


def place(t0, sig, pan=0.0, send=0.0):
    """Add a mono one-shot at time t0 (seconds). Constant-power pan in [-1, 1]; `send` feeds the reverb."""
    s = np.asarray(sig, dtype=float)
    ang = (pan + 1.0) * np.pi / 4.0
    _add(t0, math.cos(ang) * s, math.sin(ang) * s, send)


def place_stereo(t0, left, right, send=0.0):
    _add(t0, np.asarray(left, dtype=float), np.asarray(right, dtype=float), send)


# ---------------------------------------------------------------------------
# Sound generators (one-shots). Each returns a float array.
# ---------------------------------------------------------------------------
def snd_sweep(dur, f_lo, f_hi, level, power, pan0, pan1, q=1.2, rel_ms=30.0):
    """Rising band-passed noise: the cutoff rises exponentially from f_lo to f_hi and the level rises as u**power.

    Returns (left, right). The pan travels from pan0 to pan1 across the sweep.
    """
    n = int(round(dur * SR))
    u = np.arange(n) / n
    bp = svf_bandpass(noise(n), f_lo * (f_hi / f_lo) ** u, q)
    bp /= np.max(np.abs(bp))
    s = level * bp * u ** power * attack(n, 12.0) * release(n, rel_ms)
    ang = (pan0 + (pan1 - pan0) * u + 1.0) * np.pi / 4.0
    return s * np.cos(ang), s * np.sin(ang)


def snd_sub(f_end, level, dur=1.2, tau=0.45):
    """Deep sub hit: a sine that falls from twice its end pitch in about 45 ms, a soft 2nd harmonic, exponential decay."""
    n = int(round(dur * SR))
    t = t_axis(n)
    phase = phase_of(f_end * (1.0 + np.exp(-t / 0.015)))
    body = np.sin(phase) + 0.12 * np.sin(2.0 * phase)
    return level * body * np.exp(-t / tau) * attack(n, 2.0) * release(n, 30.0)


def snd_dry_hit(level):
    """Dry hit for 10.0 (no reverb send): a 180 Hz body falling to 90 Hz in about 0.1 s, plus a 1.5 ms click."""
    n = int(0.25 * SR)
    t = t_axis(n)
    phase = phase_of(90.0 * (1.0 + np.exp(-t / 0.02)))
    body = np.sin(phase) * np.exp(-t / 0.075)
    click = np.diff(noise(n), prepend=0.0) * np.exp(-t / 0.0015) * 0.5
    return level * (body + click) * attack(n, 0.2) * release(n, 10.0)


def snd_tick(level, freq, dur=0.03):
    """Tight tick: a 3 to 4 ms noise click plus a short sine at `freq`."""
    n = int(round(dur * SR))
    t = t_axis(n)
    click = np.diff(noise(n), prepend=0.0) * np.exp(-t / 0.0035)
    tone = np.sin(2.0 * np.pi * freq * t) * np.exp(-t / 0.004)
    return level * (0.5 * click + 0.6 * tone) * attack(n, 0.3) * release(n, 4.0)


def snd_chime(midi, level, dur, tau):
    """Soft bell: a sine plus a faint inharmonic partial that dies first."""
    n = int(round(dur * SR))
    t = t_axis(n)
    w = 2.0 * np.pi * midi_hz(midi) * t
    x = np.sin(w) + 0.18 * np.sin(2.01 * w) * np.exp(-t / 0.25)
    return level * x * np.exp(-t / tau) * attack(n, 4.0) * release(n, 60.0)


def snd_swell_reversed(dur, level):
    """Collapse swell: an E3, B3, E4 cluster and a band-passed noise tail. Decays forwards, then is played backwards.

    Reversed, it grows into its end point at 20.0, where the click sits.
    """
    n = int(round(dur * SR))
    t = t_axis(n)
    tones = (np.sin(2.0 * np.pi * midi_hz(52) * t)
             + 0.5 * np.sin(2.0 * np.pi * midi_hz(59) * t)
             + 0.3 * np.sin(2.0 * np.pi * midi_hz(64) * t))
    air = svf_bandpass(noise(n), 2400.0, 1.3)
    air /= np.max(np.abs(air))
    fwd = (0.5 * tones * np.exp(-t / 0.5) + 0.4 * air * np.exp(-t / 0.3)) * release(n, 150.0) * attack(n, 2.0)
    rev = fwd[::-1]
    return level * rev / np.max(np.abs(rev))


def snd_thud(f_start, f_end, level, dur=0.45, decay=0.12):
    """Low mark thud: a fast pitch fall into a decaying body, plus a low-passed noise impact."""
    n = int(round(dur * SR))
    t = t_axis(n)
    body = np.sin(phase_of(f_end + (f_start - f_end) * np.exp(-t / 0.03))) * np.exp(-t / decay)
    impact = 3.0 * moving_average(noise(n), 48) * np.exp(-t / 0.02)
    return level * (body + impact) * attack(n, 1.0) * release(n, 30.0)


def snd_drone(midi, level, dur):
    """Sustained sub under the final chord: a sine with a soft 2nd partial. The master fade ends it."""
    n = int(round(dur * SR))
    t = t_axis(n)
    w = 2.0 * np.pi * midi_hz(midi) * t
    return level * (np.sin(w) + 0.15 * np.sin(2.0 * w)) * attack(n, 350.0)


# ---------------------------------------------------------------------------
# Pad: shimmer voicings, A minor, cross-faded per CHORDS
# ---------------------------------------------------------------------------
CHORDS = [  # (start, end, name, MIDI voicing)
    (0.0, 5.0, "Am", [57, 60, 64, 69]),                 # A3 C4 E4 A4
    (5.0, 10.0, "F", [53, 57, 60, 65]),                 # F3 A3 C4 F4
    (10.0, 15.0, "C", [52, 55, 60, 64]),                # E3 G3 C4 E4
    (15.0, 20.0, "G", [55, 59, 62, 67]),                # G3 B3 D4 G4
    (20.0, 25.5, "Em", [52, 55, 59, 64]),               # E3 G3 B3 E4
    (25.5, 30.0, "Am", [45, 52, 57, 60, 64, 69, 72]),   # open final voicing: A2 E3 A3 C4 E4 A4 C5
]


def openness(t):
    """0.15 at 0 s, 1.0 from 28 s. The upper partials and the shimmer grow with it, so the pad opens up."""
    return 0.15 + 0.85 * smoothstep(t / 28.0)


def pad_voice(notes, t, cents, phase):
    o = openness(t)
    s = np.zeros(len(t))
    for m in notes:
        w = 2.0 * np.pi * midi_hz(m) * 2.0 ** (cents / 1200.0) * t
        s += (np.sin(w) + 0.5 * o * np.sin(2.0 * w)
              + 0.25 * o * o * np.sin(3.0 * w) + 0.12 * o ** 3 * np.sin(4.0 * w))
    s /= len(notes)
    top = 2.0 * np.pi * midi_hz(max(notes)) * 2.0 * 2.0 ** (cents / 1200.0) * t    # octave shimmer
    tremolo = 0.7 + 0.3 * np.sin(2.0 * np.pi * 0.23 * t + phase)
    return s + 0.22 * o * o * tremolo * np.sin(top)


def build_pad():
    last = len(CHORDS) - 1
    for i, (a, b, _, notes) in enumerate(CHORDS):
        lo_t = 0.0 if i == 0 else a - XF / 2
        hi_t = DURATION if i == last else b + XF / 2
        lo, hi = int(round(lo_t * SR)), int(round(hi_t * SR))
        t = np.arange(lo, hi) / SR
        if i == 0:
            w = smoothstep(t / 1.6)                                   # the pad enters slowly from silence
        else:
            w = smoothstep((t - (a - XF / 2)) / XF)
        if i != last:
            w = w * (1.0 - smoothstep((t - (b - XF / 2)) / XF))
        for ch, (cents, phase) in enumerate(((-6.0, 0.0), (6.0, 2.1))):   # detuned left and right
            v = w * PAD_LEVEL * pad_voice(notes, t, cents, phase)
            DRY[ch, lo:hi] += v
            SEND[ch, lo:hi] += 0.3 * v


# ---------------------------------------------------------------------------
# Cues, one function per scene
# ---------------------------------------------------------------------------
def scene_camera_moves():
    """Rising band-passed sweeps under the camera moves at 0.0, 2.0, 5.0 and 9.0, each panned so the camera turns.

    The 10.0 move is a pass-through whoosh from 9.5 that resolves into the dry hit at 10.0.
    """
    moves = [  # (start, dur, f_lo, f_hi, level, pan0, pan1)
        (0.0, 1.5, 180.0, 3200.0, 0.22, -0.6, 0.6),
        (2.0, 1.5, 240.0, 4200.0, 0.24, 0.6, -0.6),
        (5.0, 1.5, 260.0, 5000.0, 0.26, -0.5, 0.5),
        (9.0, 0.5, 400.0, 4500.0, 0.26, 0.5, 0.0),
    ]
    for t0, dur, f_lo, f_hi, level, p0, p1 in moves:
        left, right = snd_sweep(dur, f_lo, f_hi, level, power=2.0, pan0=p0, pan1=p1)
        place_stereo(t0, left, right, send=0.15)
    left, right = snd_sweep(0.5, 900.0, 8000.0, 0.34, power=3.0, pan0=-0.5, pan1=0.5, q=1.0, rel_ms=4.0)
    place_stereo(9.5, left, right, send=0.12)                 # 10.0 pass-through whoosh


def scene_tile_lock():
    """9.0 tile lock: one tight tick per row of the 5-7-5 poem, left, centre and right."""
    for pan, freq in ((-0.5, 2600.0), (0.0, 3100.0), (0.5, 3700.0)):
        place(9.0, snd_tick(0.22, freq), pan=pan, send=0.05)


def scene_card_lands():
    """Deep sub hit on each card land. The 10.0 land also gets the dry hit, with no reverb send."""
    for t0, f_end in ((1.0, 55.0), (5.0, 43.65), (15.0, 49.0), (20.0, 41.2)):
        place(t0, snd_sub(f_end, 0.75))
    place(10.0, snd_sub(65.41, 0.70))
    place(10.0, snd_dry_hit(0.55))


def scene_output_chip():
    """17.8 output chip: a soft two-note chime, B5 then D6 (both chord tones of G)."""
    place(17.8, snd_chime(83, 0.16, dur=1.8, tau=0.5), pan=-0.2, send=0.35)
    place(18.0, snd_chime(86, 0.14, dur=1.6, tau=0.45), pan=0.2, send=0.35)


def scene_collapse():
    """20.0 collapse: a reversed swell from 18.5 that ends in a click on the 20.0 card land."""
    place(18.5, snd_swell_reversed(1.5, 0.30), send=0.25)
    place(20.0, snd_tick(0.30, 4200.0))


def scene_mark():
    """Mark bars at 23.0, 23.25 and 23.5 as low thuds, then the seal thud and stamp tick at 24.0."""
    place(23.00, snd_thud(96.0, 55.0, 0.42), pan=-0.35)
    place(23.25, snd_thud(110.0, 65.41, 0.40), pan=0.0)
    place(23.50, snd_thud(123.5, 82.41, 0.38), pan=0.35)
    place(24.00, snd_thud(86.0, 41.2, 0.55, dur=0.9, decay=0.26), send=0.10)
    place(24.00, snd_tick(0.25, 2800.0))


def scene_final():
    """25.5 final chord: a sub drone under the Am voicing from build_pad. The master fade reaches silence at 30.0."""
    place(25.5, snd_drone(33, 0.22, 4.5))


# ---------------------------------------------------------------------------
# Reverb, master, limiter, output
# ---------------------------------------------------------------------------
def make_reverb_ir(length_s=2.4):
    """Procedural stereo room: smoothed noise with an exponential decay and a 12 ms pre-delay. Independent per channel."""
    n = int(length_s * SR)
    t = t_axis(n)
    irs = []
    for _ in range(2):
        x = moving_average(noise(n), 3) * np.exp(-t / 0.42)
        x[: int(0.012 * SR)] = 0.0
        irs.append(x / np.sqrt(np.sum(x * x)))
    return np.array(irs)


def convolve(x, h):
    nfft = 1 << int(math.ceil(math.log2(len(x) + len(h) - 1)))
    return np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(h, nfft), nfft)[:len(x)]


def master(ir):
    """Reverb, then the start and end fades. The fade-in is exactly zero at the first sample and the fade-out exactly zero at 30.0 s."""
    wet = np.stack([convolve(SEND[c], ir[c]) for c in range(2)])
    mix = DRY + REVERB_WET * wet
    t = t_axis(N)
    fade_in = smoothstep(t / 0.4)                       # full by 0.4 s
    fade_out = 1.0 - smoothstep((t - 28.5) / 1.5)       # full until 28.5 s, silent by 30.0 s
    return mix * (fade_in * fade_out)


def soft_limit(x):
    """Soft knee limiter: linear below KNEE, then a tanh curve that approaches CEILING (0.95).

    The result is scaled so its peak is TARGET_PEAK (-1.0 dBFS).
    """
    a = np.abs(x)
    span = CEILING - KNEE
    comp = np.where(a > KNEE, KNEE + span * np.tanh(np.maximum(a - KNEE, 0.0) / span), a)
    y = np.sign(x) * comp
    return y * (TARGET_PEAK / np.max(np.abs(y)))


def write_wav(path, stereo):
    """24-bit PCM, stereo, 48 kHz (the low three bytes of each little-endian int32)."""
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
    assert peak <= TARGET_PEAK + 1e-9, peak
    print(f"frames per channel: {N}  duration: {N / SR:.3f} s")
    print(f"peak: {peak:.4f} ({20 * math.log10(peak):.2f} dBFS)")
    edges = [0.0, 1.0, 2.0, 5.0, 9.0, 10.0, 15.0, 20.0, 23.0, 25.5, 30.0]
    for a, b in zip(edges[:-1], edges[1:]):
        seg = stereo[:, int(a * SR):int(b * SR)]
        rms = math.sqrt(float(np.mean(seg ** 2)))
        print(f"  {a:5.2f} to {b:5.2f} s   rms {20 * math.log10(rms + 1e-12):7.1f} dBFS")


def main():
    build_pad()              # 0.0 to 30.0: pad, Am F C G Em Am
    scene_camera_moves()     # 0.0, 2.0, 5.0, 9.0 sweeps; 9.5 to 10.0 whoosh
    scene_tile_lock()        # 9.0
    scene_card_lands()       # 1.0, 5.0, 10.0 (with dry hit), 15.0, 20.0
    scene_output_chip()      # 17.8, 18.0
    scene_collapse()         # 18.5 to 20.0 reversed swell, 20.0 click
    scene_mark()             # 23.0, 23.25, 23.5, 24.0
    scene_final()            # 25.5 drone under the final chord

    ir = make_reverb_ir()
    stereo = soft_limit(master(ir))
    report(stereo)
    write_wav(OUT_PATH, stereo)
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
