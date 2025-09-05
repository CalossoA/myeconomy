// --- MODIFICA MOVIMENTO ---
function openEditModal(id) {
    // Trova il movimento da modificare
    fetch(`/api/movimenti?id=${id}`)
        .then(res => res.json())
        .then(entry => {
            // entry può essere array o oggetto singolo
            if (Array.isArray(entry)) entry = entry[0];
            document.getElementById('editId').value = entry.id;
            document.getElementById('editDate').value = entry.data;
            document.getElementById('editType').value = entry.tipo === 'entrata' ? 'income' : 'expense';
            document.getElementById('editAmount').value = entry.importo;
            document.getElementById('editDescription').value = entry.descrizione || '';
            document.getElementById('editModal').style.display = 'block';
        });
}

// Chiudi modale
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#editModal .close').forEach(btn => {
        btn.onclick = function() {
            document.getElementById('editModal').style.display = 'none';
        };
    });
    // Salva modifica
    document.getElementById('editForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const data = document.getElementById('editDate').value;
        const tipo = document.getElementById('editType').value === 'income' ? 'entrata' : 'uscita';
        const importo = parseFloat(document.getElementById('editAmount').value);
        const descrizione = document.getElementById('editDescription').value;
        await fetch(`/api/movimenti/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, tipo, importo, descrizione })
        });
        document.getElementById('editModal').style.display = 'none';
        updateAll();
    });
    // Chiudi modale cliccando fuori
    window.onclick = function(event) {
        const modal = document.getElementById('editModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
});
async function updateSummaryPieChartFromFilters() {
    // Prendi valori dai filtri pie chart
    const month = document.getElementById('pieMonth').value;
    const year = document.getElementById('pieYear').value;
    // Se selezionato mese, obbliga anche anno
    let url = '/api/riepilogo';
    if (month !== 'all' && year !== 'all') {
        url += `?mese=${month}&anno=${year}`;
    } else if (year !== 'all') {
        url += `?anno=${year}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    document.getElementById('totalIncome').textContent = data.entrate.toFixed(2);
    document.getElementById('totalExpense').textContent = data.uscite.toFixed(2);
    document.getElementById('savings').textContent = data.saldo.toFixed(2);
    // Aggiorna anche la torta
    updatePieChart(month, year, data);
}


// ...funzione aggiorna movimenti rimossa perché duplicata e con errori di annidamento...



// --- GRAFICO A TORTA ---
let pieChart;
async function updatePieChart(month, year, dataOverride) {
    // Se dataOverride è passato, usa quello, altrimenti fetch
    let data;
    if (dataOverride) {
        data = dataOverride;
    } else {
        let url = '/api/riepilogo';
        if (month !== 'all' && year !== 'all') {
            url += `?mese=${month}&anno=${year}`;
        } else if (year !== 'all') {
            url += `?anno=${year}`;
        }
        const res = await fetch(url);
        data = await res.json();
    }
    const ctx = document.getElementById('pieChart').getContext('2d');
    // Migliora qualità e riduci dimensione
    ctx.canvas.width = 220;
    ctx.canvas.height = 220;
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
                },
                responsive: false,
                maintainAspectRatio: false
            }
        });
    }
}

// --- GRAFICO ANDAMENTO UNICO ---
let trendChart;
async function updateTrendChart() {
    // Prendi anno dal filtro trend
    let year = document.getElementById('trendYear').value;
    if (!year || year === 'all') year = new Date().getFullYear();
    const res = await fetch(`/api/andamento?year=${year}`);
    const data = await res.json();
    const labels = data.map(d => `${d.mese}/${d.anno}`);
    const entrate = data.map(d => d.entrate);
    const uscite = data.map(d => d.uscite);
    const saldo = data.map(d => d.saldo);
    const ctx = document.getElementById('trendChart').getContext('2d');
    // Migliora qualità
    ctx.canvas.width = 500;
    ctx.canvas.height = 200;
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
                responsive: false,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}

// --- FILTRI E LOGICA UNIFICATA ---
function getMovFilters() {
    const monthSel = document.getElementById('movMonth');
    const yearSel = document.getElementById('movYear');
    const typeSel = document.getElementById('movType');
    const month = monthSel ? monthSel.value : '';
    const year = yearSel ? yearSel.value : '';
    const type = typeSel ? typeSel.value : '';
    return { month, year, type };
}

async function updateAll() {
    // Aggiorna riepilogo e pie chart in base ai filtri pie
    await updateSummaryPieChartFromFilters();
    // Aggiorna andamento in base al filtro trend
    await updateTrendChart();
    // Aggiorna lista movimenti in base ai filtri movimenti
    const { month, year, type } = getMovFilters();
    await updateEntries(month, year, type);
}

// Popola selettore anno dinamicamente
function populateYearSelect(id) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const currentYear = new Date().getFullYear();
    sel.innerHTML = '<option value="all">Tutti</option>';
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
        const opt = document.createElement('option');
        opt.value = String(y);
        opt.textContent = String(y);
        if (y === currentYear) opt.selected = true;
        sel.appendChild(opt);
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
    // Popola select anni per i filtri movimenti
    populateYearSelect('movYear');
    // Eventi filtri movimenti
    document.getElementById('movType').addEventListener('change', updateAll);
    document.getElementById('movMonth').addEventListener('change', updateAll);
    document.getElementById('movYear').addEventListener('change', updateAll);
    // Eventi filtri grafici
    populateYearSelect('pieYear');
    populateYearSelect('trendYear');
    document.getElementById('pieMonth').addEventListener('change', updateAll);
    document.getElementById('pieYear').addEventListener('change', updateAll);
    document.getElementById('trendYear').addEventListener('change', updateAll);
    // Form aggiunta movimento
    const entryForm = document.getElementById('entryForm');
    entryForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const date = document.getElementById('date').value;
        const type = document.getElementById('type').value === 'income' ? 'entrata' : 'uscita';
        const amount = parseFloat(document.getElementById('amount').value);
        const description = document.getElementById('description').value;
        if (!date || isNaN(amount)) return;
        await fetch('/api/movimenti', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: date, tipo: type, importo: amount, descrizione: description })
        });
        entryForm.reset();
        updateAll();
    });
    updateAll();
});