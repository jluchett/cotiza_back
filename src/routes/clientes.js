const express = require('express');
const router = express.Router();
const db = require('../db');
const { manejarError } = require('../utils/utils');

/**
 * @route   GET /api/clientes
 * @desc    Obtener todos los clientes 
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const clientes = await db.query('SELECT * FROM clientes');
    res.json(clientes.rows);
  } catch (error) {
    manejarError(error, res, 'Error al obtener los clientes');
  }
});

/**
 * @route   GET /api/clientes/:id
 * @desc    Obtener un cliente específico por ID con estadísticas
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de cliente válido requerido' });
    }

    // Query para obtener cliente con estadísticas
    const query = `
      SELECT 
        c.*,
        COUNT(co.id) as total_cotizaciones,
        COALESCE(SUM(co.total), 0) as monto_total,
        MIN(co.fecha) as primera_cotizacion,
        MAX(co.fecha) as ultima_cotizacion
      FROM clientes c
      LEFT JOIN cotizaciones co ON c.id = co.cliente_id
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const cliente = {
      ...result.rows[0],
      total_cotizaciones: parseInt(result.rows[0].total_cotizaciones),
      monto_total: parseFloat(result.rows[0].monto_total)
    };

    res.json(cliente);
  } catch (error) {
    manejarError(error, res, 'Error al obtener el cliente');
  }
});

/**
 * @route   POST /api/clientes
 * @desc    Crear un nuevo cliente
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { nombre, email, telefono, direccion } = req.body;

    // Validaciones
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'Nombre del cliente requerido' });
    }

    if (nombre.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Formato de email no válido' });
    }

    if (telefono && !isValidPhone(telefono)) {
      return res.status(400).json({ error: 'Formato de teléfono no válido' });
    }

    const query = `
      INSERT INTO clientes (nombre, email, telefono, direccion)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [
      nombre.trim(),
      email ? email.trim() : null,
      telefono ? telefono.trim() : null,
      direccion ? direccion.trim() : null
    ]);

    res.status(201).json({
      message: 'Cliente creado exitosamente',
      cliente: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Violación de unique constraint
      return res.status(400).json({ error: 'Ya existe un cliente con ese email' });
    }
    manejarError(error, res, 'Error al crear el cliente');
  }
});

/**
 * @route   PUT /api/clientes/:id
 * @desc    Actualizar un cliente existente
 * @access  Public
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, telefono, direccion } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de cliente válido requerido' });
    }

    // Verificar que el cliente existe
    const clienteExistente = await db.query('SELECT * FROM clientes WHERE id = $1', [id]);
    if (clienteExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Validaciones
    if (nombre && (!nombre.trim() || nombre.trim().length < 2)) {
      return res.status(400).json({ error: 'Nombre no válido (mínimo 2 caracteres)' });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Formato de email no válido' });
    }

    if (telefono && !isValidPhone(telefono)) {
      return res.status(400).json({ error: 'Formato de teléfono no válido' });
    }

    const query = `
      UPDATE clientes 
      SET 
        nombre = COALESCE($1, nombre),
        email = COALESCE($2, email),
        telefono = COALESCE($3, telefono),
        direccion = COALESCE($4, direccion),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const result = await db.query(query, [
      nombre ? nombre.trim() : null,
      email ? email.trim() : null,
      telefono ? telefono.trim() : null,
      direccion ? direccion.trim() : null,
      parseInt(id)
    ]);

    res.json({
      message: 'Cliente actualizado exitosamente',
      cliente: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un cliente con ese email' });
    }
    manejarError(error, res, 'Error al actualizar el cliente');
  }
});

/**
 * @route   DELETE /api/clientes/:id
 * @desc    Eliminar un cliente
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de cliente válido requerido' });
    }

    // Verificar que el cliente existe
    const clienteExistente = await db.query('SELECT * FROM clientes WHERE id = $1', [id]);
    if (clienteExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Verificar si el cliente tiene cotizaciones
    const cotizacionesCheck = await db.query(
      'SELECT COUNT(*) FROM cotizaciones WHERE cliente_id = $1',
      [id]
    );

    if (parseInt(cotizacionesCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el cliente porque tiene cotizaciones asociadas' 
      });
    }

    await db.query('DELETE FROM clientes WHERE id = $1', [id]);

    res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    manejarError(error, res, 'Error al eliminar el cliente');
  }
});

/**
 * @route   GET /api/clientes/:id/cotizaciones
 * @desc    Obtener las cotizaciones de un cliente específico
 * @access  Public
 */
router.get('/:id/cotizaciones', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de cliente válido requerido' });
    }

    // Verificar que el cliente existe
    const clienteExistente = await db.query('SELECT id FROM clientes WHERE id = $1', [id]);
    if (clienteExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const query = `
      SELECT 
        c.id as cotizacion_id,
        c.fecha,
        c.total,
        COUNT(ci.id) as items_count
      FROM cotizaciones c
      LEFT JOIN cotizacion_items ci ON c.id = ci.cot_id
      WHERE c.cliente_id = $1
      GROUP BY c.id
      ORDER BY c.fecha DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) 
      FROM cotizaciones 
      WHERE cliente_id = $1
    `;

    const [cotizacionesResult, countResult] = await Promise.all([
      db.query(query, [id, limit, offset]),
      db.query(countQuery, [id])
    ]);

    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    const cotizaciones = cotizacionesResult.rows.map(cot => ({
      ...cot,
      total: parseFloat(cot.total),
      items_count: parseInt(cot.items_count)
    }));

    res.json({
      cotizaciones,
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

/**
 * @route   GET /api/clientes/stats/top
 * @desc    Obtener clientes top por monto de cotizaciones
 * @access  Public
 */
router.get('/stats/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const query = `
      SELECT 
        c.id,
        c.nombre,
        COUNT(co.id) as total_cotizaciones,
        COALESCE(SUM(co.total), 0) as monto_total,
        MAX(co.fecha) as ultima_cotizacion
      FROM clientes c
      LEFT JOIN cotizaciones co ON c.id = co.cliente_id
      GROUP BY c.id, c.nombre
      HAVING COUNT(co.id) > 0
      ORDER BY monto_total DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);

    const clientes = result.rows.map(cliente => ({
      ...cliente,
      total_cotizaciones: parseInt(cliente.total_cotizaciones),
      monto_total: parseFloat(cliente.monto_total)
    }));

    res.json(clientes);
  } catch (error) {
    manejarError(error, res, 'Error al obtener estadísticas de clientes');
  }
});

/**
 * @route   GET /api/clientes/search/autocomplete
 * @desc    Búsqueda de clientes para autocompletado
 * @access  Public
 */
router.get('/search/autocomplete', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Término de búsqueda muy corto (mínimo 2 caracteres)' });
    }

    const query = `
      SELECT 
        id,
        nombre,
        email,
        telefono
      FROM clientes
      WHERE nombre ILIKE $1 OR email ILIKE $1
      ORDER BY nombre
      LIMIT 10
    `;

    const result = await db.query(query, [`%${q}%`]);

    res.json(result.rows);
  } catch (error) {
    manejarError(error, res, 'Error en la búsqueda de clientes');
  }
});

// Funciones auxiliares de validación
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

module.exports = router;