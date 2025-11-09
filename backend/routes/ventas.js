// backend/routes/ventas.js

const express = require('express');
const router = express.Router();
const db = require('../db'); 
const { verifyToken, checkRole } = require('../middleware/auth'); 

router.post('/', verifyToken, checkRole(['administrador', 'super_admin']), async (req, res) => {
    
    const client = await db.getClient(); 
    
    const { cliente_id = 1, vendedor_id = 1, es_factura, detalles, pagos } = req.body;
    
    const empresa_id = req.usuario.empresa_id; 

    if (!empresa_id || !detalles || detalles.length === 0 || !pagos || pagos.length === 0) {
        return res.status(400).json({ success: false, message: 'Datos incompletos o inválidos (Empresa, Detalles o Pagos faltantes).' });
    }

    try {
        await client.query('BEGIN'); 
        
        const folioResult = await client.query(
            'SELECT ultimo_folio FROM control_folios WHERE empresa_id = $1 FOR UPDATE',
            [empresa_id]
        );
        
        let nuevoFolio;
        if (folioResult.rows.length === 0) {
            await client.query('INSERT INTO control_folios (empresa_id, ultimo_folio) VALUES ($1, 1)', [empresa_id]);
            nuevoFolio = 1;
        } else {
            const ultimoFolio = folioResult.rows[0].ultimo_folio;
            nuevoFolio = ultimoFolio + 1;
            await client.query('UPDATE control_folios SET ultimo_folio = $1 WHERE empresa_id = $2', [nuevoFolio, empresa_id]);
        }

        let totalVentaCalculado = 0;
        let subtotalVenta = 0;
        const impuesto = 0; 

        for (const detalle of detalles) {
            const { producto_id, cantidad } = detalle;
            let { precio_unitario } = detalle;
            
            const productoResult = await client.query(
                'SELECT stock, precio FROM productos WHERE id = $1',
                [producto_id]
            );

            if (productoResult.rows.length === 0) {
                throw new Error(`Producto ID ${producto_id} no encontrado.`);
            }

            const stockActual = productoResult.rows[0].stock;
            const precioActualBD = parseFloat(productoResult.rows[0].precio);
            precio_unitario = precio_unitario || precioActualBD; 

            if (stockActual < cantidad) {
                throw new Error(`Stock insuficiente para Producto ID ${producto_id}. Stock: ${stockActual}, solicitado: ${cantidad}.`);
            }
            
            subtotalVenta += cantidad * precio_unitario;
        }
        
        totalVentaCalculado = subtotalVenta + impuesto;
        let totalPagado = 0;
        
        for (const pago of pagos) {
            totalPagado += parseFloat(pago.monto);
        }
        
        if (totalPagado < totalVentaCalculado) {
             throw new Error(`El total pagado (${totalPagado.toFixed(2)}) es menor que el total de la venta (${totalVentaCalculado.toFixed(2)}).`);
        }
        
        const cambio = totalPagado - totalVentaCalculado;

        const ventaInsertQuery = `
            INSERT INTO ventas (empresa_id, folio, total, subtotal, impuesto, es_factura, cliente_id, vendedor_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id;
        `;
        const ventaResult = await client.query(ventaInsertQuery, [
            empresa_id, nuevoFolio, totalVentaCalculado, subtotalVenta, impuesto, es_factura, cliente_id, vendedor_id
        ]);
        const venta_id = ventaResult.rows[0].id;

        for (const detalle of detalles) {
            const { producto_id, cantidad, precio_unitario } = detalle;
            const subtotalDetalle = cantidad * precio_unitario;

            await client.query(
                'INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)',
                [venta_id, producto_id, cantidad, precio_unitario, subtotalDetalle]
            );

            await client.query(
                'UPDATE productos SET stock = stock - $1 WHERE id = $2',
                [cantidad, producto_id]
            );
        }
        
        for (const pago of pagos) {
            await client.query(
                'INSERT INTO pagos_venta (venta_id, metodo_pago, monto) VALUES ($1, $2, $3)',
                [venta_id, pago.metodo, pago.monto]
            );
        }

        await client.query('COMMIT'); 
        
        res.status(201).json({ 
            success: true, 
            message: 'Venta y pago registrados exitosamente.', 
            folio: nuevoFolio,
            cambio: cambio.toFixed(2)
        });

    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error('Error al registrar la venta:', error.message);
        res.status(500).json({ success: false, message: `Error en la transacción: ${error.message}` });
        
    } finally {
        client.release();
    }
});

module.exports = router;