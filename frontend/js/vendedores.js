// js/vendedores.js

const API_URL = 'http://localhost:4000/api';
let token = localStorage.getItem('token');
const DEFAULT_VENDEDOR = 'administrador';
let vendedoresCache = [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificación de Autenticación
    if (!token) {
        alert('Sesión no iniciada. Redirigiendo a login.');
        window.location.href = 'login.html';
        return;
    }
    loadVendedores(true); 
});

// --- Modal y CRUD ---

function openVendedorModal(id = null) {
    const modal = document.getElementById('vendedorModal');
    const title = document.getElementById('vendedor-modal-title');
    const idInput = document.getElementById('vendedor-id');
    const nameInput = document.getElementById('vendedor_nombre');

    if (id) {
        const vendedor = vendedoresCache.find(v => v.id == id);
        if (!vendedor || vendedor.nombre.toLowerCase() === DEFAULT_VENDEDOR) {
            alert('Error: Vendedor no editable o no encontrado.'); return; 
        }
        title.textContent = `Editar Vendedor (ID: ${id})`;
        idInput.value = vendedor.id;
        nameInput.value = vendedor.nombre;
    } else {
        title.textContent = 'Agregar Nuevo Vendedor';
        idInput.value = '';
        document.getElementById('vendedorForm').reset();
    }
    modal.style.display = 'flex';
}

function closeVendedorModal() {
    document.getElementById('vendedorModal').style.display = 'none';
}

async function saveVendedor(event) {
    event.preventDefault();
    const id = document.getElementById('vendedor-id').value;
    const nombre = document.getElementById('vendedor_nombre').value.trim();
    const isEditing = !!id;
    
    if (!nombre) { alert('El nombre no puede estar vacío.'); return; }

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing 
        ? `${API_URL}/admin/vendedores/${id}` 
        : `${API_URL}/admin/vendedores`;

    try {
        const response = await fetch(url, { 
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nombre })
        });
        
        const result = await response.json();

        if (response.status === 409) {
            alert('Error: Ya existe un vendedor con ese nombre.'); return; 
        }

        if (response.ok && result.success) {
            alert(`Vendedor ${isEditing ? 'actualizado' : 'creado'} exitosamente.`);
            closeVendedorModal();
            loadVendedores(true); 
        } else {
            alert('Error al guardar vendedor: ' + (result.message || 'Error desconocido.'));
        }
    } catch (error) {
        alert('Error de conexión con el servidor al guardar vendedor.');
    }
}

async function loadVendedores(doRender = true) {
    const tbody = document.getElementById('vendedores-tbody');
    if (doRender && tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Cargando vendedores...</td></tr>';

    try {
        const response = await fetch(`${API_URL}/admin/vendedores`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.status === 403) { throw new Error('Acceso denegado.'); }
        
        const data = await response.json();
        
        if (data.success) {
            vendedoresCache = data.vendedores;
            if (doRender && tbody) renderVendedores(data.vendedores);
        } else {
            if (doRender && tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Error al cargar datos.</td></tr>';
        }
    } catch (error) {
        if (doRender && tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Error de conexión.</td></tr>';
    }
}

function renderVendedores(vendedores) {
    const tbody = document.getElementById('vendedores-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (vendedores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No hay vendedores registrados.</td></tr>';
        return;
    }

    vendedores.forEach(vendedor => {
        const isDefault = vendedor.nombre.toLowerCase() === DEFAULT_VENDEDOR;
        const tr = document.createElement('tr');
        tr.className = isDefault ? 'default-item' : '';
        tr.innerHTML = `
            <td>${vendedor.id}</td>
            <td>${vendedor.nombre} ${isDefault ? ' (Por Defecto)' : ''}</td>
            <td class="actions-cell">
                <button class="btn-edit" ${isDefault ? 'disabled' : ''} onclick="openVendedorModal(${vendedor.id})">Editar</button>
                <button class="btn-delete" ${isDefault ? 'disabled' : ''} onclick="deleteVendedor(${vendedor.id}, '${vendedor.nombre}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteVendedor(id, name) {
    if (name.toLowerCase() === DEFAULT_VENDEDOR) {
        alert('El vendedor por defecto no puede ser eliminado.'); return;
    }
    if (!confirm(`¿Está seguro de eliminar al vendedor "${name}" (ID: ${id})?`)) { return; }

    try {
        const response = await fetch(`${API_URL}/admin/vendedores/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        const result = await response.json();

        if (response.ok && result.success) {
            alert(`Vendedor "${name}" eliminado exitosamente.`);
            loadVendedores(true); 
        } else {
            alert('Error al eliminar vendedor: ' + (result.message || 'Error desconocido.'));
        }
    } catch (error) {
        alert('Error de conexión con el servidor.');
    }
}

