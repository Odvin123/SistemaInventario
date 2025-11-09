const jwt = require('jsonwebtoken'); 

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Acceso denegado. No se proporcionó Token.' });
    }

    const token = authHeader.split(' ')[1]; 

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.usuario = decoded; 
        
        next(); 

    } catch (err) {
        return res.status(403).json({ success: false, message: 'Token inválido o expirado.' });
    }
};

// FUNCIÓN AGREGADA/CORREGIDA: Define y verifica el rol
const checkRole = (roles) => {
    return (req, res, next) => {
        // Verifica si el rol del usuario está incluido en los roles permitidos (roles array)
        if (!req.usuario || !roles.includes(req.usuario.rol)) {
            return res.status(403).json({ success: false, message: 'Acceso denegado. Rol no autorizado.' });
        }
        next();
    };
};

// EXPORTACIÓN CORREGIDA: Exporta ambas funciones para ser usadas en ventas.js
module.exports = { verifyToken, checkRole };