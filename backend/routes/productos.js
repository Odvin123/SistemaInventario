const express = require('express');
const router = express.Router();
const pool = require('../db'); 
const { verifyToken } = require('../middleware/auth'); 

const checkAdminRole = (req, res, next) => {
    const rol = req.usuario.rol;
    if (rol !== 'administrador' && rol !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }
    next();
};

router.get('/', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.id, 
                p.descripcion, 
                p.stock, 
                p.costo, 
                p.precio,
                c.nombre AS categoria_nombre,
                pr.nombre AS proveedor_nombre,
                p.categoria_id, 
                p.proveedor_id
            FROM productos p
            JOIN categorias c ON p.categoria_id = c.id
            JOIN proveedores pr ON p.proveedor_id = pr.id
            ORDER BY p.id DESC
        `);
        
        res.status(200).json({ 
            success: true, 
            productos: result.rows 
        });
    } catch (err) {
        console.error('Error al listar productos:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al obtener productos.' 
        });
    }
});

// Crear un nuevo Producto 
router.post('/', verifyToken, checkAdminRole, async (req, res) => {
    const { proveedor_id, categoria_id, descripcion, stock, costo, precio } = req.body;
    
    if (!proveedor_id || !categoria_id || !descripcion || stock === undefined || costo === undefined || precio === undefined) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios para el producto.' });
    }
    
    const parsedStock = parseInt(stock);
    const parsedCosto = parseFloat(costo);
    const parsedPrecio = parseFloat(precio);

    if (isNaN(parsedStock) || isNaN(parsedCosto) || isNaN(parsedPrecio) || parsedStock < 0 || parsedCosto < 0 || parsedPrecio < 0) {
        return res.status(400).json({ success: false, message: 'Stock, Costo y Precio deben ser números válidos y no negativos.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO productos (proveedor_id, categoria_id, descripcion, stock, costo, precio) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, descripcion, stock, costo, precio, categoria_id, proveedor_id',
            [proveedor_id, categoria_id, descripcion, parsedStock, parsedCosto, parsedPrecio]
        );
        
        res.status(201).json({ 
            success: true, 
            message: 'Producto creado exitosamente.',
            producto: result.rows[0]
        });
    } catch (err) {
        if (err.code === '23503') { 
            return res.status(400).json({ 
                success: false, 
                message: 'Proveedor o Categoría inválida. Asegúrese de que existan.' 
            });
        }
        console.error('Error al crear producto:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al crear producto.' 
        });
    }
});

//  Actualizar un Producto 
router.put('/:id', verifyToken, checkAdminRole, async (req, res) => {
    const { id } = req.params;
    const { proveedor_id, categoria_id, descripcion, stock, costo, precio } = req.body;

    if (!proveedor_id || !categoria_id || !descripcion || stock === undefined || costo === undefined || precio === undefined) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios para la actualización.' });
    }
    
    const parsedStock = parseInt(stock);
    const parsedCosto = parseFloat(costo);
    const parsedPrecio = parseFloat(precio);

    if (isNaN(parsedStock) || isNaN(parsedCosto) || isNaN(parsedPrecio) || parsedStock < 0 || parsedCosto < 0 || parsedPrecio < 0) {
        return res.status(400).json({ success: false, message: 'Stock, Costo y Precio deben ser números válidos y no negativos.' });
    }

    try {
        const result = await pool.query(
            'UPDATE productos SET proveedor_id = $1, categoria_id = $2, descripcion = $3, stock = $4, costo = $5, precio = $6 WHERE id = $7 RETURNING id',
            [proveedor_id, categoria_id, descripcion, parsedStock, parsedCosto, parsedPrecio, id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Producto actualizado exitosamente.' 
        });
    } catch (err) {
        if (err.code === '23503') { 
            return res.status(400).json({ 
                success: false, 
                message: 'Proveedor o Categoría inválida. Asegúrese de que existan.' 
            });
        }
        console.error('Error al actualizar producto:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar producto.' });
    }
});

// Eliminar un producto 
router.delete('/:id', verifyToken, checkAdminRole, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM productos WHERE id = $1',
            [id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
        }
        
        res.status(200).json({ success: true, message: 'Producto eliminado exitosamente.' });
    } catch (err) {
        console.error('Error al eliminar producto:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor al eliminar producto.' });
 }
});

module.exports = router;