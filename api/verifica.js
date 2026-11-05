// api/verifica.js — controlla la password dei pannelli (ADMIN_TOKEN) sul server.
// POST { password } -> 200 { ok: true } oppure 401 { ok: false }
// La password non e' mai scritta nei file del sito.

import { createHash, timingSafeEqual } from 'node:crypto';

function digest(text) {
  return createHash('sha256').update(String(text)).digest();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const atteso = process.env.ADMIN_TOKEN;
  const password = req.body && typeof req.body.password === 'string' ? req.body.password : '';

  // Piccola attesa: rallenta chi prova molte password di seguito.
  await new Promise((resolve) => setTimeout(resolve, 400));

  const ok = !!atteso && !!password && timingSafeEqual(digest(password), digest(atteso));
  return res.status(ok ? 200 : 401).json({ ok });
}
