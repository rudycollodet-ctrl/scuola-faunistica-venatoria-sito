/* ============================================================
   CONFIGURAZIONE — Scuola Faunistica Venatoria
   ------------------------------------------------------------
   SFV_API_BASE si adatta da solo all'indirizzo su cui il sito
   e' pubblicato: non va piu' aggiornato se cambi dominio.
   In locale (file aperto dal computer) resta in modalita' demo.

   SFV_ADMIN_TOKEN e' la password del Pannello Locandine e
   dell'Area Riservata. DEVE essere identica alla variabile
   ADMIN_TOKEN impostata su Vercel.
   ============================================================ */

window.SFV_API_BASE    = location.protocol.indexOf('http') === 0 ? location.origin : '';
window.SFV_ADMIN_TOKEN = 'Rudy26061976+';
