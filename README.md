npm install
npm start

# Gestione Economia Personale

App web per la gestione delle entrate, uscite e risparmi, con riepilogo e grafici filtrabili per mese.

## Funzionalità

- Inserimento, modifica e cancellazione di movimenti (entrate/uscite) con data e descrizione
- Riepilogo mensile di entrate, uscite e risparmi
- Grafico a torta filtrabile per mese
- Grafico a linee per l’andamento mensile di entrate, uscite e risparmi
- Interfaccia chiara, moderna e responsiva

## Come si usa

1. Installa le dipendenze:
   ```bash
   npm install
   ```
2. Avvia il server:
   ```bash
   npm start
   ```
3. Apri il browser su [http://localhost:3000](http://localhost:3000) oppure sull’URL fornito da Render
4. Usa il selettore mese/anno per filtrare i dati e i grafici

I dati sono salvati in un database SQLite locale (`economia.db`).

---

**Tecnologie usate:** Node.js, Express, SQLite, HTML, CSS, JavaScript, Chart.js

**Nota:** L'app è pensata per uso personale, ma può essere deployata su Render per accesso da qualsiasi dispositivo.
