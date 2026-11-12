// api/recensioni.js — recensioni degli allievi su Firestore.
//
//  GET  /api/recensioni   -> pubblico: le recensioni PUBBLICATE (raccolta sito_recensioni)
//  POST /api/recensioni   -> pubblico: un allievo invia una recensione, che finisce
//                            "in attesa" (raccolta sito_recensioni_attesa) finche'
//                            l'amministratore non la approva dal pannello.
//
// Approvare, rifiutare e rimuovere si fa dal pannello, con l'account amministratore.

import { leggiRaccolta, creaDocumento, cachePubblica, rispostaErrore } from './_firebase.js';

// Anti-spam: invii consentiti dallo stesso indirizzo in dieci minuti.
const MAX_PER_INDIRIZZO = 3;
const FINESTRA = 10 * 60 * 1000;
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    try {
      const data = await leggiRaccolta('sito_recensioni');
      data.sort((a, b) => (b.creata || 0) - (a.creata || 0));
      cachePubblica(res);
      return res.status(200).json(data);
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
    const pulisci = (v, max) => ((v || '') + '').slice(0, max).trim();
    const nome = pulisci(body && body.nome, 120);
    const testo = pulisci(body && body.testo, 4000);
    if (!nome || !testo) return res.status(400).json({ error: 'Nome e testo obbligatori' });
    if (troppiInvii(req)) return res.status(429).json({ error: 'Troppi invii ravvicinati. Riprova tra qualche minuto.' });
    const id = 'rec-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    try {
      await creaDocumento('sito_recensioni_attesa', id, {
        nome,
        titolo: pulisci(body.titolo, 160),
        testo,
        corso: pulisci(body.corso, 160),
        stato: 'pending',
        creata: Date.now()
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true });
    } catch (e) {
      return rispostaErrore(res, e);
    }
  }

  return res.status(405).json({ error: 'Metodo non consentito' });
}
