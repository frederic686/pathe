
/*
// avnt 11H30 06/09/2025

(() => {
  const $  = (s, ctx=document) => ctx.querySelector(s);
  const $$ = (s, ctx=document) => [...ctx.querySelectorAll(s)];
  const fmtEUR = n => n.toLocaleString('fr-FR',{style:'currency',currency:'EUR'});

  // ====== Récup params pour la colonne gauche + total
  const qp = new URLSearchParams(location.search);
  const film   = qp.get('film')   || 'Titre du film';
  const poster = qp.get('poster') || '../assets/images/affiches/placeholder.jpg';
  const salle  = qp.get('salle')  || '—';
  const heure  = qp.get('seance') || '--:--';
  const langue = qp.get('langue') || '—';
  const fin    = qp.get('fin')    || '—:—';
  const total  = Number(qp.get('total')) || 30.30;

  $('#filmTitle').textContent  = film;
  $('#filmPoster').src         = poster;
  $('#roomBadge').textContent  = 'Salle ' + salle;
  $('#seanceTime').textContent = heure;
  $('#seanceLang').textContent = langue;
  $('#seanceEnd').textContent  = 'Fin prévue à ' + fin;
  $('#totalAmount').textContent = fmtEUR(total);

  // ====== Accordéon
  const items = $$('#payMethods .ac-item');
  items.forEach(item=>{
    const head = $('.ac-head', item);
    const body = $('.ac-body', item);
    const openOne = () => {
      items.forEach(i=>{
        const h=$('.ac-head',i), b=$('.ac-body',i);
        const on = i===item;
        i.classList.toggle('open', on);
        h.setAttribute('aria-expanded', String(on));
        b.style.maxHeight = on ? (b.scrollHeight+'px') : '0px';
      });
    };
    if(item.classList.contains('open')) body.style.maxHeight = body.scrollHeight+'px';
    head.addEventListener('click', openOne);
    head.addEventListener('keydown', e=>{
      if(e.key===' '||e.key==='Enter'){ e.preventDefault(); openOne(); }
    });
  });

  // ====== Masques + détection marque carte (16 chiffres, pas de Luhn)
  const numberInput = $('#cc-number');
  const expInput    = $('#cc-exp');
  const cvcInput    = $('#cc-cvc');
  const brandRow    = $('#brandRow');

  numberInput?.addEventListener('input',(e)=>{
    // garde uniquement les chiffres et limite à 16
    let v = e.target.value.replace(/\D/g,'').slice(0,16);

    // format par groupe de 4
    e.target.value = v.replace(/(.{4})/g,'$1 ').trim();

    // détection simple de la marque
    let brand='cb';
    if(/^4/.test(v)) brand='visa';
    else if(/^(5[1-5]|2[2-7])/.test(v)) brand='mc';
    else if(/^3[47]/.test(v)) brand='amex'; // sera refusé au "Continuer" si != 16

    const logos = {
      cb:   '../assets/images/LOGO/cb.png',
      visa: '../assets/images/LOGO/visa.webp',
      mc:   '../assets/images/LOGO/mastercard.png',
      amex: '../assets/images/LOGO/amex.jpg'
    };
    brandRow.innerHTML = v ? `<img class="logo" src="${logos[brand]}" alt="${brand.toUpperCase()}">` : '';

    // feedback visuel : vert uniquement à 16 chiffres, jamais de rouge ici
    e.target.classList.remove('valid','invalid');
    if (v.length === 16) e.target.classList.add('valid');
  });

  expInput?.addEventListener('input',(e)=>{
    let v=e.target.value.replace(/\D/g,'').slice(0,4);
    if (v.length>=3) v=v.slice(0,2)+'/'+v.slice(2);
    e.target.value=v;
    e.target.classList.remove('valid','invalid');
    if (v.length===5) e.target.classList.add(validExpiry(v)?'valid':'invalid');
  });

  cvcInput?.addEventListener('input',(e)=>{
    e.target.value=e.target.value.replace(/\D/g,'').slice(0,4);
    e.target.classList.remove('valid','invalid');
    if(e.target.value.length>=3) e.target.classList.add('valid');
  });

  function validExpiry(mmYY){
    const [mm,yy]=mmYY.split('/').map(n=>parseInt(n,10));
    if(!mm||mm<1||mm>12) return false;
    const now=new Date(), y=2000+yy, m=mm-1;
    const exp=new Date(y,m+1,1);
    return exp>now;
  }

  // Démo boutons
  $('#btnGpay')?.addEventListener('click', ()=> alert('Simulation Google Pay : redirection…'));

  $('#btnContinue').addEventListener('click', ()=>{
    const active = document.querySelector('.ac-item.open')?.dataset.method;
    if(active==='card'){
      const raw = numberInput.value.replace(/\s+/g,''); // chiffres seuls

      // Exiger exactement 16 chiffres
      if(raw.length !== 16){
        numberInput.classList.remove('valid');
        numberInput.classList.add('invalid'); // rouge seulement au submit si ce n'est pas 16
        numberInput.focus();
        return;
      }

      if(!validExpiry(expInput.value)) { expInput.classList.add('invalid'); expInput.focus(); return; }
      if(cvcInput.value.length<3)      { cvcInput.classList.add('invalid'); cvcInput.focus(); return; }

      alert('Paiement carte prêt à être soumis (démo).');
    } else if(active==='gpay'){
      alert('Google Pay sélectionné (démo).');
    }
    // location.href = './recap.html?total='+total.toFixed(2);
  });
})();

*/


/* =========================================================
   ticket.js – Récup params & hydratation du ticket
   Attendu dans l'URL : film, poster, salle, seance, langue, fin, seats, total
   ========================================================= */
(() => {
  const $  = (s, ctx=document) => ctx.querySelector(s);
  const $$ = (s, ctx=document) => [...ctx.querySelectorAll(s)];
  const fmtEUR = n => n.toLocaleString('fr-FR',{style:'currency',currency:'EUR'});

  // ====== Récup params pour la colonne gauche + total
  const qp = new URLSearchParams(location.search);
  const film   = qp.get('film')   || 'Titre du film';
  const poster = qp.get('poster') || '../assets/images/affiches/placeholder.jpg';
  const salle  = qp.get('salle')  || '—';
  const heure  = qp.get('seance') || '--:--';
  const langue = qp.get('langue') || '—';
  const fin    = qp.get('fin')    || '—:—';
  const total  = Number(qp.get('total')) || 30.30;
  // 👇 NEW : sièges (compat "places")
  const seats  = qp.get('seats') || qp.get('places') || '';

  $('#filmTitle').textContent  = film;
  $('#filmPoster').src         = poster;
  $('#roomBadge').textContent  = 'Salle ' + salle;
  $('#seanceTime').textContent = heure;
  $('#seanceLang').textContent = langue;
  $('#seanceEnd').textContent  = 'Fin prévue à ' + fin;
  $('#totalAmount').textContent = fmtEUR(total);

  // ====== Accordéon
  const items = $$('#payMethods .ac-item');
  items.forEach(item=>{
    const head = $('.ac-head', item);
    const body = $('.ac-body', item);
    const openOne = () => {
      items.forEach(i=>{
        const h=$('.ac-head',i), b=$('.ac-body',i);
        const on = i===item;
        i.classList.toggle('open', on);
        h.setAttribute('aria-expanded', String(on));
        b.style.maxHeight = on ? (b.scrollHeight+'px') : '0px';
      });
    };
    if(item.classList.contains('open')) body.style.maxHeight = body.scrollHeight+'px';
    head.addEventListener('click', openOne);
    head.addEventListener('keydown', e=>{
      if(e.key===' '||e.key==='Enter'){ e.preventDefault(); openOne(); }
    });
  });

  // ====== Masques + détection marque carte (16 chiffres, pas de Luhn)
  const numberInput = $('#cc-number');
  const expInput    = $('#cc-exp');
  const cvcInput    = $('#cc-cvc');
  const brandRow    = $('#brandRow');

  numberInput?.addEventListener('input',(e)=>{
    // garde uniquement les chiffres et limite à 16
    let v = e.target.value.replace(/\D/g,'').slice(0,16);

    // format par groupe de 4
    e.target.value = v.replace(/(.{4})/g,'$1 ').trim();

    // détection simple de la marque
    let brand='cb';
    if(/^4/.test(v)) brand='visa';
    else if(/^(5[1-5]|2[2-7])/.test(v)) brand='mc';
    else if(/^3[47]/.test(v)) brand='amex'; // sera refusé au "Continuer" si != 16

    const logos = {
      cb:   '../assets/images/LOGO/cb.png',
      visa: '../assets/images/LOGO/visa.webp',
      mc:   '../assets/images/LOGO/mastercard.png',
      amex: '../assets/images/LOGO/amex.jpg'
    };
    brandRow.innerHTML = v ? `<img class="logo" src="${logos[brand]}" alt="${brand.toUpperCase()}">` : '';

    // feedback visuel : vert uniquement à 16 chiffres, jamais de rouge ici
    e.target.classList.remove('valid','invalid');
    if (v.length === 16) e.target.classList.add('valid');
  });

  expInput?.addEventListener('input',(e)=>{
    let v=e.target.value.replace(/\D/g,'').slice(0,4);
    if (v.length>=3) v=v.slice(0,2)+'/'+v.slice(2);
    e.target.value=v;
    e.target.classList.remove('valid','invalid');
    if (v.length===5) e.target.classList.add(validExpiry(v)?'valid':'invalid');
  });

  cvcInput?.addEventListener('input',(e)=>{
    e.target.value=e.target.value.replace(/\D/g,'').slice(0,4);
    e.target.classList.remove('valid','invalid');
    if(e.target.value.length>=3) e.target.classList.add('valid');
  });

  function validExpiry(mmYY){
    const [mm,yy]=mmYY.split('/').map(n=>parseInt(n,10));
    if(!mm||mm<1||mm>12) return false;
    const now=new Date(), y=2000+yy, m=mm-1;
    const exp=new Date(y,m+1,1);
    return exp>now;
  }

  // 👇 NEW : redirection vers ticket.html avec TOUTES les infos
  function goToTicket(){
    const params = new URLSearchParams({
      film,
      poster,
      salle,
      seance: heure,
      langue,
      fin,
      seats,
      total: total.toFixed(2)
    });
    location.href = './ticket.html?' + params.toString();
  }

  // Démo boutons
  $('#btnGpay')?.addEventListener('click', ()=> goToTicket());

  $('#btnContinue').addEventListener('click', ()=>{
    const active = document.querySelector('.ac-item.open')?.dataset.method;
    if(active==='card'){
      const raw = numberInput.value.replace(/\s+/g,''); // chiffres seuls

      // Exiger exactement 16 chiffres
      if(raw.length !== 16){
        numberInput.classList.remove('valid');
        numberInput.classList.add('invalid'); // rouge seulement au submit si ce n'est pas 16
        numberInput.focus();
        return;
      }

      if(!validExpiry(expInput.value)) { expInput.classList.add('invalid'); expInput.focus(); return; }
      if(cvcInput.value.length<3)      { cvcInput.classList.add('invalid'); cvcInput.focus(); return; }

      // ✅ Paiement carte OK (démo) -> ticket
      goToTicket();
    } else if(active==='gpay'){
      // ✅ Google Pay sélectionné (démo) -> ticket
      goToTicket();
    } else {
      // ✅ fallback
      goToTicket();
    }
    // location.href = './recap.html?total='+total.toFixed(2);
  });
})();
