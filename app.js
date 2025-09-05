const express = require('express');
const { db, initDB } = require('./db');
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.static('public'));
app.use(express.json());

// Inizializza il database
initDB();

// Ottieni tutti i movimenti
app.get('/api/movimenti', (req, res) => {
    try {
        let { mese, anno, tipo } = req.query;
        let query = 'SELECT * FROM movimenti';
        let params = [];
        if (mese && anno) {
            query += " WHERE strftime('%m', data) = ? AND strftime('%Y', data) = ?";
            params = [mese.padStart(2, '0'), anno];
        } else if (anno) {
            query += " WHERE strftime('%Y', data) = ?";
            params = [anno];
        }
        // Filtro per tipo (entrata/uscita) se richiesto
        if (tipo && tipo !== 'all') {
            if (params.length) {
                query += ' AND tipo = ?';
            } else {
                query += ' WHERE tipo = ?';
            }
            params.push(tipo);
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
        let { mese, anno } = req.query;
        let query = 'SELECT tipo, importo, data FROM movimenti';
        let params = [];
        console.log('--- /api/riepilogo ---');
        console.log('Query params:', req.query);
        if (mese && anno) {
            query += " WHERE strftime('%m', data) = ? AND strftime('%Y', data) = ?";
            params = [mese.padStart(2, '0'), anno];
        } else if (anno) {
            query += " WHERE strftime('%Y', data) = ?";
            params = [anno];
        }
        console.log('SQL:', query);
        console.log('Params:', params);
        const rows = db.prepare(query).all(...params);
        console.log('Rows:', rows);
        let entrate = 0;
        let uscite = 0;
        rows.forEach(mov => {
            if (mov.tipo === 'entrata') entrate += mov.importo;
            else if (mov.tipo === 'uscita') uscite += mov.importo;
        });
        console.log('Entrate:', entrate, 'Uscite:', uscite, 'Saldo:', entrate - uscite);
        res.json({ entrate, uscite, saldo: entrate - uscite });
    } catch (err) {
        console.error('Errore in /api/riepilogo:', err);
        res.status(500).json({ error: err.message });
    }
});

// Andamento mensile
app.get('/api/andamento', (req, res) => {
    try {
        let { year } = req.query;
        console.log('Chiamata /api/andamento con year:', year);
        if (!year) {
            year = new Date().getFullYear();
        }
    const rows = db.prepare("SELECT tipo, importo, data FROM movimenti WHERE strftime('%Y', data) = ?").all(year);
        console.log('Movimenti trovati:', rows);
        if (!rows || rows.length === 0) {
            console.log('Nessun movimento per l’anno richiesto');
            return res.json([]);
        }
        // Aggrega per mese
        const stats = {};
        for (let m = 1; m <= 12; m++) {
            const key = String(m).padStart(2, '0');
            stats[key] = { entrate: 0, uscite: 0, saldo: 0 };
        }
        rows.forEach(mov => {
            // Controllo robusto sul formato data
            if (!mov.data || !/^\d{4}-\d{2}-\d{2}$/.test(mov.data)) {
                console.warn('Movimento con data non valida:', mov);
                return;
            }
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
        console.log('Risposta andamento:', result);
        res.json(result);
    } catch (err) {
        console.error('Errore in /api/andamento:', err);
        res.status(500).json({ error: err.message });
    }
});


app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});


