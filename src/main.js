import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createMacaron } from "./macaron.js";
import { initUI } from "./ui.js";

gsap.registerPlugin(ScrollTrigger);
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

initUI();

// --- découpe du texte en mots pour les révélations ---
function split(el) {
  const walk = node => [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(w => {
        if (!w) return;
        if (/^\s+$/.test(w)) { frag.append(" "); return; }
        const o = document.createElement("span"); o.className = "w";
        const i = document.createElement("span"); i.className = "i"; i.textContent = w;
        o.append(i); frag.append(o);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
  });
  walk(el);
  return el.querySelectorAll(".i");
}
const splitted = new Map();
$$("[data-split]").forEach(el => splitted.set(el, split(el)));
splitted.forEach(words => gsap.set(words, { yPercent: 115, rotate: 4 }));
gsap.set("[data-fade]", { opacity: 0, y: 30 });
gsap.set(".rv", { opacity: 0, y: 70 });
gsap.set([".scrollhint", ".draghint"], { opacity: 0 });

// --- macaron 3D piloté par le scroll ---
const mac = createMacaron($("#stage"));
const S = mac.state;
const root = document.documentElement;

// défilement fluide
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
$$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
  const t = document.querySelector(a.getAttribute("href"));
  if (!t) return;
  e.preventDefault();
  lenis ? lenis.scrollTo(t, { offset: -60, duration: 1.6 }) : t.scrollIntoView({ behavior: "smooth" });
}));

const mm = gsap.matchMedia();
mm.add({ desk: "(min-width: 861px)", mob: "(max-width: 860px)" }, ctx => {
  const desk = ctx.conditions.desk;
  const X = desk ? { hero: 1.4, coque: -1.35, gar: 0.7 } : { hero: 0, coque: 0, gar: 0 };
  const Y = desk ? { hero: 0, chap: 0 } : { hero: 1.25, chap: 1.15 };
  const sc = desk ? 0.9 : 0.68;
  Object.assign(S, { x: X.hero, y: Y.hero, scale: sc, rotY: -0.85, rotX: 0.08, explode: 0, flavor: 0 });

  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    scrollTrigger: { trigger: "#story", start: "top top", end: "bottom bottom", scrub: 0.8 },
  });
  // 0–100 accueil · 100–230 coque · 230–360 garniture · 360–610 parfums (épinglé)
  tl.to(S, { x: X.coque, y: Y.chap, scale: sc * 1.12, rotY: -Math.PI / 2 - 0.15, rotX: 0, duration: 80 }, 20)
    .to(S, { x: X.gar, y: Y.chap, scale: sc * 0.92, rotY: -0.45, rotX: 0.15, duration: 60 }, 150)
    .to(S, { explode: 0.55, duration: 45, ease: "power3.out" }, 215)
    .to(S, { explode: 0, duration: 40 }, 290)
    .to(S, { x: 0, y: desk ? 0.4 : 0.5, scale: sc * 1.0, rotY: -0.85, rotX: 0.08, duration: 55 }, 305)
    .to(S, { flavor: 5, duration: 240, ease: "none" }, 360)
    .to(S, { rotY: -0.85 + Math.PI * 2, duration: 240, ease: "none" }, 360);
  return () => {};
});

// couleur ambiante + mots géants + légendes suivant le parfum
const cos = $$(".co"), lines = $$(".colines line");
const bgw = $$(".bgw"), fi = $$(".fi"), dots = $$("#fdots i");
let cur = -1;
mac.onFrame = () => {
  if (mac.glow) root.style.setProperty("--glow", mac.glow);
  // légendes de la vue éclatée, ancrées sur les pièces 3D
  const pts = mac.pts, k = Math.min(1, Math.max(0, (S.explode - 0.25) / 0.35));
  $("#callouts").style.opacity = pts && k > 0 ? k : 0;
  if (pts && k > 0) {
    const order = pts.map((p, i) => i).sort((a, b) => pts[a].x - pts[b].x);
    const cx = pts.reduce((s, p) => s + p.x, 0) / 3, ly = innerHeight - 150;
    order.forEach((i, slot) => {
      const x = cx + (slot - 1) * 230, p = pts[i];
      cos[i].style.transform = `translate(${x - 100}px,${ly}px)`;
      const ln = lines[i];
      ln.setAttribute("x1", p.x); ln.setAttribute("y1", p.y); ln.setAttribute("x2", x); ln.setAttribute("y2", ly - 8);
    });
  }
  const idx = Math.min(5, Math.round(S.flavor));
  if (idx !== cur) {
    cur = idx;
    [bgw, fi, dots].forEach(list => list.forEach((el, i) => el.classList.toggle("on", i === idx)));
  }
};
ScrollTrigger.create({ trigger: ".after", start: "top bottom", onToggle: s => { S.active = !s.isActive; $("#stage").style.visibility = s.isActive ? "hidden" : "visible"; } });
ScrollTrigger.create({
  trigger: "#parfums", start: "top 60%", end: "bottom 40%",
  onToggle: s => document.body.classList.toggle("in-flavors", s.isActive),
});

// --- révélations de texte ---
$$("[data-split]").forEach(el => {
  const words = splitted.get(el);
  if (el.closest(".hero")) return; // joué par l'intro
  ScrollTrigger.create({
    trigger: el, start: "top 85%",
    onEnter: () => gsap.to(words, { yPercent: 0, rotate: 0, duration: 1.1, ease: "power4.out", stagger: 0.07 }),
    onLeaveBack: () => gsap.set(words, { yPercent: 115, rotate: 4 }),
  });
});
$$(".panel:not(.hero) [data-fade]").forEach(el => ScrollTrigger.create({
  trigger: el, start: "top 85%",
  onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.25 }),
  onLeaveBack: () => gsap.set(el, { opacity: 0, y: 30 }),
}));
ScrollTrigger.batch(".rv", {
  start: "top 90%", once: true,
  onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: "power3.out", stagger: 0.12 }),
});
$$("[data-to]").forEach(c => ScrollTrigger.create({
  trigger: c, start: "top 90%", once: true,
  onEnter: () => { const o = { v: 0 }; gsap.to(o, { v: +c.dataset.to, duration: 1.6, ease: "power2.out", onUpdate: () => { c.textContent = Math.round(o.v); } }); },
}));

// bandeaux défilants, liés à la vitesse du scroll
gsap.to("#mq1", { xPercent: -30, ease: "none", scrollTrigger: { trigger: ".marquee", start: "top bottom", end: "bottom top", scrub: 0.6 } });
gsap.fromTo("#mq2", { xPercent: -30 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: ".marquee", start: "top bottom", end: "bottom top", scrub: 0.6 } });
gsap.fromTo(".bigword", { yPercent: 30, opacity: 0.2 }, { yPercent: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: "footer", start: "top bottom", end: "bottom bottom", scrub: true } });

// barre de progression, navigation active, retour en haut
const links = $$("nav a"), secs = links.map(a => document.querySelector(a.getAttribute("href")));
ScrollTrigger.create({
  start: 0, end: "max",
  onUpdate: self => {
    $("#progress").style.width = self.progress * 100 + "%";
    $("#toTop").classList.toggle("show", scrollY > 800);
    let c = -1;
    secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.4) c = i; });
    links.forEach((a, i) => a.classList.toggle("on", i === c));
  },
});

// effets de souris : curseur, boutons magnétiques, inclinaison des cartes
if (fine && !reduce) {
  const cur2 = $("#cursor");
  const qx = gsap.quickTo(cur2, "x", { duration: 0.35, ease: "power3" }), qy = gsap.quickTo(cur2, "y", { duration: 0.35, ease: "power3" });
  addEventListener("pointermove", e => { qx(e.clientX); qy(e.clientY); cur2.classList.add("show"); });
  document.addEventListener("pointerover", e => cur2.classList.toggle("big", !!e.target.closest("a,button,summary,.card,.flavor")));
  document.addEventListener("pointermove", e => {
    const b = e.target.closest(".mag");
    $$(".mag").forEach(m => { if (m !== b) gsap.to(m, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1,.5)" }); });
    if (b) { const r = b.getBoundingClientRect(); gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.3 }); }
  });
  $$(".card").forEach(c => {
    c.addEventListener("pointermove", e => {
      const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(c, { rotateY: px * 10, rotateX: -py * 10, transformPerspective: 800, duration: 0.4 });
    });
    c.addEventListener("pointerleave", () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: 0.6 }));
  });
}

// bokeh d'ambiance (flou de profondeur façon photo culinaire)
const bk = $("#bokeh");
for (let i = 0; i < 16; i++) {
  const d = document.createElement("i"), s = 40 + Math.random() * 150;
  d.style.cssText = `width:${s}px;height:${s}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;opacity:${0.08 + Math.random() * 0.22};animation-duration:${14 + Math.random() * 18}s;animation-delay:${-Math.random() * 20}s;filter:blur(${6 + Math.random() * 14}px)`;
  bk.append(d);
}

// --- intro ---
const pct = $("#pct");
const intro = gsap.timeline({ paused: true });
intro.to("#loader", { yPercent: -100, duration: 1.1, ease: "power4.inOut" })
  .add(() => $("#loader").remove(), ">")
  .to(splitted.get($(".hero .kicker")), { yPercent: 0, rotate: 0, duration: 1, ease: "power4.out", stagger: 0.04 }, "-=0.5")
  .to(splitted.get($(".hero h1")), { yPercent: 0, rotate: 0, duration: 1.3, ease: "power4.out", stagger: 0.09 }, "-=0.8")
  .to(".hero [data-fade]", { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: "power3.out" }, "-=0.9")
  .to([".scrollhint", ".draghint"], { opacity: 1, duration: 1 }, "-=0.4");
const counter = { v: 0 };
gsap.to(counter, { v: 100, duration: reduce ? 0.1 : 1.5, ease: "power1.inOut", onUpdate: () => { pct.textContent = Math.round(counter.v); }, onComplete: () => { intro.play(); } });
if (lenis) { lenis.stop(); intro.eventCallback("onComplete", () => lenis.start()); }
