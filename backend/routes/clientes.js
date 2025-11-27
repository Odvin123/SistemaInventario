// routes/clientes.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Usando tu pool de conexión
const { verifyToken } = require('../middleware/auth'); 
// El middleware 'setTenant' no se necesita aquí ya que está en server.js
// y ya tienes req.tenantId y req.esSuperAdmin disponibles.

const DEFAULT_CLIENTE = 'público general'; 

// ----------------------------------------------------------------------------------
// A. GET /api/admin/clientes - Obtiene todos los clientes de la empresa autenticada
// ----------------------------------------------------------------------------------
router.get('/', verifyToken, async (req, res) => {
    
    // El SuperAdmin puede ver todos los clientes de todas las empresas (si fuera necesario), 
    // pero para catálogos de inventario, generalmente solo ve los de una empresa específica o ninguno.
    // Aquí, replicamos la lógica de Categorías: si no es SuperAdmin, filtra por empresaId.
    
    const esSuperAdmin = req.esSuperAdmin;
    const empresaId = req.tenantId; // ID de la empresa (tenant)
    
    let queryText = 'SELECT id, nombre FROM clientes';
    const queryParams = [];
    
    // Si no es SuperAdmin, filtra por la empresa del usuario
    if (!esSuperAdmin) {
        queryText += ' WHERE empresa_id = $1';
        queryParams.push(empresaId);
    }
    
    queryText += ' ORDER BY nombre';

    try {
        const result = await pool.query(queryText, queryParams);
        
        res.status(200).json({ 
            success: true, 
            clientes: result.rows 
        });
    } catch (err) {
        console.error('Error al listar clientes:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al obtener clientes.' 
        });
    }
});

// ----------------------------------------------------------------------------------
// B. POST /api/admin/clientes - Crea un nuevo cliente para la empresa autenticada
// ----------------------------------------------------------------------------------
router.post('/', verifyToken, async (req, res) => {
    // Prohibir la acción si es SuperAdmin, ya que la entidad pertenece a un tenant
    if (!req.tenantId) { 
        return res.status(403).json({ success: false, message: 'Acción no permitida para SuperAdmin en esta ruta.' });
    }
    
    const { nombre } = req.body;
    const empresaId = req.tenantId; 
    
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ success: false, message: 'El nombre del cliente es obligatorio.' });
    }

    try {
        // 1. Verificar unicidad dentro de la empresa
        const check = await pool.query(
            'SELECT * FROM clientes WHERE LOWER(nombre) = LOWER($1) AND empresa_id = $2',
            [nombre, empresaId]
        );

        if (check.rows.length > 0) {
            return res.status(409).json({ success: false, message: `Ya existe un cliente con el nombre "${nombre}" para su empresa.` });
        }
        
        // 2. Insertar
        const result = await pool.query(
            'INSERT INTO clientes (nombre, empresa_id) VALUES ($1, $2) RETURNING id, nombre',
            [nombre, empresaId]
        );
        
        res.status(201).json({ 
            success: true, 
            message: 'Cliente creado exitosamente.',
            cliente: result.rows[0]
        });
    } catch (err) {
        console.error('Error al crear cliente:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor al crear cliente.' });
    }
});

// ----------------------------------------------------------------------------------
// C. PUT /api/admin/clientes/:id - Actualiza un cliente de la empresa
// ----------------------------------------------------------------------------------
router.put('/:id', verifyToken, async (req, res) => {
    if (!req.tenantId) {
        return res.status(403).json({ success: false, message: 'Acción no permitida para SuperAdmin en esta ruta.' });
    }

    const { id } = req.params;
    const { nombre } = req.body;
    const empresaId = req.tenantId;

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ success: false, message: 'El nombre del cliente es obligatorio.' });
    }
    
    try {
        // 1. Verificación adicional para el cliente por defecto ('público general')
        const checkDefault = await pool.query('SELECT nombre FROM clientes WHERE id = $1 AND empresa_id = $2', [id, empresaId]);
        if (checkDefault.rows.length > 0 && checkDefault.rows[0].nombre.toLowerCase() === DEFAULT_CLIENTE) {
            return res.status(403).json({ success: false, message: 'No se puede modificar el cliente por defecto.' });
        }
        
        // 2. Actualización (aislamiento por id y empresa_id)
        const result = await pool.query(
            'UPDATE clientes SET nombre = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND empresa_id = $3 RETURNING id, nombre',
            [nombre, id, empresaId]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado o no pertenece a su empresa.' });
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Cliente actualizado exitosamente.',
            cliente: result.rows[0]
        });
    } catch (err) {
        // Manejar conflicto de unicidad (si no se usa la restricción UNIQUE en la DB, se debe hacer manual)
        if (err.code === '23505') { 
            return res.status(409).json({ success: false, message: 'Ya existe otro cliente con ese nombre en esta empresa.' });
        }
        console.error('Error al actualizar cliente:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar cliente.' });
    }
});

// ----------------------------------------------------------------------------------
// D. DELETE /api/admin/clientes/:id - Elimina un cliente de la empresa
// ----------------------------------------------------------------------------------
router.delete('/:id', verifyToken, async (req, res) => {
    if (!req.tenantId) {
        return res.status(403).json({ success: false, message: 'Acción no permitida para SuperAdmin en esta ruta.' });
    }

    const { id } = req.params;
    const empresaId = req.tenantId;

    try {
        // 1. Verificación y prohibición de eliminar el cliente por defecto
        const checkDefault = await pool.query('SELECT nombre FROM clientes WHERE id = $1 AND empresa_id = $2', [id, empresaId]);
        
        if (checkDefault.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado o no pertenece a su empresa.' });
        }
        if (checkDefault.rows[0].nombre.toLowerCase() === DEFAULT_CLIENTE) {
            return res.status(403).json({ success: false, message: 'No se puede eliminar el cliente por defecto ("público general").' });
        }
        
        // 2. Eliminación
        const result = await pool.query(
            'DELETE FROM clientes WHERE id = $1 AND empresa_id = $2',
            [id, empresaId]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado o no pertenece a su empresa.' });
        }
        
        res.status(200).json({ success: true, message: 'Cliente eliminado exitosamente.' });
    } catch (err) {
        console.error('Error al eliminar cliente:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor al eliminar cliente.' });
    }
});

module.exports = router;