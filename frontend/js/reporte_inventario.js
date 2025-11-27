// js/reporte_inventario.js
const API_URL = 'http://localhost:4000/api';
let token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        alert('⚠️ Sesión no válida. Redirigiendo al login...');
        window.location.href = 'login.html';
        return;
    }

    // Fechas predeterminadas: último mes
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    document.getElementById('fecha-inicio').valueAsDate = startOfMonth;
    document.getElementById('fecha-fin').valueAsDate = now;

    loadMovimientos();

    // Event listeners
    document.getElementById('btn-ejecutar').addEventListener('click', handleEjecutar);
    document.getElementById('btn-recargar').addEventListener('click', loadMovimientos);
    document.getElementById('btn-exportar').addEventListener('click', exportarCSV);
});

function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('es-NI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function renderMovimientos(movimientos) {
    const tbody = document.getElementById('movimientos-tbody');
    const entradasEl = document.getElementById('total-entradas');
    const salidasEl = document.getElementById('total-salidas');
    const balanceEl = document.getElementById('balance-neto');

    if (!movimientos || movimientos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #6c757d;">No hay movimientos en el rango seleccionado.</td></tr>`;
        entradasEl.textContent = '0';
        salidasEl.textContent = '0';
        balanceEl.textContent = '0';
        balanceEl.style.color = '#6c757d';
        return;
    }

    let totalEntradas = 0;
    let totalSalidas = 0;

    let rows = '';
    movimientos.forEach(m => {
        const tipoClass = `tipo-${m.tipo}`;
        const cantidad = m.cantidad;
        const stockAntes = m.nuevo_stock - cantidad;

        if (m.tipo === 'ENTRADA') totalEntradas += cantidad;
        if (m.tipo === 'SALIDA') totalSalidas += Math.abs(cantidad);

        rows += `
            <tr>
                <td>${formatDate(m.fecha)}</td>
                <td>${m.producto || '—'}</td>
                <td><span class="${tipoClass}">${m.tipo}</span></td>
                <td style="text-align: right;">${cantidad > 0 ? '+' : ''}${cantidad}</td>
                <td style="text-align: right;">${stockAntes}</td>
                <td style="text-align: right;">${m.nuevo_stock}</td>
                <td>${m.usuario || 'Sistema'}</td>
                <td>${m.referencia || '—'}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rows;
    entradasEl.textContent = totalEntradas;
    salidasEl.textContent = totalSalidas;
    const balance = totalEntradas - totalSalidas;
    balanceEl.textContent = balance;
    balanceEl.style.color = balance >= 0 ? '#28a745' : '#dc3545';
}

async function loadMovimientos(tipo = 'TODOS', inicio = null, fin = null) {
    const tbody = document.getElementById('movimientos-tbody');
    tbody.innerHTML = '<tr><td colspan="8" class="loading">Cargando movimientos...</td></tr>';

    try {
        let url = `${API_URL}/admin/inventario/entradas?tipo=${tipo}`;
        if (inicio && fin) {
            url += `&inicio=${inicio}&fin=${fin}`;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            alert('⚠️ Sesión expirada. Redirigiendo...');
            localStorage.clear();
            window.location.href = 'login.html';
            return;
        }

        const result = await response.json();
        if (result.success) {
            renderMovimientos(result.movimientos || []);
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">${result.message || 'Error al cargar.'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error en loadMovimientos:', error);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Error de conexión.</td></tr>`;
    }
}

function handleEjecutar() {
    const tipo = document.getElementById('tipo-movimiento').value;
    const inicio = document.getElementById('fecha-inicio').value;
    const fin = document.getElementById('fecha-fin').value;

    if (!inicio || !fin) {
        alert('⚠️ Seleccione ambas fechas.');
        return;
    }

    const inicioDate = new Date(inicio);
    const finDate = new Date(fin);
    if (finDate < inicioDate) {
        alert('⚠️ La fecha final no puede ser anterior a la inicial.');
        return;
    }

    const inicioISO = inicioDate.toISOString().split('T')[0];
    const finISO = finDate.toISOString().split('T')[0];

    loadMovimientos(tipo, inicioISO, finISO);
}

function exportarCSV() {
    const rows = document.querySelectorAll('#movimientos-tbody tr');
    if (rows.length === 0 || rows[0].querySelector('td').colSpan) {
        alert('⚠️ No hay datos para exportar.');
        return;
    }

    const data = [];
    const headers = ['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Stock Antes', 'Stock Después', 'Usuario', 'Referencia'];
    data.push(headers);

    rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        const rowData = [
            cols[0].innerText.trim(),
            cols[1].innerText.trim(),
            cols[2].querySelector('span').innerText.trim(),
            cols[3].innerText.trim(),
            cols[4].innerText.trim(),
            cols[5].innerText.trim(),
            cols[6].innerText.trim(),
            cols[7].innerText.trim()
        ];
        data.push(rowData);
    });

    const csv = data.map(e => `"${e.join('","')}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte_inventario.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}