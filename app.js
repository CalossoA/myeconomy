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
        let { month, year } = req.query;
        let query = 'SELECT * FROM movimenti';
        let params = [];
        if (month && year) {
            query += ' WHERE strftime("%m", data) = ? AND strftime("%Y", data) = ?';
            params = [month.padStart(2, '0'), year];
        }
        query += ' ORDER BY data DESC';
        const rows = db.prepare(query).all(...params);
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
        let { month, year } = req.query;
        let query = 'SELECT tipo, importo, data FROM movimenti';
        let params = [];
        if (month && year) {
            query += ' WHERE strftime("%m", data) = ? AND strftime("%Y", data) = ?';
            params = [month.padStart(2, '0'), year];
        }
        const rows = db.prepare(query).all(...params);
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

// Andamento mensile
app.get('/api/andamento', (req, res) => {
    try {
        let { year } = req.query;
        if (!year) {
            year = new Date().getFullYear();
        }
        const rows = db.prepare('SELECT tipo, importo, data FROM movimenti WHERE strftime("%Y", data) = ?').all(year);
        // Aggrega per mese
        const stats = {};
        for (let m = 1; m <= 12; m++) {
            const key = String(m).padStart(2, '0');
            stats[key] = { entrate: 0, uscite: 0, saldo: 0 };
        }
        rows.forEach(mov => {
            const mese = mov.data.slice(5,7);
            if (mov.tipo === 'entrata') stats[mese].entrate += mov.importo;
            else if (mov.tipo === 'uscita') stats[mese].uscite += mov.importo;
        });
        Object.keys(stats).forEach(mese => {
            stats[mese].saldo = stats[mese].entrate - stats[mese].uscite;
        });
        // Trasforma in array ordinato per frontend
        const result = Object.keys(stats).map(mese => ({
            mese,
            anno: year,
            entrate: stats[mese].entrate,
            uscite: stats[mese].uscite,
            saldo: stats[mese].saldo
        }));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});


