# Pièce originale pour piano seul, tranquille, dans l'esprit d'un andante classique
# (do majeur, 3/4, 72 à la noire : 12 mesures = 30 s), synthétisée note par note : libre de droits.
# Timbre volontairement doux : peu d'harmoniques, aigus filtrés, pas de bruit de marteau, aucune note très haute.
import numpy as np, wave
from scipy.signal import butter, sosfilt, fftconvolve

SR, DUR = 44100, 30.0
BEAT = 60 / 72            # 0,833 s ; mesure à 3 temps = 2,5 s
N = int(SR * DUR)
out = np.zeros((2, N))
rng = np.random.default_rng(5)
midi = lambda m: 440 * 2 ** ((m - 69) / 12)
lp = lambda x, f: sosfilt(butter(2, f, "low", fs=SR, output="sos"), x)

def piano(m, dur, vel):
    f0 = midi(m)
    t = np.arange(int((dur + 1.2) * SR)) / SR
    tau = np.clip(3.2 * (262 / f0) ** 0.5, 1.2, 5.0)
    s = np.zeros_like(t)
    for k in range(1, 7):
        fk = k * f0 * np.sqrt(1 + 0.0003 * k * k)
        a = 1 / k ** 1.7
        tk = tau / (1 + 0.5 * (k - 1))
        s += a * (0.6 * np.exp(-t / (tk * 0.3)) + 0.4 * np.exp(-t / tk)) * np.sin(2 * np.pi * fk * t)
    s *= np.minimum(t / 0.006, 1)                                  # attaque douce, sans clic
    s *= np.where(t > dur, np.exp(-(t - dur) / 0.35), 1)           # relâché lent, comme avec la pédale
    return s * vel * 0.2

def play(m, start, dur, vel, pan):
    i = int(start * SR)
    if i >= N: return
    s = piano(m, dur, vel)[: N - i]
    out[0, i:i + len(s)] += s * np.sqrt(0.5 * (1 - pan))
    out[1, i:i + len(s)] += s * np.sqrt(0.5 * (1 + pan))

C, D, E, F, G, A, B = 0, 2, 4, 5, 7, 9, 11
n = lambda name, o: 12 * (o + 1) + name
# mélodie : (temps, durée en temps, note) — tout entre sol 4 et la 5
MEL = [
    [(0, 2, n(E, 5)), (2, 1, n(G, 5))],
    [(0, 2, n(D, 5)), (2, 1, n(B, 4))],
    [(0, 1, n(C, 5)), (1, 1, n(E, 5)), (2, 1, n(A, 5))],
    [(0, 2, n(G, 5)), (2, 1, n(F, 5))],
    [(0, 1, n(E, 5)), (1, 1, n(G, 5)), (2, 1, n(E, 5))],
    [(0, 1.5, n(F, 5)), (1.5, .5, n(E, 5)), (2, 1, n(D, 5))],
    [(0, 2, n(F, 5)), (2, 1, n(D, 5))],
    [(0, 3, n(E, 5))],
    [(0, 2, n(A, 5)), (2, 1, n(G, 5))],
    [(0, 1, n(G, 5)), (1, 1, n(E, 5)), (2, 1, n(C, 5))],
    [(0, 2, n(D, 5)), (2, 1, n(B, 4))],
    [(0, 3, n(C, 5))],
]
# accompagnement : arpège lent en croches (basse, quinte, tierce, quinte, tierce, quinte)
CH = [(n(C, 3), n(G, 3), n(E, 4)), (n(G, 2), n(D, 3), n(B, 3)), (n(A, 2), n(E, 3), n(C, 4)), (n(F, 2), n(C, 3), n(A, 3)),
      (n(C, 3), n(G, 3), n(E, 4)), (n(D, 3), n(A, 3), n(F, 4)), (n(G, 2), n(D, 3), n(F, 3)), (n(C, 3), n(G, 3), n(E, 4)),
      (n(F, 2), n(C, 3), n(A, 3)), (n(C, 3), n(G, 3), n(E, 4)), (n(G, 2), n(D, 3), n(F, 3)), (n(C, 2), n(G, 2), n(E, 3))]

def vel_at(t): return float(np.interp(t, [0, 4, 15, 20, 25, 30], [.42, .52, .56, .6, .52, .42]))

for b in range(12):
    t0 = b * 3 * BEAT
    for beat, d, m in MEL[b]:
        tt = t0 + beat * BEAT
        play(m, tt, d * BEAT, vel_at(tt) * rng.uniform(.96, 1.02), 0.12)
    lo, fifth, third = CH[b]
    if b == 11:                                                    # accord final, posé et tenu
        for k, m in enumerate((lo, fifth, third, n(G, 3))):
            play(m, t0 + k * 0.12, 4.0, vel_at(t0) * 0.6, -0.15)
        continue
    for k, m in enumerate((lo, fifth, third, fifth, third, fifth)):
        tt = t0 + k * BEAT / 2
        play(m, tt, 3 * BEAT - k * BEAT / 2, vel_at(tt) * (0.42 if k == 0 else 0.3), -0.15)

# légère acoustique de pièce, filtrée pour rester feutrée
ti = np.arange(int(1.8 * SR)) / SR
ir = rng.standard_normal((2, len(ti))) * np.exp(-ti / 0.45)
ir = np.stack([lp(ir[0], 2500), lp(ir[1], 2500)])
ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True)) * 4
wet = np.stack([fftconvolve(out[0], ir[0])[:N], fftconvolve(out[1], ir[1])[:N]])
mix = out + 0.4 * wet
mix = np.stack([lp(mix[0], 3200), lp(mix[1], 3200)])             # coupe les aigus : rien de perçant
time = np.arange(N) / SR
mix *= np.clip(time / 0.1, 0, 1) * np.clip((DUR - time) / 1.8, 0, 1)
mix /= np.abs(mix).max() / 0.85
with wave.open("video/musique.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype("<i2").tobytes())
print("ok")
