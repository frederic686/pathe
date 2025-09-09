/* =========================================================
   Catalogue – Pathé (COMPLET) — Ordre par fonctionnement
   ========================================================= */

/* 1) Helpers & constantes */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const PATH_JSON  = '../data/films.json';
const POSTER_DIR = '../assets/images/FILMS/';

/* 2) État & utilitaires */
const state = {
  films: [],
  filters: { genre: 'Tous', fourk: false, langue: 'Tous', q: '' }
};

// Convertit minutes -> "XhYY"
const minToH = (mins) => {
  const m = Math.max(0, Number(mins) || 0);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}h${String(r).padStart(2, '0')}`;
};

// Au moins une séance 4K ?
const has4K = (film) => (film['séances'] || film.seances || []).some(s => s['4k'] === true);

// Au moins une séance dans la langue demandée ?
const hasLang = (film, lang) => {
  const seances = film['séances'] || film.seances || [];
  if (lang === 'Tous') return true;
  if (lang === 'VF')   return seances.some(s => s.vf   === true);
  if (lang === 'VOST') return seances.some(s => s.vost === true);
  return true;
};

// Normalise un titre pour comparer aux clés de TRAILERS
function normalizeTitle(t) {
  return (t || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9: ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* 3) Données statiques : bandes-annonces */
const TRAILERS = new Map([
  ['evanouis', 'https://www.youtube.com/embed/eDBLToWrnBU'],
  ['le monde de wishy', 'https://www.youtube.com/embed/wiWYHjlhTKc'],
  // À compléter avec les autres films
]);

/* 4) Construction UI des menus + interactions filtres */
function uniqueGenres(films) {
  const set = new Set();
  films.forEach(f => (f.genre || []).forEach(g => set.add(g)));
  return ['Tous', ...[...set].sort((a, b) => a.localeCompare(b, 'fr'))];
}

function buildMenus() {
  const menuG = $('#menu-genres');
  if (menuG) {
    menuG.innerHTML =
      `<div class="title">Genres</div>` +
      uniqueGenres(state.films).map(g => `<button type="button" data-genre="${g}">${g}</button>`).join('');
  }

  const menuL = $('#menu-langues');
  if (menuL) {
    menuL.innerHTML =
      `<div class="title">Langues</div>
       <button type="button" data-lang="Tous">Tous</button>
       <button type="button" data-lang="VF">VF</button>
       <button type="button" data-lang="VOST">VOST</button>`;
  }
}

function closeMenus() {
  $$('#menu-genres, #menu-langues').forEach(m => m.classList.add('hidden'));
}

function initFilterInteractions() {
  const btnGenres  = $('#btnGenres');
  const btn4k      = $('#btn4K');
  const btnLangues = $('#btnLangues');
  const inputQ     = $('#searchInput');

  if (btnGenres) {
    btnGenres.addEventListener('click', () => {
      const m = $('#menu-genres');
      const r = btnGenres.getBoundingClientRect();
      m.style.top  = `${r.bottom + window.scrollY + 6}px`;
      m.style.left = `${r.left + window.scrollX}px`;
      closeMenus();
      m.classList.remove('hidden');
      btnGenres.setAttribute('aria-expanded', 'true');
    });
  }

  if (btnLangues) {
    btnLangues.addEventListener('click', () => {
      const m = $('#menu-langues');
      const r = btnLangues.getBoundingClientRect();
      m.style.top  = `${r.bottom + window.scrollY + 6}px`;
      m.style.left = `${r.left + window.scrollX}px`;
      closeMenus();
      m.classList.remove('hidden');
      btnLangues.setAttribute('aria-expanded', 'true');
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#menu-genres,#menu-langues,#btnGenres,#btnLangues')) {
      closeMenus();
      btnGenres?.setAttribute('aria-expanded', 'false');
      btnLangues?.setAttribute('aria-expanded', 'false');
    }
  });

  $('#menu-genres')?.addEventListener('click', (e) => {
    const g = e.target?.dataset?.genre;
    if (!g) return;
    state.filters.genre = g;
    if ($('#btnGenres span')) {
      $('#btnGenres span').textContent = (g === 'Tous' ? 'Genres' : g);
    }
    closeMenus();
    render();
  });

  $('#menu-langues')?.addEventListener('click', (e) => {
    const l = e.target?.dataset?.lang;
    if (!l) return;
    state.filters.langue = l;
    if ($('#btnLangues span')) {
      $('#btnLangues span').textContent = (l === 'Tous' ? 'Langues' : l);
    }
    closeMenus();
    render();
  });

  if (btn4k) {
    btn4k.addEventListener('click', () => {
      state.filters.fourk = !state.filters.fourk;
      btn4k.setAttribute('aria-pressed', String(state.filters.fourk));
      btn4k.style.fontWeight = state.filters.fourk ? '800' : '500';
      render();
    });
  }

  inputQ?.addEventListener('input', (e) => {
    state.filters.q = e.target.value || '';
    render();
  });
}

/* 5) Modale vidéo (ouverture/fermeture) */
const videoModal = $('#videoModal');
const videoFrame = $('#videoFrame');
const closeModal = $('#closeModal');

function openVideoTrailer(url) {
  if (!url) return;
  const sep = url.includes('?') ? '&' : '?';
  videoFrame.src = url + sep + 'autoplay=1&rel=0';
  videoModal.classList.add('open');
  videoModal.setAttribute('aria-hidden', 'false');
}

function closeVideo() {
  videoModal?.classList.remove('open');
  videoModal?.setAttribute('aria-hidden', 'true');
  if (videoFrame) videoFrame.src = '';
}

closeModal?.addEventListener('click', closeVideo);

videoModal?.addEventListener('click', (e) => {
  if (e.target === videoModal) closeVideo();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && videoModal?.classList.contains('open')) {
    closeVideo();
  }
});

/* 6) Rendu d’un film (brique) */
function renderFilm(f) {
  const wrap = document.createElement('article');
  wrap.className = 'film';
  wrap.dataset.title = f.titre;

  // Poster
  const img = document.createElement('img');
  img.className = 'poster';
  img.alt = f.titre;
  img.src = POSTER_DIR + (f.image || 'placeholder.jpg');
  wrap.appendChild(img);

  // Contenu
  const content = document.createElement('div');
  content.className = 'film-content';

  // Badges (Nouveau et Frisson)
  const badges = document.createElement('div');
  badges.className = 'badges';

  // Badge "Nouveau"
  if (f.nouveau === true) {
    const b = document.createElement('span');
    b.className = 'badge badge--new';
    b.textContent = 'Nouveau';
    b.setAttribute('aria-label', 'Nouveauté');
    badges.appendChild(b);
  }

  // Badge "Frisson"
  if (f.mention_frisson) {
    const b = document.createElement('span');
    b.className = 'badge-frisson';
    b.textContent = 'Frisson';
    badges.appendChild(b);
  }

  if (badges.children.length) {
    content.appendChild(badges);
  }

  // Titre du film
  const h3 = document.createElement('h3');
  h3.className = 'film-title';
  h3.textContent = f.titre;
  content.appendChild(h3);

  // Meta (genres + durée + chips)
  const meta = document.createElement('div');
  meta.className = 'meta';

  const g = document.createElement('span');
  g.textContent = (f.genre || []).join(' · ');
  meta.appendChild(g);

  const dot = document.createElement('span');
  dot.className = 'dot';
  meta.appendChild(dot);

  const d = document.createElement('span');
  d.textContent = `(${minToH(f['durée_minutes'])})`;
  meta.appendChild(d);

  // Chips Age / Violence alignés sur la même ligne
  if (typeof f['âge_minimum'] === 'number') {
    const chipAge = document.createElement('span');
    chipAge.className = 'chip chip--age';
    chipAge.textContent = `${f['âge_minimum']}+`;
    chipAge.title = `Âge minimum ${f['âge_minimum']} ans`;
    meta.appendChild(chipAge);
  }

  if (f['avertissement_violence'] === true) {
    const chipViolence = document.createElement('span');
    chipViolence.className = 'chip chip--violence';
    chipViolence.title = 'Avertissement : violence';
    meta.appendChild(chipViolence);
  }

  content.appendChild(meta);

  // Séances
  const times = document.createElement('div');
  times.className = 'showtimes';

  const seances = f['séances'] || f.seances || [];
  seances.forEach((s) => {
    const btn = document.createElement('button');
    btn.className = 'showtime';
    btn.type = 'button';

    btn.setAttribute(
      'aria-label',
      `Séance ${s.horaire} ${s.vf ? 'VF' : (s.vost ? 'VOST' : '')} ${s.imax ? 'IMAX' : ''} ${s['4k'] ? '4K' : ''}`
    );

    // Flags IMAX/4K
    const flags = [];
    if (s.imax) flags.push('IMAX');
    if (s['4k']) flags.push('4K');

    if (flags.length) {
      const flag = document.createElement('span');
      flag.className = 'flag';
      flag.textContent = flags.join(' • ');
      btn.appendChild(flag);
    }

    const left = document.createElement('div');

    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = s.horaire;
    left.appendChild(time);

    const lang = document.createElement('span');
    lang.className = 'lang';
    lang.textContent = s.vf ? 'VF' : (s.vost ? 'VOST' : '');
    left.appendChild(lang);

    btn.appendChild(left);

    const right = document.createElement('div');
    right.className = 'icons';

    if (s.handicap) {
      const ic = document.createElement('i');
      ic.className = 'icon-wheel';
      ic.title = 'Accessible PMR';
      right.appendChild(ic);
    }

    btn.appendChild(right);

    // Redirection salle.html
    btn.addEventListener('click', () => {
      const sessionData = {
        film: f.titre,
        seance: s.horaire,
        salle: s.salle,
        fin: s.fin,
        vf: !!s.vf,
        vost: !!s.vost,
        imax: !!s.imax,
        fourk: !!s['4k'],
        poster: f.image
      };

      const qs = new URLSearchParams(sessionData).toString();
      window.location.href = `salle.html?${qs}`;
    });

    times.appendChild(btn);
  });

  content.appendChild(times);
  wrap.appendChild(content);
  return wrap;
}
/* 7) Rendu de la liste (orchestrateur) */
function render() {
  const list = $('#filmsList');
  if (!list) return;
  list.innerHTML = '';

  const filtered = state.films.filter(f => {
    const q = (state.filters.q || '').trim().toLowerCase();
    const genresText = (f.genre || []).join(' ').toLowerCase();

    const qok = !q || f.titre.toLowerCase().includes(q) || genresText.includes(q);
    const gok = (state.filters.genre === 'Tous') || (f.genre || []).includes(state.filters.genre);
    const k4  = state.filters.fourk ? has4K(f) : true;
    const lok = hasLang(f, state.filters.langue);

    return qok && gok && k4 && lok;
  });

  filtered.forEach(f => list.appendChild(renderFilm(f)));
}

/* 8) Délégation : clic affiche (ouvre BA) */
$('#filmsList')?.addEventListener('click', (e) => {
  const poster = e.target.closest('.poster');
  if (!poster) return;

  const article = poster.closest('.film');
  const title   = article?.dataset?.title || '';
  const key     = normalizeTitle(title);

  let url = TRAILERS.get(key);
  if (!url) {
    for (const [k, v] of TRAILERS.entries()) {
      if (key.includes(k)) { url = v; break; }
    }
  }

  if (url) openVideoTrailer(url);
});

/* 9) Init (DOMContentLoaded → fetch → build → init → render) */
document.addEventListener('DOMContentLoaded', () => {
  fetch(PATH_JSON)
    .then(r => r.json())
    .then(data => {
      state.films = Array.isArray(data) ? data : [];
      buildMenus();
      initFilterInteractions();
      render();
    })
    .catch(err => {
      console.error('Erreur chargement films.json', err);
      const list = $('#filmsList');
      if (list) list.innerHTML = `<p style="opacity:.8">Impossible de charger les films.</p>`;
    });
});

/* fnction fleche haut */
(function(){
  const btn = document.getElementById('scrollTop');
  if(!btn) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // afficher/cacher le bloc selon le scroll
  function toggleBtn(){
    if(window.scrollY > 300){
      btn.classList.add('is-visible');
    } else {
      btn.classList.remove('is-visible');
    }
  }

  // action au clic : remonter en haut
  btn.addEventListener('click', () => {
    const behavior = prefersReduced ? 'auto' : 'smooth';
    window.scrollTo({ top: 0, left: 0, behavior });
  });

  // initialisation + listener
  toggleBtn();
  window.addEventListener('scroll', toggleBtn, { passive: true });
})();
