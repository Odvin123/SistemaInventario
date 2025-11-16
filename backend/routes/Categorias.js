const express = require('express');
const router = express.Router();
const pool = require('../db'); 
const { verifyToken } = require('../middleware/auth'); 

router.get('/', verifyToken, async (req, res) => {
  
    if (req.usuario.rol !== 'administrador' && req.usuario.rol !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }
    
    try {
        const result = await pool.query(
            'SELECT id, nombre FROM categorias ORDER BY nombre'
        );
        
        res.status(200).json({ 
            success: true, 
            categorias: result.rows 
        });
    } catch (err) {
        console.error('Error al listar categorías:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al obtener categorías.' 
        });
    }
});

// Crear una nueva Categoría 
router.post('/', verifyToken, async (req, res) => {
    if (req.usuario.rol !== 'administrador' && req.usuario.rol !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }

    
    const { nombre } = req.body;
    
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ 
            success: false, 
            message: 'El nombre de la categoría es obligatorio.' 
        });
    }

    try {
        const check = await pool.query(
            'SELECT * FROM categorias WHERE LOWER(nombre) = LOWER($1)',
            [nombre]
        );

        if (check.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: `Ya existe una categoría con el nombre "${nombre}".` 
            });
        }
        
        const result = await pool.query(
            'INSERT INTO categorias (nombre) VALUES ($1) RETURNING id, nombre',
            [nombre]
        );
        
        res.status(201).json({ 
            success: true, 
            message: 'Categoría creada exitosamente.',
            categoria: result.rows[0]
        });
    } catch (err) {
        console.error('Error al crear categoría:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al crear categoría.' 
        });
    }
});

// ACTUALIZAR una Categoría 
router.put('/:id', verifyToken, async (req, res) => {
    if (req.usuario.rol !== 'administrador' && req.usuario.rol !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }

    const { id } = req.params;
    const { nombre } = req.body;

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ 
            success: false, 
            message: 'El nombre de la categoría es obligatorio.' 
        });
    }
    
    try {
        const result = await pool.query(
            'UPDATE categorias SET nombre = $1 WHERE id = $2 RETURNING id, nombre',
            [nombre, id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Categoría no encontrada.' 
            });
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Categoría actualizada exitosamente.',
            categoria: result.rows[0]
        });
    } catch (err) {
        console.error('Error al actualizar categoría:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al actualizar categoría.' 
        });
    }
});

// Eliminar una Categoría 
router.delete('/:id', verifyToken, async (req, res) => {
    // 1. Verificar Rol
    if (req.usuario.rol !== 'administrador' && req.usuario.rol !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }

    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM categorias WHERE id = $1',
            [id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Categoría no encontrada.' 
            });
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Categoría eliminada exitosamente.' 
        });
    } catch (err) {
        console.error('Error al eliminar categoría:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al eliminar categoría.' 
        });
    }
});

module.exports = router;