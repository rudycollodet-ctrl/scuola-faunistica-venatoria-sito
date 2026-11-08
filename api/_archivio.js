// api/_archivio.js — accesso condiviso all'archivio Vercel Blob (locandine e recensioni).
// Il trattino basso iniziale fa si' che Vercel NON lo pubblichi come pagina /api.
//
// Perche' esiste: prima ogni visita al sito chiamava list() sull'archivio.
// list() e' un'operazione "avanzata" e il piano gratuito ne concede poche al mese:
// finite quelle, Vercel blocca l'archivio e il sito mostrava "nessuna locandina".
// Ora i file JSON si leggono direttamente dal loro indirizzo pubblico (nessuna
// operazione avanzata) e il risultato resta in memoria per un minuto.

import { put, list } from '@vercel/blob';

// Il token del Blob puo' avere nomi diversi a seconda di come l'archivio
// e' stato collegato su Vercel (es. blobpub_READ_WRITE_TOKEN).
export function blobToken() {
  var env = process.env;
  if (env.blobpub_READ_WRITE_TOKEN) return env.blobpub_READ_WRITE_TOKEN;
  if (env.BLOBPUB_READ_WRITE_TOKEN) return env.BLOBPUB_READ_WRITE_TOKEN;
  var keys = Object.keys(env);
  for (var i = 0; i < keys.length; i++) {
    if (/^blobpub/i.test(keys[i]) && /READ_WRITE_TOKEN$/i.test(keys[i]) && env[keys[i]]) return env[keys[i]];
  }
  if (env.BLOB_READ_WRITE_TOKEN) return env.BLOB_READ_WRITE_TOKEN;
  for (var j = 0; j < keys.length; j++) {
    if (/READ_WRITE_TOKEN$/i.test(keys[j]) && env[keys[j]]) return env[keys[j]];
  }
  return undefined;
}

function storeId() {
  var env = process.env;
  if (env.blobpub_STORE_ID) return env.blobpub_STORE_ID;
  if (env.BLOBPUB_STORE_ID) return env.BLOBPUB_STORE_ID;
  var keys = Object.keys(env);
  for (var i = 0; i < keys.length; i++) {
    if (/^blobpub/i.test(keys[i]) && /STORE_ID$/i.test(keys[i]) && env[keys[i]]) return env[keys[i]];
  }
  return '';
}

// Indirizzo base dell'archivio pubblico, es. https://abc123.public.blob.vercel-storage.com
var baseUrl = '';
async function base() {
  if (baseUrl) return baseUrl;
  var id = storeId().replace(/^store_/i, '').toLowerCase();
  if (id) { baseUrl = 'https://' + id + '.public.blob.vercel-storage.com'; return baseUrl; }
  // Ripiego (una sola volta per istanza): ricava l'indirizzo da un elenco.
  var r = await list({ limit: 1, token: blobToken() });
  if (r.blobs && r.blobs.length) {
    baseUrl = new URL(r.blobs[0].url).origin;
    return baseUrl;
  }
  throw new Error('Indirizzo archivio sconosciuto');
}

// Errore di archivio: il chiamante deve rispondere 503, MAI trattarlo come "vuoto".
export class ArchivioNonDisponibile extends Error {}

var memoria = {}; // path -> { at, data }
var DURATA_MEMORIA = 60 * 1000;

// Legge un elenco JSON. Restituisce [] solo se il file non esiste davvero.
// Se l'archivio e' bloccato o non risponde lancia ArchivioNonDisponibile.
export async function leggiElenco(path, opts) {
  var fresco = opts && opts.fresco;
  var m = memoria[path];
  if (!fresco && m && Date.now() - m.at < DURATA_MEMORIA) return m.data;

  var url = (await base()) + '/' + path + (fresco ? '?t=' + Date.now() : '');
  var r;
  try {
    r = await fetch(url, { cache: 'no-store' });
  } catch (e) {
    throw new ArchivioNonDisponibile('Archivio non raggiungibile: ' + e.message);
  }
  if (r.status === 404) {
    memoria[path] = { at: Date.now(), data: [] };
    return [];
  }
  if (!r.ok) {
    var dettaglio = '';
    try { dettaglio = (await r.text()).trim().slice(0, 120); } catch (e) {}
    throw new ArchivioNonDisponibile('Archivio non disponibile (' + r.status + ') ' + dettaglio);
  }
  var data = await r.json();
  if (!Array.isArray(data)) throw new ArchivioNonDisponibile('Contenuto archivio non valido');
  memoria[path] = { at: Date.now(), data: data };
  return data;
}

export async function scriviElenco(path, items) {
  await put(path, JSON.stringify(items), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    token: blobToken()
  });
  memoria[path] = { at: Date.now(), data: items };
}

export function isAdmin(req) {
  var token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

// Risposte pubbliche: la CDN di Vercel le tiene per 60 s, cosi' le visite
// al sito non arrivano nemmeno alla funzione.
export function cachePubblica(res) {
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
}

export function rispostaErrore(res, e) {
  res.setHeader('Cache-Control', 'no-store');
  if (e instanceof ArchivioNonDisponibile) {
    return res.status(503).json({ error: 'Archivio temporaneamente non disponibile. Riprova piu\' tardi.', dettaglio: e.message });
  }
  return res.status(500).json({ error: 'Errore del server', dettaglio: e && e.message });
}
