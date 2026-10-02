import * as THREE from "three";

const host = document.getElementById("stage");
const COLORS = {
  pistache: { shell: 0x8db860, fill: 0xf3ecd8 },
  violet:   { shell: 0x6a35a8, fill: 0xd9c2f5 },
  chocolat: { shell: 0x4a2c20, fill: 0xb98a5e },
  framboise:{ shell: 0xc93a64, fill: 0xf6d6df },
  citron:   { shell: 0xe8d94c, fill: 0xfff6c4 },
};

function speckle(base) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#808080"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = 90 + Math.random() * 110;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  return t;
}

function shellGeometry() {
  // profil : coque lisse + collerette (le « pied » du macaron)
  const pts = [];
  const N = 36;
  for (let i = 0; i <= N; i++) {            // dôme
    const r = (i / N) * 0.93;
    const y = 0.42 * Math.pow(1 - Math.pow(r / 0.93, 2.6), 0.55) + 0.15;
    pts.push(new THREE.Vector2(r, y));
  }
  pts.push(new THREE.Vector2(0.97, 0.13), new THREE.Vector2(1.0, 0.09),
           new THREE.Vector2(1.02, 0.04), new THREE.Vector2(1.01, 0.0),
           new THREE.Vector2(0.9, 0.0), new THREE.Vector2(0, 0.0));
  pts.reverse();
  const geo = new THREE.LatheGeometry(pts, 160);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < 0.14 && y > 0.001) {
      const a = Math.atan2(z, x);
      const k = THREE.MathUtils.smoothstep(0.14 - y, 0, 0.12);
      const f = 1 + k * (0.016 * Math.sin(a * 40) + 0.006 * Math.sin(a * 17 + 1));
      p.setX(i, x * f); p.setZ(i, z * f);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function fillGeometry() {
  const pts = [new THREE.Vector2(0, -0.22), new THREE.Vector2(0.9, -0.22),
    new THREE.Vector2(1.03, -0.12), new THREE.Vector2(1.07, 0), new THREE.Vector2(1.03, 0.12),
    new THREE.Vector2(0.9, 0.22), new THREE.Vector2(0, 0.22)];
  return new THREE.LatheGeometry(pts, 96);
}

try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0.6, 6.2);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xe6dcff, 0x2a1250, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(3, 4, 4); scene.add(key);
  const rimG = new THREE.PointLight(0x9be05a, 40, 14); rimG.position.set(-4, 1, -2); scene.add(rimG);
  const rimV = new THREE.PointLight(0xa56bff, 40, 14); rimV.position.set(4, -1, -3); scene.add(rimV);

  const shellMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.pistache.shell, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.35,
    sheen: 0.6, sheenColor: new THREE.Color(0xffffff), bumpMap: speckle(), bumpScale: 0.6,
  });
  const fillMat = new THREE.MeshPhysicalMaterial({ color: COLORS.pistache.fill, roughness: 0.55, sheen: 0.4 });

  const macaron = new THREE.Group();
  const top = new THREE.Mesh(shellGeometry(), shellMat);
  const bottom = new THREE.Mesh(shellGeometry(), shellMat);
  bottom.rotation.x = Math.PI;
  const fill = new THREE.Mesh(fillGeometry(), fillMat);
  macaron.add(top, bottom, fill);
  const spin = new THREE.Group(); spin.add(macaron); scene.add(spin);
  macaron.scale.setScalar(1.35);


  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.9 ? 8.2 : 6.2;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host); resize();

  // rotation à la souris / au doigt, avec inertie
  let rotY = 0.6, rotX = 0.55, vY = 0.004, vX = 0, drag = false, lx = 0, ly = 0, idle = 0;
  const el = renderer.domElement;
  el.addEventListener("pointerdown", e => { drag = true; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId); host.classList.add("grab"); });
  el.addEventListener("pointermove", e => {
    if (!drag) return;
    vY = (e.clientX - lx) * 0.012; vX = (e.clientY - ly) * 0.008;
    rotY += vY; rotX = THREE.MathUtils.clamp(rotX + vX, -1.2, 1.5);
    lx = e.clientX; ly = e.clientY; idle = 0;
    host.classList.add("touched");
  });
  const up = () => { drag = false; host.classList.remove("grab"); };
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);

  // couleurs
  document.querySelectorAll("[data-flavor]").forEach(b => b.addEventListener("click", () => {
    const c = COLORS[b.dataset.flavor];
    shellMat.color.setHex(c.shell); fillMat.color.setHex(c.fill);
    document.querySelectorAll("[data-flavor]").forEach(o => o.classList.toggle("on", o === b));
  }));

  const clock = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { threshold: 0 }).observe(host);
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = clock.getElapsedTime();
    if (!drag) { vY += (0.004 - vY) * 0.02; vX *= 0.92; rotY += vY; rotX += vX; rotX += (0.5 - rotX) * 0.004; }
    spin.rotation.y = rotY; spin.rotation.x = rotX;
    spin.position.y = Math.sin(t * 1.2) * 0.07;
    // les coques s'écartent quand on descend dans la page
    const k = THREE.MathUtils.clamp(scrollY / (innerHeight * 0.8), 0, 1);
    top.position.y = 0.12 + k * 0.5; bottom.position.y = -0.12 - k * 0.5;
    spin.scale.setScalar(1 - k * 0.15);
    host.style.setProperty('--shadow', 1 - k * 0.6);
    renderer.render(scene, camera);
  });
  host.classList.add("ready");
} catch (e) {
  host.classList.add("no3d");
}
