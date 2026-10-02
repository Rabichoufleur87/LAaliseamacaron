const FLAVORS = [
  { name: "Myrtille", type: "sucré", price: 1.2 },
  { name: "Mojito", type: "sucré", price: 1.2 },
  { name: "Chocolat", type: "sucré", price: 1.2 },
  { name: "Framboise", type: "sucré", price: 1.2 },
  { name: "Pistache", type: "sucré", price: 1.2 },
  { name: "Chèvre", type: "salé", price: 1.3 },
  { name: "Tomate-basilic", type: "salé", price: 1.3 },
];
const qty = FLAVORS.map(() => 0);
const eur = n => n.toFixed(2).replace(".", ",") + " €";
const builder = document.getElementById("builder");

function render() {
  let total = 0, count = 0, parts = [];
  FLAVORS.forEach((f, i) => {
    total += qty[i] * f.price;
    count += qty[i];
    if (qty[i]) parts.push(qty[i] + " × " + f.name);
    builder.children[i].querySelector("output").textContent = qty[i];
  });
  document.getElementById("total").textContent = eur(total);
  document.getElementById("count").textContent = count;
  document.getElementById("summary").textContent = parts.join(", ") || "—";
}

FLAVORS.forEach((f, i) => {
  const el = document.createElement("div");
  el.className = "item";
  el.innerHTML = `<div>${f.name}<small>${f.type} · ${eur(f.price)}</small></div>
    <div class="qty"><button type="button" aria-label="Retirer ${f.name}">−</button><output>0</output><button type="button" aria-label="Ajouter ${f.name}">+</button></div>`;
  const [minus, plus] = el.querySelectorAll("button");
  minus.onclick = () => { qty[i] = Math.max(0, qty[i] - 1); render(); };
  plus.onclick = () => { qty[i]++; render(); };
  builder.appendChild(el);
});
render();
document.getElementById("year").textContent = new Date().getFullYear();
