import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// ---------- bruit de Perlin 3D (« improved noise » de Ken Perlin) ----------
const PERM = new Uint8Array(512);
{
  const p = Array.from({ length: 256 }, (_, i) => i);
  let s = 20131;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const mix = (a, b, t) => a + (b - a) * t;
function grad(h, x, y, z) {
  h &= 15;
  const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return (h & 1 ? -u : u) + (h & 2 ? -v : v);
}
export function perlin(x, y, z) {
  const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
  const X = fx & 255, Y = fy & 255, Z = fz & 255;
  x -= fx; y -= fy; z -= fz;
  const u = fade(x), v = fade(y), w = fade(z);
  const A = PERM[X] + Y, AA = PERM[A] + Z, AB = PERM[A + 1] + Z;
  const B = PERM[X + 1] + Y, BA = PERM[B] + Z, BB = PERM[B + 1] + Z;
  return mix(
    mix(mix(grad(PERM[AA], x, y, z), grad(PERM[BA], x - 1, y, z), u),
        mix(grad(PERM[AB], x, y - 1, z), grad(PERM[BB], x - 1, y - 1, z), u), v),
    mix(mix(grad(PERM[AA + 1], x, y, z - 1), grad(PERM[BA + 1], x - 1, y, z - 1), u),
        mix(grad(PERM[AB + 1], x, y - 1, z - 1), grad(PERM[BB + 1], x - 1, y - 1, z - 1), u), v), w);
}
export const mulberry = seed => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const range = (n, f) => Array.from({ length: n + 1 }, (_, j) => f(j / n));

// ---------- solide de révolution multi-matériaux ----------
// Chaque section est un profil [r, y] parcouru dans le sens trigonométrique
// (face du dessous vers l'extérieur, flanc vers le haut, dessus vers l'axe) : normales sortantes.
// uv « cyl » : autour × hauteur ; uv « plane » : projection vue de dessus (pas de pincement au centre) ;
// uv « dome » : déroulé depuis le sommet (distance le long du profil), sans étirement sur les bords bombés.
function revolve(sections, R, deform) {
  const pos = [], uv = [], idx = [], rows = [], seams = [], poles = [], groups = [];
  for (const sec of sections) {
    const start = pos.length / 3, i0 = idx.length, n = sec.pts.length;
    rows.push(start);
    const arc = [0];
    for (let j = 1; j < n; j++) arc[j] = arc[j - 1] + Math.hypot(sec.pts[j][0] - sec.pts[j - 1][0], sec.pts[j][1] - sec.pts[j - 1][1]);
    for (let j = 0; j < n; j++) {
      const [r, y] = sec.pts[j];
      for (let i = 0; i <= R; i++) {
        const t = (i / R) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
        const p = deform(r * c, y, r * s, t, r);
        pos.push(p[0], p[1], p[2]);
        if (sec.uv === "cyl") uv.push((i / R) * sec.N, y / sec.S);
        else if (sec.uv === "dome") { const d = (arc[n - 1] - arc[j]) / sec.S; uv.push(c * d + 0.5, s * d + 0.5); }
        else uv.push((r * c) / sec.S + 0.5, (r * s) / sec.S + 0.5);
      }
      const a = start + j * (R + 1);
      seams.push([a, a + R]);
      if (r < 1e-6) poles.push(a);
    }
    for (let j = 0; j < n - 1; j++) {
      for (let i = 0; i < R; i++) {
        const a = start + j * (R + 1) + i, b = a + R + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    groups.push([i0, idx.length - i0, sec.mat]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  groups.forEach(([s, c, m]) => g.addGroup(s, c, m));
  g.computeVertexNormals();
  // raccords : couture à 0/2π et pôles sur l'axe
  const nr = g.attributes.normal, A = new THREE.Vector3(), B = new THREE.Vector3();
  for (const [a, b] of seams) {
    A.fromBufferAttribute(nr, a).add(B.fromBufferAttribute(nr, b)).normalize();
    nr.setXYZ(a, A.x, A.y, A.z); nr.setXYZ(b, A.x, A.y, A.z);
  }
  for (const a of poles) {
    A.set(0, 0, 0);
    for (let i = 0; i <= R; i++) A.add(B.fromBufferAttribute(nr, a + i));
    A.normalize();
    for (let i = 0; i <= R; i++) nr.setXYZ(a + i, A.x, A.y, A.z);
  }
  g.userData.rows = rows;
  return g;
}
// moyenne des normales sur une rangée commune à deux pièces (pied continu une fois assemblé)
function stitch(gA, a0, gB, b0, R) {
  const na = gA.attributes.normal, nb = gB.attributes.normal, A = new THREE.Vector3(), B = new THREE.Vector3();
  for (let i = 0; i <= R; i++) {
    A.fromBufferAttribute(na, a0 + i).add(B.fromBufferAttribute(nb, b0 + i)).normalize();
    na.setXYZ(a0 + i, A.x, A.y, A.z); nb.setXYZ(b0 + i, A.x, A.y, A.z);
  }
}

// ---------- coque ----------
// Repère local d'une coque (rayon ≈ 1, y = 0 contre la ganache) :
// intérieur alvéolé de 0 à SPLIT, pied jusqu'à FOOT (≈ 40 % de la coque), dôme lisse jusqu'à TOP.
export const SH = { split: 0.1, foot: 0.16, top: 0.4, rim: 0.955 };
const footR = y => SH.rim + 0.04 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, y / SH.foot))), 0.8);

function shellDeform(seed) {
  return (x, y, z, t, r) => {
    // une coque n'est jamais parfaitement ronde
    const k = 1 + 0.008 * Math.sin(2 * t + seed) + 0.006 * Math.sin(3 * t + seed * 2.1) + 0.004 * Math.sin(5 * t + seed * 0.7);
    let X = x * k, Y = y, Z = z * k;
    if (y >= SH.foot - 1e-6) { // dôme : légère irrégularité, nulle au bord et au sommet
      const u = r / SH.rim;
      Y += 0.012 * Math.sin(t + seed) * 4 * u * (1 - u);
    }
    // relief « croustillant » sur le pied et les faces intérieures, qui s'efface vers le dôme
    const w = 1 - smooth(y, SH.foot - 0.03, SH.foot);
    if (w > 0) {
      const a = 0.016 * w, b = 0.006 * w, f = 15, f2 = 33, o = seed * 7.3;
      const px = X * f + o, py = Y * f * 0.7, pz = Z * f; // étiré en hauteur : collerette plissée
      const dx = perlin(px, py, pz), dy = perlin(px + 31.4, py + 17.1, pz + 5.3), dz = perlin(px + 11.7, py + 43.2, pz + 27.9);
      const ex = perlin(X * f2 + o, Y * f2, Z * f2 + 3.3), ey = perlin(X * f2 + 9.1, Y * f2 + o, Z * f2), ez = perlin(X * f2, Y * f2 + 5.5, Z * f2 + o);
      X += a * dx + b * ex;
      Y += a * 0.7 * dy + b * ey;
      Z += a * dz + b * ez;
    }
    return [X, Y, Z];
  };
}

// Une coque = « croûte » (face intérieure alvéolée + pied + dôme) et « intérieur » (disque alvéolé),
// séparables pour la vue éclatée. Le pied est continu entre les deux quand elles sont assemblées.
export function shellPieces(seed, R) {
  const deform = shellDeform(seed);
  // pied : alvéoles plus fines (S = 0,5) que sur les faces intérieures (S = 1)
  const rs = footR(SH.split), r0 = footR(0), S = 1, BS = 0.5, N = 12, BAND = 16;
  const band = (y0, y1, n) => range(n, u => { const y = y0 + (y1 - y0) * u; return [footR(y), y]; });
  const crust = revolve([
    { mat: 1, uv: "plane", S, pts: range(24, u => [rs * u, SH.split + 0.025 * (1 - u * u)]) },
    { mat: 1, uv: "cyl", S: BS, N, pts: band(SH.split, SH.foot, 10) },
    { mat: 0, uv: "dome", S, pts: range(60, u => {
      const v = 1 - Math.pow(u, 1.6);
      return [SH.rim * v, SH.foot + (SH.top - SH.foot) * Math.sqrt(Math.max(0, 1 - Math.pow(v, 2.8)))];
    }) },
  ], R, deform);
  const slab = revolve([
    { mat: 1, uv: "plane", S, pts: range(22, u => [r0 * u, 0]) },
    { mat: 1, uv: "cyl", S: BS, N, pts: band(0, SH.split, BAND) },
    { mat: 1, uv: "plane", S, pts: range(24, u => { const v = 1 - u; return [rs * v, SH.split + 0.01 * (1 - v * v)]; }) },
  ], R, deform);
  stitch(crust, crust.userData.rows[1], slab, slab.userData.rows[1] + BAND * (R + 1), R);
  return { crust, slab };
}

// ---------- ganache : disque légèrement bombé, bord renflé et irrégulier ----------
export const GA = { r: 0.93, h: 0.12 };
export function ganacheGeometry(R) {
  const RE = GA.r * 0.93, D = 0.014;
  const deform = (x, y, z, t, r) => {
    const k = 1 + 0.02 * Math.sin(2 * t + 0.4) + 0.012 * Math.sin(3 * t + 1.9) + 0.006 * Math.sin(7 * t + 0.3);
    let X = x * k, Y = y, Z = z * k;
    const a = 0.009 * smooth(r, 0.3, RE);
    const dx = perlin(X * 8, Y * 8, Z * 8), dy = perlin(X * 8 + 7.1, Y * 8, Z * 8 + 3.3), dz = perlin(X * 8 + 2.2, Y * 8 + 5.4, Z * 8);
    return [X + a * dx, Y + a * 0.6 * dy, Z + a * dz];
  };
  return revolve([
    { mat: 0, uv: "plane", S: 2 * GA.r, pts: range(26, u => [RE * u, -GA.h - D * (1 - u * u)]) },
    { mat: 1, uv: "cyl", S: 0.5, N: 5, pts: range(22, u => { const p = -Math.PI / 2 + u * Math.PI; return [RE + (GA.r - RE) * Math.cos(p), GA.h * Math.sin(p)]; }) },
    { mat: 0, uv: "plane", S: 2 * GA.r, pts: range(26, u => { const v = 1 - u; return [RE * v, GA.h + D * (1 - v * v)]; }) },
  ], R, deform);
}

// ---------- miette : caillou irrégulier ----------
export function crumbGeometry(seed) {
  let g = new THREE.IcosahedronGeometry(1, 2);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(1 + 0.38 * perlin(v.x * 1.6 + seed, v.y * 1.6, v.z * 1.6 - seed) + 0.14 * perlin(v.x * 4 + seed, v.y * 4 + 1, v.z * 4));
    v.y *= 0.72;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    uv[i * 2] = (Math.atan2(v.z, v.x) / (2 * Math.PI) + 0.5) * 0.3;
    uv[i * 2 + 1] = v.y * 0.1 + 0.5;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}
