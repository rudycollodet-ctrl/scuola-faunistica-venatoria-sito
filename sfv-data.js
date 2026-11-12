/* ============================================================
   SFVData — livello dati del sito (locandine e recensioni).

   Dove stanno i dati: Firebase (progetto scuola-faunistica-venatoria),
   lo stesso di Area Formativa e gestionale, in raccolte separate:
     sito_locandine            locandine della sezione News
     sito_recensioni           recensioni pubblicate
     sito_recensioni_attesa    recensioni inviate, in attesa di verifica
     Storage: sito/locandine/  immagini delle locandine

   Chi legge e chi scrive:
   - Il sito pubblico legge da /api/locandine e /api/recensioni (server
     Vercel con cache di un minuto) e invia le recensioni a /api/recensioni.
   - Il pannello entra con l'account amministratore di Firebase (la stessa
     password della piattaforma e-learning e del gestionale) e scrive
     direttamente su Firebase. Le regole di sicurezza di Firebase permettono
     le modifiche solo all'amministratore.
   ============================================================ */
(function () {
  var PROJECT = 'scuola-faunistica-venatoria';
  var API_KEY = 'AIzaSyCH0NoAaZztDWvHUrEhb5D4QUjQE4om9Pk';
  var BUCKET = 'scuola-faunistica-venatoria.firebasestorage.app';
  var FS = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';
  var DOC_PREFIX = 'projects/' + PROJECT + '/databases/(default)/documents/';
  var ADMIN_EMAILS = ['scuolafaunisticavenatoria@gmail.com', 'admin@sfv.it'];
  var SS_AUTH = 'sfv:fb:auth';
  // Vecchio archivio Vercel (bloccato): serve solo per importare i dati una volta.
  var VECCHIO_ARCHIVIO = 'https://xat7ozsandfxgraa.public.blob.vercel-storage.com/data/';

  function base() {
    return (window.SFV_API_BASE || '').replace(/\/+$/, '');
  }
  function isRemote() { return !!base(); }

  function uid() {
    return 'loc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

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
  function sortByDateDesc(arr) {
    return (arr || []).slice().sort(function (a, b) { return (b.creata || 0) - (a.creata || 0); });
  }

  /* ---------- valori Firestore <-> JS ---------- */
  function daValore(v) {
    if (!v || typeof v !== 'object') return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return Date.parse(v.timestampValue);
    if ('nullValue' in v) return null;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(daValore);
    if ('mapValue' in v) return daCampi(v.mapValue.fields || {});
    return null;
  }
  function daCampi(f) { var o = {}; Object.keys(f || {}).forEach(function (k) { o[k] = daValore(f[k]); }); return o; }
  function aValore(x) {
    if (x === null || x === undefined) return { nullValue: null };
    if (typeof x === 'boolean') return { booleanValue: x };
    if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
    if (Array.isArray(x)) return { arrayValue: { values: x.map(aValore) } };
    if (typeof x === 'object') return { mapValue: { fields: aCampi(x) } };
    return { stringValue: String(x) };
  }
  function aCampi(o) { var f = {}; Object.keys(o || {}).forEach(function (k) { f[k] = aValore(o[k]); }); return f; }

  /* ---------- accesso amministratore (Firebase Authentication) ---------- */
  function leggiAuth() { try { return JSON.parse(sessionStorage.getItem(SS_AUTH) || 'null'); } catch (e) { return null; } }
  function scriviAuth(a) { try { if (a) sessionStorage.setItem(SS_AUTH, JSON.stringify(a)); else sessionStorage.removeItem(SS_AUTH); } catch (e) {} }

  async function erroreLeggibile(r) {
    try { var j = await r.json(); return (j && j.error && (j.error.message || j.error)) || ('errore ' + r.status); }
    catch (e) { return 'errore ' + r.status; }
  }

  async function sonoAdmin(a) {
    var r = await fetch(FS + '/admins/' + encodeURIComponent(a.uid), { headers: { Authorization: 'Bearer ' + a.idToken } });
    return r.ok;
  }

  // Entra con la password dell'amministratore. Restituisce true/false.
  async function login(password) {
    if (!password) return false;
    var ultimoErrore = '';
    for (var i = 0; i < ADMIN_EMAILS.length; i++) {
      var r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + API_KEY, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAILS[i], password: password, returnSecureToken: true })
      });
      if (r.ok) {
        var j = await r.json();
        var a = { uid: j.localId, email: j.email, idToken: j.idToken, refreshToken: j.refreshToken,
                  scade: Date.now() + (Number(j.expiresIn || 3600) - 120) * 1000 };
        if (await sonoAdmin(a)) { scriviAuth(a); return true; }
        ultimoErrore = 'Questo account non e\' amministratore.';
        continue;
      }
      ultimoErrore = await erroreLeggibile(r);
      if (/TOO_MANY_ATTEMPTS/.test(ultimoErrore)) throw new Error('Troppi tentativi: riprova tra qualche minuto.');
    }
    if (/non e' amministratore/.test(ultimoErrore)) throw new Error(ultimoErrore);
    return false;
  }

  function logout() { scriviAuth(null); }
  function isLogged() { return !!leggiAuth(); }

  // Token valido per le scritture (si rinnova da solo ogni ora).
  async function token() {
    var a = leggiAuth();
    if (!a) throw new Error('Accesso scaduto: rientra nel pannello.');
    if (Date.now() < a.scade) return a.idToken;
    var r = await fetch('https://securetoken.googleapis.com/v1/token?key=' + API_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(a.refreshToken)
    });
    if (!r.ok) { scriviAuth(null); throw new Error('Accesso scaduto: rientra nel pannello.'); }
    var j = await r.json();
    a.idToken = j.id_token; a.refreshToken = j.refresh_token || a.refreshToken;
    a.scade = Date.now() + (Number(j.expires_in || 3600) - 120) * 1000;
    scriviAuth(a);
    return a.idToken;
  }

  /* ---------- letture e scritture dirette su Firestore ---------- */
  async function leggiRaccolta(nome, conAccesso) {
    var out = [], pageToken = '';
    var headers = conAccesso ? { Authorization: 'Bearer ' + (await token()) } : {};
    for (var giro = 0; giro < 10; giro++) {
      var r = await fetch(FS + '/' + nome + '?pageSize=300&key=' + API_KEY + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''),
        { cache: 'no-store', headers: headers });
      if (!r.ok) throw new Error('Lettura di ' + nome + ' non riuscita: ' + (await erroreLeggibile(r)));
      var d = await r.json();
      (d.documents || []).forEach(function (doc) { var x = daCampi(doc.fields); x.id = x.id || doc.name.split('/').pop(); out.push(x); });
      if (!d.nextPageToken) break;
      pageToken = d.nextPageToken;
    }
    return out;
  }

  // Scritture atomiche: o vanno a buon fine tutte, o nessuna.
  async function commit(writes) {
    if (!writes.length) return true;
    for (var i = 0; i < writes.length; i += 400) {
      var r = await fetch(FS.replace(/\/documents$/, '/documents:commit') + '?key=' + API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await token()) },
        body: JSON.stringify({ writes: writes.slice(i, i + 400) })
      });
      if (r.status === 401 || r.status === 403) throw new Error('Permesso negato: rientra nel pannello con la password amministratore.');
      if (!r.ok) throw new Error('Salvataggio non riuscito: ' + (await erroreLeggibile(r)));
    }
    return true;
  }
  function scrivi(raccolta, id, dati) { return { update: { name: DOC_PREFIX + raccolta + '/' + id, fields: aCampi(dati) } }; }
  function cancella(raccolta, id) { return { delete: DOC_PREFIX + raccolta + '/' + id }; }

  /* ---------- LOCANDINE ---------- */
  var ultimeLocandine = null; // ultimo elenco letto dal pannello: serve a capire cosa e' stato eliminato

  // Sito pubblico: elenco dal server (con cache) + locandine fisse.
  // Pannello (opts.strict): elenco fresco da Firebase; se non risponde lancia un
  // errore invece di restituire un elenco vuoto, cosi' non si salva "zero locandine".
  async function list(opts) {
    var strict = !!(opts && opts.strict);
    if (strict) {
      if (!isRemote()) return sortItems(JSON.parse(localStorage.getItem('sfv:locandine:data') || '[]'));
      var dati = sortItems(await leggiRaccolta('sito_locandine', false));
      ultimeLocandine = dati.map(function (x) { return x.id; });
      return dati;
    }
    if (isRemote()) {
      try {
        var r = await fetch(base() + '/api/locandine', { cache: 'no-store' });
        if (r.ok) { var d = await r.json(); return conFisse(Array.isArray(d) ? d : []); }
      } catch (e) {}
    }
    return conFisse([]);
  }

  async function save(items) {
    var clean = sortItems(items).map(function (it, i) {
      var c = Object.assign({}, it);
      delete c.uploading;
      c.ordine = i;
      if (!c.id) c.id = uid();
      return c;
    });
    if (!isRemote()) { localStorage.setItem('sfv:locandine:data', JSON.stringify(clean)); return true; }
    if (ultimeLocandine === null) throw new Error('Le locandine esistenti non sono state caricate: ricarica la pagina.');
    var restano = {};
    clean.forEach(function (c) { restano[c.id] = true; });
    var writes = clean.map(function (c) { return scrivi('sito_locandine', c.id, c); });
    ultimeLocandine.forEach(function (id) { if (!restano[id]) writes.push(cancella('sito_locandine', id)); });
    await commit(writes);
    ultimeLocandine = clean.map(function (c) { return c.id; });
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

  function dataUrlInBlob(dataUrl) {
    var m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
    var bin = atob(m[2]), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: m[1] });
  }

  // Carica un'immagine nello spazio file di Firebase e restituisce l'indirizzo pubblico.
  async function caricaInStorage(blob, nomeBase) {
    var nome = 'sito/locandine/' + Date.now() + '-' + (nomeBase || 'locandina').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) + '.jpg';
    var r = await fetch('https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o?uploadType=media&name=' + encodeURIComponent(nome), {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'image/jpeg', Authorization: 'Firebase ' + (await token()) },
      body: blob
    });
    if (r.status === 401 || r.status === 403) throw new Error('Permesso negato per il caricamento: rientra nel pannello.');
    if (!r.ok) throw new Error('Caricamento immagine non riuscito (' + r.status + ').');
    return 'https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o/' + encodeURIComponent(nome) + '?alt=media';
  }

  async function uploadImage(file) {
    var dataUrl = await shrinkImage(file, 1600, 0.82);
    if (!dataUrl) dataUrl = await fileToDataUrl(file);
    if (dataUrl.length > 3200000) dataUrl = await shrinkImage(file, 1200, 0.72);
    if (dataUrl.length > 3200000) dataUrl = await shrinkImage(file, 900, 0.65);
    if (!isRemote()) return dataUrl; // prova in locale: l'immagine resta nel browser
    return caricaInStorage(dataUrlInBlob(dataUrl), (file.name || 'locandina').replace(/\.[^.]+$/, ''));
  }

  /* ---------- RECENSIONI ----------
     Modello: { id, nome, titolo, testo, corso, stato:'pending'|'approved', creata }
  */

  // Sito pubblico: solo le recensioni pubblicate.
  async function listReviews() {
    if (!isRemote()) return [];
    try {
      var r = await fetch(base() + '/api/recensioni', { cache: 'no-store' });
      if (r.ok) { var d = await r.json(); return sortByDateDesc(Array.isArray(d) ? d : []); }
    } catch (e) {}
    return [];
  }

  // Pannello: in attesa + pubblicate.
  async function listReviewsAll() {
    var attesa = await leggiRaccolta('sito_recensioni_attesa', true);
    var pubblicate = await leggiRaccolta('sito_recensioni', false);
    attesa.forEach(function (x) { x.stato = 'pending'; });
    pubblicate.forEach(function (x) { x.stato = 'approved'; });
    return sortByDateDesc(attesa.concat(pubblicate));
  }

  // Sito pubblico: invia una recensione (resta in attesa di verifica).
  async function submitReview(data) {
    var r = await fetch(base() + '/api/recensioni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: data.nome, titolo: data.titolo, testo: data.testo, corso: data.corso })
    });
    if (!r.ok) {
      var det = '';
      try { var j = await r.json(); det = j && j.error ? j.error : ''; } catch (e) {}
      throw new Error(det || 'Invio non riuscito.');
    }
    return true;
  }

  function campiRecensione(x, stato) {
    return { nome: x.nome || '', titolo: x.titolo || '', testo: x.testo || '', corso: x.corso || '', stato: stato, creata: Number(x.creata) || Date.now() };
  }
  // Approva: la sposta da "in attesa" a "pubblicate" in un'unica operazione.
  function approveReview(x) {
    return commit([scrivi('sito_recensioni', x.id, campiRecensione(x, 'approved')), cancella('sito_recensioni_attesa', x.id)]);
  }
  function rejectReview(x) { return commit([cancella('sito_recensioni_attesa', x.id)]); }
  function removeReview(x) { return commit([cancella('sito_recensioni', x.id)]); }

  /* ---------- IMPORTAZIONE DAL VECCHIO ARCHIVIO VERCEL ----------
     Da usare una volta, quando Vercel sblocca il vecchio archivio. Aggiunge
     solo cio' che non c'e' gia' (per id) e non cancella nulla. */
  async function importaVecchioArchivio() {
    async function leggi(f) {
      var r = await fetch(VECCHIO_ARCHIVIO + f + '?t=' + Date.now(), { cache: 'no-store' });
      if (r.status === 404) return [];
      if (!r.ok) throw new Error('Il vecchio archivio di Vercel non e\' ancora accessibile (' + r.status + '). Riprova quando Vercel lo sblocca.');
      var d = await r.json();
      return Array.isArray(d) ? d : [];
    }
    var vecchieLoc = await leggi('locandine.json');
    var vecchieRec = await leggi('recensioni.json');
    var giaLoc = {}, giaRec = {};
    (await leggiRaccolta('sito_locandine', false)).forEach(function (x) { giaLoc[x.id] = true; });
    (await listReviewsAll()).forEach(function (x) { giaRec[x.id] = true; });

    var writes = [], nLoc = 0, nRec = 0, base0 = (ultimeLocandine || []).length;
    for (var i = 0; i < vecchieLoc.length; i++) {
      var l = Object.assign({}, vecchieLoc[i]);
      if (!l.id) l.id = uid();
      if (giaLoc[l.id]) continue;
      if (l.immagine && /^https?:\/\//.test(l.immagine) && l.immagine.indexOf('firebasestorage') < 0) {
        try { var img = await fetch(l.immagine); if (img.ok) l.immagine = await caricaInStorage(await img.blob(), l.titolo || l.id); } catch (e) {}
      }
      l.ordine = base0 + i;
      writes.push(scrivi('sito_locandine', l.id, l));
      nLoc++;
    }
    vecchieRec.forEach(function (x) {
      if (!x || !x.id || giaRec[x.id]) return;
      var approvata = x.stato === 'approved';
      writes.push(scrivi(approvata ? 'sito_recensioni' : 'sito_recensioni_attesa', x.id, campiRecensione(x, approvata ? 'approved' : 'pending')));
      nRec++;
    });
    await commit(writes);
    if (ultimeLocandine) ultimeLocandine = null; // da ricaricare
    return { locandine: nLoc, recensioni: nRec };
  }

  // Area riservata della home (link al gestionale): resta controllata dal server.
  async function verifyPassword(password) {
    if (!base()) return false;
    var r = await fetch(base() + '/api/verifica', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    });
    return r.ok;
  }

  // Pulisce la vecchia memoria della password del pannello (versioni precedenti).
  try { sessionStorage.removeItem('sfv:admin:token'); localStorage.removeItem('sfv:admin:token'); } catch (e) {}

  window.SFVData = {
    list: list,
    save: save,
    uploadImage: uploadImage,
    listReviews: listReviews,
    listReviewsAll: listReviewsAll,
    submitReview: submitReview,
    approveReview: approveReview,
    rejectReview: rejectReview,
    removeReview: removeReview,
    importaVecchioArchivio: importaVecchioArchivio,
    isRemote: isRemote,
    login: login,
    logout: logout,
    isLogged: isLogged,
    verifyPassword: verifyPassword,
    newId: uid
  };
})();
