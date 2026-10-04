// Vidéo de présentation : une timeline GSAP en pause, rendue image par image (window.seek)
import { gsap } from "gsap";
import { createMacaron } from "../src/macaron.js";

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp01 = v => Math.min(1, Math.max(0, v));
const FPS = 25, DURATION = 30;

// texte découpé en mots
function split(el) {
  const walk = node => [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const f = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(w => {
        if (!w) return;
        if (/^\s+$/.test(w)) { f.append(" "); return; }
        const o = document.createElement("span"); o.className = "w";
        const i = document.createElement("span"); i.className = "i"; i.textContent = w;
        o.append(i); f.append(o);
      });
      n.replaceWith(f);
    } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
  });
  walk(el);
  return el.querySelectorAll(".i");
}
const W = {};
$$("[data-split]").forEach((el, k) => { W[k] = split(el); el.dataset.k = k; });
const words = sel => W[$(sel).dataset.k];

// mosaïque de parfums (scène claire)
const SLUGS = ["framboise", "pistache", "rose", "caramel-beurre-sale", "chocolat-origine-vietnam", "citron", "foie-gras-et-figues", "mangue", "cassis",
  "fraise", "cafe", "noix-de-coco-et-chocolat-noir", "fruit-de-la-passion", "menthe-et-chocolat-noir", "vanille", "myrtille", "chevre-et-miel",
  "tiramisu", "abricot-et-the-a-la-bergamotte", "praline", "olives-noires-et-citron-confit", "citron-vert-et-basilic", "cookie", "roquefort", "avocat"];
$("#cols").innerHTML = [0, 1, 2, 3, 4].map(c => `<div class="col">${[0, 1, 2, 3, 4].map(r => `<img src="../img/macarons/${SLUGS[(c * 5 + r) % SLUGS.length]}.webp" alt="">`).join("")}</div>`).join("");

// bokeh
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const bokeh = Array.from({ length: 14 }, () => {
  const d = document.createElement("i"), s = 40 + rnd() * 160;
  d.style.cssText = `width:${s}px;height:${s}px;left:${rnd() * 100}%;top:${rnd() * 100}%;opacity:${0.08 + rnd() * 0.2};filter:blur(${8 + rnd() * 14}px)`;
  $("#bokeh").append(d);
  return { d, vx: (rnd() - 0.5) * 30, vy: -10 - rnd() * 25 };
});

// macaron 3D en mode manuel
const mac = createMacaron($("#stage"));
mac.manual = true;
const S = mac.state;
Object.assign(S, { x: 1.35, y: 0, rotY: -0.85, rotX: 0.08, rotZ: 0, scale: 0.85, split: 0.55, layer: 0.5, flavor: 0 });

const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
const reveal = (sel, at, st = 0.07, d = 1.1) => tl.fromTo(words(sel), { yPercent: 115, rotate: 4 }, { yPercent: 0, rotate: 0, duration: d, stagger: st, ease: "power4.out" }, at);
const show = (sel, at, d = 0.6) => tl.fromTo(sel, { opacity: 0 }, { opacity: 1, duration: d, ease: "power1.out" }, at);
const hide = (sel, at, d = 0.6) => tl.to(sel, { opacity: 0, y: -30, duration: d, ease: "power2.in" }, at);
gsap.set(["#B", "#C", "#D", "#E", "#F", "#G", "#stage", ".fade"], { opacity: 0 });

// A — logo
tl.fromTo("#A img", { opacity: 0, scale: 0.9, filter: "blur(14px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.6 }, 0.2)
  .fromTo("#A .line", { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: "power2.inOut" }, 0.8);
reveal("#A .kick", 1.0, 0.05);
hide("#A", 2.8);
// B — le macaron s'assemble, accroche
show("#stage", 2.9, 0.8);
tl.fromTo(S, { scale: 0.35, rotY: -4.2 }, { scale: 0.84, rotY: -0.85, duration: 2.6 }, 2.9)
  .to(S, { split: 0, layer: 0, duration: 2.2, ease: "power3.inOut" }, 3.0);
show("#B", 3.3, 0.1);
reveal("#B .kick", 3.4, 0.04);
reveal("#B h1", 3.6, 0.09, 1.3);
tl.fromTo("#B .fade", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1 }, 4.7);
hide("#B", 7.5);
// C — vue éclatée
tl.to(S, { x: 0.05, y: -0.18, rotY: 0.45, rotX: 0.06, scale: 0.75, duration: 1.3, ease: "power2.inOut" }, 7.8)
  .to(S, { split: 1, duration: 1.1, ease: "power2.inOut" }, 8.8)
  .to(S, { layer: 1, duration: 1.2 }, 9.5)
  .to(S, { rotY: 0.6, rotX: 0.12, duration: 2.6, ease: "sine.inOut" }, 10.5);
show("#C", 10.9, 0.1);
reveal("#C .kick", 11.0, 0.04);
reveal("#C h2", 11.2, 0.08);
hide("#C", 12.9, 0.5);
tl.to(S, { layer: 0, duration: 0.7, ease: "power2.inOut" }, 13.0)
  .to(S, { split: 0, duration: 0.7, ease: "power2.inOut" }, 13.2);
// D — les parfums défilent
tl.to(S, { x: 0, y: 0.12, scale: 0.85, rotY: -0.85, rotX: 0.08, duration: 1, ease: "power2.inOut" }, 13.6);
show("#D", 13.9, 0.6);
const cnt = { v: 0 };
tl.to(cnt, { v: 38, duration: 1.6, ease: "power2.out", onUpdate: () => { $("#cnt").textContent = Math.round(cnt.v); } }, 14.0)
  .to(S, { flavor: 5, duration: 3.6, ease: "none" }, 14.4)
  .to(S, { rotY: -0.85 + Math.PI * 2, duration: 3.6, ease: "none" }, 14.4);
// passage au blanc
tl.to("#wipe", { clipPath: "circle(150% at 50% 50%)", duration: 1, ease: "power3.inOut" }, 17.9)
  .set(["#stage", "#D", "#glow", "#bokeh"], { opacity: 0 }, 18.9);
// E — mosaïque de parfums
show("#E", 18.85, 0.15);
$$("#cols .col").forEach((c, k) => tl.fromTo(c, { y: k % 2 ? -150 : 0 }, { y: k % 2 ? 0 : -150, duration: 4.2, ease: "none" }, 18.7));
reveal("#E .kick", 19.3, 0.05);
reveal("#E h2", 19.5, 0.1, 1.2);
tl.fromTo("#E .fade", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9 }, 20.4);
tl.to("#E", { opacity: 0, duration: 0.5, ease: "power1.in" }, 22.4);
// F — présentoirs
show("#F", 22.6, 0.5);
tl.fromTo("#strip", { x: 260 }, { x: -540, duration: 4.2, ease: "power1.inOut" }, 22.5);
reveal("#F .kick", 23.0, 0.05);
reveal("#F h2", 23.2, 0.08);
tl.to("#F", { opacity: 0, duration: 0.5, ease: "power1.in" }, 26.3);
// G — fin
show("#G", 26.6, 0.5);
tl.fromTo("#G img", { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 1.2 }, 26.7)
  .fromTo("#G .bar", { width: 0 }, { width: 220, duration: 1, ease: "power2.inOut" }, 27.1);
reveal("#G h2", 27.3, 0.08);
tl.fromTo("#G .cta", { opacity: 0, y: 24, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.9 }, 28.0)
  .fromTo("#G .info", { opacity: 0 }, { opacity: 1, duration: 0.8 }, 28.4)
  .to({}, { duration: 0.1 }, DURATION - 0.1);

// légendes de la vue éclatée (même logique que le site)
const labs = $$(".lab"), lines = $$("#labels line"), dots = $$("#labels circle"), RANK = [2, 1, 0, 1, 2];
function labels() {
  const P = mac.pts && mac.pts.up, L = S.layer;
  $("#labels").style.opacity = P && L > 0.45 ? 1 : 0;
  if (!P || L <= 0.45) return;
  const order = P[0].x > P[4].x ? [4, 3, 2, 1, 0] : [0, 1, 2, 3, 4];
  const top = Math.max(70, Math.min(...P.map(p => p.y)) - 80);
  order.forEach((pi, n) => {
    const p = P[pi], a = clamp01((L - 0.5 - RANK[n] * 0.12) / 0.18);
    labs[n].style.opacity = a;
    labs[n].style.transform = `translate(${p.x}px,${top}px) translate(-50%,-100%) translateY(${(1 - a) * 12}px)`;
    const l = lines[n]; l.setAttribute("x1", p.x); l.setAttribute("y1", top + 8); l.setAttribute("x2", p.x); l.setAttribute("y2", top + 8 + (p.y - top - 13) * a);
    dots[n].setAttribute("cx", p.x); dots[n].setAttribute("cy", p.y); dots[n].style.opacity = a > 0.95 ? 1 : 0;
  });
}

window.FPS = FPS; window.DURATION = DURATION;
window.seek = t => {
  tl.time(t, false);
  mac.renderAt(t);
  labels();
  if (mac.glow) $("#film").style.setProperty("--glow", mac.glow);
  $("#glow").style.setProperty("--gx", S.x > 0.6 ? "68%" : "50%");
  const idx = Math.min(5, Math.round(S.flavor)), inD = t > 14 && t < 18.9;
  $$("#D .bw").forEach((e, i) => { e.style.opacity = inD && i === idx ? 1 : 0; });
  $$("#D .fn span").forEach((e, i) => { e.style.opacity = inD && i === idx ? 1 : 0; });
  bokeh.forEach(b => { b.d.style.transform = `translate(${b.vx * t}px,${b.vy * t}px)`; });
  return true;
};
window.ready = Promise.all([document.fonts.ready, ...$$("img").map(i => i.decode().catch(() => {}))]).then(() => true);
