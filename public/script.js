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

            // --- PIE CHART ---
            let pieChart;
            async function updatePieChart() {
                const month = document.getElementById('pieMonth').value;
                const year = document.getElementById('pieYear').value;
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

            // --- TREND CHART ---
            let trendChart;
            async function updateTrendChart() {
                const year = document.getElementById('trendYear').value;
                let y = year && year !== 'all' ? year : new Date().getFullYear();
                const res = await fetch(`/api/andamento?year=${y}`);
                const data = await res.json();
                const labels = data.map(d => `${d.mese}/${d.anno}`);
                const entrate = data.map(d => d.entrate);
                const uscite = data.map(d => d.uscite);
                const saldo = data.map(d => d.saldo);
                const ctx = document.getElementById('trendChart').getContext('2d');
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

            // --- MOVIMENTI ---
            async function updateEntries() {
                const type = document.getElementById('movType').value;
                const month = document.getElementById('movMonth').value;
                const year = document.getElementById('movYear').value;
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
                            updateEntries();
                            updateSummary();
                            updatePieChart();
                            updateTrendChart();
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

            // --- RIEPILOGO ---
            async function updateSummary() {
                // Mostra sempre il totale generale (non filtrato)
                const res = await fetch('/api/riepilogo');
                const data = await res.json();
                document.getElementById('totalIncome').textContent = data.entrate.toFixed(2);
                document.getElementById('totalExpense').textContent = data.uscite.toFixed(2);
                document.getElementById('savings').textContent = data.saldo.toFixed(2);
            }

            // --- POPOLA ANNI ---
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

            // --- INIZIALIZZAZIONE FILTRI E EVENTI ---
            document.addEventListener('DOMContentLoaded', () => {
                populateYearSelect('pieYear');
                populateYearSelect('trendYear');
                populateYearSelect('movYear');
                document.getElementById('pieMonth').addEventListener('change', updatePieChart);
                document.getElementById('pieYear').addEventListener('change', updatePieChart);
                document.getElementById('trendYear').addEventListener('change', updateTrendChart);
                document.getElementById('movType').addEventListener('change', updateEntries);
                document.getElementById('movMonth').addEventListener('change', updateEntries);
                document.getElementById('movYear').addEventListener('change', updateEntries);
                updateSummary();
                updatePieChart();
                updateTrendChart();
                updateEntries();
            });
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

// --- GRAFICO ANDAMENTO UNICO ---
let trendChart;
async function updateTrendChart(month, year) {
    // Il backend accetta solo year, ma il filtro mese serve per la tabella e la torta
    if (!year || year === 'all') year = new Date().getFullYear();
    const res = await fetch(`/api/andamento?year=${year}`);
    const data = await res.json();
    const labels = data.map(d => `${d.mese}/${d.anno}`);
    const entrate = data.map(d => d.entrate);
    const uscite = data.map(d => d.uscite);
    const saldo = data.map(d => d.saldo);
    const ctx = document.getElementById('trendChart').getContext('2d');
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

// --- FILTRI E LOGICA UNIFICATA ---
function getSelectedFilters() {
    const monthSel = document.getElementById('monthFilter');
    const yearSel = document.getElementById('yearFilter');
    const typeSel = document.getElementById('typeFilter');
    const month = monthSel ? monthSel.value : '';
    const year = yearSel ? yearSel.value : '';
    const type = typeSel ? typeSel.value : '';
    return { month, year, type };
}

async function updateAll() {
    const { month, year, type } = getSelectedFilters();
    await updateSummary(month, year);
    await updatePieChart(month, year);
    await updateTrendChart(month, year);
    await updateEntries(month, year, type);
}

// Popola selettore anno dinamicamente
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
    document.getElementById('typeFilter').addEventListener('change', updateAll);
    document.getElementById('monthFilter').addEventListener('change', updateAll);
    document.getElementById('yearFilter').addEventListener('change', updateAll);
    updateAll();
});