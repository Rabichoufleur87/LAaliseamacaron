# Musique lo-fi originale pour la vidéo (30 s, 80 BPM), générée par synthèse : libre de droits.
# Calée sur les scènes : intro feutrée (0-3 s), la batterie entre avec le macaron (3 s),
# clochettes sur les parfums (13 s), montée puis ouverture sur le passage au blanc (18 s), fin apaisée.
import numpy as np, wave
from scipy.signal import butter, sosfilt, fftconvolve

SR, DUR, BPM = 44100, 30.0, 80
BEAT = 60 / BPM          # 0,75 s
BAR = 4 * BEAT           # 3 s
N = int(SR * DUR)
rng = np.random.default_rng(7)
L, R = np.zeros(N), np.zeros(N)
stems = {k: np.zeros((2, N)) for k in ("ep", "bass", "drums", "bells", "fx")}

midi = lambda m: 440 * 2 ** ((m - 69) / 12)
def add(stem, start, sig, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    stems[stem][0, i:i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
    stems[stem][1, i:i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))
def tt(d): return np.arange(int(d * SR)) / SR
def lp(x, f): return sosfilt(butter(2, f, "low", fs=SR, output="sos"), x)
def hp(x, f): return sosfilt(butter(2, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)

# piano électrique doux (type Rhodes)
def ep(m, d=2.6, vel=1.0, det=0.0):
    t, f = tt(d), midi(m) * (1 + det)
    env = np.minimum(t / 0.008, 1) * np.exp(-t / 1.5)
    s = sum(a * np.sin(2 * np.pi * k * f * t) * np.exp(-t * k * 0.6) for k, a in ((1, 1), (2, 0.32), (3, 0.1), (4, 0.04)))
    s += 0.06 * np.sin(2 * np.pi * 7.1 * f * t) * np.exp(-t * 18)          # petit « tine » d'attaque
    return s * env * (1 + 0.12 * np.sin(2 * np.pi * 4.4 * t)) * vel * 0.16

CHORDS = [([53, 57, 60, 64], 41), ([52, 55, 59, 62], 40), ([50, 53, 57, 60, 64], 38), ([48, 52, 55, 59, 62], 36)]  # Fmaj7 Em7 Dm9 Cmaj9
NBARS = int(DUR / BAR)
for b in range(NBARS):
    notes, root = CHORDS[b % 4]
    t0 = b * BAR
    for j, m in enumerate(notes):                                  # accord égrené sur le temps 1
        add("ep", t0 + j * 0.012, ep(m, 2.8, 1.0, -0.0015), pan=-0.35)
        add("ep", t0 + j * 0.012 + 0.004, ep(m, 2.8, 0.9, 0.0015), pan=0.35)
    if b < NBARS - 1:                                              # relance douce à contretemps
        for j, m in enumerate(notes[1:]):
            add("ep", t0 + 2.5 * BEAT + 0.1 + j * 0.01, ep(m + 12 if j == len(notes) - 2 else m, 1.2, 0.45), pan=0.15)
    # basse ronde
    if 1 <= b < NBARS - 1 or b == NBARS - 1:
        for beat, d in ((0, 1.9), (2.5, 0.9)):
            t = tt(d); f = midi(root)
            s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * np.minimum(t / 0.01, 1) * np.exp(-t / 0.9)
            add("bass", t0 + beat * BEAT, lp(s, 400), gain=0.42 if b >= 1 else 0.0)

# batterie (swing léger), de la mesure 2 (3 s) à 27 s
def kick():
    t = tt(0.45); f = 45 + 75 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
def snare():
    t = tt(0.3)
    return (bp(rng.standard_normal(len(t)), 1200, 5000) * 0.5 + np.sin(2 * np.pi * 185 * t) * 0.6) * np.exp(-t / 0.08)
def hat(o=False):
    t = tt(0.25 if o else 0.06)
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t / (0.08 if o else 0.018))
SW = 0.11 * BEAT
for b in range(1, NBARS):
    t0 = b * BAR
    if t0 >= 27: break
    for beat in (0, 1.75 + 0.0, 2.5):
        add("drums", t0 + beat * BEAT + (SW if beat % 1 else 0), kick(), gain=0.55)
    for beat in (1, 3):
        add("drums", t0 + beat * BEAT + 0.02, snare(), pan=0.05, gain=0.22)
    for k in range(8):
        add("drums", t0 + k * BEAT / 2 + (SW if k % 2 else 0), hat(k == 7), pan=0.3, gain=(0.09 if k % 2 else 0.13))

# clochettes : petite mélodie pentatonique pendant les parfums et la mosaïque (13 s → 26 s)
def bell(m, d=2.2):
    t, f = tt(d), midi(m)
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 4)) * np.minimum(t / 0.003, 1) * np.exp(-t / 0.6) * 0.11
MEL = [(0, 76), (0.75, 79), (1.5, 81), (2.25, 79), (3.0, 76), (4.5, 74), (5.25, 72), (6.0, 74), (6.75, 76), (7.5, 79), (9.0, 81), (9.75, 84), (10.5, 81), (11.25, 79)]
for start in (13.5, 19.5):
    for dt, m in MEL:
        if start + dt < 26:
            add("bells", start + dt, bell(m), pan=0.4 * np.sin(dt), gain=1.0)
            add("bells", start + dt + 0.375, bell(m), pan=-0.4 * np.sin(dt), gain=0.32)   # écho

# montée de bruit avant le passage au blanc, puis un souffle grave à 18 s
t = tt(1.0)
add("fx", 17.0, bp(rng.standard_normal(len(t)), 600, 6000) * (t / 1.0) ** 2 * 0.12)
t = tt(1.6)
add("fx", 18.0, np.sin(2 * np.pi * (40 + 30 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.5) * 0.4)
# crépitement de vinyle et souffle, du début à la fin
crack = np.zeros(N); idx = rng.integers(0, N, 900); crack[idx] = rng.uniform(-1, 1, 900) * rng.uniform(0.2, 1, 900)
hiss = lp(hp(rng.standard_normal(N), 1500), 6000) * 0.006
for ch in (0, 1): stems["fx"][ch] += lp(hp(crack, 1500), 7000) * 0.02 + hiss

# réverbération (réponse impulsionnelle synthétique)
ir_t = tt(1.8); ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.45); ir = lp(ir, 5000); ir /= np.abs(ir).sum() ** 0.5 * 10
def verb(x, wet): return x + wet * np.stack([fftconvolve(x[0], ir)[:N], fftconvolve(x[1], ir[::-1])[:N]])

# filtre « feutré » au début et à la fin : on ouvre à 3 s, on referme après 26 s
time = np.arange(N) / SR
k = np.clip((time - 2.6) / 0.6, 0, 1) * np.clip((28.5 - time) / 2.5, 0, 1)
def muffle(x): return np.stack([lp(x[0], 900), lp(x[1], 900)]) * (1 - k) + x * k

mix = muffle(verb(stems["ep"], 0.35)) + stems["bass"] + muffle(verb(stems["drums"], 0.08)) + verb(stems["bells"], 0.5) + stems["fx"]
mix = np.tanh(mix * 1.6) / 1.6                                      # compression douce
mix *= np.clip(time / 0.3, 0, 1) * np.clip((DUR - time) / 1.4, 0, 1)
mix /= np.abs(mix).max() / 0.89                                    # crête à -1 dB
pcm = (mix.T * 32767).astype("<i2")
with wave.open("video/musique.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("ok", mix.shape)
