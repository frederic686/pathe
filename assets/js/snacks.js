// SNACKS (page 5)
// - Colonne gauche : hydratée depuis URL + films.json (fin) + fond
// - Détail des billets : lu depuis localStorage (clé séance) puis fallback URL
// - Catalogue snacks : depuis ../data/snack.json
// - Panier snacks : +/-, suppression ligne, vider
// - Total global = billets + snacks
// =========================================================
(() => {
    const $ = (s, ctx = document) => ctx.querySelector(s);
    const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
    const fmt = (n) => (n || 0).toLocaleString('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    });

    // --- Chemins ---
    const PATH_JSON = "../data/snack.json";
    const IMG_DIR = "../assets/images/SNACKS/";
    const PLUS_ICON = "../assets/images/PICTOS/plus.png";
    const MINUS_ICON = "../assets/images/PICTOS/moins.png";
    const TRASH_ICON = "../assets/images/PICTOS/poubelle.png";

    // --- DOM ---
    const shopSection = $('#catalog-container');
    const ticketLinesEl = $('#ticketLines');
    const cartLinesEl = $('#cartLines');
    const basketTotalEl = $('#basketTotal');
    const btnContinue = $('#btnContinue');
    const btnClear = $('#btnClear');

    // --- Params & clé séance ---
    const qp = new URLSearchParams(location.search);
    const film = qp.get('film') || 'Film';
    const salle = qp.get('salle') || '—';
    const seance = qp.get('seance') || '';
    const seatsStr = (qp.get('seats') || '').trim();
    const seats = seatsStr ? seatsStr.split(',').filter(Boolean) : [];
    const LS_MAIN = 'pathe_reservation';
    const seanceKey = `${film}|${salle}|${seance}`;

    // --- Barème identique à Tarifs ---
    const PRICES = {
        MATIN: {
            label: 'Matin',
            price: 9.90
        },
        U14: {
            label: 'Moins de 14 ans',
            price: 6.50
        },
    };

    // --- État snacks ---
    let catalog = {};
    const cart = new Map(); // key = nom, value = { nom, prix, image, points, qty }

    // ---------------------------------------------------------
    // [COMMUN] Fonction d'hydratation de la colonne gauche
    // ---------------------------------------------------------
    async function hydrateLeftColumn(params) {
        const poster = params.get('poster') || '';
        const film = params.get('film') || 'Film';
        const salle = params.get('salle') || '—';
        const seance = params.get('seance') || '';
        const langue = params.get('langue') || '—';
        const endQP = params.get('end') || '';
        const leftPane = document.querySelector('.left');
        const posterEl = document.querySelector('#filmPoster');
        const titleEl = document.querySelector('#filmTitle');
        const seanceTimeEl = document.querySelector('#seanceTime');
        const seanceEndEl = document.querySelector('#seanceEnd');
        const seanceLangEl = document.querySelector('#seanceLang');
        const roomNoEl = document.querySelector('#roomNo');

        // Mise à jour de l'affiche et du fond de la colonne gauche
        const posterFile = (poster ? poster.split('/').pop() : '') || 'placeholder.jpg';
        if (posterEl) {
            posterEl.src = `../assets/images/FILMS/${posterFile}`;
            posterEl.alt = `Affiche : ${film}`;
        }
        if (leftPane) {
            leftPane.style.setProperty('--left-bg', `url("../images/FILMS/${posterFile}")`);
        }

        // Mise à jour des textes
        if (titleEl) titleEl.textContent = film;
        if (roomNoEl) roomNoEl.textContent = `Salle ${salle}`;
        if (seanceTimeEl) seanceTimeEl.textContent = seance || '—:—';
        if (seanceLangEl) seanceLangEl.textContent = langue || '—';

        // Gestion de l'heure de fin (fin prévue)
        if (seanceEndEl) {
            if (endQP) {
                seanceEndEl.textContent = `Fin prévue à ${endQP}`;
            } else {
                try {
                    const res = await fetch('../data/films.json');
                    const list = await res.json();
                    const f = list.find(x => x.titre === film);
                    const s = f?.séances?.find(x => String(x.salle) === String(salle) && x.horaire === seance);
                    seanceEndEl.textContent = s?.fin ? `Fin prévue à ${s.fin}` : 'Fin prévue —:—';
                } catch (error) {
                    console.error("Erreur lors de la récupération de la fin de séance", error);
                    seanceEndEl.textContent = 'Fin prévue —:—';
                }
            }
        }
    }
    
    // ---------- Billets : lecture localStorage puis fallback URL ----------
    function loadTickets() {
        let tarifs = null,
            promo = null,
            total = NaN;

        try {
            const all = JSON.parse(localStorage.getItem(LS_MAIN) || '{}');
            const saved = all[seanceKey] || {};
            tarifs = saved.tarifs || null;
            promo = saved.promo || null;
            if (Number.isFinite(saved.total)) total = saved.total;
        } catch {}

        // Fallback URL si pas de LS
        if (!tarifs) {
            const tStr = qp.get('tarifs');
            if (tStr) {
                try {
                    tarifs = JSON.parse(tStr);
                } catch {}
            }
        }
        if (!promo) promo = (qp.get('promo') || '').toUpperCase() || null;
        if (!Number.isFinite(total)) total = Number(qp.get('total')) || 0;

        // Recalcule le total pour fiabilité
        let subtotal = 0;
        const lines = [];
        for (const [code, q] of Object.entries(tarifs || {})) {
            const p = PRICES[code];
            if (!p || !q) continue;
            const lineTotal = +(q * p.price).toFixed(2);
            lines.push({
                code,
                label: p.label,
                qty: q,
                lineTotal
            });
            subtotal += lineTotal;
        }
        let recomputed = subtotal;
        if (promo === 'CINEPASS') recomputed = Math.max(0, subtotal * 0.9);
        if (promo === 'REDUC2' && subtotal >= 10) recomputed = Math.max(0, subtotal - 2);
        recomputed = +recomputed.toFixed(2);

        return {
            tarifs: tarifs || {},
            promo: promo || null,
            seats,
            lines,
            count: lines.reduce((a, l) => a + (l.qty || 0), 0),
            total: recomputed || total || 0
        };
    }

    function renderTicketLines(data) {
        if (!ticketLinesEl) {
            const right = document.querySelector('.right') || document.body;
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
        <h3 class="h3">Vos billets</h3>
        <ul id="__ticketsUL" class="lines"></ul>
        <div class="meta" style="margin-top:6px;">Places : ${data.seats?.length ? data.seats.join(', ') : '—'}</div>
        <div class="total" style="margin-top:8px;border-top:1px solid #eee;padding-top:8px;">
          <div class="left"><span class="label">Total billets</span></div>
          <div class="right"><div class="amount">${fmt(data.total)}</div></div>
        </div>
      `;
            right.prepend(card);
            const ul = card.querySelector('#__ticketsUL');
            if (!data.lines.length) {
                ul.innerHTML = '<li class="muted">Aucun billet</li>';
            } else {
                data.lines.forEach(l => {
                    const li = document.createElement('li');
                    li.innerHTML = `<div class="line-left"><strong>${l.qty}×</strong> ${l.label}</div><div class="line-price">${fmt(l.lineTotal)}</div>`;
                    ul.appendChild(li);
                });
            }
            return;
        }

        // Cas où #ticketLines existe déjà dans ton HTML
        ticketLinesEl.innerHTML = '';
        if (!data.lines.length) {
            ticketLinesEl.innerHTML = '<li class="muted">Aucun billet</li>';
        } else {
            data.lines.forEach(l => {
                const li = document.createElement('li');
                li.className = 'cart-line is-sub';
                li.innerHTML = `<span>${l.qty} × ${l.label}</span><span>${fmt(l.lineTotal)}</span>`;
                ticketLinesEl.appendChild(li);
            });
        }
    }

    // ---------- Catalogue snacks ----------
    function renderCatalog() {
        Object.keys(catalog).forEach((cat) => {
            const items = catalog[cat] || [];
            const section = document.createElement('section');
            section.className = 'category-section';

            const h3 = document.createElement('h3');
            h3.textContent = cat;
            section.appendChild(h3);

            const grid = document.createElement('div');
            grid.className = 'grid';

            items.forEach((prod) => {
                const card = document.createElement('article');
                card.className = 'card';
                card.dataset.name = prod.nom;

                card.innerHTML = `
          <img src="${IMG_DIR}${prod.image}" alt="${prod.nom}" loading="lazy">
          <h4 class="product-name">${prod.nom}</h4>
          <p class="price">${fmt(prod.prix)}</p>

          <div class="card-controls">
            <button class="btn btn-remove" data-name="${prod.nom}" data-action="remove" aria-label="Diminuer ${prod.nom}" type="button">
              <img src="${MINUS_ICON}" alt="" aria-hidden="true">
            </button>
            <span class="qty" data-name="${prod.nom}" aria-live="polite">0</span>
            <button class="btn btn-add" data-name="${prod.nom}" data-action="add" aria-label="Augmenter ${prod.nom}" type="button">
              <img src="${PLUS_ICON}" alt="" aria-hidden="true">
            </button>
          </div>
        `;
                grid.appendChild(card);
            });

            section.appendChild(grid);
            shopSection?.appendChild(section);
        });

        // Délégation d’événements
        shopSection?.addEventListener('click', handleProductInteraction);
        btnClear?.addEventListener('click', clearCart);
        cartLinesEl?.addEventListener('click', handleCartLineClick);
    }

    // ---------- Interactions produits (+ / -) ----------
    function handleProductInteraction(event) {
        const btn = event.target.closest('.btn');
        if (!btn) return;

        const productName = btn.dataset.name;
        const product = findProductByName(productName);
        if (!product) return;

        const action = btn.dataset.action;
        if (action === 'add') addToCart(product);
        else if (action === 'remove') removeFromCart(product);
    }

    function findProductByName(name) {
        for (const category in catalog) {
            const product = (catalog[category] || []).find(p => p.nom === name);
            if (product) return product;
        }
        return null;
    }

    // ---------- Panier snacks ----------
    function addToCart(prod) {
        const item = cart.get(prod.nom) || {
            ...prod,
            qty: 0
        };
        item.qty += 1;
        cart.set(prod.nom, item);
        updateUI(prod.nom);
    }

    function removeFromCart(prod) {
        const item = cart.get(prod.nom);
        if (item) {
            item.qty -= 1;
            if (item.qty <= 0) cart.delete(prod.nom);
            updateUI(prod.nom);
        }
    }

    function clearCart() {
        cart.clear();
        updateUI();
    }

    function handleCartLineClick(e) {
        const trashBtn = e.target.closest('.cart-trash');
        if (!trashBtn) return;
        const name = trashBtn.dataset.name;
        cart.delete(name);
        updateUI();
    }

    // ---------- UI : tickets + snacks + total ----------
    let ticketsSnapshot = loadTickets();

    function calcSnackTotal() {
        let t = 0;
        cart.forEach(it => t += it.prix * it.qty);
        return +t.toFixed(2);
    }

    function saveCartLS() {
        try {
            const all = JSON.parse(localStorage.getItem('pathe_cart_snacks') || '{}');
            const obj = {};
            cart.forEach((v, k) => obj[k] = {
                prix: v.prix,
                qty: v.qty,
                image: v.image,
                points: v.points || 0
            });
            all[seanceKey] = obj;
            localStorage.setItem('pathe_cart_snacks', JSON.stringify(all));
        } catch {}
    }

    function restoreCartLS() {
        try {
            const all = JSON.parse(localStorage.getItem('pathe_cart_snacks') || '{}');
            const obj = all[seanceKey] || {};
            Object.entries(obj).forEach(([name, v]) => {
                cart.set(name, {
                    nom: name,
                    prix: (v.prix || 0),
                    image: v.image || '',
                    points: v.points || 0,
                    qty: (v.qty || 0)
                });
            });
        } catch {}
    }

    function updateUI(productName = null) {
        // Met à jour la quantité sur la carte ciblée
        if (productName) {
            const qtyEl = $(`.qty[data-name="${productName}"]`);
            if (qtyEl) qtyEl.textContent = cart.get(productName)?.qty ?? 0;
        }

        // Reconstruit la liste panier SNACKS
        if (cartLinesEl) {
            cartLinesEl.innerHTML = '';
            cart.forEach((item) => {
                const line = document.createElement('li');
                line.className = 'cart-line';
                line.dataset.name = item.nom;
                line.innerHTML = `
          <span>${item.qty} × ${item.nom}</span>
          <span>${fmt(item.prix * item.qty)}</span>
          <button class="cart-trash" data-name="${item.nom}" aria-label="Retirer ${item.nom}" type="button">
            <img src="${TRASH_ICON}" alt="" aria-hidden="true">
          </button>`;
                cartLinesEl.appendChild(line);
            });
        }

        // Total global = billets + snacks
        const total = +((ticketsSnapshot.total || 0) + calcSnackTotal()).toFixed(2);
        basketTotalEl && (basketTotalEl.textContent = fmt(total));

        // État du bouton Continuer
        const isEmpty = cart.size === 0 && (!ticketsSnapshot || !ticketsSnapshot.count);
        btnContinue?.classList.toggle('is-disabled', isEmpty);
        btnContinue?.setAttribute('aria-disabled', String(isEmpty));

        // Met à jour toutes les pastilles qty si pas ciblé
        if (!productName) {
            $$('.qty').forEach(el => {
                const name = el.dataset.name;
                el.textContent = cart.get(name)?.qty ?? 0;
            });
        }

        // Persiste panier snacks
        saveCartLS();

        // Prépare l’URL de la suite (paiement) avec cumul total
        // Récupère les informations du film depuis l'URL actuelle
        const qp = new URLSearchParams(location.search);
        const film = qp.get('film');
        const salle = qp.get('salle');
        const langue = qp.get('langue');
        const seance = qp.get('seance');
        const poster = qp.get('poster');
        const format = qp.get('format');
        const seats = qp.get('seats')?.split(',') || [];

        if (btnContinue && !isEmpty) {
            const qs = new URLSearchParams({
                film: film || '',
                salle: salle || '',
                langue: langue || '',
                seance: seance || '',
                poster: poster || '',
                format: format || '',
                seats: seats.join(','),
                total: String(total)
            });
            if (ticketsSnapshot?.tarifs) qs.set('tarifs', JSON.stringify(ticketsSnapshot.tarifs));
            if (ticketsSnapshot?.promo) qs.set('promo', ticketsSnapshot.promo);
            btnContinue.href = `./paiement.html?${qs.toString()}`;
        } else if (btnContinue) {
            btnContinue.href = '#';
        }
    }
    // ---------- Boot ----------
    async function boot() {
        // 0) Hydratation de la colonne de gauche (NEW)
        await hydrateLeftColumn(qp);

        // 1) Billets
        ticketsSnapshot = loadTickets();
        renderTicketLines(ticketsSnapshot);

        // 2) Catalogue snacks
        try {
            const res = await fetch(PATH_JSON);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            catalog = await res.json();
        } catch (err) {
            shopSection && (shopSection.innerHTML = `<p class="empty">Impossible de charger les snacks.</p>`);
            console.error(err);
        }

        // 3) Rendu + restauration panier
        renderCatalog();
        restoreCartLS();

        // 4) Maj initiale
        updateUI();

        // 5) Bouton "Changer de film"
        $('#changeFilmBtn')?.addEventListener('click', () => {
            location.href = './catalogue.html';
        });
    }

    boot();
})();