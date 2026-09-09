// api/locandine.js — legge e salva l'elenco delle locandine
// Usa Vercel Blob (gratuito) sia per le immagini che per i dati: salviamo
// l'elenco come un file JSON dentro l'archivio Blob.
//
// GET  -> pubblico, restituisce l'array delle locandine
// PUT  -> protetto da password (Authorization: Bearer <ADMIN_TOKEN>), salva l'array

import { put, list } from '@vercel/blob';

// Il token del Blob puo' avere nomi diversi a seconda di come l'archivio
// e' stato collegato su Vercel (es. blobpub_READ_WRITE_TOKEN).
function blobToken() {
  var env = process.env;
  // Le locandine devono essere visibili sul sito: serve l'archivio PUBBLICO.
  // Su Vercel il suo token si chiama blobpub_READ_WRITE_TOKEN.
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


const PATH = 'data/locandine.json';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function readData() {
  try {
    const { blobs } = await list({ prefix: PATH, limit: 1, token: blobToken() });
    if (!blobs.length) return [];
    const r = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

async function writeData(items) {
  await put(PATH, JSON.stringify(items), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: blobToken()
  });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(await readData());
  }

  if (req.method === 'PUT') {
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!Array.isArray(body)) return res.status(400).json({ error: 'Formato non valido' });
      await writeData(body);
      return res.status(200).json({ ok: true, count: body.length });
    } catch (e) {
      return res.status(500).json({ error: 'Salvataggio non riuscito' });
    }
  }

  return res.status(405).json({ error: 'Metodo non consentito' });
}
