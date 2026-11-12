// api/locandine.js — elenco delle locandine del sito, letto da Firestore (raccolta sito_locandine).
//
// GET            -> pubblico, array delle locandine (cache CDN di 60 secondi)
// GET ?fresco=1  -> senza cache
//
// Le modifiche non passano da qui: il pannello scrive direttamente su Firestore
// dopo l'accesso con l'account amministratore.

import { leggiRaccolta, cachePubblica, rispostaErrore } from './_firebase.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metodo non consentito' });

  const fresco = req.query && req.query.fresco === '1';
  try {
    const data = await leggiRaccolta('sito_locandine', { fresco });
    data.sort((a, b) => (a.ordine == null ? 999 : a.ordine) - (b.ordine == null ? 999 : b.ordine));
    if (fresco) res.setHeader('Cache-Control', 'no-store');
    else cachePubblica(res);
    return res.status(200).json(data);
  } catch (e) {
    return rispostaErrore(res, e);
  }
}
