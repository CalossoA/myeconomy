const express = require('express');
const { db, initDB } = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

// Inizializza il database
initDB();

// Ottieni tutti i movimenti
app.get('/api/movimenti', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM movimenti ORDER BY data DESC').all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Aggiungi un movimento
app.post('/api/movimenti', (req, res) => {
    try {
        const { tipo, descrizione, importo, data } = req.body;
        const stmt = db.prepare('INSERT INTO movimenti (tipo, descrizione, importo, data) VALUES (?, ?, ?, ?)');
        const info = stmt.run(tipo, descrizione, importo, data);
        res.json({ success: true, id: info.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Elimina un movimento
app.delete('/api/movimenti/:id', (req, res) => {
    try {
        const id = Number(req.params.id);
        const info = db.prepare('DELETE FROM movimenti WHERE id = ?').run(id);
        if (info.changes === 0) return res.status(404).json({ error: 'Movimento non trovato' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Modifica un movimento
app.put('/api/movimenti/:id', (req, res) => {
    try {
        const id = Number(req.params.id);
        const { tipo, descrizione, importo, data } = req.body;
        const info = db.prepare(
            'UPDATE movimenti SET tipo = ?, descrizione = ?, importo = ?, data = ? WHERE id = ?'
        ).run(tipo, descrizione, importo, data, id);
        if (info.changes === 0) return res.status(404).json({ error: 'Movimento non trovato' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Riepilogo entrate/uscite/saldo
app.get('/api/riepilogo', (req, res) => {
    try {
        const rows = db.prepare('SELECT tipo, importo FROM movimenti').all();
        let entrate = 0;
        let uscite = 0;
        rows.forEach(mov => {
            if (mov.tipo === 'entrata') entrate += mov.importo;
            else if (mov.tipo === 'uscita') uscite += mov.importo;
        });
        res.json({ entrate, uscite, saldo: entrate - uscite });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
});
app.delete('/api/entry/:id', (req, res) => {
    const { id } = req.params;
    const data = readData();
    const idx = data.entries.findIndex(e => e.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    data.entries.splice(idx, 1);
    writeData(data);
    res.json({ success: true });
});

// Modifica una transazione
app.put('/api/entry/:id', (req, res) => {
    const { id } = req.params;
    const { date, type, amount, description } = req.body;
    const data = readData();
    const entry = data.entries.find(e => e.id === id);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    if (date) entry.date = date;
    if (type) entry.type = type;
    if (amount) entry.amount = Number(amount);
    if (description !== undefined) entry.description = description;
    writeData(data);
    res.json({ success: true });
});


