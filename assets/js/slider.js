/* =========================
   Slider 100% JavaScript
   - précharge et filtre les images cassées
   - boucle infinie toutes les 4s
   - navigation clavier
   - transition pages (fade out)
========================= */

const BASE = "assets/images/affiches/";
const IMAGES = [
  "nobody-accueil.jpg",
  "nobody-2.jpg",
  "TNG.png",
  "evanouis.webp",
  "karate-kid-legends.webp",
  "karate-kid-legends-2.jpg",
  "le-monde-de-wishy.jpg",
  "le-monde-de-wishy-2.jpg",
  "nobody-2_header-mobile.jpg"
];

const slidesEl = document.getElementById("slides");

function preload(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(src);
    img.onerror = () => reject(src);
    img.src = BASE + encodeURIComponent(src);
  });
}

(async function initSlider() {
  if (!slidesEl) return;

  const results = await Promise.allSettled(IMAGES.map(preload));
  const validImages = results.filter(r => r.status === "fulfilled").map(r => r.value);

  if (validImages.length === 0) {
    console.error("[slider] Aucune image valide trouvée");
    return;
  }

  const slides = validImages.map(file => {
    const s = document.createElement("div");
    s.className = "slide";
    s.style.backgroundImage = `url("${BASE + encodeURIComponent(file)}")`;
    slidesEl.appendChild(s);
    return s;
  });

  let idx = 0;
  let timer = null;
  const INTERVAL = 4000; // 4 secondes

  function goTo(i) {
    idx = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle("is-active", k === idx));
  }

  function next() { goTo(idx + 1); }
  function start() { stop(); if (slides.length > 1) timer = setInterval(next, INTERVAL); }
  function stop() { if (timer) clearInterval(timer); timer = null; }

  goTo(0);
  start();

  // navigation clavier
  document.addEventListener("keydown", (e) => {
    if (slides.length <= 1) return;
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft")  goTo(idx - 1);
  });
})();

/* Transition pages (fondu au clic) */
document.querySelectorAll('a, .btn-reserver, button[data-href]').forEach(el => {
  el.addEventListener('click', (e) => {
    const href = el.getAttribute('href') || el.dataset.href || "";
    if (!href || href.startsWith('#')) return;
    e.preventDefault();
    document.body.classList.add('fade-out');
    setTimeout(() => { window.location = href; }, 500);
  });
});
