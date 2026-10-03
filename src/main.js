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
const clamp01 = v => Math.min(1, Math.max(0, v));

// un récit au scroll se relit depuis le début
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
scrollTo(0, 0);

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
  const sc = desk ? 0.9 : 0.68;
  const pose = (x, y, rotY, rotX, scale, rotZ = 0) => ({ x, y, rotY, rotX, scale, rotZ });
  // poses du macaron à chaque chapitre (sur mobile, la vue éclatée est verticale)
  const P = desk ? {
    hero: pose(1.4, 0, -0.85, 0.08, sc),
    coque: pose(-1.35, 0, -Math.PI / 2 - 0.15, 0, sc * 1.12),
    intro: pose(1.3, 0, 0.5, 0.1, sc * 0.95),
    xview: pose(0.05, -0.2, 0.42, 0.06, sc * 0.78),
    orbit: { rotY: 0.55, rotX: 0.12 },
    flav: pose(0, 0.3, -0.85, 0.08, sc),
  } : {
    hero: pose(0, 0.95, -0.85, 0.08, sc),
    coque: pose(0, 1.15, -Math.PI / 2 - 0.15, 0, sc * 1.12),
    intro: pose(0, 1.1, 0.5, 0.1, sc * 0.95),
    xview: pose(-0.3, 0.1, 0, 0.42, sc * 0.82, Math.PI / 2),
    orbit: { rotX: 0.55 },
    flav: pose(0, 0.5, -0.85, 0.08, sc),
  };
  Object.assign(S, P.hero, { split: 0, layer: 0, flavor: 0 });

  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    scrollTrigger: { trigger: "#story", start: "top top", end: "bottom bottom", scrub: 0.8 },
  });
  // en vh défilés : 0–100 accueil · 100–230 coque · 230–630 vue éclatée (épinglée 230–530) · 630–980 parfums (épinglé 630–880)
  tl.to(S, { ...P.coque, duration: 70 }, 20)
    .to(S, { ...P.intro, duration: 80 }, 150)
    .to(".xtxt", { opacity: 0, y: -40, duration: 28, ease: "power1.in" }, 262)
    .to(S, { ...P.xview, duration: 55 }, 262)
    .to(S, { split: 1, duration: 50 }, 305)
    .to(S, { layer: 1, duration: 55, ease: "power3.out" }, 338)
    .to(S, { ...P.orbit, duration: 90, ease: "sine.inOut" }, 392)
    .to(S, { layer: 0, duration: 40 }, 482)
    .to(S, { split: 0, duration: 40 }, 498)
    .to(S, { ...P.flav, duration: 90 }, 530)
    .to(S, { flavor: 5, duration: 230, ease: "none" }, 640)
    .to(S, { rotY: P.flav.rotY + Math.PI * 2, duration: 230, ease: "none" }, 640)
    .to({}, { duration: 10 }, 870);
  return () => {};
});

// --- légendes de la vue éclatée, accrochées aux pièces 3D (au-dessus sur ordinateur, à droite sur mobile) ---
const callouts = $("#callouts"), cos = $$(".co"), clines = $$(".colines line"), cdots = $$(".colines circle"), xhint = $(".xhint");
const RANK = [2, 1, 0, 1, 2]; // la ganache d'abord, puis les intérieurs, puis les coques
const setLine = (l, x1, y1, x2, y2) => { l.setAttribute("x1", x1); l.setAttribute("y1", y1); l.setAttribute("x2", x2); l.setAttribute("y2", y2); };
function updateCallouts() {
  const L = S.layer, pts = mac.pts;
  xhint.style.opacity = clamp01((L - 0.6) / 0.3);
  if (!pts || L < 0.45) { callouts.style.visibility = "hidden"; return; }
  callouts.style.visibility = "visible";
  const side = innerWidth <= 860, P = side ? pts.side : pts.up;
  const order = [0, 1, 2, 3, 4];
  if (side ? P[0].y > P[4].y : P[0].x > P[4].x) order.reverse();
  const top = Math.max(118, Math.min(...P.map(p => p.y)) - 95);
  const colX = Math.min(innerWidth - 128, Math.max(innerWidth * 0.6, Math.max(...P.map(p => p.x)) + 40));
  let crowd = false;
  for (let n = 1; n < 5; n++) if (Math.abs(P[order[n]].x - P[order[n - 1]].x) < 110) crowd = true;
  order.forEach((pi, n) => {
    const p = P[pi], a = clamp01((L - 0.5 - RANK[n] * 0.12) / 0.18), el = cos[n];
    el.style.opacity = a;
    if (!side) {
      const ly = top - (crowd && n % 2 ? 52 : 0);
      el.style.transform = `translate(${p.x}px,${ly}px) translate(-50%,-100%) translateY(${(1 - a) * 12}px)`;
      setLine(clines[n], p.x, ly + 8, p.x, ly + 8 + (p.y - ly - 13) * a);
    } else {
      el.style.transform = `translate(${colX}px,${p.y}px) translate(0,-50%) translateX(${(1 - a) * 10}px)`;
      setLine(clines[n], colX - 8, p.y, colX - 8 - (colX - 13 - p.x) * a, p.y);
    }
    cdots[n].setAttribute("cx", p.x);
    cdots[n].setAttribute("cy", p.y);
    cdots[n].style.opacity = a > 0.95 ? 1 : 0;
  });
}

// couleur ambiante + mots géants + légendes suivant le parfum
const bgw = $$(".bgw"), fi = $$(".fi"), dots = $$("#fdots i");
let cur = -1;
mac.onFrame = () => {
  if (mac.glow) root.style.setProperty("--glow", mac.glow);
  updateCallouts();
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
$$("[data-fade]").filter(el => !el.closest(".hero")).forEach(el => ScrollTrigger.create({
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
intro.to("#loader", { yPercent: -100, duration: 1.1, ease: "power4.inOut" }, 0)
  .add(() => $("#loader").remove(), 1.1)
  // le macaron s'assemble sous nos yeux : les miettes se rejoignent, il pivote en place
  .fromTo(S, { split: reduce ? 0 : 0.55, layer: reduce ? 0 : 0.5 }, { split: 0, layer: 0, duration: 2.2, ease: "power3.inOut" }, 0.15)
  .from(S, { rotY: reduce ? "+=0" : "-=2.2", scale: reduce ? "*=1" : "*=0.7", duration: 2.4, ease: "power3.out" }, 0.1)
  .to(splitted.get($(".hero .kicker")), { yPercent: 0, rotate: 0, duration: 1, ease: "power4.out", stagger: 0.04 }, 0.6)
  .to(splitted.get($(".hero h1")), { yPercent: 0, rotate: 0, duration: 1.3, ease: "power4.out", stagger: 0.09 }, 0.8)
  .to(".hero [data-fade]", { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: "power3.out" }, 1.2)
  .to([".scrollhint", ".draghint"], { opacity: 1, duration: 1 }, 2.1);
const counter = { v: 0 };
gsap.to(counter, { v: 100, duration: reduce ? 0.1 : 1.5, ease: "power1.inOut", onUpdate: () => { pct.textContent = Math.round(counter.v); }, onComplete: () => { intro.play(); } });
if (lenis) { lenis.stop(); intro.eventCallback("onComplete", () => lenis.start()); }
