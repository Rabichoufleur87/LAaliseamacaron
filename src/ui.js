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
// familles de goûts pour la recherche (« fruit », « fromage »…) en plus du nom
const FAMILIES = {
  chocolat: /chocolat|cookie|tiramisu|banane/, fruits: /abricot|cassis|citron|fraise|framboise|mangue|myrtille|passion|banane|figue|coco|rose/,
  "fruits secs": /amande|noisette|noix|cajou|pistache|praline|cacahuete|sesame/, fromages: /chevre|roquefort|parmesan/,
  "apéritif": /avocat|chevre|chorizo|foie|cajou|olive|parmesan|roquefort|sesame|truite/, gourmand: /caramel|cookie|pop-corn|tiramisu|praline|vanille|cafe/,
};
const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function initUI() {
  $("#sizes").innerHTML = SIZES.map(n => `
    <article class="card rv"><div class="big">${n}</div><h3>macarons</h3>
    <p class="price">dès ${eur(n * SWEET)}</p>
    <a class="btn mag" href="#composer" data-size="${n}">Composer</a></article>`).join("")
    + `<article class="card rv"><div class="big">1–6</div><h3>sachet</h3><p class="price">${eur(SWEET)} / pièce</p><a class="btn mag" href="#composer" data-size="6">Composer</a></article>`;

  // --- signatures : les incontournables, chacun avec une phrase d'ambiance ---
  const SIG = [
    ["caramel-beurre-sale", "Fondant, une pointe de sel, l'âme bretonne."],
    ["pistache", "Une pistache intense, verte comme notre maison."],
    ["framboise", "Vive, acidulée, cueillie au cœur de l'été."],
    ["chocolat-origine-vietnam", "Un grand cru aux notes boisées et fruitées."],
    ["fruit-de-la-passion", "Un éclat exotique, tout en fraîcheur."],
    ["rose", "Délicate et florale, l'élégance à la française."],
    ["foie-gras-et-figues", "Le salé de fête, pour un apéritif d'exception."],
    ["cafe", "Corsé et doux, le compagnon du café gourmand."],
  ];
  $("#sigTrack").innerHTML = SIG.map(([slug, line], n) => {
    const i = FLAVORS.findIndex(f => f.slug === slug), f = FLAVORS[i];
    return `<article class="sig-card"><span class="sig-n">N°${String(n + 1).padStart(2, "0")}</span>
      <div class="sig-img"><img src="${f.img}" alt="Macaron ${f.name}" loading="lazy" width="420" height="420"></div>
      <h3>${f.name}</h3><p>${line}</p>
      <div class="sig-foot"><span class="sig-price">${eur(f.price)}</span><button class="btn small" type="button" data-addi="${i}">Ajouter</button></div></article>`;
  }).join("");

  // --- recherche de parfums : nom, famille de goûts, sucré / salé ---
  FLAVORS.forEach(f => {
    const n = norm(f.name + " " + f.slug);
    f.key = n + " " + Object.keys(FAMILIES).filter(k => FAMILIES[k].test(n)).map(norm).join(" ") + " " + norm(f.type);
  });
  let typeF = "all", query = "";
  $("#flavors").innerHTML = FLAVORS.map((x, i) =>
    `<figure class="flavor" data-i="${i}"><div class="fimg"><img src="${x.img}" alt="Macaron ${x.name}" loading="lazy" width="420" height="420"></div>
    <figcaption><strong>${x.name}</strong><small>${x.type} · ${eur(x.price)}</small></figcaption>
    <button class="add" type="button" data-i="${i}" aria-label="Ajouter ${x.name} à ma boîte"><span>+</span></button></figure>`).join("");
  const cards = [...$("#flavors").children];
  function filterFlavors() {
    const words = norm(query).split(/\s+/).filter(Boolean);
    let shown = 0;
    cards.forEach(c => {
      const f = FLAVORS[+c.dataset.i];
      const ok = (typeF === "all" || f.type === typeF) && words.every(w => f.key.includes(w));
      if (ok) { c.style.setProperty("--d", Math.min(shown, 12) * 35 + "ms"); shown++; }
      c.hidden = !ok;
      c.classList.remove("pop"); if (ok) { void c.offsetWidth; c.classList.add("pop"); }
    });
    $("#qcount").textContent = shown ? `${shown} parfum${shown > 1 ? "s" : ""}` : "";
    $("#noresult").hidden = shown > 0;
    $("#noq").textContent = query.trim();
    $("#qclear").hidden = !query;
  }
  document.querySelectorAll(".tab[data-f]").forEach(t => t.addEventListener("click", () => {
    document.querySelectorAll(".tab[data-f]").forEach(o => o.classList.toggle("on", o === t));
    typeF = t.dataset.f; filterFlavors();
  }));
  $("#q").addEventListener("input", e => { query = e.target.value; document.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", norm(c.dataset.q) === norm(query))); filterFlavors(); });
  $("#qclear").addEventListener("click", () => { $("#q").value = query = ""; document.querySelectorAll(".chip").forEach(c => c.classList.remove("on")); filterFlavors(); $("#q").focus(); });
  document.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => {
    const on = !c.classList.contains("on");
    document.querySelectorAll(".chip").forEach(o => o.classList.toggle("on", on && o === c));
    $("#q").value = query = on ? c.dataset.q : ""; filterFlavors();
  }));
  filterFlavors();

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
  // ajouter un parfum depuis sa carte, avec un petit message de confirmation
  let toastT;
  const toast = msg => {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2200);
  };
  document.addEventListener("click", e => {
    const b = e.target.closest(".add, [data-addi]"); if (!b) return;
    const i = +(b.dataset.i ?? b.dataset.addi), f = FLAVORS[i];
    if (sum() >= max) { toast(`Votre boîte de ${max} est pleine`); b.classList.add("no"); setTimeout(() => b.classList.remove("no"), 500); return; }
    qty[i]++; render();
    b.classList.add("ok"); setTimeout(() => b.classList.remove("ok"), 700);
    toast(`${f.name} ajouté · ${sum()}/${max}`);
  });
  $("#bq").addEventListener("input", e => {
    const w = norm(e.target.value).split(/\s+/).filter(Boolean);
    [...$("#builder").children].forEach((el, i) => { el.hidden = !w.every(x => FLAVORS[i].key.includes(x)); });
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
      const el = $("#builder").children[i], o = el.querySelector("output");
      if (o.textContent !== String(qty[i])) { o.textContent = qty[i]; o.classList.remove("bump"); void o.offsetWidth; o.classList.add("bump"); }
      el.classList.toggle("has", qty[i] > 0);
      el.querySelectorAll("button")[0].disabled = !qty[i];
      el.querySelectorAll("button")[1].disabled = full;
    });
    if ($("#count").textContent !== String(n)) { const c = $("#count"); c.textContent = n; c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }
    $("#max").textContent = max;
    $("#left").textContent = full ? "boîte pleine ✔" : `encore ${max - n} à choisir`;
    $("#bar").style.width = (n / max * 100) + "%";
    $("#total").textContent = eur(total);
    $("#summary").textContent = parts.join(", ") || "Ajoutez des macarons avec les boutons +";
    // barre « ma boîte » flottante
    $("#orderbar").classList.toggle("has", n > 0);
    document.body.classList.toggle("hasbox", n > 0);
    $("#obCount").textContent = `${n}/${max}`;
    $("#obTotal").textContent = eur(total);
    $("#obDots").innerHTML = FLAVORS.flatMap((f, i) => Array(qty[i]).fill(`<img src="${f.img}" alt="">`)).slice(0, 4).join("");
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
