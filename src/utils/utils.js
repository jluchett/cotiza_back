// utils.js - Funciones utilitarias para el cotizador

/**
 * Genera un ID único para cotizaciones en el formato: COT_AAAAMMDD_HHMMSS
 * @returns {string} ID de cotización
 */
function generarIdCotizacion() {
    const ahora = new Date();
    
    // Formatear fecha como AAAAMMDD
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const fechaStr = `${año}${mes}${dia}`;
    
    // Formatear hora como HHMMSS
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const segundos = String(ahora.getSeconds()).padStart(2, '0');
    const horaStr = `${horas}${minutos}${segundos}`;
    
    return `COT_${fechaStr}_${horaStr}`;
}

/**
 * Formatea un número como moneda
 * @param {number} cantidad - Valor a formatear
 * @returns {string} Valor formateado como moneda
 */
function formatearMoneda(cantidad) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(cantidad);
}

/**
 * Valida que un objeto tenga todas las propiedades requeridas
 * @param {object} obj - Objeto a validar
 * @param {string[]} propiedades - Array de propiedades requeridas
 * @returns {boolean} True si todas las propiedades existen
 */
function validarPropiedades(obj, propiedades) {
    return propiedades.every(prop => obj.hasOwnProperty(prop));
}

/**
 * Maneja errores y envía respuesta HTTP
 * @param {Error} error - Objeto de error
 * @param {Response} res - Objeto de respuesta Express
 * @param {string} mensajeDefault - Mensaje por defecto
 */
function manejarError(error, res, mensajeDefault = 'Error en el servidor') {
    console.error(error);
    
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Error de validación',
            detalles: error.errors
        });
    }
    
    res.status(500).json({
        error: mensajeDefault,
        detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
}

module.exports = {
    generarIdCotizacion,
    formatearMoneda,
    validarPropiedades,
    manejarError
};