const API_URL = 'https://raw-philipa-odvin123-8a860263.koyeb.app/api';
let token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        alert('Sesión no válida. Redirigiendo al login...');
        window.location.href = 'login.html';
        return;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    document.getElementById('fecha-inicio').valueAsDate = startOfMonth;
    document.getElementById('fecha-fin').valueAsDate = now;

    loadVentas();

    document.getElementById('btn-mostrar').addEventListener('click', handleFilter);
    document.getElementById('btn-refrescar').addEventListener('click', () => loadVentas());
});

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-NI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);
}

// Renderizar tabla de ventas
function renderVentas(ventas) {
    const tbody = document.getElementById('ventas-tbody');
    const totalElement = document.getElementById('total-acumulado');

    if (!ventas || ventas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #6c757d;">No se encontraron ventas.</td></tr>`;
        totalElement.textContent = 'C$0.00';
        return;
    }

    let totalAcumulado = 0;
    let rows = '';

    ventas.forEach(venta => {
        totalAcumulado += parseFloat(venta.total);

        const productosHTML = venta.detalles && venta.detalles.length 
            ? `<div class="productos-lista">${venta.detalles.map(d => 
                  `<div class="producto-item">
                    <span>${d.cantidad} × ${d.descripcion}</span>
                    <span>C$${parseFloat(d.subtotal).toFixed(2)}</span>
                  </div>`
              ).join('')}</div>`
            : '<em>Sin productos</em>';

        const esFactura = venta.es_factura ? '<span class="factura-yes">✔️ Sí</span>' : '<span class="factura-no">❌ No</span>';

        rows += `
            <tr>
                <td><strong>${venta.folio}</strong></td>
                <td>${formatDate(venta.fecha_venta)}</td>
                <td>${venta.cliente_nombre || '—'}</td>
                <td>${venta.vendedor_nombre || '—'}</td>
                <td>${productosHTML}</td>
                <td>C$${parseFloat(venta.subtotal).toFixed(2)}</td>
                <td>C$${parseFloat(venta.impuesto).toFixed(2)}</td>
                <td>C$${parseFloat(venta.descuento).toFixed(2)}</td>
                <td><strong>C$${parseFloat(venta.total).toFixed(2)}</strong></td>
                <td>${esFactura}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rows;
    totalElement.textContent = `C$${totalAcumulado.toFixed(2)}`;
}

async function loadVentas(fecha_inicio = null, fecha_fin = null) {
    const tbody = document.getElementById('ventas-tbody');
    tbody.innerHTML = '<tr><td colspan="10" class="loading">Cargando ventas...</td></tr>';

    try {
        let url = `${API_URL}/admin/ventas/reportes`;
        if (fecha_inicio && fecha_fin) {
            url += `?inicio=${fecha_inicio}&fin=${fecha_fin}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            alert('⚠️ Sesión expirada o sin permisos. Redirigiendo...');
            localStorage.clear();
            window.location.href = 'login.html';
            return;
        }

        const result = await response.json();

        if (result.success) {
            renderVentas(result.ventas || []);
        } else {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: red;">${result.message || 'Error al cargar ventas.'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error en loadVentas:', error);
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: red;">Error de conexión con el servidor.</td></tr>`;
    }
}

function handleFilter() {
    const inicioInput = document.getElementById('fecha-inicio').value;
    const finInput = document.getElementById('fecha-fin').value;

    if (!inicioInput || !finInput) {
        alert('⚠️ Por favor, seleccione ambas fechas.');
        return;
    }

    const inicio = new Date(inicioInput);
    const fin = new Date(finInput);
    if (fin < inicio) {
        alert('⚠️ La fecha final no puede ser anterior a la fecha inicial.');
        return;
    }

    const inicioISO = inicio.toISOString().split('T')[0];
    const finISO = fin.toISOString().split('T')[0];

    loadVentas(inicioISO, finISO);
}