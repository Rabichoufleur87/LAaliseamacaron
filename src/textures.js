import * as THREE from "three";

// Textures procédurales calculées une seule fois sur le GPU, au chargement :
// grain de la coque, alvéoles de l'intérieur et du pied, volutes de la ganache.
// Chaque surface fournit une hauteur H (→ carte de normales) et un albédo A.
const COMMON = /* glsl */ `
varying vec2 vUv;
uniform float uSeed, uMode, uRes, uK;
float h1(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031 + uSeed * 0.0137);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
vec2 h2(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973) + uSeed * 0.0137);
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}
float vnoise(vec2 p, vec2 per) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  float a = h1(mod(i, per)), b = h1(mod(i + vec2(1.0, 0.0), per));
  float c = h1(mod(i + vec2(0.0, 1.0), per)), d = h1(mod(i + vec2(1.0, 1.0), per));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 uv, vec2 base, int oct) {
  float s = 0.0, a = 0.5, t = 0.0;
  vec2 n = base;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    s += a * vnoise(uv * n, n);
    t += a; n *= 2.0; a *= 0.5;
  }
  return s / t;
}
// Worley périodique : x = distance au germe le plus proche, y = au second (en cellules), z = identifiant de la cellule
vec3 worley(vec2 uv, float n) {
  vec2 p = uv * n, i = floor(p), f = fract(p);
  float d1 = 9.0, d2 = 9.0, id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 c = mod(i + g, n);
      vec2 r = g + 0.1 + 0.8 * h2(c) - f;
      float dd = dot(r, r);
      if (dd < d1) { d2 = d1; d1 = dd; id = h1(c * 1.37 + 11.0); }
      else if (dd < d2) { d2 = dd; }
    }
  }
  return vec3(sqrt(d1), sqrt(d2), id);
}
// alvéole à bords francs et fond arrondi : profondeur 0..1
float pores(vec2 uv, float n, float dens, float rmin, float rmax) {
  vec3 w = worley(uv, n);
  float on = step(1.0 - dens, fract(w.z * 3.71));
  float r = mix(rmin, rmax, fract(w.z * 13.37));
  return on * smoothstep(r, r * 0.45, w.x);
}
`;

const SURF = {
  // pied et intérieur de la coque : biscuit alvéolé, trous de toutes tailles
  crumb: /* glsl */ `
// coordonnées déformées : des bulles irrégulières, jamais parfaitement rondes
vec2 warp(vec2 uv) { return uv + (vec2(fbm(uv, vec2(6.0), 3), fbm(uv + 0.37, vec2(6.0), 3)) - 0.5) * 0.04; }
float cavity(vec2 uv) {
  vec2 q = warp(uv);
  float c1 = pores(q, 9.0, 0.3, 0.30, 0.50);
  float c2 = pores(q, 19.0, 0.45, 0.25, 0.48);
  float c3 = pores(q + 0.13, 41.0, 0.6, 0.22, 0.45);
  float c4 = pores(q + 0.29, 89.0, 0.7, 0.20, 0.42);
  float c5 = pores(q + 0.51, 170.0, 0.75, 0.20, 0.40);
  return max(max(c1, c2 * 0.9), max(max(c3 * 0.75, c4 * 0.55), c5 * 0.35));
}
// mousse : fines cloisons entre les bulles (0 sur les cloisons, 1 au cœur des cellules)
float foam(vec2 uv) { vec3 w = worley(warp(uv) + 0.71, 32.0); return smoothstep(0.0, 0.3, w.y - w.x); }
float H(vec2 uv) { return fbm(uv, vec2(7.0), 5) * 0.45 - foam(uv) * 0.12 + fbm(uv, vec2(128.0), 2) * 0.05 - cavity(uv) * 0.5; }
float A(vec2 uv) {
  float c = cavity(uv);
  return clamp(1.0 - c * 0.5 - foam(uv) * 0.08 + (fbm(uv, vec2(5.0), 4) - 0.5) * 0.22 + (fbm(uv, vec2(160.0), 2) - 0.5) * 0.1, 0.3, 1.0);
}`,
  // face lisse : grain très fin, légères ondulations, rares micro-points
  face: /* glsl */ `
float H(vec2 uv) { return fbm(uv, vec2(9.0), 4) * 0.22 + fbm(uv, vec2(220.0), 2) * 0.08 - pores(uv, 140.0, 0.18, 0.15, 0.35) * 0.06; }
float A(vec2 uv) {
  return clamp(0.95 + (fbm(uv, vec2(6.0), 4) - 0.5) * 0.14 + (fbm(uv, vec2(200.0), 2) - 0.5) * 0.06
    - pores(uv, 45.0, 0.05, 0.08, 0.16) * 0.35, 0.0, 1.0);
}`,
  // face « brossée » (cassis)
  streak: /* glsl */ `
float H(vec2 uv) { return fbm(uv, vec2(64.0, 2.0), 4) * 0.5 + fbm(uv, vec2(220.0), 2) * 0.06; }
float A(vec2 uv) { return clamp(0.92 + (fbm(uv, vec2(64.0, 2.0), 4) - 0.5) * 0.35 + (fbm(uv, vec2(6.0), 3) - 0.5) * 0.1, 0.0, 1.0); }`,
  // ganache : volutes lissées à la spatule (faces, projection centrée sur le disque)
  ganache: /* glsl */ `
float W(vec2 uv) { return fbm(uv, vec2(4.0), 4); }
float RG(vec2 uv) {
  vec2 p = (uv - 0.5) * 2.0;
  float r = length(p), a = atan(p.y, p.x), w = W(uv);
  return smoothstep(-0.7, 0.8, sin(r * 26.0 + a + w * 10.0 + sin(a * 3.0 + r * 6.0 + w * 4.0) * 1.5));
}
float H(vec2 uv) { return RG(uv) * 0.35 + W(uv) * 0.6 + fbm(uv, vec2(64.0), 3) * 0.03; }
float A(vec2 uv) { return clamp(0.9 + RG(uv) * 0.1 + (W(uv) - 0.5) * 0.12, 0.0, 1.0); }`,
  // ganache : flanc (motif périodique)
  ganSide: /* glsl */ `
float W(vec2 uv) { return fbm(uv, vec2(3.0), 4); }
float RG(vec2 uv) { return smoothstep(-0.8, 0.9, sin(uv.y * 25.1327 + W(uv) * 9.0)); }
float H(vec2 uv) { return RG(uv) * 0.3 + W(uv) * 0.6 + fbm(uv, vec2(48.0), 3) * 0.04; }
float A(vec2 uv) { return clamp(0.9 + RG(uv) * 0.1 + (W(uv) - 0.5) * 0.12, 0.0, 1.0); }`,
};

const MAIN = /* glsl */ `
void main() {
  if (uMode < 0.5) { gl_FragColor = vec4(vec3(pow(A(vUv), 2.2)), 1.0); return; }
  float e = 1.0 / uRes;
  float hx = (H(vUv + vec2(e, 0.0)) - H(vUv - vec2(e, 0.0))) / (2.0 * e);
  float hy = (H(vUv + vec2(0.0, e)) - H(vUv - vec2(0.0, e))) / (2.0 * e);
  gl_FragColor = vec4(normalize(vec3(-hx * uK, -hy * uK, 1.0)) * 0.5 + 0.5, 1.0);
}`;

export function bakeTextures(renderer, size) {
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  scene.add(quad);
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const bake = (surf, mode, k, wrap) => {
    const rt = new THREE.WebGLRenderTarget(size, size, {
      depthBuffer: false, wrapS: wrap, wrapT: wrap, anisotropy,
      minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true,
    });
    quad.material = new THREE.ShaderMaterial({
      uniforms: { uSeed: { value: 3.7 }, uMode: { value: mode }, uRes: { value: size }, uK: { value: k } },
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: COMMON + SURF[surf] + MAIN,
    });
    renderer.setRenderTarget(rt);
    renderer.render(scene, cam);
    quad.material.dispose();
    return rt.texture;
  };
  const REP = THREE.RepeatWrapping, CLAMP = THREE.ClampToEdgeWrapping;
  const t = {
    crumbA: bake("crumb", 0, 0, REP), crumbN: bake("crumb", 1, 0.03, REP),
    faceA: bake("face", 0, 0, REP), faceN: bake("face", 1, 0.015, REP),
    streakA: bake("streak", 0, 0, REP), streakN: bake("streak", 1, 0.02, REP),
    ganA: bake("ganache", 0, 0, CLAMP), ganN: bake("ganache", 1, 0.02, CLAMP),
    sideA: bake("ganSide", 0, 0, REP), sideN: bake("ganSide", 1, 0.018, REP),
  };
  renderer.setRenderTarget(null);
  quad.geometry.dispose();
  return t;
}
