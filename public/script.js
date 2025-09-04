async function updateSummary() {
    const res = await fetch('/api/riepilogo');
    const data = await res.json();
    document.getElementById('totalIncome').textContent = data.entrate.toFixed(2);
    document.getElementById('totalExpense').textContent = data.uscite.toFixed(2);
    document.getElementById('savings').textContent = data.saldo.toFixed(2);
}


async function updateEntries() {
    const res = await fetch('/api/movimenti');
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
async function updatePieChart() {
    const res = await fetch('/api/riepilogo');
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

async function updateAll() {
    await updateSummary();
    await updateEntries();
    await updatePieChart();
}

updateAll();
