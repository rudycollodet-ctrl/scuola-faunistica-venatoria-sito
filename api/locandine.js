// api/locandine.js — legge e salva l'elenco delle locandine (file JSON su Vercel Blob)
//
// GET            -> pubblico, restituisce l'array delle locandine
// GET ?fresco=1  -> come sopra ma senza cache (usato dal pannello)
// PUT            -> protetto (Authorization: Bearer <ADMIN_TOKEN>), salva l'array
//
// Se l'archivio non e' disponibile risponde 503: il sito NON deve mai
// confondere un archivio bloccato con "nessuna locandina".

import { leggiElenco, scriviElenco, isAdmin, cachePubblica, rispostaErrore } from './_archivio.js';

const PATH = 'data/locandine.json';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const fresco = req.query && req.query.fresco === '1';
    try {
      const data = await leggiElenco(PATH, { fresco });
      if (fresco) res.setHeader('Cache-Control', 'no-store');
      else cachePubblica(res);
      return res.status(200).json(data);
    } catch (e) {
      return rispostaErrore(res, e);
    }
  }

  if (req.method === 'PUT') {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Non autorizzato' });
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!Array.isArray(body)) return res.status(400).json({ error: 'Formato non valido' });
      await scriviElenco(PATH, body);
      return res.status(200).json({ ok: true, count: body.length });
    } catch (e) {
      return res.status(500).json({ error: 'Salvataggio non riuscito', dettaglio: e && e.message });
    }
  }

  return res.status(405).json({ error: 'Metodo non consentito' });
}
