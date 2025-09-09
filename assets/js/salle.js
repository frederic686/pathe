// =========================================================
// SALLE (Page 3) – Script
// =========================================================

// ---------- Helpers & Params ----------
const $  = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => [...ctx.querySelectorAll(s)];
const params = new URLSearchParams(location.search);

// URL params (gauche + redirection)
const filmTitre = params.get('film')   || 'Film';
const room      = params.get('salle')  || '—';
const lang      = params.get('langue') || '—';
const timeStr   = params.get('seance') || '';
const seanceKey = `${filmTitre}|${room}|${timeStr}`;

// Permet de tester via l’URL : ?taken=A1,B3,C10
const URL_TAKEN = (params.get('taken') || '')
  .split(',')
  .map(s => s.trim().toUpperCase())
  .filter(Boolean);

// ---------- État ----------
const state = {
  rows: 16,
  cols: 18,
  taken:   new Set(),   // sièges bloqués (gris)
  selected:new Set(),   // sièges de l’utilisateur (verts)
  custom:  new Map(),   // si tu veux des icônes spécifiques
  poster: '',
  format: '',
  end: '',
  selectedSeance: null
};

// ---------- Configuration des sièges ----------
const FIXED_OVERRIDES = {
  // pour mettre en gris taken
  taken: ['G9','G10','A1'],
  gaps:  ['A5','A6','A13','A14'],
  customIcon: {
    'A7':  '../images/PICTOS/desactive.png',
    'A8':  '../images/PICTOS/desactive.png',
    'A9':  '../images/PICTOS/desactive.png',
    'A10': '../images/PICTOS/desactive.png',
    'A11': '../images/PICTOS/desactive.png',
    'A12': '../images/PICTOS/desactive.png',
  }
};
// Ajout de ceux passés par l’URL
FIXED_OVERRIDES.taken = Array.from(new Set([...FIXED_OVERRIDES.taken, ...URL_TAKEN]));

// Colonnes 4 et 15 en gaps
for (let r = 0; r < 16; r++) {
  FIXED_OVERRIDES.gaps.push(`${String.fromCharCode(65 + r)}4`);
  FIXED_OVERRIDES.gaps.push(`${String.fromCharCode(65 + r)}15`);
}

// Id de siège "A1"
const seatId = (r, c) => `${String.fromCharCode(65 + r)}${c + 1}`;

// Calcule l’indispo initiale
function computeAvailability() {
  state.taken = new Set(FIXED_OVERRIDES.taken);
  // Si certains customIcon sont "desactivés", on les force en pris
  Object.entries(FIXED_OVERRIDES.customIcon || {}).forEach(([id, path]) => {
    if (/desactive/i.test(path || '')) state.taken.add(id);
  });
}

// ---------- Persistance ----------
const LS_KEY = 'pathe_reservation';
const loadAll = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } };
function persist(){
  const all = loadAll();
  all[seanceKey] = {
    filmTitre, room, lang, timeStr,
    selected:[...state.selected],
    taken:[...state.taken],
    custom:[...state.custom]
  };
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}
function restore(){
  const data = loadAll()[seanceKey];
  if (!data) return;
  state.selected = new Set(data.selected || []);
  // on conserve nos "taken" calculés + on merge ceux restaurés
  const restoredTaken = new Set(data.taken || []);
  state.taken = new Set([...state.taken, ...restoredTaken]);
  state.custom = new Map(data.custom || []);
}

// ---------- Hydratation colonne gauche ----------
async function hydrateLeftColumn(qp){
  const poster = qp.get('poster') || '';
  const film   = qp.get('film')   || 'Film';
  const salle  = qp.get('salle')  || '—';
  const seance = qp.get('seance') || '';
  const langue = qp.get('langue') || '—';
  const endQP  = qp.get('end')    || '';

  const leftPane      = $('.left');
  const posterEl      = $('#filmPoster');
  const titleEl       = $('#filmTitle');
  const seanceTimeEl  = $('#seanceTime');
  const seanceEndEl   = $('#seanceEnd');
  const seanceLangEl  = $('#seanceLang');
  const roomNoEl      = $('#roomNo');

  const posterFile = (poster ? poster.split('/').pop() : '') || 'placeholder.jpg';
  if (posterEl){
    posterEl.src = `../assets/images/FILMS/${posterFile}`;
    posterEl.alt = `Affiche : ${film}`;
  }
  if (leftPane){
    // ✅ corrige le chemin de fond
    leftPane.style.setProperty('--left-bg', `url("../images/FILMS/${posterFile}")`);
  }

  if (titleEl)      titleEl.textContent = film;
  if (roomNoEl)     roomNoEl.textContent = salle;
  if (seanceTimeEl) seanceTimeEl.textContent = seance || '—:—';
  if (seanceLangEl) seanceLangEl.textContent = langue || '—';

  if (seanceEndEl){
    if (endQP){
      seanceEndEl.textContent = `Fin prévue à ${endQP}`;
      state.end = endQP;
    }else{
      try{
        const res  = await fetch('../data/films.json');
        const list = await res.json();
        const f = list.find(x => x.titre === film);
        const s = f?.séances?.find(x => String(x.salle) === String(salle) && x.horaire === seance);
        seanceEndEl.textContent = s?.fin ? `Fin prévue à ${s.fin}` : 'Fin prévue —:—';
        state.end = s?.fin || '';
        state.selectedSeance = s;
        state.poster = posterFile;
        state.format = s?.imax ? 'IMAX' : (s?.['4k'] ? '4K' : '');
      }catch{
        seanceEndEl.textContent = 'Fin prévue —:—';
      }
    }
  }
}
    $('#changeFilmBtn')?.addEventListener('click', () => {
        location.href = './catalogue.html';
    });
// ---------- Colonne droite ----------
const gridEl     = $('#seatGrid');
const freeCountEl= $('#freeCount');
const mySeatsEl  = $('#mySeats');
const btnReserve = $('#btnReserve');

function renderGrid(){
  gridEl.style.setProperty('--cols', state.cols);
  gridEl.innerHTML = '';

  for (let r=0; r<state.rows; r++){
    for (let c=0; c<state.cols; c++){
      const id = seatId(r,c);
      const isGap = FIXED_OVERRIDES.gaps.includes(id);

      const cell = document.createElement('div');
      if (isGap){
        cell.className = 'seat gap';
        gridEl.appendChild(cell);
        continue;
      }

      const isCustom  = Object.prototype.hasOwnProperty.call(FIXED_OVERRIDES.customIcon, id);
      const customPath= isCustom ? FIXED_OVERRIDES.customIcon[id] : '';
      const isTaken   = state.taken.has(id) || (isCustom && /desactive/i.test(customPath));
      const isMe      = state.selected.has(id);

      let cls = isTaken ? 'taken' : (isMe ? 'me' : 'free');
      if (isCustom){
        cls += ' custom';
        cell.style.setProperty('--seat-bg', `url("${customPath}")`);
      }

      cell.className = `seat ${cls}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.id = id;
      btn.tabIndex = isTaken ? -1 : 0;
      btn.setAttribute('aria-label', `Siège ${id}${isTaken ? ' indisponible' : ''}`);

      if (!isTaken) btn.addEventListener('click', toggleSeat);

      cell.appendChild(btn);
      gridEl.appendChild(cell);
    }
  }
}

function toggleSeat(e){
  const id = e.currentTarget.dataset.id;
  if (state.selected.has(id)) state.selected.delete(id);
  else state.selected.add(id);
  renderGrid();
  updateRecap();
  persist();
}

function updateRecap(){
  const total = state.rows * state.cols;
  const libres = total - state.taken.size - state.selected.size - FIXED_OVERRIDES.gaps.length;
  freeCountEl.textContent = `${libres} places libres`;

  const arr = [...state.selected].sort((a,b)=>{
    const [ra,ca] = [a.charCodeAt(0), parseInt(a.slice(1),10)];
    const [rb,cb] = [b.charCodeAt(0), parseInt(b.slice(1),10)];
    return ra !== rb ? ra - rb : ca - cb;
  });
  mySeatsEl.textContent = arr.length ? arr.join(', ') : '—';
  btnReserve.disabled = arr.length === 0;
}

// API pratique pour forcer des sièges pris depuis le code
function setTaken(...ids){
  ids.flat().forEach(id => state.taken.add(String(id).toUpperCase()));
  persist(); renderGrid(); updateRecap();
}

btnReserve?.addEventListener('click', ()=>{
  persist();
  const poster = state.poster || 'placeholder.jpg';
  const format = state.format || '';
  const end    = state.end || '';
  const seanceHM =
    state.selectedSeance?.horaire ||
    (/^\d{2}:\d{2}$/.test(params.get('seance') || '') ? params.get('seance') : '');

  const selectedSeats = [...state.selected].join(',');

  location.href =
    `tarif.html?film=${encodeURIComponent(filmTitre)}` +
    `&salle=${room}` +
    `&langue=${encodeURIComponent(lang)}` +
    (seanceHM ? `&seance=${encodeURIComponent(seanceHM)}` : '') +
    `&poster=${encodeURIComponent(`../assets/images/FILMS/${poster}`)}` +
    `&format=${encodeURIComponent(format)}` +
    `&seats=${encodeURIComponent(selectedSeats)}` +
    (end ? `&end=${encodeURIComponent(end)}` : '');
});

// ---------- BOOT ----------
(async function(){
  await hydrateLeftColumn(params); // gauche
  computeAvailability();           // 👉 applique les "pris" (A1, etc.)
  restore();                       // recharge sélection éventuelle
  renderGrid();                    // droite
  updateRecap();
})();