async function updateSummary(month, year) {
    let url = '/api/riepilogo';
    if (month && year) url += `?mese=${month}&anno=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    document.getElementById('totalIncome').textContent = data.entrate.toFixed(2);
    document.getElementById('totalExpense').textContent = data.uscite.toFixed(2);
    document.getElementById('savings').textContent = data.saldo.toFixed(2);
}


async function updateEntries(month, year) {
    let url = '/api/movimenti';
    if (month && year) url += `?mese=${month}&anno=${year}`;
    const res = await fetch(url);
    const entries = await res.json();
    const tbody = document.querySelector('#entriesTable tbody');
    tbody.innerHTML = '';
    entries.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${e.data}</td>
            <td>${e.tipo === 'entrata' ? 'Entrata' : (e.tipo === 'uscita' ? 'Uscita' : e.tipo)}</td>
            <td>${e.importo.toFixed(2)} €</td>
            <td>${e.descrizione || ''}</td>
            <td>
                <button class="edit-btn" data-id="${e.id}">✏️</button>
                <button class="delete-btn" data-id="${e.id}">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Eventi elimina
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = async function() {
            if (confirm('Eliminare questa transazione?')) {
                await fetch(`/api/movimenti/${btn.dataset.id}`, { method: 'DELETE' });
                updateAll();
            }
        };
    });

    // Eventi modifica
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = function() {
            openEditModal(btn.dataset.id);
        };
    });
}

// Modale modifica
const modal = document.getElementById('editModal');
const closeModal = () => { modal.style.display = 'none'; };
document.querySelector('#editModal .close').onclick = closeModal;
window.onclick = function(event) { if (event.target === modal) closeModal(); };

async function openEditModal(id) {
    const res = await fetch('/api/movimenti');
    const entries = await res.json();
    const entry = entries.find(e => String(e.id) === String(id));
    if (!entry) {
        console.warn('Movimento non trovato per la modifica:', id);
        return;
    }
    document.getElementById('editId').value = entry.id;
    document.getElementById('editDate').value = entry.data;
    document.getElementById('editType').value = entry.tipo;
    document.getElementById('editAmount').value = entry.importo;
    document.getElementById('editDescription').value = entry.descrizione || '';
    modal.style.display = 'block';
    console.log('Modale modifica aperta per movimento:', entry);
}

    document.getElementById('editForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = document.getElementById('editDate').value;
        let tipo = document.getElementById('editType').value;
        tipo = tipo === 'income' ? 'entrata' : (tipo === 'expense' ? 'uscita' : tipo);
        const importo = Number(document.getElementById('editAmount').value);
        const descrizione = document.getElementById('editDescription').value;
        await fetch(`/api/movimenti/${document.getElementById('editId').value}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, tipo, importo, descrizione })
        });
        closeModal();
        updateAll();
    });

document.getElementById('entryForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const data = document.getElementById('date').value;
    let tipo = document.getElementById('type').value;
    tipo = tipo === 'income' ? 'entrata' : (tipo === 'expense' ? 'uscita' : tipo);
    const importo = Number(document.getElementById('amount').value);
    const descrizione = document.getElementById('description').value;
    await fetch('/api/movimenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, tipo, importo, descrizione })
    });
    document.getElementById('entryForm').reset();
    updateAll();
})  


// let pieChart; // già dichiarata sopra, non ridichiarare
async function updatePieChart(month, year) {
    let url = '/api/riepilogo';
    async function updateEntriesFiltered() {
    const res = await fetch(url);
    const data = await res.json();
    const ctx = document.getElementById('pieChart').getContext('2d');
    const chartData = {
        labels: ['Entrate', 'Uscite', 'Risparmi'],
        datasets: [{
            data: [data.entrate, data.uscite, Math.max(data.saldo, 0)],
            backgroundColor: ['#4caf50', '#e74c3c', '#3498db'],
            borderWidth: 1
        }]
    };
    if (pieChart) {
        pieChart.data = chartData;
        pieChart.update();
    } else {
        pieChart = new Chart(ctx, {
            type: 'pie',
            data: chartData,
            options: {
                plugins: {
                    legend: { display: true, position: 'bottom' },
                    tooltip: { enabled: true }
                }
            }
        });
    }
}
}

let trendChart;
async function updateTrendChart() {
    const yearSel = document.getElementById('yearSelect');
    const year = yearSel ? yearSel.value : new Date().getFullYear();
    const trendCanvas = document.getElementById('trendChart');
    if (!trendCanvas) return;
    const ctx = trendCanvas.getContext('2d');
    if (!ctx) return;
    const res = await fetch(`/api/andamento?year=${year}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
        if (trendChart) {
            trendChart.data.labels = [];
            trendChart.data.datasets.forEach(ds => ds.data = []);
            trendChart.update();
        }
        return;
    }
    const labels = data.map(d => `${d.mese}/${d.anno}`);
    const entrate = data.map(d => d.entrate);
    const uscite = data.map(d => d.uscite);
    const saldo = data.map(d => d.saldo);
    const chartData = {
        labels,
        datasets: [
            {
                label: 'Entrate',
                data: entrate,
                borderColor: '#4caf50',
                backgroundColor: 'rgba(76,175,80,0.1)',
                fill: false
            },
            {
                label: 'Uscite',
                data: uscite,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231,76,60,0.1)',
                fill: false
            },
            {
                label: 'Risparmi',
                data: saldo,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52,152,219,0.1)',
                fill: false
            }
        ]
    };
    if (trendChart) {
        trendChart.data = chartData;
        trendChart.update();
    } else {
        trendChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                plugins: {
                    legend: { display: true, position: 'bottom' },
                    tooltip: { enabled: true }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}


// --- GRAFICO A TORTA ---
let pieChart;
async function updatePieChart(month, year) {
    let url = '/api/riepilogo';
    if (month && month !== 'all') url += `?mese=${month}`;
    if (year && year !== 'all') url += (url.includes('?') ? '&' : '?') + `anno=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    const ctx = document.getElementById('pieChart').getContext('2d');
    const chartData = {
        labels: ['Entrate', 'Uscite', 'Risparmi'],
        datasets: [{
            data: [data.entrate, data.uscite, Math.max(data.saldo, 0)],
            backgroundColor: ['#4caf50', '#e74c3c', '#3498db'],
            borderWidth: 1
        }]
    };
    if (pieChart) {
        pieChart.data = chartData;
        pieChart.update();
    } else {
        pieChart = new Chart(ctx, {
            type: 'pie',
            data: chartData,
            options: {
                plugins: {
                    legend: { display: true, position: 'bottom' },
                    tooltip: { enabled: true }
                }
            }
        });
    }
}

// --- 3 MINI-GRAFICI ANDAMENTO ---
let incomeChart, expenseChart, savingsChart;
async function updateMiniCharts(year) {
    if (!year || year === 'all') year = new Date().getFullYear();
    const res = await fetch(`/api/andamento?year=${year}`);
    const data = await res.json();
    const labels = data.map(d => `${d.mese}/${d.anno}`);
    const entrate = data.map(d => d.entrate);
    const uscite = data.map(d => d.uscite);
    const saldo = data.map(d => d.saldo);
    // Entrate
    const ctxIncome = document.getElementById('incomeChart').getContext('2d');
    const incomeData = {
        labels,
        datasets: [{
            label: 'Entrate',
            data: entrate,
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76,175,80,0.2)',
            fill: true
        }]
    };
    if (incomeChart) { incomeChart.data = incomeData; incomeChart.update(); }
    else {
        incomeChart = new Chart(ctxIncome, {
            type: 'line', data: incomeData,
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }
    // Uscite
    const ctxExpense = document.getElementById('expenseChart').getContext('2d');
    const expenseData = {
        labels,
        datasets: [{
            label: 'Uscite',
            data: uscite,
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231,76,60,0.2)',
            fill: true
        }]
    };
    if (expenseChart) { expenseChart.data = expenseData; expenseChart.update(); }
    else {
        expenseChart = new Chart(ctxExpense, {
            type: 'line', data: expenseData,
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }
    // Risparmi
    const ctxSavings = document.getElementById('savingsChart').getContext('2d');
    const savingsData = {
        labels,
        datasets: [{
            label: 'Risparmi',
            data: saldo,
            borderColor: '#3498db',
            backgroundColor: 'rgba(52,152,219,0.2)',
            fill: true
        }]
    };
    if (savingsChart) { savingsChart.data = savingsData; savingsChart.update(); }
    else {
        savingsChart = new Chart(ctxSavings, {
            type: 'line', data: savingsData,
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }
}

// --- FILTRI E LOGICA SINCRONIZZATA ---
function getSelectedFilters(prefix = '') {
    const monthSel = document.getElementById(prefix + 'monthFilter');
    const yearSel = document.getElementById(prefix + 'yearFilter');
    const typeSel = document.getElementById(prefix + 'typeFilter');
    const month = monthSel ? monthSel.value : '';
    const year = yearSel ? yearSel.value : '';
    const type = typeSel ? typeSel.value : '';
    return { month, year, type };
}

async function updateAll() {
    // Filtri per grafici principali
    const { month, year } = getSelectedFilters('');
    await updateSummary(month, year);
    await updatePieChart(month, year);
    await updateMiniCharts(year);
    // Filtri per lista movimenti
    const { month: m2, year: y2, type: t2 } = getSelectedFilters('Mov');
    await updateEntries(m2, y2, t2);
}

// Popola selettori anno dinamicamente
function populateYearFilter(id) {
    const yearFilter = document.getElementById(id);
    if (!yearFilter) return;
    const currentYear = new Date().getFullYear();
    yearFilter.innerHTML = '<option value="all">Tutti</option>';
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
        const opt = document.createElement('option');
        opt.value = String(y);
        opt.textContent = String(y);
        if (y === currentYear) opt.selected = true;
        yearFilter.appendChild(opt);
    }
}

// --- AGGIORNA ENTRIES CON FILTRI ---
async function updateEntries(month, year, type) {
    let url = '/api/movimenti';
    const params = [];
    if (month && month !== 'all') params.push(`mese=${month}`);
    if (year && year !== 'all') params.push(`anno=${year}`);
    if (params.length) url += '?' + params.join('&');
    const res = await fetch(url);
    let entries = await res.json();
    if (type && type !== 'all') entries = entries.filter(e => e.tipo === type);
    const tbody = document.querySelector('#entriesTable tbody');
    tbody.innerHTML = '';
    entries.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${e.data}</td>
            <td>${e.tipo === 'entrata' ? 'Entrata' : (e.tipo === 'uscita' ? 'Uscita' : e.tipo)}</td>
            <td>${e.importo.toFixed(2)} €</td>
            <td>${e.descrizione || ''}</td>
            <td>
                <button class="edit-btn" data-id="${e.id}">✏️</button>
                <button class="delete-btn" data-id="${e.id}">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    // Eventi elimina
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = async function() {
            if (confirm('Eliminare questa transazione?')) {
                await fetch(`/api/movimenti/${btn.dataset.id}`, { method: 'DELETE' });
                updateAll();
            }
        };
    });
    // Eventi modifica
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = function() {
            openEditModal(btn.dataset.id);
        };
    });
}

// --- INIZIALIZZAZIONE FILTRI E EVENTI ---
document.addEventListener('DOMContentLoaded', () => {
    populateYearFilter('yearFilter');
    populateYearFilter('yearFilterMov');
    // Eventi filtri grafici
    document.getElementById('typeFilter').addEventListener('change', updateAll);
    document.getElementById('monthFilter').addEventListener('change', updateAll);
    document.getElementById('yearFilter').addEventListener('change', updateAll);
    // Eventi filtri movimenti
    document.getElementById('typeFilterMov').addEventListener('change', updateAll);
    document.getElementById('monthFilterMov').addEventListener('change', updateAll);
    document.getElementById('yearFilterMov').addEventListener('change', updateAll);
    updateAll();
});