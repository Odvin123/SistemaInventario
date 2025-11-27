const API_URL = 'http://localhost:4000/api';
let token = localStorage.getItem('token');
const DEFAULT_CLIENTE = 'público general';
let clientesCache = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        alert('Sesión no iniciada. Redirigiendo a login.');
        window.location.href = 'login.html';
        return;
    }
    loadClientes(true); 
});



function openClienteModal(id = null) {
    const modal = document.getElementById('clienteModal');
    const title = document.getElementById('cliente-modal-title');
    const idInput = document.getElementById('cliente-id');
    const nameInput = document.getElementById('cliente_nombre');

    if (id) {
        const cliente = clientesCache.find(c => c.id == id);
        if (!cliente || cliente.nombre.toLowerCase() === DEFAULT_CLIENTE) {
            alert('Error: Cliente no editable o no encontrado.'); return; 
        }
        title.textContent = `Editar Cliente (ID: ${id})`;
        idInput.value = cliente.id;
        nameInput.value = cliente.nombre;
    } else {
        title.textContent = 'Agregar Nuevo Cliente';
        idInput.value = '';
        document.getElementById('clienteForm').reset();
    }
    modal.style.display = 'flex';
}

function closeClienteModal() {
    document.getElementById('clienteModal').style.display = 'none';
}

async function saveCliente(event) {
    event.preventDefault();
    const id = document.getElementById('cliente-id').value;
    const nombre = document.getElementById('cliente_nombre').value.trim();
    const isEditing = !!id;
    
    if (!nombre) { alert('El nombre no puede estar vacío.'); return; }

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing 
        ? `${API_URL}/admin/clientes/${id}` 
        : `${API_URL}/admin/clientes`;

    try {
        const response = await fetch(url, { 
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nombre })
        });
        
        const result = await response.json();

        if (response.status === 409) {
            alert('Error: Ya existe un cliente con ese nombre.'); return; 
        }

        if (response.ok && result.success) {
            alert(`Cliente ${isEditing ? 'actualizado' : 'creado'} exitosamente.`);
            closeClienteModal();
            loadClientes(true); 
        } else {
            alert('Error al guardar cliente: ' + (result.message || 'Error desconocido.'));
        }
    } catch (error) {
        alert('Error de conexión con el servidor al guardar cliente.');
    }
}

async function loadClientes(doRender = true) {
    const tbody = document.getElementById('clientes-tbody');
    if (doRender && tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Cargando clientes...</td></tr>';
    
    try {
        const response = await fetch(`${API_URL}/admin/clientes`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.status === 403) { throw new Error('Acceso denegado.'); }
        
        const data = await response.json();
        
        if (data.success) {
            clientesCache = data.clientes;
            if (doRender && tbody) renderClientes(data.clientes);
        } else {
            if (doRender && tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Error al cargar datos.</td></tr>';
        }
    } catch (error) {
        if (doRender && tbody) tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Error de conexión.</td></tr>';
    }
}

function renderClientes(clientes) {
    const tbody = document.getElementById('clientes-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No hay clientes registrados.</td></tr>';
        return;
    }

    clientes.forEach(cliente => {
        const isDefault = cliente.nombre.toLowerCase() === DEFAULT_CLIENTE;
        const tr = document.createElement('tr');
        tr.className = isDefault ? 'default-item' : '';
        tr.innerHTML = `
            <td>${cliente.id}</td>
            <td>${cliente.nombre} ${isDefault ? ' (Por Defecto)' : ''}</td>
            <td class="actions-cell">
                <button class="btn-edit" ${isDefault ? 'disabled' : ''} onclick="openClienteModal(${cliente.id})">Editar</button>
                <button class="btn-delete" ${isDefault ? 'disabled' : ''} onclick="deleteCliente(${cliente.id}, '${cliente.nombre}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteCliente(id, name) {
    if (name.toLowerCase() === DEFAULT_CLIENTE) {
        alert('El cliente por defecto no puede ser eliminado.'); return;
    }
    if (!confirm(`¿Está seguro de eliminar al cliente "${name}" (ID: ${id})?`)) { return; }

    try {
        const response = await fetch(`${API_URL}/admin/clientes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        const result = await response.json();

        if (response.ok && result.success) {
            alert(`Cliente "${name}" eliminado exitosamente.`);
            loadClientes(true); 
        } else {
            alert('Error al eliminar cliente: ' + (result.message || 'Error desconocido.'));
        }
    } catch (error) {
        alert('Error de conexión con el servidor.');
    }
}

