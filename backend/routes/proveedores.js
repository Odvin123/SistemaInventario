const express = require('express');
const router = express.Router(); 
const db = require('../db'); 
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
    if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }
    
    try {
        const empresaResult = await db.query(
            'SELECT empresa_id FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );
        if (empresaResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'ID de empresa no encontrado para el usuario.' });
        }
        const empresaId = empresaResult.rows[0].empresa_id;

        const result = await db.query(
            'SELECT id, nombre, telefono, correo_contacto FROM proveedores WHERE empresa_id = $1 ORDER BY nombre ASC',
            [empresaId]
        );

        return res.status(200).json({ 
            success: true, 
            proveedores: result.rows 
        });

    } catch (error) {
        console.error('Error al obtener proveedores:', error);
        res.status(500).json({ success: false, message: 'Error interno al obtener proveedores.' });
    }
});

//  Crear Nuevo Proveedor
router.post('/', verifyToken, async (req, res) => {
    if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }

    const { nombre, telefono, correo_contacto } = req.body;
    
    if (!nombre) {
        return res.status(400).json({ success: false, message: 'El nombre del proveedor es obligatorio.' });
    }
    
    try {
        const empresaResult = await db.query(
            'SELECT empresa_id FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );
        const empresaId = empresaResult.rows[0].empresa_id;

        const result = await db.query(
            `INSERT INTO proveedores (empresa_id, nombre, telefono, correo_contacto) 
             VALUES ($1, $2, $3, $4) RETURNING id, nombre`,
            [empresaId, nombre, telefono || null, correo_contacto || null]
        );

        return res.status(201).json({
            success: true,
            message: `Proveedor ${nombre} creado exitosamente.`,
            proveedor: result.rows[0]
        });

    } catch (error) {
        if (error.code === '23505') { 
            return res.status(409).json({ success: false, message: `El proveedor llamado "${nombre}" ya existe en su catálogo.` });
        }
        console.error('Error al crear proveedor:', error);
        res.status(500).json({ success: false, message: 'Error interno al crear proveedor.' });
    }
});

//  Editar Proveedor
router.put('/:id', verifyToken, async (req, res) => {
    if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }

    const proveedorId = req.params.id;
    const { nombre, telefono, correo_contacto } = req.body;

    if (!nombre) {
        return res.status(400).json({ success: false, message: 'El nombre del proveedor es obligatorio.' });
    }

    try {
        const empresaResult = await db.query(
            'SELECT empresa_id FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );
        const empresaId = empresaResult.rows[0].empresa_id;

        const updateResult = await db.query(
            `UPDATE proveedores
             SET nombre = $1, telefono = $2, correo_contacto = $3, fecha_registro = CURRENT_TIMESTAMP
             WHERE id = $4 AND empresa_id = $5
             RETURNING id, nombre`,
            [nombre, telefono || null, correo_contacto || null, proveedorId, empresaId]
        );

        if (updateResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Proveedor no encontrado o no pertenece a esta empresa.' });
        }

        return res.status(200).json({
            success: true,
            message: `Proveedor ${nombre} actualizado exitosamente.`,
            proveedor: updateResult.rows[0]
        });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ success: false, message: `El proveedor llamado "${nombre}" ya existe en su catálogo.` });
        }
        console.error('Error al editar proveedor:', error);
        res.status(500).json({ success: false, message: 'Error interno al editar proveedor.' });
    }
});

// Eliminar Proveedor
router.delete('/:id', verifyToken, async (req, res) => {
    if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }

    const proveedorId = req.params.id;

    try {
        const empresaResult = await db.query(
            'SELECT empresa_id FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );
        const empresaId = empresaResult.rows[0].empresa_id;

        const deleteResult = await db.query(
            'DELETE FROM proveedores WHERE id = $1 AND empresa_id = $2 RETURNING id',
            [proveedorId, empresaId]
        );

        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Proveedor no encontrado o no pertenece a esta empresa.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Proveedor eliminado exitosamente.'
        });

    } catch (error) {
        console.error('Error al eliminar proveedor:', error);
        res.status(500).json({ success: false, message: 'Error interno al eliminar proveedor.' });
    }
});

module.exports = router;