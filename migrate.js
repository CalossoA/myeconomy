const fs = require('fs');
const path = require('path');
const { db, initDB } = require('./db');

const DATA_FILE = path.join(__dirname, 'data.json');

initDB();

if (!fs.existsSync(DATA_FILE)) {
  console.log('Nessun file data.json trovato.');
  process.exit(0);
}


const raw = fs.readFileSync(DATA_FILE);
const data = JSON.parse(raw);
const entries = data.entries || [];

let imported = 0;

function importEntries() {
  if (entries.length === 0) {
    console.log('Nessun movimento da importare.');
    return;
  }
  let done = 0;
  entries.forEach(entry => {
    // Mappa i campi in italiano e nel formato richiesto dal db
    const tipo = entry.type === 'income' ? 'entrata' : (entry.type === 'expense' ? 'uscita' : entry.type);
    const descrizione = entry.description || '';
    const importo = entry.amount;
    const dataMov = entry.date;
    db.run(
      'INSERT INTO movimenti (tipo, descrizione, importo, data) VALUES (?, ?, ?, ?)',
      [tipo, descrizione, importo, dataMov],
      function (err) {
        if (err) console.error('Errore:', err.message);
        else imported++;
        done++;
        if (done === entries.length) {
          console.log(`Importati ${imported} movimenti su ${entries.length}`);
          process.exit(0);
        }
      }
    );
  });
}

importEntries();
