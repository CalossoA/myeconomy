const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Percorso del database
const dbPath = path.join(__dirname, 'economia.db');
const db = new sqlite3.Database(dbPath);

// Crea la tabella movimenti se non esiste
const initDB = () => {
  db.run(`CREATE TABLE IF NOT EXISTS movimenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    descrizione TEXT,
    importo REAL NOT NULL,
    data TEXT NOT NULL
  )`);
};

module.exports = {
  db,
  initDB
};
