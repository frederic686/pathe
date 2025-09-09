  /* =========================================================
JAVASCRIPT CORRIGÉ (tarifs.html)
========================================================= */
(() => {
    const $ = (s, ctx = document) => ctx.querySelector(s);
    const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
    const fmtEUR = n => (n || 0).toLocaleString('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    });

    const qp = new URLSearchParams(location.search);
    const film = qp.get('film') || 'Film';
    const salle = qp.get('salle') || '—';
    const langue = qp.get('langue') || '—';
    const seance = qp.get('seance') || '';
    const endQP = qp.get('end') || '';
    const posterParam = qp.get('poster') || '';
    const format = qp.get('format') || '';
    const seatsStr = (qp.get('seats') || '').trim();
    const seats = seatsStr ? seatsStr.split(',').filter(Boolean) : [];
    const seatsCount = seats.length;

    const LS_MAIN = 'pathe_reservation';
    const seanceKey = `${film}|${salle}|${seance}`;

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
    
    // Appel de la fonction harmonisée
    hydrateLeftColumn(qp);

    $('#changeFilmBtn')?.addEventListener('click', () => {
        location.href = './catalogue.html';
    });

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

    const state = {
        qty: {
            MATIN: 0,
            U14: 0
        },
        total: 0,
    };

    const seatsHintEl = $('#seatsHint');
    const linesEl = $('#basketLines');
    const totalEl = $('#basketTotal');
    const noteEl = $('#totalNote');
    const btnCta = $('#btnContinue');
    const footerTotalEl = $('#basketTotalFooter');

    const totalTickets = () => Object.values(state.qty).reduce((a, b) => a + b, 0);

    function updateSeatHint() {
        const t = totalTickets();
        if (seatsCount > 0) {
            seatsHintEl.textContent = `Billets à sélectionner : ${t}/${seatsCount}`;
        } else {
            seatsHintEl.textContent = t > 0 ? `Billets sélectionnés : ${t}` : `Sélectionnez au moins un billet`;
        }
    }

    function updateStepperAvailability() {
        $$('.tarif-item .plus').forEach(btn => btn.disabled = false);
    }

    function buildTicketsLines() {
        const out = [];
        for (const [code, q] of Object.entries(state.qty)) {
            const p = PRICES[code];
            if (!p || !q) continue;
            out.push({
                code,
                label: p.label,
                qty: q,
                lineTotal: +(q * p.price).toFixed(2)
            });
        }
        return out;
    }

    function setCTAEnabled() {
        const qs = new URLSearchParams({
            film,
            salle,
            langue,
            seance,
            end: endQP || '',
            poster: posterParam || '',
            format: format || '',
            seats: seats.join(','),
            total: String(state.total)
        });

        const ticketsDetails = buildTicketsLines();
        if (ticketsDetails.length > 0) {
            qs.set('tarifs', JSON.stringify(state.qty)); // Correction ici : passer le state.qty complet
        }

        const ticketsCount = totalTickets();
        const seatsMatch = seatsCount === 0 || ticketsCount === seatsCount;

        if (ticketsCount > 0 && seatsMatch) {
            btnCta.classList.toggle('is-disabled', false);
            btnCta.setAttribute('aria-disabled', "false");
            btnCta.href = `./snacks.html?${qs.toString()}`;
        } else {
            btnCta.classList.toggle('is-disabled', true);
            btnCta.setAttribute('aria-disabled', "true");
            btnCta.href = '#';
        }
    }


    function persist() {
        try {
            const all = JSON.parse(localStorage.getItem(LS_MAIN) || '{}');
            all[seanceKey] = {
                ...(all[seanceKey] || {}),
                film,
                salle,
                langue,
                seance,
                poster: posterParam,
                format,
                seats,
                tarifs: {
                    ...state.qty
                },
                total: state.total,
                tickets: {
                    lines: buildTicketsLines(),
                    total: state.total,
                    count: totalTickets()
                }
            };
            localStorage.setItem(LS_MAIN, JSON.stringify(all));
        } catch {}
    }

    function renderBasket() {
        linesEl.innerHTML = '';
        const entries = Object.entries(state.qty).filter(([, q]) => q > 0);
        if (!entries.length) {
            linesEl.innerHTML = `<li class="muted">Aucun tarif sélectionné</li>`;
        } else {
            for (const [code, q] of entries) {
                const {
                    label,
                    price
                } = PRICES[code];
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="line-left"><strong>${q}×</strong> ${label}</div>
                    <div class="line-price">${fmtEUR(q * price)}</div>
                `;
                linesEl.appendChild(li);
            }
        }

        let total = 0;
        for (const [code, q] of Object.entries(state.qty)) {
            total += q * (PRICES[code]?.price || 0);
        }
        state.total = Math.round(total * 100) / 100;
        if (totalEl) totalEl.textContent = fmtEUR(state.total);
        if (footerTotalEl) footerTotalEl.textContent = fmtEUR(state.total);

        updateSeatHint();
        updateStepperAvailability();
        if (noteEl) {
            noteEl.textContent = seatsCount > 0 ? `Billets : ${totalTickets()}/${seatsCount}` : '';
        }
        setCTAEnabled();
        persist();
    }

    $$('.tarif-item').forEach(item => {
        const code = item.dataset.code;
        const qtyEl = item.querySelector('.qty');
        const btnMinus = item.querySelector('.minus');
        const btnPlus = item.querySelector('.plus');
        const sync = () => {
            state.qty[code] = state.qty[code] || 0;
            qtyEl.textContent = state.qty[code];
            renderBasket();
        };
        btnMinus.addEventListener('click', () => {
            if (state.qty[code] > 0) {
                state.qty[code] = state.qty[code] - 1;
                sync();
            }
        });
        btnPlus.addEventListener('click', () => {
            state.qty[code] = (state.qty[code] || 0) + 1;
            sync();
        });
    });

    $('#editSeatsBtn')?.addEventListener('click', () => {
        const qs = new URLSearchParams({
            film,
            salle,
            langue,
            seance,
            end: endQP || '',
            poster: posterParam || '',
            format: format || '',
            seats: seats.join(',')
        });
        location.href = `./salle.html?${qs.toString()}`;
    });

    renderBasket();
})();