// --- RIEPILOGO ---
async function updateSummary(month, year) {
    let url = '/api/riepilogo';
    if (month && year) url += `?mese=${month}&anno=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    document.getElementById('totalIncome').textContent = data.entrate.toFixed(2);
    document.getElementById('totalExpense').textContent = data.uscite.toFixed(2);
    document.getElementById('savings').textContent = data.saldo.toFixed(2);
}

// --- MOVIMENTI ---
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
        `;
        tbody.appendChild(tr);
    });
}

// --- PIE CHART ---
let pieChart;
async function updatePieChart(month, year, dataOverride) {
    if (!dataOverride) {
        let url = '/api/riepilogo';
        if (month && month !== 'all') url += `?mese=${month}`;
        if (year && year !== 'all') url += (url.includes('?') ? '&' : '?') + `anno=${year}`;
        const res = await fetch(url);
        dataOverride = await res.json();
    }
    const data = dataOverride;
    const canvas = document.getElementById('pieChart');
    const dpr = window.devicePixelRatio || 1;
    // Imposta dimensioni fisiche e CSS per nitidezza retina
    canvas.width = 340 * dpr;
    canvas.height = 340 * dpr;
    canvas.style.width = '340px';
    canvas.style.height = '340px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
    ctx.scale(dpr, dpr);
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

// --- TREND CHART MENSILE ---
let trendChart;
async function updateTrendChart() {
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
    ctx.canvas.height = 220;
    const chartData = {
        labels,
        datasets: [
            {
                label: 'Entrate',
                data: entrate,
                backgroundColor: 'rgba(76,175,80,0.7)',
                borderColor: '#388e3c',
                borderWidth: 2,
                borderRadius: 8,
                categoryPercentage: 0.5,
                barPercentage: 0.8
            },
            {
                label: 'Uscite',
                data: uscite,
                backgroundColor: 'rgba(231,76,60,0.7)',
                borderColor: '#c0392b',
                borderWidth: 2,
                borderRadius: 8,
                categoryPercentage: 0.5,
                barPercentage: 0.8
            },
            {
                label: 'Risparmi',
                data: saldo,
                backgroundColor: 'rgba(52,152,219,0.7)',
                borderColor: '#217dbb',
                borderWidth: 2,
                borderRadius: 8,
                categoryPercentage: 0.5,
                barPercentage: 0.8
            }
        ]
    };
    if (trendChart) {
        trendChart.data = chartData;
        trendChart.options.plugins.legend.labels.font = { size: 15, weight: 'bold' };
        trendChart.update();
    } else {
        trendChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { font: { size: 15, weight: 'bold' } } },
                    tooltip: { enabled: true }
                },
                responsive: false,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: '#e0e0e0' }, ticks: { color: '#2a4d69', font: { size: 13 } } },
                    x: { grid: { color: '#f0f0f0' }, ticks: { color: '#2a4d69', font: { size: 13 } } }
                },
                animation: { duration: 900, easing: 'easeOutQuart' }
            }
        });
    }
}

// --- GRAFICO ANDAMENTO ANNUALE ---
let annualChart;
async function updateAnnualChart() {
    const res = await fetch('/api/movimenti');
    const data = await res.json();
    const stats = {};
    data.forEach(mov => {
        const year = mov.data.slice(0, 4);
        if (!stats[year]) stats[year] = { entrate: 0, uscite: 0, saldo: 0 };
        if (mov.tipo === 'entrata') stats[year].entrate += mov.importo;
        else if (mov.tipo === 'uscita') stats[year].uscite += mov.importo;
    });
    Object.keys(stats).forEach(anno => {
        stats[anno].saldo = stats[anno].entrate - stats[anno].uscite;
    });
    const labels = Object.keys(stats).sort();
    const entrate = labels.map(y => stats[y].entrate);
    const uscite = labels.map(y => stats[y].uscite);
    const saldo = labels.map(y => stats[y].saldo);
    const ctx = document.getElementById('annualChart').getContext('2d');
    ctx.canvas.width = 500;
    ctx.canvas.height = 220;
    const chartData = {
        labels,
        datasets: [
            {
                label: 'Entrate',
                data: entrate,
                backgroundColor: 'rgba(76,175,80,0.7)',
                borderColor: '#388e3c',
                borderWidth: 2,
                borderRadius: 8,
                categoryPercentage: 0.5,
                barPercentage: 0.8
            },
            {
                label: 'Uscite',
                data: uscite,
                backgroundColor: 'rgba(231,76,60,0.7)',
                borderColor: '#c0392b',
                borderWidth: 2,
                borderRadius: 8,
                categoryPercentage: 0.5,
                barPercentage: 0.8
            },
            {
                label: 'Risparmi',
                data: saldo,
                backgroundColor: 'rgba(52,152,219,0.7)',
                borderColor: '#217dbb',
                borderWidth: 2,
                borderRadius: 8,
                categoryPercentage: 0.5,
                barPercentage: 0.8
            }
        ]
    };
    if (annualChart) {
        annualChart.data = chartData;
        annualChart.options.plugins.legend.labels.font = { size: 15, weight: 'bold' };
        annualChart.update();
    } else {
        annualChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                plugins: {
                    legend: { display: true, position: 'bottom', labels: { font: { size: 15, weight: 'bold' } } },
                    tooltip: { enabled: true }
                },
                responsive: false,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: '#e0e0e0' }, ticks: { color: '#2a4d69', font: { size: 13 } } },
                    x: { grid: { color: '#f0f0f0' }, ticks: { color: '#2a4d69', font: { size: 13 } } }
                },
                animation: { duration: 900, easing: 'easeOutQuart' }
            }
        });
    }
}

// --- MODIFICA MOVIMENTO ---
function openEditModal(id) {
    fetch(`/api/movimenti?id=${id}`)
        .then(res => res.json())
        .then(entry => {
            if (Array.isArray(entry)) entry = entry[0];
            document.getElementById('editId').value = entry.id;
            document.getElementById('editDate').value = entry.data;
            document.getElementById('editType').value = entry.tipo === 'entrata' ? 'income' : 'expense';
            document.getElementById('editAmount').value = entry.importo;
            document.getElementById('editDescription').value = entry.descrizione || '';
            document.getElementById('editModal').style.display = 'block';
        });
}

// --- FILTRI UNIFICATI ---
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
    await updateSummaryPieChartFromFilters();
    await updateTrendChart();
    await updateAnnualChart();
    const { month, year, type } = getMovFilters();
    await updateEntries(month, year, type);
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

// --- AGGIORNA ENTRIES CON FILTRI ---
async function updateEntries(month, year, type) {
    // Mostra tabella su desktop, card su mobile
    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    const table = document.getElementById('entriesTable');
    const mobileContainer = document.querySelector('.entries-table-mobile');
    if (isMobile) {
        table.style.display = 'none';
        mobileContainer.style.display = 'flex';
    } else {
        table.style.display = '';
        mobileContainer.style.display = 'none';
    }

    if (month && month !== 'all' && (!year || year === 'all')) {
        if (isMobile) {
            mobileContainer.innerHTML = '<div style="text-align:center;color:#888;padding:12px;">Seleziona anche l\'anno</div>';
        } else {
            const tbody = document.querySelector('#entriesTable tbody');
            tbody.innerHTML = '';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5" style="text-align:center;color:#888;">Seleziona anche l'anno</td>`;
            tbody.appendChild(tr);
        }
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


    if (isMobile) {
        // Mostra card con edit inline
        mobileContainer.innerHTML = '';
        if (!entries.length) {
            mobileContainer.innerHTML = '<div style="text-align:center;color:#888;padding:12px;">Nessun movimento trovato</div>';
            return;
        }
        entries.forEach(e => {
            const card = document.createElement('div');
            card.className = 'entry-card';
            card.dataset.id = e.id;
            card.innerHTML = `
                <div class="entry-card-row"><span class="entry-card-label">Data:</span> <span class="entry-card-value">${e.data}</span></div>
                <div class="entry-card-row"><span class="entry-card-label">Tipo:</span> <span class="entry-card-value">${e.tipo === 'entrata' ? 'Entrata <span class=\"badge badge-entrata\">Entrata</span>' : (e.tipo === 'uscita' ? 'Uscita <span class=\"badge badge-uscita\">Uscita</span>' : e.tipo)}</span></div>
                <div class="entry-card-row"><span class="entry-card-label">Importo:</span> <span class="entry-card-value">${e.importo.toFixed(2)} &euro;</span></div>
                <div class="entry-card-row"><span class="entry-card-label">Descrizione:</span> <span class="entry-card-value">${e.descrizione || ''}</span></div>
                <div class="entry-card-actions">
                    <button class="edit-btn" data-id="${e.id}" title="Modifica movimento">&#9998;</button>
                    <button class="delete-btn" data-id="${e.id}" title="Elimina movimento">&#128465;</button>
                </div>
            `;
            mobileContainer.appendChild(card);
        });
        // Azioni elimina
        mobileContainer.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async function() {
                if (confirm('Eliminare questa transazione?')) {
                    await fetch(`/api/movimenti/${btn.dataset.id}`, { method: 'DELETE' });
                    updateAll();
                }
            };
        });
        // Azioni modifica inline
        mobileContainer.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = function() {
                const card = btn.closest('.entry-card');
                const id = btn.dataset.id;
                const entry = entries.find(x => String(x.id) === String(id));
                if (!entry) return;
                // Sostituisci contenuto con form inline
                card.innerHTML = `
                    <form class="edit-inline-form">
                        <div class="mb-2">
                            <label class="form-label">Data</label>
                            <input type="date" class="form-control" name="data" value="${entry.data}" required>
                        </div>
                        <div class="mb-2">
                            <label class="form-label">Tipo</label>
                            <select class="form-select" name="tipo">
                                <option value="entrata" ${entry.tipo === 'entrata' ? 'selected' : ''}>Entrata</option>
                                <option value="uscita" ${entry.tipo === 'uscita' ? 'selected' : ''}>Uscita</option>
                            </select>
                        </div>
                        <div class="mb-2">
                            <label class="form-label">Importo</label>
                            <input type="number" class="form-control" name="importo" value="${entry.importo}" min="0" step="0.01" required>
                        </div>
                        <div class="mb-2">
                            <label class="form-label">Descrizione</label>
                            <input type="text" class="form-control" name="descrizione" value="${entry.descrizione || ''}">
                        </div>
                        <div class="d-flex justify-content-end gap-2">
                            <button type="submit" class="btn btn-success btn-sm">Salva</button>
                            <button type="button" class="btn btn-secondary btn-sm cancel-edit">Annulla</button>
                        </div>
                    </form>
                `;
                card.querySelector('.cancel-edit').onclick = () => updateAll();
                card.querySelector('form').onsubmit = async function(ev) {
                    ev.preventDefault();
                    const fd = new FormData(ev.target);
                    const data = fd.get('data');
                    const tipo = fd.get('tipo');
                    const importo = parseFloat(fd.get('importo'));
                    const descrizione = fd.get('descrizione');
                    await fetch(`/api/movimenti/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ data, tipo, importo, descrizione })
                    });
                    updateAll();
                };
            };
        });
        return;
    }

    // Desktop: tabella classica con edit inline
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
                <button class="edit-btn" data-id="${e.id}" title="Modifica movimento">✏️</button>
                <button class="delete-btn" data-id="${e.id}" title="Elimina movimento">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = async function() {
            if (confirm('Eliminare questa transazione?')) {
                await fetch(`/api/movimenti/${btn.dataset.id}`, { method: 'DELETE' });
                updateAll();
            }
        };
    });
    tbody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = function() {
            const tr = btn.closest('tr');
            const id = btn.dataset.id;
            const entry = entries.find(x => String(x.id) === String(id));
            if (!entry) return;
            // Sostituisci la riga con form inline
            tr.innerHTML = `
                <td colspan="5">
                    <form class="edit-inline-form row g-2 align-items-end">
                        <div class="col-12 col-md-2 mb-2">
                            <input type="date" class="form-control" name="data" value="${entry.data}" required>
                        </div>
                        <div class="col-12 col-md-2 mb-2">
                            <select class="form-select" name="tipo">
                                <option value="entrata" ${entry.tipo === 'entrata' ? 'selected' : ''}>Entrata</option>
                                <option value="uscita" ${entry.tipo === 'uscita' ? 'selected' : ''}>Uscita</option>
                            </select>
                        </div>
                        <div class="col-12 col-md-2 mb-2">
                            <input type="number" class="form-control" name="importo" value="${entry.importo}" min="0" step="0.01" required>
                        </div>
                        <div class="col-12 col-md-4 mb-2">
                            <input type="text" class="form-control" name="descrizione" value="${entry.descrizione || ''}">
                        </div>
                        <div class="col-12 col-md-2 d-flex gap-2 mb-2">
                            <button type="submit" class="btn btn-success btn-sm">Salva</button>
                            <button type="button" class="btn btn-secondary btn-sm cancel-edit">Annulla</button>
                        </div>
                    </form>
                </td>
            `;
            tr.querySelector('.cancel-edit').onclick = () => updateAll();
            tr.querySelector('form').onsubmit = async function(ev) {
                ev.preventDefault();
                const fd = new FormData(ev.target);
                const data = fd.get('data');
                const tipo = fd.get('tipo');
                const importo = parseFloat(fd.get('importo'));
                const descrizione = fd.get('descrizione');
                await fetch(`/api/movimenti/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data, tipo, importo, descrizione })
                });
                updateAll();
            };
        };
    });
}

// --- UPDATE SUMMARY PIE DA FILTRI ---
async function updateSummaryPieChartFromFilters() {
    const month = document.getElementById('pieMonth').value;
    const year = document.getElementById('pieYear').value;
    let url = '/api/riepilogo';
    if (month !== 'all' && year === 'all') {
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

// --- INIZIALIZZAZIONE ---
document.addEventListener('DOMContentLoaded', () => {
    populateYearSelect('pieYear');
    populateYearSelect('trendYear');
    populateYearSelect('movYear');

    document.getElementById('pieMonth').addEventListener('change', updateAll);
    document.getElementById('pieYear').addEventListener('change', updateAll);
    document.getElementById('trendYear').addEventListener('change', updateAll);
    document.getElementById('movMonth').addEventListener('change', updateAll);
    document.getElementById('movYear').addEventListener('change', updateAll);
    document.getElementById('movType').addEventListener('change', updateAll);

    document.getElementById('entryForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const tipo = document.getElementById('type').value === 'income' ? 'entrata' : 'uscita';
        const descrizione = document.getElementById('description').value;
        const importo = parseFloat(document.getElementById('amount').value);
        const data = document.getElementById('date').value;
        await fetch('/api/movimenti', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo, descrizione, importo, data })
        });
        document.getElementById('entryForm').reset();
        updateAll();
    });


    updateAll();
});
