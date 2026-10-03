// Interface « classique » : boîtes, parfums, composeur, horaires, menu
const $ = s => document.querySelector(s);
const eur = n => n.toFixed(2).replace(".", ",") + " €";
const SWEET = 1.2, SAVORY = 1.3;
const FLAVORS = [
  { name: "Chocolat", type: "sucré", color: "#5a3a2a" },
  { name: "Pistache", type: "sucré", color: "#b5d27a" },
  { name: "Café", type: "sucré", color: "#b59f86" },
  { name: "Cassis", type: "sucré", color: "#70505f" },
  { name: "Mojito", type: "sucré", color: "#9ed36a" },
  { name: "Framboise", type: "sucré", color: "#d9456b" },
  { name: "Citron", type: "sucré", color: "#f2e05a" },
  { name: "Chèvre", type: "salé", color: "#efe6d2" },
  { name: "Tomate-basilic", type: "salé", color: "#d8563a" },
].map(f => ({ ...f, price: f.type === "salé" ? SAVORY : SWEET }));
const SIZES = [8, 12, 18, 24];

export function initUI() {
  $("#sizes").innerHTML = SIZES.map(n => `
    <article class="card rv"><div class="big">${n}</div><h3>macarons</h3>
    <p class="price">dès ${eur(n * SWEET)}</p>
    <a class="btn mag" href="#composer" data-size="${n}">Composer</a></article>`).join("")
    + `<article class="card rv"><div class="big">1–6</div><h3>sachet</h3><p class="price">${eur(SWEET)} / pièce</p><a class="btn mag" href="#composer" data-size="6">Composer</a></article>`;

  const renderFlavors = f => {
    $("#flavors").innerHTML = FLAVORS.filter(x => f === "all" || x.type === f).map(x =>
      `<div class="flavor"><span class="dot" style="background:${x.color}"></span><strong>${x.name}</strong><small>${x.type} · ${eur(x.price)}</small></div>`).join("");
  };
  renderFlavors("all");
  document.querySelectorAll(".tab[data-f]").forEach(t => t.onclick = () => {
    document.querySelectorAll(".tab[data-f]").forEach(o => o.classList.toggle("on", o === t));
    renderFlavors(t.dataset.f);
  });

  let max = 12;
  const qty = FLAVORS.map(() => 0);
  const sum = () => qty.reduce((a, b) => a + b, 0);
  $("#sizePick").innerHTML = [6, ...SIZES].map(n => `<button class="tab${n === max ? " on" : ""}" data-n="${n}">${n === 6 ? "Sachet (6)" : n}</button>`).join("");
  $("#builder").innerHTML = FLAVORS.map(f => `
    <div class="item"><div>${f.name}<small>${f.type} · ${eur(f.price)}</small></div>
    <div class="qty"><button type="button" aria-label="Retirer ${f.name}">−</button><output>0</output><button type="button" aria-label="Ajouter ${f.name}">+</button></div></div>`).join("");
  [...$("#builder").children].forEach((el, i) => {
    const [m, p] = el.querySelectorAll("button");
    m.onclick = () => { qty[i] = Math.max(0, qty[i] - 1); render(); };
    p.onclick = () => { if (sum() < max) qty[i]++; render(); };
  });
  const setSize = n => {
    max = n;
    document.querySelectorAll("#sizePick .tab").forEach(b => b.classList.toggle("on", +b.dataset.n === n));
    for (let i = qty.length - 1; sum() > max && i >= 0; i--) qty[i] = Math.max(0, qty[i] - (sum() - max));
    render();
  };
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

  const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const today = new Date().getDay(), h = new Date().getHours();
  $("#hours").innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d =>
    `<tr class="${d === today ? "today" : ""}"><td>${DAYS[d]}</td><td>${d === 0 || d === 1 ? "Fermé" : "10h – 19h"}</td></tr>`).join("");
  $("#openNow").textContent = today > 1 && h >= 10 && h < 19 ? "● Ouvert actuellement" : "● Fermé actuellement";

  $("#burger").onclick = () => { const o = $("#nav").classList.toggle("open"); $("#burger").setAttribute("aria-expanded", o); };
  $("#nav").addEventListener("click", e => { if (e.target.tagName === "A") $("#nav").classList.remove("open"); });
  $("#year").textContent = new Date().getFullYear();
}
