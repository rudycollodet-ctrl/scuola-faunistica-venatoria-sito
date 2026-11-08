/* ============================================================
   SFVData — livello dati per le locandine.
   Funziona in due modalità (automatico):
   - REMOTA: se SFV_API_BASE è impostato -> legge/scrive sul
     backend Vercel (visibile a tutti, in tempo reale).
   - DEMO: se SFV_API_BASE è vuoto -> usa il browser locale
     (localStorage), utile per provare senza pubblicare.

   Contratto API (backend Vercel):
     GET  {base}/api/locandine            -> [ {locandina}, ... ]
     PUT  {base}/api/locandine            -> body: array intero
            header: Authorization: Bearer <token>
     POST {base}/api/upload               -> body JSON {name, dataUrl}
            header: Authorization: Bearer <token>
            risposta: { url: "https://..." }

   Modello locandina:
     { id, titolo, data, sede, descrizione, link, stato, immagine, ordine }
   ============================================================ */
(function () {
  var LS_DATA = 'sfv:locandine:data';
  var LS_REVIEWS = 'sfv:recensioni:data';
  var LS_TOKEN = 'sfv:admin:token';

  function base() {
    return (window.SFV_API_BASE || '').replace(/\/+$/, '');
  }
  function token() {
    return sessionStorage.getItem(LS_TOKEN) || '';
  }
  function isRemote() { return !!base(); }

  function uid() {
    return 'loc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  // Locandine fisse: restano sempre visibili sul sito, anche se l'archivio
  // del pannello non e' disponibile. Le immagini stanno nella cartella /locandine.
  var LOCANDINE_FISSE = [
    { id: 'corsi-caccia-veneto', ordine: -3, stato: 'Iscrizioni aperte',
      titolo: 'Corsi di caccia — Licenza',
      data: '', sede: 'Vittorio Veneto · Valdobbiadene · Tezze di Piave',
      descrizione: "Preparazione completa per l'esame di caccia: lezioni teoriche, prove pratiche, materiale didattico, simulazioni d'esame, biologia, normative e riconoscimento della fauna.",
      link: 'https://iscrizione-corsi-sfv-2026-nuovo.netlify.app/',
      immagine: 'locandine/corsi-caccia-veneto-2027.jpg' },
    { id: 'corso-zona-alpi', ordine: -2, stato: 'Iscrizioni aperte',
      titolo: 'Corso abilitazione Zona faunistica delle Alpi',
      data: '', sede: 'Tezze di Piave · Valdobbiadene · Vittorio Veneto',
      descrizione: "Abilitazione alla caccia in Zona faunistica delle Alpi, valida per tutto il Veneto: teoria in aula, pratica sul territorio, docenti qualificati e supporto per tutto il percorso.",
      link: 'https://iscrizione-corsi-sfv-2026-nuovo.netlify.app/',
      immagine: 'locandine/manifesto-corso-faunistico.jpg' },
    { id: 'piattaforma-e-learning', ordine: -1, stato: 'Novità',
      titolo: 'Piattaforma e-learning',
      data: 'Dirette online: Licenza il lunedì · Zona Alpi il mercoledì', sede: 'Online',
      descrizione: "Corsi completi a norma ISPRA: videolezioni per tutte le materie, quiz ufficiali per provincia, chat con la scuola e attestati verificabili. In autonomia o a supporto dei corsi in presenza.",
      link: 'https://nuova-piattaforma-corsi-scuola-faun.vercel.app/',
      immagine: 'locandine/locandina-sfv.jpg' }
  ];

  function conFisse(items) {
    var ids = {};
    (items || []).forEach(function (x) { if (x && x.id) ids[x.id] = true; });
    return LOCANDINE_FISSE.filter(function (x) { return !ids[x.id]; })
      .map(function (x) { return Object.assign({}, x); })
      .concat(sortItems(items));
  }

  function sortItems(arr) {
    return (arr || []).slice().sort(function (a, b) {
      return (a.ordine == null ? 999 : a.ordine) - (b.ordine == null ? 999 : b.ordine);
    });
  }

  // opts.strict (pannello): se il server non risponde lancia un errore invece
  // di restituire un elenco vuoto, cosi' non si rischia di salvare "zero locandine".
  async function list(opts) {
    var strict = !!(opts && opts.strict);
    if (isRemote()) {
      try {
        var r = await fetch(base() + '/api/locandine' + (strict ? '?fresco=1' : ''), { cache: 'no-store' });
        if (r.ok) {
          var data = await r.json();
          data = Array.isArray(data) ? data : [];
          return strict ? sortItems(data) : conFisse(data);
        }
        if (strict) {
          var det = '';
          try { var j = await r.json(); det = j && j.error ? j.error : ''; } catch (e2) {}
          throw new Error(det || ('Server non disponibile (' + r.status + ').'));
        }
      } catch (e) {
        if (strict) throw e;
        /* sito pubblico: cade in demo sotto */
      }
    }
    var locali = [];
    try {
      var raw = localStorage.getItem(LS_DATA);
      locali = raw ? JSON.parse(raw) : [];
    } catch (e) { locali = []; }
    return strict ? sortItems(locali) : conFisse(locali);
  }

  async function save(items) {
    var clean = sortItems(items).map(function (it, i) {
      it.ordine = i;
      if (!it.id) it.id = uid();
      return it;
    });
    if (isRemote()) {
      var r = await fetch(base() + '/api/locandine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
        body: JSON.stringify(clean)
      });
      if (r.status === 401 || r.status === 403) throw new Error('Password non valida.');
      if (!r.ok) throw new Error('Salvataggio non riuscito (' + r.status + ').');
      return true;
    }
    localStorage.setItem(LS_DATA, JSON.stringify(clean));
    return true;
  }

  function fileToDataUrl(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  // Ridimensiona e comprime l'immagine nel browser: le locandine restano
  // nitide ma il file resta ben sotto il limite di invio del server.
  function shrinkImage(file, maxSide, quality) {
    return new Promise(function (res) {
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var w = img.naturalWidth, h = img.naturalHeight;
          var scale = Math.min(1, maxSide / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale));
          var ch = Math.max(1, Math.round(h * scale));
          var c = document.createElement('canvas');
          c.width = cw; c.height = ch;
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cw, ch);
          ctx.drawImage(img, 0, 0, cw, ch);
          try { res(c.toDataURL('image/jpeg', quality)); }
          catch (e) { res(fr.result); }
        };
        img.onerror = function () { res(fr.result); };
        img.src = fr.result;
      };
      fr.onerror = function () { res(''); };
      fr.readAsDataURL(file);
    });
  }

  async function uploadImage(file) {
    var dataUrl = await shrinkImage(file, 1600, 0.82);
    if (!dataUrl) dataUrl = await fileToDataUrl(file);
    // se ancora troppo pesante, riduco ulteriormente
    if (dataUrl.length > 3200000) dataUrl = await shrinkImage(file, 1200, 0.72);
    if (dataUrl.length > 3200000) dataUrl = await shrinkImage(file, 900, 0.65);
    if (isRemote()) {
      var r = await fetch(base() + '/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
        body: JSON.stringify({ name: (file.name || 'locandina').replace(/\.[^.]+$/, '') + '.jpg', dataUrl: dataUrl })
      });
      if (r.status === 401 || r.status === 403) throw new Error('Password non valida.');
      if (!r.ok) {
        var det = '';
        try { var e1 = await r.json(); det = e1 && e1.error ? e1.error : ''; }
        catch (e2) { try { det = await r.text(); } catch (e3) {} }
        if (r.status === 413) throw new Error('Immagine troppo grande anche dopo la compressione. Prova con una foto piu leggera.');
        throw new Error('Caricamento immagine non riuscito (' + r.status + '). ' + (det || 'Nessun dettaglio dal server.'));
      }
      var j = await r.json();
      return j.url;
    }
    // demo: l'immagine resta come dataURL nel browser
    return dataUrl;
  }

  /* ---------- RECENSIONI ----------
     Modello: { id, nome, titolo, testo, corso, stato:'pending'|'approved', creata }
     - Il cliente invia una recensione dal sito -> stato 'pending' (in attesa).
     - L'amministratore la approva dal pannello -> stato 'approved' (verificata) e appare sul sito.
  */

  function sortByDateDesc(arr) {
    return (arr || []).slice().sort(function (a, b) {
      return (b.creata || 0) - (a.creata || 0);
    });
  }

  // Pubblico: solo recensioni approvate (verificate).
  async function listReviews() {
    if (isRemote()) {
      try {
        var r = await fetch(base() + '/api/recensioni', { cache: 'no-store' });
        if (r.ok) { var d = await r.json(); return sortByDateDesc(Array.isArray(d) ? d : []); }
      } catch (e) {}
    }
    try {
      var raw = localStorage.getItem(LS_REVIEWS);
      var all = raw ? JSON.parse(raw) : [];
      return sortByDateDesc(all.filter(function (x) { return x.stato === 'approved'; }));
    } catch (e) { return []; }
  }

  // Admin: tutte le recensioni (comprese quelle in attesa).
  async function listReviewsAll() {
    if (isRemote()) {
      var r = await fetch(base() + '/api/recensioni?all=1', {
        cache: 'no-store',
        headers: { 'Authorization': 'Bearer ' + token() }
      });
      if (r.status === 401 || r.status === 403) throw new Error('Password non valida.');
      if (r.ok) { var d = await r.json(); return sortByDateDesc(Array.isArray(d) ? d : []); }
      var det2 = '';
      try { var j2 = await r.json(); det2 = j2 && j2.error ? j2.error : ''; } catch (e3) {}
      throw new Error(det2 || 'Caricamento non riuscito.');
    }
    try {
      var raw = localStorage.getItem(LS_REVIEWS);
      return sortByDateDesc(raw ? JSON.parse(raw) : []);
    } catch (e) { return []; }
  }

  // Pubblico: invia una nuova recensione (resta in attesa di approvazione).
  async function submitReview(data) {
    var review = {
      id: 'rec-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      nome: (data.nome || '').trim(),
      titolo: (data.titolo || '').trim(),
      testo: (data.testo || '').trim(),
      corso: (data.corso || '').trim(),
      stato: 'pending',
      creata: Date.now()
    };
    if (isRemote()) {
      var r = await fetch(base() + '/api/recensioni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review)
      });
      if (!r.ok) throw new Error('Invio non riuscito.');
      return true;
    }
    try {
      var raw = localStorage.getItem(LS_REVIEWS);
      var all = raw ? JSON.parse(raw) : [];
      all.push(review);
      localStorage.setItem(LS_REVIEWS, JSON.stringify(all));
      return true;
    } catch (e) { throw new Error('Invio non riuscito.'); }
  }

  // Admin: salva l'intero elenco (dopo approvazione/eliminazione).
  async function saveReviews(items) {
    if (isRemote()) {
      var r = await fetch(base() + '/api/recensioni', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
        body: JSON.stringify(items)
      });
      if (r.status === 401 || r.status === 403) throw new Error('Password non valida.');
      if (!r.ok) throw new Error('Salvataggio non riuscito.');
      return true;
    }
    localStorage.setItem(LS_REVIEWS, JSON.stringify(items));
    return true;
  }

  async function verifyPassword(password) {
    if (!base()) return false;
    var r = await fetch(base() + '/api/verifica', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    });
    return r.ok;
  }

  function setToken(t) {
    localStorage.removeItem(LS_TOKEN); // pulisce la copia delle vecchie versioni
    sessionStorage.setItem(LS_TOKEN, t || '');
  }
  function getToken() { return token(); }

  window.SFVData = {
    list: list,
    save: save,
    uploadImage: uploadImage,
    listReviews: listReviews,
    listReviewsAll: listReviewsAll,
    submitReview: submitReview,
    saveReviews: saveReviews,
    isRemote: isRemote,
    verifyPassword: verifyPassword,
    setToken: setToken,
    getToken: getToken,
    newId: uid
  };
})();
