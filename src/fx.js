// Micro-interactions des boutons : texte qui roule, remplissage depuis le curseur, onde au clic,
// et ouverture fluide des questions fréquentes.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initFx() {
  // texte doublé : au survol, l'étiquette glisse vers le haut et sa copie la remplace
  document.querySelectorAll(".btn, .tab, .chip, nav a").forEach(el => {
    if (el.querySelector(".bt")) return;
    const t = el.textContent.trim();
    el.innerHTML = `<span class="bt" data-t="${t.replace(/"/g, "&quot;")}"><span>${t}</span></span>`;
  });
  // le remplissage part de l'endroit où entre le curseur
  document.querySelectorAll(".btn, .tab, .chip, .add, .qty button, #toTop").forEach(el => {
    const at = e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--x", ((e.clientX - r.left) / r.width) * 100 + "%");
      el.style.setProperty("--y", ((e.clientY - r.top) / r.height) * 100 + "%");
    };
    el.addEventListener("pointerenter", at);
    el.addEventListener("pointerleave", at);
  });
  // onde au clic
  document.addEventListener("pointerdown", e => {
    const el = e.target.closest(".btn, .tab, .chip, .add, .qty button");
    if (!el || el.disabled || reduce) return;
    const r = el.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2;
    const w = document.createElement("span");
    w.className = "rip";
    w.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    el.append(w);
    w.addEventListener("animationend", () => w.remove());
  });
  // FAQ : hauteur animée à l'ouverture comme à la fermeture
  document.querySelectorAll(".faq details").forEach(d => {
    const s = d.querySelector("summary"), p = d.querySelector("p");
    s.addEventListener("click", e => {
      if (reduce) return;
      e.preventDefault();
      if (d.open) {
        d.classList.remove("is-open");
        p.animate([{ height: p.scrollHeight + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 380, easing: "cubic-bezier(.7,0,.3,1)" }).onfinish = () => { d.open = false; };
      } else {
        d.open = true; d.classList.add("is-open");
        p.animate([{ height: "0px", opacity: 0 }, { height: p.scrollHeight + "px", opacity: 1 }], { duration: 480, easing: "cubic-bezier(.2,.7,.2,1)" });
      }
    });
  });
}
