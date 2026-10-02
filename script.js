const $ = s => document.querySelector(s);
const eur = n => n.toFixed(2).replace(".", ",") + " €";
const SWEET = 1.2, SAVORY = 1.3;
const FLAVORS = [
  { name: "Myrtille", type: "sucré", color: "#6b4a9e" },
  { name: "Mojito", type: "sucré", color: "#9ed36a" },
  { name: "Chocolat", type: "sucré", color: "#5a3a2a" },
  { name: "Framboise", type: "sucré", color: "#d9456b" },
  { name: "Pistache", type: "sucré", color: "#b5d27a" },
  { name: "Citron", type: "sucré", color: "#f2e05a" },
  { name: "Chèvre", type: "salé", color: "#efe6d2" },
  { name: "Tomate-basilic", type: "salé", color: "#d8563a" },
].map(f => ({ ...f, price: f.type === "salé" ? SAVORY : SWEET }));
const SIZES = [8, 12, 18, 24];

// Boîtes
$("#sizes").innerHTML = SIZES.map(n => `
  <article class="card reveal"><div class="big">${n}</div><h3>macarons</h3>
  <p class="price">dès ${eur(n * SWEET)}</p>
  <a class="btn" href="#composer" data-size="${n}">Composer</a></article>`).join("")
  + `<article class="card reveal"><div class="big">1–6</div><h3>sachet</h3><p class="price">${eur(SWEET)} / pièce</p><a class="btn" href="#composer" data-size="6">Composer</a></article>`;

// Parfums
function renderFlavors(f) {
  $("#flavors").innerHTML = FLAVORS.filter(x => f === "all" || x.type === f).map(x =>
    `<div class="flavor"><span class="dot" style="background:${x.color}"></span><strong>${x.name}</strong><small>${x.type} · ${eur(x.price)}</small></div>`).join("");
}
renderFlavors("all");
document.querySelectorAll(".tab").forEach(t => t.onclick = () => {
  document.querySelectorAll(".tab").forEach(o => o.classList.toggle("on", o === t));
  renderFlavors(t.dataset.f);
});

// Composeur
let max = 12;
const qty = FLAVORS.map(() => 0);
const sum = () => qty.reduce((a, b) => a + b, 0);
$("#sizePick").innerHTML = [6, ...SIZES].map(n => `<button class="tab${n === max ? " on" : ""}" data-n="${n}">${n === 6 ? "Sachet (6)" : n}</button>`).join("");
$("#builder").innerHTML = FLAVORS.map((f, i) => `
  <div class="item"><div>${f.name}<small>${f.type} · ${eur(f.price)}</small></div>
  <div class="qty"><button type="button" aria-label="Retirer ${f.name}">−</button><output>0</output><button type="button" aria-label="Ajouter ${f.name}">+</button></div></div>`).join("");
[...$("#builder").children].forEach((el, i) => {
  const [m, p] = el.querySelectorAll("button");
  m.onclick = () => { qty[i] = Math.max(0, qty[i] - 1); render(); };
  p.onclick = () => { if (sum() < max) qty[i]++; render(); };
});
function setSize(n) {
  max = n;
  document.querySelectorAll("#sizePick .tab").forEach(b => b.classList.toggle("on", +b.dataset.n === n));
  // retire l'excédent si on réduit la taille
  for (let i = qty.length - 1; sum() > max && i >= 0; i--) { qty[i] = Math.max(0, qty[i] - (sum() - max)); }
  render();
}
document.querySelectorAll("#sizePick .tab").forEach(b => b.onclick = () => setSize(+b.dataset.n));
document.querySelectorAll("[data-size]").forEach(a => a.addEventListener("click", () => setSize(+a.dataset.size)));
$("#reset").onclick = () => { qty.fill(0); render(); };
function render() {
  const n = sum(), full = n >= max;
  let total = 0, parts = [];
  FLAVORS.forEach((f, i) => {
    total += qty[i] * f.price;
    if (qty[i]) parts.push(qty[i] + " × " + f.name);
    const el = $("#builder").children[i];
    el.querySelector("output").textContent = qty[i];
    el.querySelectorAll("button")[0].disabled = !qty[i];
    el.querySelectorAll("button")[1].disabled = full;
  });
  $("#count").textContent = n;
  $("#max").textContent = max;
  $("#left").textContent = full ? "boîte pleine ✔" : `encore ${max - n} à choisir`;
  $("#bar").style.width = (n / max * 100) + "%";
  $("#total").textContent = eur(total);
  $("#summary").textContent = parts.join(", ") || "Ajoutez des macarons avec les boutons +";
}
render();

// Horaires
const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const today = new Date().getDay();
$("#hours").innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d =>
  `<tr class="${d === today ? "today" : ""}"><td>${DAYS[d]}</td><td>${d === 0 || d === 1 ? "Fermé" : "10h – 19h"}</td></tr>`).join("");
const h = new Date().getHours();
$("#openNow").textContent = today > 1 && h >= 10 && h < 19 ? "● Ouvert actuellement" : "● Fermé actuellement";

// Menu mobile
$("#burger").onclick = () => { const o = $("#nav").classList.toggle("open"); $("#burger").setAttribute("aria-expanded", o); };
$("#nav").addEventListener("click", e => { if (e.target.tagName === "A") $("#nav").classList.remove("open"); });

// Barre de progression, retour haut, lien actif
const links = [...document.querySelectorAll("nav a")];
const secs = links.map(a => document.querySelector(a.getAttribute("href")));
addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  $("#progress").style.width = (scrollY / max * 100) + "%";
  $("#toTop").classList.toggle("show", scrollY > 600);
  let cur = -1;
  secs.forEach((s, i) => { if (s.getBoundingClientRect().top < innerHeight * 0.4) cur = i; });
  links.forEach((a, i) => a.classList.toggle("on", i === cur));
}, { passive: true });

// Apparition au scroll + compteurs
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add("in");
  const c = e.target.querySelector("[data-to]");
  if (c && !c.done) {
    c.done = true;
    const to = +c.dataset.to, t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / 1200); c.textContent = Math.round(to * k); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  io.unobserve(e.target);
}), { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

$("#year").textContent = new Date().getFullYear();
