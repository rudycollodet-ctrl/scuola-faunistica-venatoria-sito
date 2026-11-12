// api/_firebase.js — accesso a Firestore (progetto scuola-faunistica-venatoria)
// tramite le API REST pubbliche di Google. Il trattino basso iniziale fa si'
// che Vercel NON lo pubblichi come pagina /api.
//
// Il server NON ha chiavi segrete: fa solo cio' che le regole di sicurezza di
// Firestore permettono a chiunque (leggere locandine e recensioni pubblicate,
// inviare una recensione "in attesa"). Le modifiche le fa il pannello, dopo
// l'accesso con l'account amministratore di Firebase.

export const PROJECT = 'scuola-faunistica-venatoria';
export const API_KEY = 'AIzaSyCH0NoAaZztDWvHUrEhb5D4QUjQE4om9Pk'; // chiave web pubblica (la stessa delle altre app)
const BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';

export class FirestoreNonDisponibile extends Error {}

// ---- conversione valori Firestore <-> JS ----
export function daValore(v) {
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
export function daCampi(fields) {
  const o = {};
  Object.keys(fields || {}).forEach((k) => { o[k] = daValore(fields[k]); });
  return o;
}
export function aValore(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(aValore) } };
  if (typeof x === 'object') return { mapValue: { fields: aCampi(x) } };
  return { stringValue: String(x) };
}
export function aCampi(o) {
  const f = {};
  Object.keys(o || {}).forEach((k) => { f[k] = aValore(o[k]); });
  return f;
}

// ---- cache in memoria: le visite al sito non rileggono il database ogni volta ----
const memoria = {};
const DURATA = 60 * 1000;

// Legge tutti i documenti di una raccolta (lettura pubblica consentita dalle regole).
export async function leggiRaccolta(nome, opts) {
  const fresco = opts && opts.fresco;
  const m = memoria[nome];
  if (!fresco && m && Date.now() - m.at < DURATA) return m.data;
  const out = [];
  let pageToken = '';
  for (let giro = 0; giro < 10; giro++) {
    const url = BASE + '/' + nome + '?pageSize=300&key=' + API_KEY + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    let r;
    try { r = await fetch(url, { cache: 'no-store' }); }
    catch (e) { throw new FirestoreNonDisponibile('Database non raggiungibile: ' + e.message); }
    if (!r.ok) {
      let det = '';
      try { det = (await r.text()).slice(0, 200); } catch (e) {}
      throw new FirestoreNonDisponibile('Database non disponibile (' + r.status + ') ' + det);
    }
    const d = await r.json();
    (d.documents || []).forEach((doc) => {
      const x = daCampi(doc.fields);
      x.id = x.id || doc.name.split('/').pop();
      out.push(x);
    });
    if (!d.nextPageToken) break;
    pageToken = d.nextPageToken;
  }
  memoria[nome] = { at: Date.now(), data: out };
  return out;
}

// Crea un documento (senza account: solo dove le regole lo permettono a chiunque).
export async function creaDocumento(nome, id, dati) {
  const url = BASE + '/' + nome + '?documentId=' + encodeURIComponent(id) + '&key=' + API_KEY;
  let r;
  try {
    r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: aCampi(dati) })
    });
  } catch (e) { throw new FirestoreNonDisponibile('Database non raggiungibile: ' + e.message); }
  if (!r.ok) {
    let det = '';
    try { det = (await r.text()).slice(0, 200); } catch (e) {}
    throw new FirestoreNonDisponibile('Scrittura non riuscita (' + r.status + ') ' + det);
  }
  return true;
}

export function cachePubblica(res) {
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
}

export function rispostaErrore(res, e) {
  res.setHeader('Cache-Control', 'no-store');
  if (e instanceof FirestoreNonDisponibile) {
    return res.status(503).json({ error: 'Database temporaneamente non disponibile. Riprova piu\' tardi.', dettaglio: e.message });
  }
  return res.status(500).json({ error: 'Errore del server', dettaglio: e && e.message });
}
