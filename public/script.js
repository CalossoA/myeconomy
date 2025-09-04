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

document.getElementById('editForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const data = document.getElementById('editDate').value;
    let tipo = document.getElementById('editType').value;
    tipo = tipo === 'income' ? 'entrata' : (tipo === 'expense' ? 'uscita' : tipo);
    const importo = Number(document.getElementById('editAmount').value);
    const descrizione = document.getElementById('editDescription').value;
    await fetch(`/api/movimenti/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, tipo, importo, descrizione })
    });
    closeModal();
    updateAll();
});

document.getElementById('entryForm').addEventListener('submit', async e => {
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
});


// GRAFICO A TORTA
let pieChart;
async function updatePieChart(month, year) {
    let url = '/api/riepilogo';
    if (month && year) url += `?mese=${month}&anno=${year}`;
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

// GRAFICO ANDAMENTO MENSILE
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


function getSelectedMonthYear() {
    const monthSel = document.getElementById('monthSelect');
    const yearSel = document.getElementById('yearSelect');
    const month = monthSel ? monthSel.value : '';
    const year = yearSel ? yearSel.value : '';
    return { month, year };
}

async function updateAll() {
    const { month, year } = getSelectedMonthYear();
    await updateSummary(month, year);
    await updateEntries(month, year);
    await updatePieChart(month, year);
    await updateTrendChart();
}

// Popola selettore anno dinamicamente
function populateYearSelect() {
    const yearSelect = document.getElementById('yearSelect');
    if (!yearSelect) return;
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
        const opt = document.createElement('option');
        opt.value = String(y);
        opt.textContent = String(y);
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    populateYearSelect();
    const monthSel = document.getElementById('monthSelect');
    const yearSel = document.getElementById('yearSelect');
    if (monthSel) monthSel.addEventListener('change', updateAll);
    if (yearSel) yearSel.addEventListener('change', updateAll);
    updateAll();
});
