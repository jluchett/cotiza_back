const express = require('express');
const router = express.Router();
const Cotizacion = require('../models/cotizaciones');
const { generarIdCotizacion, formatearMoneda, manejarError } = require('../utils/utils');

/**
 * @route   GET /api/cotizaciones
 * @desc    Obtener todas las cotizaciones
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT c.*, cl.nombre as cliente_nombre 
      FROM cotizaciones c
      JOIN clientes cl ON c.cliente_id = cl.id
      ORDER BY c.fecha DESC, c.id DESC
      LIMIT $1 OFFSET $2
    `;
    
    let countQuery = 'SELECT COUNT(*) FROM cotizaciones';
    
    // Búsqueda por término
    if (req.query.search) {
      const searchTerm = `%${req.query.search}%`;
      query = `
        SELECT c.*, cl.nombre as cliente_nombre 
        FROM cotizaciones c
        JOIN clientes cl ON c.cliente_id = cl.id
        WHERE c.id ILIKE $3 OR cl.nombre ILIKE $3
        ORDER BY c.fecha DESC, c.id DESC
        LIMIT $1 OFFSET $2
      `;
      countQuery = `
        SELECT COUNT(*) 
        FROM cotizaciones c
        JOIN clientes cl ON c.cliente_id = cl.id
        WHERE c.id ILIKE $1 OR cl.nombre ILIKE $1
      `;
    }

    const [cotizacionesResult, countResult] = await Promise.all([
      req.query.search 
        ? Cotizacion.obtenerTodasPaginadas(query, [limit, offset, `%${req.query.search}%`])
        : Cotizacion.obtenerTodasPaginadas(query, [limit, offset]),
      
      req.query.search 
        ? Cotizacion.contarTodos(countQuery, [`%${req.query.search}%`])
        : Cotizacion.contarTodos(countQuery)
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      cotizaciones: cotizacionesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    manejarError(error, res, 'Error al obtener las cotizaciones');
  }
});

/**
 * @route   GET /api/cotizaciones/:id
 * @desc    Obtener una cotización específica
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'ID de cotización requerido' });
    }

    const cotizacion = await Cotizacion.obtenerPorId(id);
    
    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json(cotizacion);
  } catch (error) {
    manejarError(error, res, 'Error al obtener la cotización');
  }
});

/**
 * @route   POST /api/cotizaciones
 * @desc    Crear una nueva cotización
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { clienteId, items } = req.body;

    // Validaciones
    if (!clienteId) {
      return res.status(400).json({ error: 'ID de cliente requerido' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items requeridos y deben ser un array no vacío' });
    }

    // Validar cada item
    for (const item of items) {
      if (!item.id || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ 
          error: 'Cada item debe tener un ID y cantidad válida (mayor a 0)' 
        });
      }
    }

    const cotizacion = await Cotizacion.crear(clienteId, items);
    
    res.status(201).json({
      message: 'Cotización creada exitosamente',
      cotizacion: {
        ...cotizacion,
        total_formateado: formatearMoneda(cotizacion.total)
      }
    });

  } catch (error) {
    if (error.message.includes('cliente_id')) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    if (error.message.includes('item_id')) {
      return res.status(404).json({ error: 'Uno o más items no existen' });
    }
    manejarError(error, res, 'Error al crear la cotización');
  }
});

/**
 * @route   DELETE /api/cotizaciones/:id
 * @desc    Eliminar una cotización
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'ID de cotización requerido' });
    }

    // Verificar si existe la cotización
    const cotizacionExistente = await Cotizacion.obtenerPorId(id);
    if (!cotizacionExistente) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const result = await Cotizacion.eliminar(id);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json({ message: 'Cotización eliminada exitosamente' });
  } catch (error) {
    manejarError(error, res, 'Error al eliminar la cotización');
  }
});

/**
 * @route   GET /api/cotizaciones/:id/pdf
 * @desc    Generar PDF de una cotización
 * @access  Public
 */
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'ID de cotización requerido' });
    }

    const cotizacion = await Cotizacion.obtenerPorId(id);
    
    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const pdfBuffer = await Cotizacion.generarPDF(cotizacion);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cotizacion_${id}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    manejarError(error, res, 'Error al generar el PDF');
  }
});

/**
 * @route   GET /api/cotizaciones/cliente/:clienteId
 * @desc    Obtener cotizaciones de un cliente específico
 * @access  Public
 */
router.get('/cliente/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!clienteId) {
      return res.status(400).json({ error: 'ID de cliente requerido' });
    }

    const query = `
      SELECT c.*, cl.nombre as cliente_nombre 
      FROM cotizaciones c
      JOIN clientes cl ON c.cliente_id = cl.id
      WHERE c.cliente_id = $1
      ORDER BY c.fecha DESC, c.id DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = 'SELECT COUNT(*) FROM cotizaciones WHERE cliente_id = $1';

    const [cotizacionesResult, countResult] = await Promise.all([
      Cotizacion.obtenerTodasPaginadas(query, [clienteId, limit, offset]),
      Cotizacion.contarTodos(countQuery, [clienteId])
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      cotizaciones: cotizacionesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    manejarError(error, res, 'Error al obtener las cotizaciones del cliente');
  }
});

module.exports = router;