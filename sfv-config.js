/* ============================================================
   CONFIGURAZIONE — Scuola Faunistica Venatoria
   ------------------------------------------------------------
   SFV_API_BASE si adatta da solo all'indirizzo su cui il sito
   e' pubblicato: non va piu' aggiornato se cambi dominio.
   In locale (file aperto dal computer) resta in modalita' demo.

   La password dei pannelli NON va scritta qui: sta solo su Vercel
   (variabile ADMIN_TOKEN) e la controlla il server (/api/verifica).
   ============================================================ */

window.SFV_API_BASE    = location.protocol.indexOf('http') === 0 ? location.origin : '';
