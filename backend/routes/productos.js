const express = require('express');
const router = express.Router(); 
const db = require('../db'); 
const { verifyToken } = require('../middleware/auth'); // Asegúrate de que esta ruta sea correcta

// 1. OBTENER TODOS LOS PRODUCTOS
router.get('/', verifyToken, async (req, res) => {
    if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }
    
    try {
        const empresaResult = await db.query('SELECT empresa_id FROM usuarios WHERE id = $1', [req.usuario.id]);
        const empresaId = empresaResult.rows[0].empresa_id;

        const result = await db.query(
            `SELECT 
                p.id, 
                p.clave AS sku,                   -- Mapeado a sku para el Frontend
                p.descripcion AS nombre_producto, -- Mapeado a nombre_producto para el Frontend
                p.stock AS cantidad,              -- Mapeado a cantidad para el Frontend
                p.precio,                         -- Se mantiene 'precio'
                p.descripcion AS descripcion_larga, -- Columna original (opcional)
                c.nombre AS nombre_clasificacion,
                pr.nombre AS nombre_proveedor,
                p.fecha_registro
            FROM 
                productos p
            LEFT JOIN 
                clasificaciones c ON p.clasificacion_id = c.id
            LEFT JOIN 
                proveedores pr ON p.proveedor_id = pr.id
            WHERE 
                p.empresa_id = $1 
            ORDER BY 
                p.descripcion ASC`,
            [empresaId]
        );

        return res.status(200).json({ 
            success: true, 
            productos: result.rows 
        });

    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ success: false, message: 'Error interno al obtener productos.' });
    }
});

// 2. CREAR NUEVO PRODUCTO
router.post('/', verifyToken, async (req, res) => {
    if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }

    // Nombres que vienen del FRONTEND: sku, nombre_producto, cantidad, precio
    const { sku, nombre_producto, cantidad, precio, clasificacion_id, proveedor_id } = req.body; 
    
    if (!nombre_producto || !sku || cantidad === undefined || precio === undefined) { 
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios: SKU, Nombre, Stock y Precio.' });
    }

    const finalClasificacionId = clasificacion_id || null;
    const finalProveedorId = proveedor_id || null;
    
    try {
        const empresaResult = await db.query('SELECT empresa_id FROM usuarios WHERE id = $1', [req.usuario.id]);
        const empresaId = empresaResult.rows[0].empresa_id;

        const insertResult = await db.query(
            `INSERT INTO productos 
             (empresa_id, clave, descripcion, stock, precio, clasificacion_id, proveedor_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING id, descripcion AS nombre`,
            // Mapeo a columnas de la BD: clave(sku), descripcion(nombre_producto), stock(cantidad), precio(precio)
            [empresaId, sku, nombre_producto, cantidad, precio, finalClasificacionId, finalProveedorId] 
        );

        return res.status(201).json({
            success: true,
            message: `Producto ${nombre_producto} (${sku}) creado exitosamente.`,
            producto: insertResult.rows[0]
        });

    } catch (error) {
        if (error.code === '23505') { 
            return res.status(409).json({ success: false, message: `El SKU "${sku}" ya está registrado para otro producto.` });
        }
        if (error.code === '23503') { 
             return res.status(400).json({ success: false, message: 'Clasificación o Proveedor especificado no existe.' });
        }
        console.error('Error al crear producto:', error);
        res.status(500).json({ success: false, message: 'Error interno al crear producto.' });
    }
});

// 3. EDITAR PRODUCTO (PUT)
router.put('/:id', verifyToken, async (req, res) => {
    if (req.usuario.rol !== 'administrador') {
        return res.status(403).json({ success: false, message: 'Acción no permitida para este rol.' });
    }

    const productoId = req.params.id;
    // Nombres que vienen del FRONTEND
    const { sku, nombre_producto, cantidad, precio, clasificacion_id, proveedor_id } = req.body; 

    if (!nombre_producto || !sku || cantidad === undefined || precio === undefined) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios para la actualización.' });
    }

    const finalClasificacionId = clasificacion_id || null;
    const finalProveedorId = proveedor_id || null;

    try {
        const empresaResult = await db.query('SELECT empresa_id FROM usuarios WHERE id = $1', [req.usuario.id]);
        const empresaId = empresaResult.rows[0].empresa_id;

        const updateResult = await db.query(
            `UPDATE productos
             SET clave = $1,             -- Mapeo 1: sku
                 descripcion = $2,       -- Mapeo 2: nombre_producto
                 stock = $3,             -- Mapeo 3: cantidad
                 precio = $4,            -- Mapeo 4: precio
                 clasificacion_id = $5,
                 proveedor_id = $6
             WHERE id = $7 AND empresa_id = $8
             RETURNING id, descripcion, clave`,
            [sku, nombre_producto, cantidad, precio, finalClasificacionId, finalProveedorId, productoId, empresaId]
        );

        if (updateResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado o no pertenece a esta empresa.' });
        }

        return res.status(200).json({
            success: true,
            message: `Producto ${nombre_producto} (${sku}) actualizado exitosamente.`,
            producto: updateResult.rows[0]
        });

    } catch (error) {
        if (error.code === '23505') { 
            return res.status(409).json({ success: false, message: `El SKU "${sku}" ya está registrado para otro producto.` });
        }
        if (error.code === '23503') { 
             return res.status(400).json({ success: false, message: 'Clasificación o Proveedor especificado no existe.' });
        }
        console.error('Error al editar producto:', error);
        res.status(500).json({ success: false, message: 'Error interno al editar producto.' });
    }
});

// 4. ELIMINAR PRODUCTO (DELETE) - Se mantiene igual
router.delete('/:id', verifyToken, async (req, res) => {
    // ... (Tu código original)
});

module.exports = router;