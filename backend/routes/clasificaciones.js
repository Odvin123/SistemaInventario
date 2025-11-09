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
        const empresaId = empresaResult.rows[0].empresa_id;

        const result = await db.query(
            'SELECT id, nombre, descripcion FROM clasificaciones WHERE empresa_id = $1 ORDER BY nombre ASC',
            [empresaId]
        );

        return res.status(200).json({ 
            success: true, 
            clasificaciones: result.rows 
        });

    } catch (error) {
        console.error('Error al obtener clasificaciones:', error);
        res.status(500).json({ success: false, message: 'Error interno al obtener clasificaciones.' });
    }
});

// Crear Nueva Clasificación
router.post('/', verifyToken, async (req, res) => {
    if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }

    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
        return res.status(400).json({ success: false, message: 'El nombre de la clasificación es obligatorio.' });
    }
    
    try {
        const empresaResult = await db.query(
            'SELECT empresa_id FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );
        const empresaId = empresaResult.rows[0].empresa_id;

        const insertResult = await db.query(
            `INSERT INTO clasificaciones (empresa_id, nombre, descripcion) 
             VALUES ($1, $2, $3) RETURNING id, nombre`,
            [empresaId, nombre, descripcion || null]
        );

        return res.status(201).json({
            success: true,
            message: `Clasificación ${nombre} creada exitosamente.`,
            clasificacion: insertResult.rows[0]
        });

    } catch (error) {
        if (error.code === '23505') { 
            return res.status(409).json({ success: false, message: `La clasificación llamada "${nombre}" ya existe en su catálogo.` });
        }
        console.error('Error al crear clasificación:', error);
        res.status(500).json({ success: false, message: 'Error interno al crear clasificación.' });
    }
});

// Editar Clasificación
router.put('/:id', verifyToken, async (req, res) => {
    if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }

    const clasificacionId = req.params.id;
    const { nombre, descripcion } = req.body;

    if (!nombre) {
        return res.status(400).json({ success: false, message: 'El nombre de la clasificación es obligatorio.' });
    }

    try {
        const empresaResult = await db.query(
            'SELECT empresa_id FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );
        const empresaId = empresaResult.rows[0].empresa_id;

        const updateResult = await db.query(
            `UPDATE clasificaciones
             SET nombre = $1, descripcion = $2
             WHERE id = $3 AND empresa_id = $4
             RETURNING id, nombre`,
            [nombre, descripcion || null, clasificacionId, empresaId]
        );

        if (updateResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Clasificación no encontrada o no pertenece a esta empresa.' });
        }

        return res.status(200).json({
            success: true,
            message: `Clasificación ${nombre} actualizada exitosamente.`,
            clasificacion: updateResult.rows[0]
        });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ success: false, message: `La clasificación llamada "${nombre}" ya existe en su catálogo.` });
        }
        console.error('Error al editar clasificación:', error);
        res.status(500).json({ success: false, message: 'Error interno al editar clasificación.' });
    }
});

//  Eliminar Clasificación
router.delete('/:id', verifyToken, async (req, res) => {
    if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }

    const clasificacionId = req.params.id;

    try {
        const empresaResult = await db.query(
            'SELECT empresa_id FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );
        const empresaId = empresaResult.rows[0].empresa_id;

       
     
        const deleteResult = await db.query(
            'DELETE FROM clasificaciones WHERE id = $1 AND empresa_id = $2 RETURNING id',
            [clasificacionId, empresaId]
        );

        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Clasificación no encontrada o no pertenece a esta empresa.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Clasificación eliminada exitosamente.'
        });

    } catch (error) {
        if (error.code === '23503') {
            return res.status(409).json({ success: false, message: 'No se puede eliminar la clasificación porque está siendo utilizada por productos existentes.' });
        }
        console.error('Error al eliminar clasificación:', error);
        res.status(500).json({ success: false, message: 'Error interno al eliminar clasificación.' });
    }
});

module.exports = router;