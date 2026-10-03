import * as THREE from "three";

// Chaque parfum : face lisse, pied plus clair et rugueux, garniture
export const FLAVORS = {
  chocolat: { face: 0x7d5c3d, foot: 0x9c7c52, fill: 0x3a2217, fillRough: 0.3, streak: false },
  cafe:     { face: 0xb59f86, foot: 0xc9b496, fill: 0xb98a58, fillRough: 0.6, streak: false },
  cassis:   { face: 0x70505f, foot: 0x805f70, fill: 0x3a2236, fillRough: 0.4, streak: true },
  pistache: { face: 0x9cc46c, foot: 0xb2d086, fill: 0xefe6c8, fillRough: 0.6, streak: false },
  framboise:{ face: 0xcc4a73, foot: 0xdb7090, fill: 0xf6d6df, fillRough: 0.6, streak: false },
  citron:   { face: 0xe6d655, foot: 0xefe27c, fill: 0xfff3b8, fillRough: 0.6, streak: false },
};
export const ORDER = ["chocolat", "cafe", "cassis", "pistache", "framboise", "citron"];

// ---------- textures procédurales (bruit de valeur sans raccord) ----------
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function noiseField(size, octaves, seed, sx = 1, sy = 1) {
  const f = new Float32Array(size * size), r = rng(seed);
  let amp = 1, tot = 0;
  for (const o of octaves) {
    const nx = Math.max(1, Math.round(o * sx)), ny = Math.max(1, Math.round(o * sy));
    const g = Array.from({ length: nx * ny }, r);
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * ny, y0 = Math.floor(fy), ty = fy - y0, uy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * nx, x0 = Math.floor(fx), tx = fx - x0, ux = tx * tx * (3 - 2 * tx);
        const a = g[(y0 % ny) * nx + (x0 % nx)], b = g[(y0 % ny) * nx + ((x0 + 1) % nx)];
        const c = g[((y0 + 1) % ny) * nx + (x0 % nx)], d = g[((y0 + 1) % ny) * nx + ((x0 + 1) % nx)];
        f[y * size + x] += amp * ((a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy);
      }
    }
    tot += amp; amp *= 0.55;
  }
  for (let i = 0; i < f.length; i++) f[i] /= tot;
  return f;
}
function toTexture(field, size, map) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"), im = g.createImageData(size, size);
  for (let i = 0; i < field.length; i++) { const v = Math.max(0, Math.min(255, map(field[i], i))); im.data.set([v, v, v, 255], i * 4); }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
// pores très fins de la face + quelques points sombres
const poresTex = () => {
  const a = noiseField(512, [110, 200, 256], 7), b = noiseField(512, [60], 11);
  return toTexture(a, 512, (v, i) => 128 + (v - 0.5) * 260 - (b[i] > 0.8 ? 80 : 0));
};
// face « brossée » (cassis) : stries presque parallèles
const streakTex = () => {
  const s = noiseField(512, [40, 90], 21, 1, 0.06), p = noiseField(512, [128, 200], 5);
  return toTexture(s, 512, (v, i) => 128 + (v - 0.5) * 330 + (p[i] - 0.5) * 60);
};
// pied : grain croustillant à plusieurs échelles, avec alvéoles
const crumbTex = () => {
  const a = noiseField(1024, [10, 20, 40, 80, 160], 3), b = noiseField(1024, [48, 96], 17);
  return toTexture(a, 1024, (v, i) => 40 + v * 240 - (b[i] > 0.7 ? 90 * (b[i] - 0.7) / 0.3 : 0));
};

// ---------- géométrie ----------
const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function domeGeometry() {
  const pts = [new THREE.Vector2(0, 0.2), new THREE.Vector2(0.9, 0.2)];
  const N = 48;
  for (let i = N; i >= 0; i--) {
    const u = i / N, r = u * 0.99;
    pts.push(new THREE.Vector2(r, 0.2 + 0.3 * Math.pow(1 - Math.pow(u, 3.2), 0.6)));
  }
  const geo = new THREE.LatheGeometry(pts, 220);
  // projection plane : pas de pincement au centre, stries parallèles
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.5 + 0.5, p.getZ(i) * 0.5 + 0.5);
  return geo;
}

function footGeometry() {
  const pts = [], H = 22, top = 0.22;
  for (let j = 0; j <= H; j++) {
    const t = j / H;
    const bulge = Math.sin(Math.min(1, t * 1.1) * Math.PI) * 0.06;
    pts.push(new THREE.Vector2(0.9 + bulge + t * 0.08, t * top));
  }
  pts.unshift(new THREE.Vector2(0, 0), new THREE.Vector2(0.88, 0));
  const geo = new THREE.LatheGeometry(pts, 420);
  const p = geo.attributes.position;
  const n3 = (x, y, z) => Math.sin(x * 9.1 + Math.sin(y * 7.3 + z * 3.1)) * Math.sin(y * 11.7 + Math.sin(z * 5.9 + x * 2.3)) * Math.sin(z * 8.3 + Math.sin(x * 6.7 + y * 4.1));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < 0.001 || Math.hypot(x, z) < 0.89) continue;
    const a = Math.atan2(z, x), w = THREE.MathUtils.smoothstep(top - y, 0, 0.12) * 0.85 + 0.15;
    const n = 0.022 * Math.sin(a * 33 + y * 28 + Math.sin(a * 7) * 2) + 0.014 * Math.sin(a * 67 - y * 44 + 2) +
              0.010 * n3(x * 4, y * 22, z * 4) + 0.008 * Math.sin(a * 131 + y * 95 + 5) + 0.010 * (hash(i) - 0.5);
    const f = 1 + n * w;
    p.setX(i, x * f); p.setZ(i, z * f); p.setY(i, y + 0.014 * (hash(i + 99) - 0.5) * w + 0.006 * n3(x * 7, y * 30, z * 7) * w);
  }
  geo.computeVertexNormals();
  return geo;
}

function fillGeometry() {
  const pts = [new THREE.Vector2(0, -0.2), new THREE.Vector2(0.86, -0.2), new THREE.Vector2(0.99, -0.12),
    new THREE.Vector2(1.04, 0), new THREE.Vector2(0.99, 0.12), new THREE.Vector2(0.86, 0.2), new THREE.Vector2(0, 0.2)];
  const geo = new THREE.LatheGeometry(pts, 160);
  // ombre de contact : plus sombre près des coques
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const k = 0.5 + 0.5 * (1 - THREE.MathUtils.smoothstep(Math.abs(p.getY(i)), 0.02, 0.2));
    col.set([k, k, k], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return geo;
}

export function createMacaron(host) {
  const state = { x: 0, y: 0, scale: 1, rotY: -0.85, rotX: 0.08, explode: 0, flavor: 0, active: true };
  const api = { state, onFrame: null, pts: null };
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0.35, 6.6);
    camera.lookAt(0, 0, 0);

    // « studio » photo : softboxes → reflets doux et réalistes
    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0x2a1d3a);
    const box = (w, h, col, i, pos) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(i), side: THREE.DoubleSide }));
      m.position.set(...pos); m.lookAt(0, 0, 0); studio.add(m);
    };
    box(9, 6, 0xfff0e0, 5, [-5, 5, 5]);
    box(2, 8, 0xc4e09a, 0.5, [6, 1, -3]);
    box(7, 3, 0xa77bdc, 2, [3, -3, 4]);
    box(12, 3, 0xfff6ea, 1.5, [0, 6, -4]);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(studio, 0.04).texture;
    const key = new THREE.DirectionalLight(0xfff0dc, 2.0);
    key.position.set(-3.5, 4.5, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 16 });
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 5;
    scene.add(key);

    const pores = poresTex(), streaks = streakTex(), crumb = crumbTex();
    const f0 = FLAVORS.chocolat;
    const faceMat = new THREE.MeshPhysicalMaterial({
      color: f0.face, roughness: 0.62, clearcoat: 0.05, clearcoatRoughness: 0.7,
      sheen: 0.2, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xd8b890),
      bumpMap: pores, bumpScale: 0.7, envMapIntensity: 0.4,
    });
    const footMat = new THREE.MeshPhysicalMaterial({
      color: f0.foot, roughness: 0.95, sheen: 0.3, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xf0dcc0),
      bumpMap: crumb, bumpScale: 4.5, envMapIntensity: 0.3,
    });
    footMat.bumpMap.repeat.set(4, 1);
    const fillMat = new THREE.MeshPhysicalMaterial({
      color: f0.fill, roughness: f0.fillRough, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 1.0, vertexColors: true,
    });

    const geos = [domeGeometry(), footGeometry()];
    const makeShell = () => {
      const g = new THREE.Group();
      for (const [geo, mat] of [[geos[0], faceMat], [geos[1], footMat]]) {
        const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; g.add(m);
      }
      return g;
    };
    const top = makeShell(), bottom = makeShell();
    bottom.rotation.x = Math.PI;
    const fill = new THREE.Mesh(fillGeometry(), fillMat);
    fill.castShadow = fill.receiveShadow = true;
    const macaron = new THREE.Group();
    macaron.add(top, bottom, fill);
    macaron.rotation.z = -Math.PI / 2;
    const spin = new THREE.Group(); spin.add(macaron); scene.add(spin);

    // repères pour les légendes de la vue éclatée
    const mk = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
    const marks = [mk(top, 0, 0.5, 0), mk(fill, 1.04, 0, 0), mk(bottom, 0.98, 0.1, 0)];

    function resize() {
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = w / h < 0.9 ? 9.4 : 6.6;
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(host); resize();

    // glisser pour tourner, retour élastique vers la pose du scroll
    let dY = 0, dX = 0, vY = 0, vX = 0, drag = false, lx = 0, ly = 0;
    const el = renderer.domElement;
    el.addEventListener("pointerdown", e => { drag = true; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId); host.classList.add("grab"); });
    el.addEventListener("pointermove", e => {
      if (!drag) return;
      vY = (e.clientX - lx) * 0.012; vX = (e.clientY - ly) * 0.006;
      dY += vY; dX = THREE.MathUtils.clamp(dX + vX, -0.8, 0.8);
      lx = e.clientX; ly = e.clientY;
      document.documentElement.classList.add("touched");
    });
    const up = () => { drag = false; host.classList.remove("grab"); dY = ((dY + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);

    const ca = new THREE.Color(), cb = new THREE.Color();
    const mix = (target, key, i, j, t) => target.copy(ca.setHex(FLAVORS[ORDER[i]][key])).lerp(cb.setHex(FLAVORS[ORDER[j]][key]), t);
    let lastF = -1, lastNear = -1;
    function applyFlavor(f) {
      if (Math.abs(f - lastF) < 0.001) return;
      lastF = f;
      const i = Math.min(ORDER.length - 1, Math.floor(f)), j = Math.min(ORDER.length - 1, i + 1);
      const t = THREE.MathUtils.smoothstep(f - i, 0.25, 0.75);
      mix(faceMat.color, "face", i, j, t); mix(footMat.color, "foot", i, j, t); mix(fillMat.color, "fill", i, j, t);
      fillMat.roughness = THREE.MathUtils.lerp(FLAVORS[ORDER[i]].fillRough, FLAVORS[ORDER[j]].fillRough, t);
      const near = FLAVORS[ORDER[t > 0.5 ? j : i]].streak ? 1 : 0;
      if (near !== lastNear) { lastNear = near; faceMat.bumpMap = near ? streaks : pores; faceMat.bumpScale = near ? 2.4 : 0.7; faceMat.needsUpdate = true; }
      api.glow = "#" + faceMat.color.getHexString();
    }

    const clock = new THREE.Clock(), v = new THREE.Vector3();
    renderer.setAnimationLoop(() => {
      if (api.onFrame) api.onFrame();
      if (!state.active) return;
      const t = clock.getElapsedTime();
      if (!drag) { vY *= 0.94; vX *= 0.92; dY += vY; dX += vX; dY += (0 - dY) * 0.025; dX += (0 - dX) * 0.04; }
      applyFlavor(state.flavor);
      spin.position.set(state.x, state.y + Math.sin(t * 1.1) * 0.05, 0);
      spin.rotation.y = state.rotY + dY + Math.sin(t * 0.5) * 0.06;
      spin.rotation.x = state.rotX + dX;
      macaron.scale.setScalar(1.18 * state.scale);
      top.position.y = 0.1 + state.explode; bottom.position.y = -0.1 - state.explode;
      renderer.render(scene, camera);
      if (state.explode > 0.02) {
        const w = host.clientWidth, h = host.clientHeight;
        api.pts = marks.map(m => { m.getWorldPosition(v); v.project(camera); return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h }; });
      } else api.pts = null;
    });
    host.classList.add("ready");
  } catch (e) {
    host.classList.add("no3d");
  }
  return api;
}
