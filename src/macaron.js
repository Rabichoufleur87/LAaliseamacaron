import * as THREE from "three";

const host = document.getElementById("stage");
// face lisse, « pied » plus clair et rugueux, garniture
const FLAVORS = {
  chocolat:  { face: 0x8a6446, foot: 0x9a7048, fill: 0x2a160f },
  pistache:  { face: 0x9cc46c, foot: 0xaccb80, fill: 0xf0e8cf },
  violet:    { face: 0x7a4cb8, foot: 0x8d62c6, fill: 0xe3d2f7 },
  framboise: { face: 0xd04a72, foot: 0xdd6c8b, fill: 0xf7d9e2 },
  citron:    { face: 0xeadb55, foot: 0xf0e378, fill: 0xfff3b8 },
};

// textures procédurales : pores fins sur la face, grain « croustillant » sur le pied
function grain(size, dots, minR, maxR, contrast, pits) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  g.fillStyle = "#808080"; g.fillRect(0, 0, size, size);
  for (let i = 0; i < dots; i++) {
    const v = 128 + (Math.random() - 0.5) * contrast;
    const r = minR + Math.random() * (maxR - minR);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath(); g.arc(Math.random() * size, Math.random() * size, r, 0, 7); g.fill();
  }
  for (let i = 0; i < pits; i++) {
    g.fillStyle = "rgba(20,20,20,.7)";
    g.beginPath(); g.arc(Math.random() * size, Math.random() * size, 0.8 + Math.random() * 1.6, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function domeGeometry() {
  const pts = [new THREE.Vector2(0, 0.17), new THREE.Vector2(0.9, 0.17)];
  const N = 44;
  for (let i = N; i >= 0; i--) {              // du bord vers le sommet
    const r = (i / N) * 0.985;
    const u = r / 0.985;
    pts.push(new THREE.Vector2(r, 0.17 + 0.36 * Math.pow(1 - Math.pow(u, 2.5), 0.62)));
  }
  // ordre bas → haut pour des normales vers l'extérieur
  const prof = [pts[0], pts[1], ...pts.slice(2)];
  return new THREE.LatheGeometry(prof, 200);
}

function footGeometry() {
  const pts = [], H = 16;
  for (let j = 0; j <= H; j++) {
    const t = j / H;                           // 0 = bas, 1 = jonction avec la face
    const bulge = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.055;
    pts.push(new THREE.Vector2(0.9 + bulge + t * 0.07, t * 0.19));
  }
  pts.unshift(new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.88, 0.0));
  const geo = new THREE.LatheGeometry(pts, 260);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < 0.001 || Math.hypot(x, z) < 0.89) continue;
    const a = Math.atan2(z, x), w = THREE.MathUtils.smoothstep(0.19 - y, 0, 0.1) * 0.85 + 0.15;
    const n = 0.018 * Math.sin(a * 37 + y * 24) + 0.012 * Math.sin(a * 71 - y * 40 + 2) +
              0.007 * Math.sin(a * 113 + y * 90 + 5) + 0.012 * (hash(i) - 0.5);
    const f = 1 + n * w;
    p.setX(i, x * f); p.setZ(i, z * f); p.setY(i, y + 0.012 * (hash(i + 99) - 0.5) * w);
  }
  geo.computeVertexNormals();
  return geo;
}

function fillGeometry() {
  const pts = [new THREE.Vector2(0, -0.2), new THREE.Vector2(0.88, -0.2),
    new THREE.Vector2(0.97, -0.12), new THREE.Vector2(1.0, 0), new THREE.Vector2(0.97, 0.12),
    new THREE.Vector2(0.88, 0.2), new THREE.Vector2(0, 0.2)];
  return new THREE.LatheGeometry(pts, 120);
}

try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.35, 6.6);
  camera.lookAt(0, 0, 0);

  // « studio » photo : grands softboxes pour de vrais reflets
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x1d1133);
  const box = (w, h, col, i, pos, look) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(...look); studio.add(m);
  };
  box(8, 5, 0xfff0dd, 9, [-5, 5, 4], [0, 0, 0]);       // clé chaude en haut à gauche
  box(3, 8, 0xc4e09a, 4, [6, 1, -3], [0, 0, 0]);       // liseré vert à droite
  box(6, 3, 0xa77bdc, 3, [3, -3, 4], [0, 0, 0]);       // contre-jour violet
  box(10, 2, 0xffffff, 2, [0, 6, -4], [0, 0, 0]);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(studio, 0.03).texture;
  const key = new THREE.DirectionalLight(0xfff1de, 1.6); key.position.set(-3, 4, 5); scene.add(key);

  const faceMat = new THREE.MeshPhysicalMaterial({
    color: FLAVORS.chocolat.face, roughness: 0.5, clearcoat: 0.1, clearcoatRoughness: 0.6,
    sheen: 0.15, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xd9b48a),
    bumpMap: grain(512, 5000, 0.6, 1.8, 90, 40), bumpScale: 0.7, envMapIntensity: 0.45,
  });
  faceMat.bumpMap.repeat.set(2, 2);
  const footMat = new THREE.MeshPhysicalMaterial({
    color: FLAVORS.chocolat.foot, roughness: 0.92,
    bumpMap: grain(512, 3200, 1, 5, 200, 160), bumpScale: 2.2, envMapIntensity: 0.3,
  });
  footMat.bumpMap.repeat.set(5, 1.2);
  const fillMat = new THREE.MeshPhysicalMaterial({
    color: FLAVORS.chocolat.fill, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 1.2,
  });

  const shellGeo = [domeGeometry(), footGeometry()];
  const makeShell = () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(shellGeo[0], faceMat), new THREE.Mesh(shellGeo[1], footMat));
    return g;
  };
  const top = makeShell(), bottom = makeShell();
  bottom.rotation.x = Math.PI;
  const fill = new THREE.Mesh(fillGeometry(), fillMat);
  const macaron = new THREE.Group();
  macaron.add(top, bottom, fill);
  macaron.rotation.z = -Math.PI / 2;           // le macaron est debout sur la tranche
  macaron.scale.setScalar(1.18);
  const spin = new THREE.Group(); spin.add(macaron); scene.add(spin);

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.9 ? 8.6 : 6.6;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host); resize();

  // rotation à la souris / au doigt, avec inertie
  let rotY = -0.85, rotX = 0.08, vY = 0.003, vX = 0, drag = false, lx = 0, ly = 0;
  const el = renderer.domElement;
  el.addEventListener("pointerdown", e => { drag = true; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId); host.classList.add("grab"); });
  el.addEventListener("pointermove", e => {
    if (!drag) return;
    vY = (e.clientX - lx) * 0.012; vX = (e.clientY - ly) * 0.006;
    rotY += vY; rotX = THREE.MathUtils.clamp(rotX + vX, -0.7, 0.9);
    lx = e.clientX; ly = e.clientY;
    host.classList.add("touched");
  });
  const up = () => { drag = false; host.classList.remove("grab"); };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);

  document.querySelectorAll("[data-flavor]").forEach(b => b.addEventListener("click", () => {
    const c = FLAVORS[b.dataset.flavor];
    faceMat.color.setHex(c.face); footMat.color.setHex(c.foot); fillMat.color.setHex(c.fill);
    document.querySelectorAll("[data-flavor]").forEach(o => o.classList.toggle("on", o === b));
  }));

  const clock = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { threshold: 0 }).observe(host);
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = clock.getElapsedTime();
    if (!drag) { vY += (0.003 - vY) * 0.02; vX *= 0.92; rotY += vY; rotX = THREE.MathUtils.clamp(rotX + vX, -0.7, 0.9); rotX += (0.08 - rotX) * 0.01; }
    spin.rotation.y = rotY; spin.rotation.x = rotX;
    spin.position.y = Math.sin(t * 1.1) * 0.05;
    const k = THREE.MathUtils.clamp(scrollY / (innerHeight * 0.8), 0, 1);
    top.position.y = 0.1 + k * 0.55; bottom.position.y = -0.1 - k * 0.55;
    spin.scale.setScalar(1 - k * 0.12);
    host.style.setProperty("--shadow", 1 - k * 0.6);
    renderer.render(scene, camera);
  });
  host.classList.add("ready");
} catch (e) {
  host.classList.add("no3d");
}
