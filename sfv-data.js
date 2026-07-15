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
    return localStorage.getItem(LS_TOKEN) || window.SFV_ADMIN_TOKEN || '';
  }
  function isRemote() { return !!base(); }

  function uid() {
    return 'loc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function sortItems(arr) {
    return (arr || []).slice().sort(function (a, b) {
      return (a.ordine == null ? 999 : a.ordine) - (b.ordine == null ? 999 : b.ordine);
    });
  }

  async function list() {
    if (isRemote()) {
      try {
        var r = await fetch(base() + '/api/locandine', { cache: 'no-store' });
        if (r.ok) {
          var data = await r.json();
          return sortItems(Array.isArray(data) ? data : []);
        }
      } catch (e) { /* cade in demo sotto */ }
    }
    try {
      var raw = localStorage.getItem(LS_DATA);
      return sortItems(raw ? JSON.parse(raw) : []);
    } catch (e) { return []; }
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

  async function uploadImage(file) {
    var dataUrl = await fileToDataUrl(file);
    if (isRemote()) {
      var r = await fetch(base() + '/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
        body: JSON.stringify({ name: file.name, dataUrl: dataUrl })
      });
      if (r.status === 401 || r.status === 403) throw new Error('Password non valida.');
      if (!r.ok) throw new Error('Caricamento immagine non riuscito.');
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
      throw new Error('Caricamento non riuscito.');
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

  function setToken(t) { localStorage.setItem(LS_TOKEN, t || ''); }
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
    setToken: setToken,
    getToken: getToken,
    newId: uid
  };
})();
