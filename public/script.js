async function updateSummary() {
    const res = await fetch('/api/summary');
    const data = await res.json();
    document.getElementById('totalIncome').textContent = data.totalIncome.toFixed(2);
    document.getElementById('totalExpense').textContent = data.totalExpense.toFixed(2);
    document.getElementById('savings').textContent = data.savings.toFixed(2);
}


async function updateEntries() {
    const res = await fetch('/api/entries');
    const entries = await res.json();
    const tbody = document.querySelector('#entriesTable tbody');
    tbody.innerHTML = '';
    entries.slice().reverse().forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${e.date}</td>
            <td>${e.type === 'income' ? 'Entrata' : 'Uscita'}</td>
            <td>${e.amount.toFixed(2)} €</td>
            <td>${e.description || ''}</td>
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
                await fetch(`/api/entry/${btn.dataset.id}`, { method: 'DELETE' });
                updateSummary();
                updateEntries();
                updatePieChart();
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
    const res = await fetch('/api/entries');
    const entries = await res.json();
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    document.getElementById('editId').value = entry.id;
    document.getElementById('editDate').value = entry.date;
    document.getElementById('editType').value = entry.type;
    document.getElementById('editAmount').value = entry.amount;
    document.getElementById('editDescription').value = entry.description || '';
    modal.style.display = 'block';
}

document.getElementById('editForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const date = document.getElementById('editDate').value;
    const type = document.getElementById('editType').value;
    const amount = document.getElementById('editAmount').value;
    const description = document.getElementById('editDescription').value;
    await fetch(`/api/entry/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type, amount, description })
    });
    closeModal();
    updateSummary();
    updateEntries();
    updatePieChart();
});

document.getElementById('entryForm').addEventListener('submit', async e => {
    e.preventDefault();
    const date = document.getElementById('date').value;
    const type = document.getElementById('type').value;
    const amount = document.getElementById('amount').value;
    const description = document.getElementById('description').value;
    await fetch('/api/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type, amount, description })
    });
    document.getElementById('entryForm').reset();
    updateSummary();
    updateEntries();
    updatePieChart();
});


// GRAFICO A TORTA
let pieChart;
async function updatePieChart() {
    const res = await fetch('/api/summary');
    const data = await res.json();
    const ctx = document.getElementById('pieChart').getContext('2d');
    const chartData = {
        labels: ['Entrate', 'Uscite', 'Risparmi'],
        datasets: [{
            data: [data.totalIncome, data.totalExpense, Math.max(data.savings, 0)],
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
