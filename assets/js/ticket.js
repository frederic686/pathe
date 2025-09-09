(() => {
  // Utilitaires
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const fmtEUR = (n) =>
    Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

  // --- Params URL (fallbacks propres)
  const qp = new URLSearchParams(location.search);
  const film   = qp.get("film")   || "Film";
  const salle  = qp.get("salle")  || "—";
  const seance = qp.get("seance") || "—:—";
  const langue = qp.get("langue") || "—";
  const seats  = (qp.get("seats") || "").trim();
  const total  = qp.get("total")  || "0.00";

  // ---------------------------------------------------------
  // [COMMUN] Hydratation de la colonne gauche
  // ---------------------------------------------------------
  async function hydrateLeftColumn(params) {
    const posterQP = params.get("poster") || "";
    const filmQP   = params.get("film")   || "Film";
    const salleQP  = params.get("salle")  || "—";
    const seanceQP = params.get("seance") || "—:—";
    const langueQP = params.get("langue") || "—";
    const finQP    = params.get("end")    || ""; // <- corrigé (au lieu de 'end')

    const leftPane     = document.querySelector(".left");
    const posterEl     = document.querySelector("#filmPoster");
    const titleEl      = document.querySelector("#filmTitle");
    const seanceTimeEl = document.querySelector("#seanceTime");
    const seanceEndEl  = document.querySelector("#seanceEnd");
    const seanceLangEl = document.querySelector("#seanceLang");
    const roomNoEl     = document.querySelector("#roomNo");

    // Affiche + fond : on normalise le fichier s'il vient d'une URL
    const posterFile = posterQP ? posterQP.split("/").pop() : "";

    if (posterEl) {
      // chemin assets cohérent avec ton CSS/HTML
      posterEl.src = `../assets/images/FILMS/${posterFile || "placeholder.jpg"}`;
      posterEl.alt = `Affiche : ${filmQP}`;
    }
    if (leftPane) {
      // le CSS lit --left-bg via .left::before
      const bgPath = posterFile ? `../images/FILMS/${posterFile}` : "";
      leftPane.style.setProperty("--left-bg", bgPath ? `url("${bgPath}")` : "none");
    }

    // Textes
    if (titleEl)      titleEl.textContent = filmQP;
    if (roomNoEl)     roomNoEl.textContent = `Salle ${salleQP}`;
    if (seanceTimeEl) seanceTimeEl.textContent = seanceQP;
    if (seanceLangEl) seanceLangEl.textContent = langueQP;

    // Heure de fin
    if (seanceEndEl) {
      if (finQP) {
        seanceEndEl.textContent = `Fin prévue à ${finQP}`;
      } else {
        try {
          const res  = await fetch("../data/films.json");
          const list = await res.json();
          const f    = list.find((x) => x.titre === filmQP);
          const s    = f?.séances?.find(
            (x) => String(x.salle) === String(salleQP) && x.horaire === seanceQP
          );
          seanceEndEl.textContent = s?.fin ? `Fin prévue à ${s.fin}` : "Fin prévue —:—";
        } catch (err) {
          console.error("Erreur lors de la récupération de la fin de séance", err);
          seanceEndEl.textContent = "Fin prévue —:—";
        }
      }
    }
  }

  // Appel
  hydrateLeftColumn(qp);

  // ---------------------------------------------------------
  // Ticket (colonne droite)
  // ---------------------------------------------------------
  if ($("#movie-title"))     $("#movie-title").textContent = film;
  if ($("#session-time"))    $("#session-time").textContent = seance;
  if ($("#session-version")) $("#session-version").textContent = langue;
  if ($("#room-number"))     $("#room-number").textContent = salle;

  // Sièges : on espace proprement "8H,9H" -> "8H, 9H"
  const seatsPretty =
    seats && seats.includes(",")
      ? seats.split(",").map((s) => s.trim()).join(", ")
      : seats || "—";
  if ($("#seat-numbers")) $("#seat-numbers").textContent = seatsPretty;

  // Total
  if ($("#total-price")) $("#total-price").textContent = fmtEUR(parseFloat(total));


  // ---------------------------------------------------------
  // Reset storage sur liens Accueil
  // ---------------------------------------------------------
  const homeLinkBreadcrumb = $("#homeLinkBreadcrumb");
  const homeLinkHeader     = $("#homeLinkHeader");
  const clearAll = () => localStorage.clear();

  if (homeLinkBreadcrumb) homeLinkBreadcrumb.addEventListener("click", clearAll);
  if (homeLinkHeader)     homeLinkHeader.addEventListener("click", clearAll);

})();
