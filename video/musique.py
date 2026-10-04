# Pièce originale pour piano « dans le style de Mozart » (do majeur, 120 à la noire, 15 mesures = 30 s),
# synthétisée note par note : libre de droits.
# Mélodie chantante à la main droite, basse d'Alberti à la main gauche, gammes, trille final.
# Calage : thème piano (0 s) · reprise ornée pendant la vue éclatée (8 s) · la mineur sur les parfums (16 s)
# · éclat en fa majeur au passage au blanc (18 s) · cadence finale et accord tenu (26-30 s).
import numpy as np, wave
from scipy.signal import butter, sosfilt, fftconvolve

SR, DUR, BPM = 44100, 30.0, 120
Q = 60 / BPM            # noire = 0,5 s ; mesure = 2 s
N = int(SR * DUR)
out = np.zeros((2, N))
rng = np.random.default_rng(3)
midi = lambda m: 440 * 2 ** ((m - 69) / 12)
lp = lambda x, f: sosfilt(butter(2, f, "low", fs=SR, output="sos"), x)

# ---------- piano : partiels légèrement inharmoniques, deux cordes, marteau, étouffoir ----------
def piano(m, dur, vel):
    f0 = midi(m)
    ring = dur + 0.35
    t = np.arange(int(ring * SR)) / SR
    tau = np.clip(2.6 * (262 / f0) ** 0.6, 0.35, 4.0)
    s = np.zeros_like(t)
    for k in range(1, 11):
        fk = k * f0 * np.sqrt(1 + 0.0004 * k * k)
        if fk > 16000: break
        a = (1 / k ** 1.25) * (0.55 + 0.45 * vel) ** (k * 0.35)
        tk = tau / (1 + 0.35 * (k - 1))
        env = 0.65 * np.exp(-t / (tk * 0.22)) + 0.35 * np.exp(-t / tk)
        for d in (-0.00035, 0.00035):                       # deux cordes à peine désaccordées
            s += 0.5 * a * env * np.sin(2 * np.pi * fk * (1 + d) * t + rng.uniform(0, 6.28))
    s *= np.minimum(t / 0.002, 1)
    hammer = lp(rng.standard_normal(len(t)), 3000 + 2000 * vel) * np.exp(-t / 0.012) * 0.08
    s += hammer
    s *= np.where(t > dur, np.exp(-(t - dur) / 0.11), 1)    # l'étouffoir retombe à la fin de la note
    return s * vel * 0.22

def play(m, start, dur, vel, pan):
    i = int(start * SR)
    if i >= N: return
    s = piano(m, dur, vel)[: N - i]
    out[0, i:i + len(s)] += s * np.sqrt(0.5 * (1 - pan))
    out[1, i:i + len(s)] += s * np.sqrt(0.5 * (1 + pan))

C, D, E, F, G, A, B = 0, 2, 4, 5, 7, 9, 11
n = lambda name, octv: 12 * (octv + 1) + name           # n(C,5) = 72

# ---------- main droite : (temps dans la mesure, durée en noires, note) ----------
RH = {
    0:  [(0, 1, n(E, 5)), (1, 1, n(G, 5)), (2, 1.5, n(C, 6)), (3.5, .5, n(B, 5))],
    1:  [(0, 1.5, n(D, 6)), (1.5, .5, n(C, 6)), (2, 1, n(B, 5)), (3, 1, n(G, 5))],
    2:  [(0, .5, n(A, 5)), (.5, .5, n(G, 5)), (1, .5, n(F, 5)), (1.5, .5, n(E, 5)), (2, 1, n(D, 5)), (3, 1, n(G, 5))],
    3:  [(0, .5, n(B, 4)), (.5, .5, n(C, 5)), (1, .5, n(D, 5)), (1.5, .5, n(E, 5)), (2, 2, n(D, 5))],
    4:  [(0, 1, n(E, 5)), (1, 1, n(G, 5)), (2, .25, n(D, 6)), (2.25, 1.25, n(C, 6)), (3.5, .5, n(E, 6))],
    5:  [(0, 1.5, n(F, 6)), (1.5, .5, n(D, 6)), (2, 1, n(B, 5)), (3, .5, n(G, 5)), (3.5, .5, n(A, 5))],
    6:  [(0, .5, n(G, 5)), (.5, .5, n(E, 5)), (1, .5, n(F, 5)), (1.5, .5, n(D, 5)), (2, 1, n(E, 5)), (3, 1, n(D, 5))],
    7:  [(0, 2, n(C, 5))] + [(2 + k * .25, .25, n(x, o)) for k, (x, o) in enumerate(((C, 5), (D, 5), (E, 5), (F, 5), (G, 5), (A, 5), (B, 5), (C, 6)))],
    8:  [(0, .5, n(A, 5)), (.5, .5, n(G, 5) + 1), (1, .5, n(A, 5)), (1.5, .5, n(C, 6)), (2, 1, n(E, 6)), (3, 1, n(A, 5))],
    9:  [(k * .25, .25, n(x, o)) for k, (x, o) in enumerate(((C, 7), (B, 6), (A, 6), (G, 6), (F, 6), (E, 6), (D, 6), (C, 6)))] + [(2, 1, n(F, 6)), (3, 1, n(A, 6))],
    10: [(0, 1, n(D, 6)), (1, .5, n(C, 6)), (1.5, .5, n(B, 5)), (2, 1, n(A, 5)), (3, 1, n(F, 5) + 1)],
    11: [(0, .5, n(G, 5)), (.5, .5, n(A, 5)), (1, .5, n(B, 5)), (1.5, .5, n(C, 6)), (2, 2, n(D, 6))],
    12: [(0, 1, n(F, 6)), (1, 1, n(D, 6)), (2, 1, n(B, 5)), (3, 1, n(G, 5))],
    13: [(0, 1, n(E, 6)), (1, 1, n(C, 6))] + [(2 + k * .125, .125, n(D, 6) if k % 2 == 0 else n(E, 6)) for k in range(14)] + [(3.75, .25, n(D, 6))],
    14: [(0, 4, n(C, 6)), (0.03, 4, n(E, 5)), (0.06, 4, n(G, 5))],
}
# ---------- main gauche : basse d'Alberti (bas, haut, milieu, haut) en croches ----------
ALB = {"C": (n(C, 4), n(G, 4), n(E, 4)), "G7": (n(B, 3), n(F, 4), n(D, 4)), "G": (n(B, 3), n(G, 4), n(D, 4)),
       "Am": (n(A, 3), n(E, 4), n(C, 4)), "F": (n(A, 3), n(F, 4), n(C, 4)), "D7": (n(F, 3) + 1, n(D, 4), n(C, 4)),
       "C64": (n(G, 3), n(E, 4), n(C, 4))}
LH = ["C", "G7", "C", "G", "C", "G7", ("C64", "G7"), "C", "Am", "F", "D7", "G", "G7", ("C64", "G7"), None]

def vel_at(t):        # nuances : p au début, mf, crescendo vers le passage au blanc, f, puis p à la fin
    pts = [(0, .5), (3, .62), (8, .7), (15, .7), (17.8, .85), (18, 1.0), (22, .85), (26, .8), (30, .6)]
    return float(np.interp(t, *zip(*pts)))

for b in range(15):
    t0 = b * 4 * Q
    for beat, d, m in RH.get(b, []):
        tt = t0 + beat * Q
        v = vel_at(tt) * (1.0 if d >= 0.5 else 0.82) * rng.uniform(0.94, 1.03)
        play(m, tt + rng.uniform(0, 0.008), d * Q * 0.95, v, 0.18)
    ch = LH[b]
    if ch is None:                                     # accord final arpégé et tenu
        for k, m in enumerate((n(C, 2), n(G, 2), n(C, 3), n(E, 3), n(G, 3))):
            play(m, t0 + k * 0.07, 3.6, vel_at(t0) * 0.85, -0.2)
        continue
    for k in range(8):
        name = ch if isinstance(ch, str) else ch[k // 4]
        lo, hi, mid = ALB[name]
        m = (lo, hi, mid, hi)[k % 4]
        tt = t0 + k * Q / 2
        play(m, tt, Q / 2 * 1.6, vel_at(tt) * (0.48 if k % 4 == 0 else 0.38), -0.22)
    if b in (7, 13):                                   # basse grave aux cadences
        play(n(C, 3) if b == 7 else n(G, 2), t0 + (0 if b == 7 else 2 * Q), 2 * Q, vel_at(t0) * 0.6, -0.25)

# ---------- salle de concert : réverbération douce ----------
ti = np.arange(int(2.6 * SR)) / SR
ir = rng.standard_normal((2, len(ti))) * np.exp(-ti / 0.7)
ir = np.stack([lp(ir[0], 4500), lp(ir[1], 4500)])
ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True)) * 3.2
wet = np.stack([fftconvolve(out[0], ir[0])[:N], fftconvolve(out[1], ir[1])[:N]])
mix = out + 0.55 * wet
time = np.arange(N) / SR
mix *= np.clip(time / 0.05, 0, 1) * np.clip((DUR - time) / 1.2, 0, 1)
mix = np.tanh(mix * 1.2) / 1.2
mix /= np.abs(mix).max() / 0.89
with wave.open("video/musique.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype("<i2").tobytes())
print("ok")
