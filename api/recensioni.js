// api/recensioni.js — recensioni degli allievi con verifica (moderazione), su Vercel Blob
//
//  GET  /api/recensioni          -> pubblico: solo le recensioni APPROVATE
//  GET  /api/recensioni?all=1    -> protetto: TUTTE (comprese in attesa) [Bearer ADMIN_TOKEN]
//  POST /api/recensioni          -> pubblico: un allievo invia una recensione (resta "pending")
//  PUT  /api/recensioni          -> protetto: salva l'elenco intero
//
// Se l'archivio non e' disponibile risponde 503 e NON scrive nulla:
// prima un invio con archivio bloccato poteva sovrascrivere tutte le recensioni.

import { leggiElenco, scriviElenco, isAdmin, cachePubblica, rispostaErrore } from './_archivio.js';

const PATH = 'data/recensioni.json';

// Anti-spam: ogni invio scrive sull'archivio, e le scritture gratuite sono limitate.
const MAX_IN_ATTESA = 60;          // oltre questo numero di recensioni da verificare si rifiutano i nuovi invii
const MAX_PER_INDIRIZZO = 3;       // invii consentiti dallo stesso indirizzo...
const FINESTRA = 10 * 60 * 1000;   // ...ogni dieci minuti
const invii = new Map();

function troppiInvii(req) {
  const ip = ((req.headers['x-forwarded-for'] || '') + '').split(',')[0].trim() || 'sconosciuto';
  const ora = Date.now();
  const recenti = (invii.get(ip) || []).filter((t) => ora - t < FINESTRA);
  if (recenti.length >= MAX_PER_INDIRIZZO) { invii.set(ip, recenti); return true; }
  recenti.push(ora);
  invii.set(ip, recenti);
  if (invii.size > 500) invii.clear();
  return false;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    const tutte = req.query && req.query.all === '1';
    if (tutte && !isAdmin(req)) return res.status(401).json({ error: 'Non autorizzato' });
    try {
      const all = await leggiElenco(PATH, { fresco: tutte });
      if (tutte) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(all);
      }
      cachePubblica(res);
      return res.status(200).json(all.filter((r) => r.stato === 'approved'));
    } catch (e) {
      return rispostaErrore(res, e);
    }
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      return res.status(400).json({ error: 'Formato non valido' });
    }
    const nome = ((body && body.nome) || '').toString().slice(0, 120).trim();
    const testo = ((body && body.testo) || '').toString().slice(0, 4000).trim();
    if (!nome || !testo) return res.status(400).json({ error: 'Nome e testo obbligatori' });
    if (troppiInvii(req)) return res.status(429).json({ error: 'Troppi invii ravvicinati. Riprova tra qualche minuto.' });
    try {
      // Lettura fresca: se fallisce ci fermiamo, senza toccare l'archivio.
      const all = await leggiElenco(PATH, { fresco: true });
      if (all.filter((r) => r.stato !== 'approved').length >= MAX_IN_ATTESA) {
        return res.status(429).json({ error: 'Ci sono gia\' molte recensioni in attesa di verifica. Riprova piu\' avanti.' });
      }
      all.push({
        id: 'rec-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
        nome,
        titolo: (body.titolo || '').toString().slice(0, 160).trim(),
        testo,
        corso: (body.corso || '').toString().slice(0, 160).trim(),
        stato: 'pending',
        creata: Date.now()
      });
      await scriviElenco(PATH, all);
      return res.status(200).json({ ok: true });
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
