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
    let url = '/api/riepilogo';
    if (month !== 'all' && year === 'all') {
        // Se selezioni solo mese, chiedi anche l'anno (non aggiorna nulla finché non selezioni anno)
        document.getElementById('totalIncome').textContent = '0.00';
        document.getElementById('totalExpense').textContent = '0.00';
        document.getElementById('savings').textContent = '0.00';
        updatePieChart('all', 'all', { entrate: 0, uscite: 0, saldo: 0 });
        return;
    }
    if (year !== 'all' && month !== 'all') {
        url += `?mese=${month}&anno=${year}`;
    } else if (year !== 'all') {
        url += `?anno=${year}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    document.getElementById('totalIncome').textContent = data.entrate.toFixed(2);
    document.getElementById('totalExpense').textContent = data.uscite.toFixed(2);
    document.getElementById('savings').textContent = data.saldo.toFixed(2);
    updatePieChart(month, year, data);
}


// ...funzione aggiorna movimenti rimossa perché duplicata e con errori di annidamento...



// --- GRAFICO A TORTA ---
let pieChart;
function updatePieChart(month, year, dataOverride) {
    // Usa sempre i dati passati (mai fetch qui!)
    const data = dataOverride;
    const ctx = document.getElementById('pieChart').getContext('2d');
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
    // Se selezioni solo mese e anno = 'all', non aggiorna e non fa chiamata
    if (month && month !== 'all' && (!year || year === 'all')) {
        const tbody = document.querySelector('#entriesTable tbody');
        tbody.innerHTML = '';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" style="text-align:center;color:#888;">Seleziona anche l'anno</td>`;
        tbody.appendChild(tr);
        return;
    }
    let url = '/api/movimenti';
    const params = [];
    if (month && month !== 'all') params.push(`mese=${month}`);
    if (year && year !== 'all') params.push(`anno=${year}`);
    if (type && type !== 'all') params.push(`tipo=${type}`);
    if (params.length) url += '?' + params.join('&');
    const res = await fetch(url);
    let entries = await res.json();
    const tbody = document.querySelector('#entriesTable tbody');
    tbody.innerHTML = '';
    if (!entries.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" style="text-align:center;color:#888;">Nessun movimento trovato</td>`;
        tbody.appendChild(tr);
        return;
    }
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
// --- GRAFICA MODERNA ---
function applyModernStyles() {
    document.body.style.background = '#eaf0fa';
    document.body.style.fontFamily = 'Inter, Arial, sans-serif';
    document.querySelectorAll('.container').forEach(c => {
        c.style.background = '#fff';
        c.style.borderRadius = '18px';
        c.style.boxShadow = '0 2px 16px 0 #b3c6e0';
        c.style.padding = '32px 24px';
        c.style.margin = '32px auto';
        c.style.maxWidth = '480px';
    });
    document.querySelectorAll('input, select, button').forEach(el => {
        el.style.borderRadius = '8px';
        el.style.border = '1px solid #b3c6e0';
        el.style.padding = '8px 10px';
        el.style.marginRight = '8px';
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
            ctx.canvas.width = 500;
            ctx.canvas.height = 200;
            const chartData = {
                labels,
                datasets: [
                    {
                        label: 'Entrate',
                        data: entrate,
                        backgroundColor: '#4caf50',
                        borderColor: '#4caf50',
                        borderWidth: 1
                    },
                    {
                        label: 'Uscite',
                        data: uscite,
                        backgroundColor: '#e74c3c',
                        borderColor: '#e74c3c',
                        borderWidth: 1
                    },
                    {
                        label: 'Risparmi',
                        data: saldo,
                        backgroundColor: '#3498db',
                        borderColor: '#3498db',
                        borderWidth: 1
                    }
                ]
            };
            if (trendChart) {
                trendChart.data = chartData;
                trendChart.update();
            } else {
                trendChart = new Chart(ctx, {
                    type: 'bar',
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
        }}
    )

    }