# Guida alla pubblicazione — Pannello locandine

Questa guida ti fa passare dalla **modalità demo** (le modifiche restano solo sul tuo
browser) alla **modalità online** (le modifiche si vedono da tutti, in tempo reale).

Serve solo la prima volta. Dopo, aggiornerai le locandine dal pannello in pochi secondi.

---

## Come funziona (in breve)

- Il **sito** e il **pannello** leggono le locandine da un piccolo database online.
- Tu aggiorni tutto dal **Pannello locandine**, protetto da password.
- Il database e le immagini vivono su **Vercel** (gratis per un sito come questo).

Tre pezzi già pronti nella cartella `backend-vercel/`:
- `api/locandine.js` — legge/salva l'elenco delle locandine
- `api/upload.js` — carica le immagini delle locandine
- `api/recensioni.js` — riceve le recensioni degli allievi e gestisce l'approvazione
- `package.json` — le dipendenze

---

## Passo 1 — Metti il sito su Vercel

1. Crea un account gratuito su https://vercel.com (puoi entrare con GitHub).
2. Crea un nuovo progetto e carica i file del sito **insieme** alla cartella `backend-vercel/`.
   In pratica la struttura deve avere una cartella `api/` con dentro `locandine.js` e `upload.js`,
   e il `package.json`. (Se usi GitHub: metti tutto in un repository e collegalo a Vercel.)

> Nota: i file `.dc.html` sono le pagine del sito e del pannello. Vercel li serve come pagine normali.

---

## Passo 2 — Crea il database e l'archivio immagini

Dentro il tuo progetto su Vercel, apri la scheda **Storage**:

1. **Create Database → KV** (è il database che conserva i testi delle locandine).
   Collegalo al progetto quando te lo chiede: Vercel aggiunge da solo le variabili necessarie.
2. **Create → Blob** (è l'archivio dove finiscono le immagini delle locandine).
   Collegalo al progetto: Vercel crea la variabile `BLOB_READ_WRITE_TOKEN`.

---

## Passo 3 — Imposta la password (ADMIN_TOKEN)

Sempre su Vercel, apri **Settings → Environment Variables** e aggiungi:

| Nome          | Valore                          |
|---------------|---------------------------------|
| `ADMIN_TOKEN` | la password che vuoi usare      |

Scegli una password robusta. È quella che ti verrà chiesta nel pannello per salvare.

Poi fai un nuovo **Deploy** (Vercel → Deployments → Redeploy) così le variabili diventano attive.

---

## Passo 4 — Collega il sito al backend

Apri il file **`sfv-config.js`** e modifica due righe:

```js
window.SFV_API_BASE    = 'https://IL-TUO-DOMINIO';  // es. https://scuolafaunisticavenatoria.it
window.SFV_ADMIN_TOKEN = 'la-stessa-password-di-ADMIN_TOKEN';
```

- `SFV_API_BASE`: l'indirizzo del sito online (senza barra finale `/`).
- `SFV_ADMIN_TOKEN`: **deve essere identica** ad `ADMIN_TOKEN` impostata su Vercel.

Salva, ricarica il sito online: in alto nel pannello vedrai l'etichetta diventare **Online** (verde).

---

## Le recensioni degli allievi (con verifica)

Il sito ha un pulsante **"Scrivi una recensione"** nella sezione allievi. Quando un
visitatore la invia, la recensione **non compare subito**: resta **in attesa di verifica**.

Per approvarla:
1. Apri il **Pannello** → scheda **Recensioni** (un pallino arancione segnala quante sono in attesa).
2. Leggi la recensione. Se è autentica premi **✓ Approva e pubblica**; altrimenti **Rifiuta**.
3. Appena approvata compare sul sito, in cima alle testimonianze, marcata come verificata.

Così le recensioni pubblicate sono solo quelle che hai controllato tu.
Anche questa funzione va in **modalità demo** finché non colleghi il backend (Passo 1–4);
`api/recensioni.js` usa lo stesso database KV, quindi non serve altra configurazione.

---

## Uso quotidiano — come aggiorno le locandine

1. Vai su `https://IL-TUO-DOMINIO/Pannello Locandine.dc.html`
   (oppure clicca **Gestione locandine** nel footer del sito).
2. Inserisci la password.
3. **Aggiungi locandina** → riempi titolo, data, sede, descrizione, link e **Carica immagine**.
4. Usa le frecce ↑ ↓ per ordinarle, il cestino per eliminarle.
5. Premi **Salva e pubblica**.

Fatto: la sezione **News** del sito si aggiorna per tutti i visitatori.

Quando un corso finisce, eliminalo o sostituiscine l'immagine: nessun limite al numero di locandine.

---

## Domande frequenti

**Devo sapere programmare?** No. Dopo la configurazione iniziale usi solo il pannello.

**Ho sbagliato la password.** Cambiala su Vercel (`ADMIN_TOKEN`), aggiorna `sfv-config.js`
con lo stesso valore, e rifai il deploy.

**Le immagini sono troppo grandi?** Meglio caricare locandine sotto ~4–5 MB. Se serve, posso
aggiungere un ridimensionamento automatico.

**Voglio provarlo prima di pubblicare.** Lascia `SFV_API_BASE` vuoto: il pannello funziona in
modalità demo sul tuo computer, così prendi confidenza senza rischi.

Per qualsiasi passaggio, scrivimi: posso seguirti punto per punto.
