
const Database = require('better-sqlite3');
const path = require('path');

// Percorso del database
const dbPath = path.join(__dirname, 'economia.db');
const db = new Database(dbPath);

// Crea la tabella movimenti se non esiste
const initDB = () => {
  db.prepare(`CREATE TABLE IF NOT EXISTS movimenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    descrizione TEXT,
    importo REAL NOT NULL,
    data TEXT NOT NULL
  )`).run();
};

module.exports = {
  db,
  initDB
};
