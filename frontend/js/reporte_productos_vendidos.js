// js/reporte_productos_vendidos.js
const API_URL = 'http://localhost:4000/api';
let token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        alert('⚠️ Sesión no válida. Redirigiendo al login...');
        window.location.href = 'login.html';
        return;
    }

    // Establecer fechas predeterminadas: mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    document.getElementById('fecha-inicio').valueAsDate = startOfMonth;
    document.getElementById('fecha-fin').valueAsDate = now;

    // Cargar datos iniciales
    loadReporte();

    // Event listeners
    document.getElementById('btn-ejecutar').addEventListener('click', handleEjecutar);
    document.getElementById('btn-recargar').addEventListener('click', loadReporte);
    document.getElementById('btn-imprimir').addEventListener('click', handleImprimir);
    document.getElementById('btn-exportar').addEventListener('click', handleExportar);
});

// Formatear fecha dd/mm/yyyy
function formatDate(dateString) {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleDateString('es-NI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Formatear moneda C$
function formatCurrency(value) {
    return `C$${parseFloat(value || 0).toFixed(2)}`;
}

// Renderizar tabla
function renderReporte(data) {
    const tbody = document.getElementById('productos-tbody');
    const ventaTotalEl = document.getElementById('venta-total');
    const recuperacionEl = document.getElementById('recuperacion-total');
    const gananciaEl = document.getElementById('ganancia-total');

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #6c757d;">No hay productos vendidos en el rango seleccionado.</td></tr>`;
        ventaTotalEl.textContent = 'C$0.00';
        recuperacionEl.textContent = 'C$0.00';
        gananciaEl.textContent = 'C$0.00';
        return;
    }

    let ventaTotal = 0;
    let recuperacionTotal = 0;
    let gananciaTotal = 0;

    let rows = '';
    data.forEach(item => {
        const venta = parseFloat(item.venta) || 0;
        const costo = parseFloat(item.costo) || 0;
        const ganancia = venta - costo;

        ventaTotal += venta;
        recuperacionTotal += costo;
        gananciaTotal += ganancia;

        rows += `
            <tr>
                <td>${formatDate(item.fecha_venta)}</td>
                <td>${item.clave || '—'}</td>
                <td>${item.descripcion || '—'}</td>
                <td>${item.cantidad}</td>
                <td>${formatCurrency(venta)}</td>
                <td>${formatCurrency(item.precio_unitario)}</td>
                <td>${formatCurrency(costo)}</td>
                <td>${formatCurrency(costo)}</td>
                <td style="color: ${ganancia >= 0 ? 'green' : 'red'};">${formatCurrency(ganancia)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rows;
    ventaTotalEl.textContent = formatCurrency(ventaTotal);
    recuperacionEl.textContent = formatCurrency(recuperacionTotal);
    gananciaEl.textContent = formatCurrency(gananciaTotal);
    gananciaEl.style.color = gananciaTotal >= 0 ? 'green' : 'red';
}

// Cargar reporte (todos o por rango)
async function loadReporte(inicio = null, fin = null) {
    const tbody = document.getElementById('productos-tbody');
    tbody.innerHTML = '<tr><td colspan="9" class="loading">Cargando productos vendidos...</td></tr>';

    try {
        let url = `${API_URL}/admin/ventas/productos-vendidos`;
        if (inicio && fin) {
            url += `?inicio=${inicio}&fin=${fin}`;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            alert('⚠️ Sesión expirada o sin permisos. Redirigiendo...');
            localStorage.clear();
            window.location.href = 'login.html';
            return;
        }

        const result = await response.json();

        if (result.success) {
            renderReporte(result.productos || []);
        } else {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">${result.message || 'Error al cargar el reporte.'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error en loadReporte:', error);
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">Error de conexión con el servidor.</td></tr>`;
    }
}

// Ejecutar con fechas seleccionadas
function handleEjecutar() {
    const inicioInput = document.getElementById('fecha-inicio').value;
    const finInput = document.getElementById('fecha-fin').value;

    if (!inicioInput || !finInput) {
        alert('⚠️ Por favor, seleccione ambas fechas.');
        return;
    }

    const inicio = new Date(inicioInput);
    const fin = new Date(finInput);
    if (fin < inicio) {
        alert('⚠️ La fecha final no puede ser anterior a la inicial.');
        return;
    }

    const inicioISO = inicio.toISOString().split('T')[0];
    const finISO = fin.toISOString().split('T')[0];

    loadReporte(inicioISO, finISO);
}

// Imprimir
function handleImprimir() {
    window.print();
}

// Exportar a Excel (requiere SheetJS - lo añadiremos en el HTML si quieres, o uso CSV temporal)
function handleExportar() {
    const data = [];
    const headers = ['FECHA', 'CLAVE', 'DESCRIPCIÓN', 'CANTIDAD', 'VENTA', 'PRECIO', 'COSTO', 'RECUPERACIÓN', 'GANANCIA'];
    data.push(headers);

    const rows = document.querySelectorAll('#productos-tbody tr');
    if (rows.length === 0 || rows[0].querySelector('td').colSpan) {
        alert('⚠️ No hay datos para exportar.');
        return;
    }

    rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        const rowData = [];
        cols.forEach((col, i) => {
            let text = col.innerText.trim();
            // Eliminar "C$" para dejar solo número
            if (i >= 4 && i <= 8) text = text.replace('C$', '').replace(',', '');
            rowData.push(text);
        });
        data.push(rowData);
    });

    // Exportar como CSV (alternativa ligera sin librerías)
    const csvContent = 'data:text/csv;charset=utf-8,' + 
        data.map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'reporte_productos_vendidos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}