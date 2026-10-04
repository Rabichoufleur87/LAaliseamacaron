// Interface « classique » : boîtes, parfums, composeur, horaires, menu
const $ = s => document.querySelector(s);
const eur = n => n.toFixed(2).replace(".", ",") + " €";
const SWEET = 1.2, SAVORY = 1.3;
// les parfums de la boutique : [fichier photo, nom, type]
const FLAVORS = [
  ["abricot-et-the-a-la-bergamotte", "Abricot & thé à la bergamote", "sucré"],
  ["amandes", "Amandes", "sucré"],
  ["avocat", "Avocat", "salé"],
  ["banane-chocolat-noir", "Banane & chocolat noir", "sucré"],
  ["cafe", "Café", "sucré"],
  ["caramel-beurre-sale", "Caramel beurre salé", "sucré"],
  ["cassis", "Cassis", "sucré"],
  ["chevre-et-miel", "Chèvre & miel", "salé"],
  ["chocolat-lait", "Chocolat au lait", "sucré"],
  ["chocolat-cote-d-ivoire", "Chocolat Côte d'Ivoire", "sucré"],
  ["chocolat-origine-vietnam", "Chocolat origine Vietnam", "sucré"],
  ["chorizo", "Chorizo", "salé"],
  ["citron", "Citron", "sucré"],
  ["citron-vert-et-basilic", "Citron vert & basilic", "sucré"],
  ["cookie", "Cookie", "sucré"],
  ["foie-gras-et-figues", "Foie gras & figues", "salé"],
  ["fraise", "Fraise", "sucré"],
  ["framboise", "Framboise", "sucré"],
  ["fruit-de-la-passion", "Fruit de la passion", "sucré"],
  ["mangue", "Mangue", "sucré"],
  ["menthe-et-chocolat-noir", "Menthe & chocolat noir", "sucré"],
  ["myrtille", "Myrtille", "sucré"],
  ["noisettes-torrefiees-et-chocolat-lait", "Noisettes torréfiées & chocolat au lait", "sucré"],
  ["noix-et-figues", "Noix & figues", "sucré"],
  ["noix-de-cajou-truffees", "Noix de cajou truffées", "salé"],
  ["noix-de-coco-et-chocolat-noir", "Noix de coco & chocolat noir", "sucré"],
  ["olives-noires-et-citron-confit", "Olives noires & citron confit", "salé"],
  ["parmesan-et-tomates", "Parmesan & tomates", "salé"],
  ["pistache", "Pistache", "sucré"],
  ["pop-corn-et-caramel", "Pop-corn & caramel", "sucré"],
  ["praline", "Praliné", "sucré"],
  ["praline-cacahuete", "Praliné cacahuète", "sucré"],
  ["roquefort", "Roquefort", "salé"],
  ["rose", "Rose", "sucré"],
  ["sesame-et-gingembre", "Sésame & gingembre", "salé"],
  ["tiramisu", "Tiramisu", "sucré"],
  ["truite-fumee-citronnee", "Truite fumée citronnée", "salé"],
  ["vanille", "Vanille", "sucré"]
].map(([slug, name, type]) => ({ slug, name, type, img: `img/macarons/${slug}.webp`, price: type === "salé" ? SAVORY : SWEET }));
const SIZES = [8, 12, 18, 24];

export function initUI() {
  $("#sizes").innerHTML = SIZES.map(n => `
    <article class="card rv"><div class="big">${n}</div><h3>macarons</h3>
    <p class="price">dès ${eur(n * SWEET)}</p>
    <a class="btn mag" href="#composer" data-size="${n}">Composer</a></article>`).join("")
    + `<article class="card rv"><div class="big">1–6</div><h3>sachet</h3><p class="price">${eur(SWEET)} / pièce</p><a class="btn mag" href="#composer" data-size="6">Composer</a></article>`;

  const renderFlavors = f => {
    $("#flavors").innerHTML = FLAVORS.filter(x => f === "all" || x.type === f).map(x =>
      `<figure class="flavor"><img src="${x.img}" alt="Macaron ${x.name}" loading="lazy" width="420" height="420"><figcaption><strong>${x.name}</strong><small>${x.type} · ${eur(x.price)}</small></figcaption></figure>`).join("");
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
    <div class="item"><img src="${f.img}" alt="" loading="lazy" width="44" height="44"><div class="nm">${f.name}<small>${f.type} · ${eur(f.price)}</small></div>
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
