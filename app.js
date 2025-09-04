const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data.json');

function readData() {
    if (!fs.existsSync(DATA_FILE)) return { entries: [] };
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/summary', (req, res) => {
    const { entries } = readData();
    let totalIncome = 0, totalExpense = 0;
    entries.forEach(e => {
        if (e.type === 'income') totalIncome += e.amount;
        else totalExpense += e.amount;
    });
    res.json({
        totalIncome,
        totalExpense,
        savings: totalIncome - totalExpense
    });
});

app.get('/api/entries', (req, res) => {
    const { entries } = readData();
    res.json(entries);
});


// Utility per id univoco
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

app.post('/api/entry', (req, res) => {
    const { date, type, amount, description } = req.body;
    if (!date || !type || !amount) return res.status(400).json({ error: 'Missing fields' });
    const data = readData();
    data.entries.push({ id: generateId(), date, type, amount: Number(amount), description });
    writeData(data);
    res.json({ success: true });
});

// Elimina una transazione
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
