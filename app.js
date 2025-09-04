
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
    db.all('SELECT * FROM movimenti ORDER BY data DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Aggiungi un movimento
app.post('/api/movimenti', (req, res) => {
    const { tipo, descrizione, importo, data } = req.body;
    db.run(
        'INSERT INTO movimenti (tipo, descrizione, importo, data) VALUES (?, ?, ?, ?)',
        [tipo, descrizione, importo, data],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Riepilogo entrate/uscite/saldo
app.get('/api/riepilogo', (req, res) => {
    db.all('SELECT tipo, importo FROM movimenti', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        let entrate = 0;
        let uscite = 0;
        rows.forEach(mov => {
            if (mov.tipo === 'entrata') entrate += mov.importo;
            else if (mov.tipo === 'uscita') uscite += mov.importo;
        });
        res.json({ entrate, uscite, saldo: entrate - uscite });
    });
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
