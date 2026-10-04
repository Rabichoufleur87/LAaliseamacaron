import * as THREE from "three";
import { bakeTextures } from "./textures.js";
import { SH, GA, shellPieces, ganacheGeometry, crumbGeometry, mulberry } from "./geometry.js";

// Chaque parfum : face lisse, pied et intérieur plus clairs, garniture (et sa rugosité)
export const FLAVORS = {
  chocolat:  { face: 0x86624a, foot: 0x95603d, fill: 0x3c2421, rough: 0.3, streak: false },
  cafe:      { face: 0xb59f86, foot: 0xc9b496, fill: 0xb98a58, rough: 0.55, streak: false },
  cassis:    { face: 0x70505f, foot: 0x805f70, fill: 0x3a2236, rough: 0.4, streak: true },
  pistache:  { face: 0x9cc46c, foot: 0xb2d086, fill: 0xefe6c8, rough: 0.6, streak: false },
  framboise: { face: 0xcc4a73, foot: 0xdb7090, fill: 0xf6d6df, rough: 0.6, streak: false },
  citron:    { face: 0xe6d655, foot: 0xefe27c, fill: 0xfff3b8, rough: 0.6, streak: false },
};
export const ORDER = ["chocolat", "cafe", "cassis", "pistache", "framboise", "citron"];

const GAP = 0.6; // écart entre pièces en vue éclatée (repère du macaron)

export function createMacaron(host) {
  // split : coques écartées de la ganache · layer : intérieurs détachés des croûtes
  const state = { x: 0, y: 0, scale: 1, rotX: 0.08, rotY: -0.85, rotZ: 0, split: 0, layer: 0, flavor: 0, active: true };
  const api = { state, onFrame: null, pts: null, glow: null };
  try {
    const small = Math.min(innerWidth, innerHeight) < 700;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(renderer.domElement);

    const T = bakeTextures(renderer, small ? 512 : 1024);

    const scene = new THREE.Scene();
    // focale longue (peu de déformation), comme une photo de produit au téléobjectif
    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 60);
    camera.position.set(0, 0.44, 8.3);
    camera.lookAt(0, 0, 0);

    // studio photo : grands softboxes chauds → reflets doux
    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0x221830);
    const box = (w, h, col, i, pos) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(i), side: THREE.DoubleSide }));
      m.position.set(...pos); m.lookAt(0, 0, 0); studio.add(m);
    };
    box(9, 6, 0xfff0e0, 4.5, [-5, 5, 5]);
    box(3, 8, 0xffe2c4, 2.2, [6, 1.5, -3]);
    box(9, 4, 0xa77bdc, 0.25, [3, -3, 4]);
    box(12, 3, 0xfff6ea, 1.4, [0, 6, -4]);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(studio, 0.04).texture;
    pm.dispose();

    const key = new THREE.DirectionalLight(0xfff0dc, 2.3);
    key.position.set(-3.5, 4.5, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -3.2, right: 3.2, top: 3.2, bottom: -3.2, near: 1, far: 16 });
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 4;
    const rim = new THREE.DirectionalLight(0xffe4c4, 1.5);
    rim.position.set(4.5, 2.5, -4);
    scene.add(key, rim);

    // matériaux : couleur du parfum × albédo procédural, relief par cartes de normales
    const v2 = s => new THREE.Vector2(s, s);
    const faceMat = new THREE.MeshPhysicalMaterial({
      map: T.faceA, normalMap: T.faceN, normalScale: v2(1), roughness: 0.66,
      sheen: 0.35, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xe0cdb5), envMapIntensity: 0.55,
    });
    const crumbMat = new THREE.MeshPhysicalMaterial({
      map: T.crumbA, normalMap: T.crumbN, normalScale: v2(1), roughness: 0.93,
      sheen: 0.25, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xf2e4cf), envMapIntensity: 0.35,
    });
    const ganMat = new THREE.MeshPhysicalMaterial({
      map: T.ganA, normalMap: T.ganN, normalScale: v2(1), roughness: 0.3,
      clearcoat: 0.55, clearcoatRoughness: 0.28, clearcoatNormalMap: T.ganN, clearcoatNormalScale: v2(0.6), envMapIntensity: 1,
    });
    const sideMat = ganMat.clone();
    sideMat.map = T.sideA; sideMat.normalMap = T.sideN; sideMat.clearcoatNormalMap = T.sideN;

    // pièces : croûte et intérieur de chaque coque, ganache au centre
    const R = small ? 220 : 360;
    const shellMats = [faceMat, crumbMat];
    const mesh = (geo, mats) => { const m = new THREE.Mesh(geo, mats); m.castShadow = m.receiveShadow = true; return m; };
    const A = shellPieces(1.3, R), B = shellPieces(4.1, R);
    const crustTop = mesh(A.crust, shellMats), slabTop = mesh(A.slab, shellMats);
    const crustBot = mesh(B.crust, shellMats), slabBot = mesh(B.slab, shellMats);
    const shellTop = new THREE.Group(), shellBot = new THREE.Group();
    shellTop.add(slabTop, crustTop);
    shellBot.add(slabBot, crustBot);
    shellBot.rotation.x = Math.PI;
    const fill = mesh(ganacheGeometry(Math.round(R * 0.6)), [ganMat, sideMat]);
    const macaron = new THREE.Group();
    macaron.add(shellTop, shellBot, fill);
    macaron.rotation.z = -Math.PI / 2; // posé sur la tranche
    const spin = new THREE.Group();
    spin.add(macaron);
    scene.add(spin);

    // miettes qui s'échappent quand on ouvre le macaron
    const rnd = mulberry(7);
    const NC = small ? 72 : 144;
    const cm = [0, 1, 2].map(k => {
      const m = new THREE.InstancedMesh(crumbGeometry(k * 2.7 + 0.5), crumbMat, NC / 3);
      m.frustumCulled = false; m.visible = false; macaron.add(m);
      return m;
    });
    const crumbs = Array.from({ length: NC }, (_, j) => {
      const kind = j % 10 < 4 ? 0 : j % 10 < 7 ? 1 : 2; // 0 : contre la ganache · 1 : entre intérieur et croûte · 2 : libres
      return {
        m: cm[j % 3], i: Math.floor(j / 3), kind, side: rnd() < 0.5 ? -1 : 1, f: 0.12 + rnd() * 0.76,
        // les miettes libres tombent plutôt vers le bas (+X local = bas à l'écran)
        ang: kind < 2 || rnd() < 0.4 ? rnd() * Math.PI * 2 : (rnd() - 0.5) * 2.6, r: kind < 2 ? 0.45 + rnd() * 0.85 : 0.9 + rnd() * 0.6,
        size: 0.012 + Math.pow(rnd(), 2.2) * 0.04, delay: 0.25 + rnd() * 0.35, ph: rnd() * 6.28, ws: 0.4 + rnd() * 0.6,
        rx: rnd() * 6.28, ry: rnd() * 6.28, rz: rnd() * 6.28, sx: (rnd() - 0.5) * 0.6, sy: (rnd() - 0.5) * 0.6,
      };
    });
    const dummy = new THREE.Object3D();
    const sstep = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    function updateCrumbs(t) {
      const L = state.layer, vis = L > 0.2;
      cm.forEach(m => { m.visible = vis; });
      if (!vis) return;
      const base = SH.split + state.split * GAP; // dessous de l'intérieur (repère du macaron)
      for (const c of crumbs) {
        const a = sstep(L, c.delay, c.delay + 0.35);
        let y;
        if (c.kind === 0) y = GA.h + (base - GA.h) * c.f;
        else if (c.kind === 1) y = base + SH.split + 0.01 + Math.max(0, L * GAP - 0.02) * c.f;
        else y = c.f * 1.5 * (0.4 + 0.6 * L);
        const r = c.r * (0.75 + 0.25 * a) + Math.sin(t * c.ws + c.ph) * 0.02;
        const ang = c.ang + Math.sin(t * 0.2 + c.ph) * 0.05;
        dummy.position.set(Math.cos(ang) * r, c.side * y + Math.sin(t * c.ws * 1.3 + c.ph) * 0.015, Math.sin(ang) * r);
        dummy.rotation.set(c.rx + t * c.sx, c.ry + t * c.sy, c.rz);
        dummy.scale.setScalar(c.size * a);
        dummy.updateMatrix();
        c.m.setMatrixAt(c.i, dummy.matrix);
      }
      cm.forEach(m => { m.instanceMatrix.needsUpdate = true; });
    }

    // repères des légendes : un point sur la face visible de chaque pièce
    const parts = [crustBot, slabBot, fill, slabTop, crustTop]; // ordre le long de l'axe
    const FACE_Y = [[0.34, 0.112], [0.105, 0], [-0.125, 0.125], [0, 0.105], [0.112, 0.34]]; // face vers −Y / +Y du macaron
    const axisW = new THREE.Vector3(), toCam = new THREE.Vector3(), q = new THREE.Vector3();
    function anchors() {
      axisW.set(0, 1, 0).transformDirection(macaron.matrixWorld);
      toCam.copy(camera.position).sub(macaron.getWorldPosition(q));
      const facing = axisW.dot(toCam) > 0 ? 1 : 0;
      const w = host.clientWidth, h = host.clientHeight;
      const proj = (p, i, sx) => {
        q.set(sx * 0.72, FACE_Y[i][facing], 0);
        p.localToWorld(q).project(camera);
        return { x: (q.x + 1) / 2 * w, y: (1 - q.y) / 2 * h };
      };
      return { up: parts.map((p, i) => proj(p, i, -1)), side: parts.map((p, i) => proj(p, i, 1)) };
    }

    function resize() {
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = w / h < 0.9 ? 11.8 : 8.3;
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(host);
    resize();
    renderer.compile(scene, camera); // shaders prêts avant l'intro : pas d'à-coup à la première image

    // glisser pour tourner, puis retour élastique vers la pose du scroll
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
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);

    // couleurs : mélange continu entre deux parfums voisins
    const ca = new THREE.Color(), cb = new THREE.Color();
    const mixC = (target, k, i, j, t) => target.copy(ca.setHex(FLAVORS[ORDER[i]][k])).lerp(cb.setHex(FLAVORS[ORDER[j]][k]), t);
    let lastF = -1, lastStreak = -1;
    function applyFlavor(f) {
      if (Math.abs(f - lastF) < 0.001) return;
      lastF = f;
      const i = Math.min(ORDER.length - 1, Math.floor(f)), j = Math.min(ORDER.length - 1, i + 1);
      const t = THREE.MathUtils.smoothstep(f - i, 0.25, 0.75);
      mixC(faceMat.color, "face", i, j, t);
      mixC(crumbMat.color, "foot", i, j, t);
      mixC(ganMat.color, "fill", i, j, t);
      sideMat.color.copy(ganMat.color);
      ganMat.roughness = sideMat.roughness = THREE.MathUtils.lerp(FLAVORS[ORDER[i]].rough, FLAVORS[ORDER[j]].rough, t);
      const st = FLAVORS[ORDER[t > 0.5 ? j : i]].streak ? 1 : 0;
      if (st !== lastStreak) {
        lastStreak = st;
        faceMat.map = st ? T.streakA : T.faceA;
        faceMat.normalMap = st ? T.streakN : T.faceN;
        faceMat.needsUpdate = true;
      }
      api.glow = "#" + faceMat.color.getHexString();
    }

    const t0 = performance.now();
    // une image : t en secondes (la vidéo de présentation l'appelle image par image)
    function frame(t) {
      if (!drag) { vY *= 0.94; vX *= 0.92; dY += vY; dX += vX; dY += (0 - dY) * 0.025; dX += (0 - dX) * 0.04; }
      applyFlavor(state.flavor);
      spin.position.set(state.x, state.y + Math.sin(t * 1.1) * 0.04, 0);
      spin.rotation.set(state.rotX + dX, state.rotY + dY + Math.sin(t * 0.5) * 0.05, state.rotZ);
      macaron.scale.setScalar(1.18 * state.scale);
      const sp = state.split, L = state.layer;
      shellTop.position.y = SH.split + sp * GAP;
      shellBot.position.y = -(SH.split + sp * GAP);
      // en vue éclatée, chaque pièce flotte et s'incline un peu, comme en apesanteur
      crustTop.position.y = L * GAP + Math.sin(t * 0.6 + 3) * 0.014 * L;
      crustBot.position.y = L * GAP + Math.sin(t * 0.7 + 1) * 0.014 * L;
      slabTop.position.y = Math.sin(t * 0.9 + 1) * 0.012 * L;
      slabBot.position.y = Math.sin(t * 0.8 + 2) * 0.012 * L;
      crustTop.rotation.set(0.05 * L + Math.sin(t * 0.5) * 0.012 * L, 0, -0.04 * L);
      crustBot.rotation.set(-0.04 * L, 0, 0.05 * L + Math.sin(t * 0.6) * 0.012 * L);
      slabTop.rotation.set(0.03 * L, 0, 0.025 * L);
      slabBot.rotation.set(-0.025 * L, 0, -0.03 * L);
      fill.rotation.set(Math.sin(t * 0.5) * 0.02 * sp, 0, Math.cos(t * 0.6) * 0.02 * sp);
      updateCrumbs(t);
      renderer.render(scene, camera);
      api.pts = sp > 0.01 || L > 0.01 ? anchors() : null;
    }
    api.renderAt = frame;
    renderer.setAnimationLoop(() => {
      if (api.manual) return;
      if (!state.active) { api.pts = null; if (api.onFrame) api.onFrame(); return; }
      frame((performance.now() - t0) / 1000);
      if (api.onFrame) api.onFrame();
    });
    host.classList.add("ready");
  } catch (e) {
    console.error(e);
    host.classList.add("no3d");
  }
  return api;
}
