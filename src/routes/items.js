const express = require('express');
const router = express.Router();
const db = require('../db');
const { manejarError, formatearMoneda } = require('../utils/utils');

/**
 * @route   GET /api/items
 * @desc    Obtener todos los items 
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const items = await db.query('SELECT * FROM items');
    res.json(items.rows);

  } catch (error) {
    manejarError(error, res, 'Error al obtener los items');
  }
});

/**
 * @route   GET /api/items/:id
 * @desc    Obtener un item específico por ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de item válido requerido' });
    }

    const query = `
      SELECT 
        i.id,
        i.name,
        i.description,
        i.price,
        i.type_id,
        it.name as type_name,
        i.created_at,
        i.updated_at
      FROM items i
      INNER JOIN item_types it ON i.type_id = it.id
      WHERE i.id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    const item = {
      ...result.rows[0],
      price_formatted: formatearMoneda(result.rows[0].price),
      price: parseFloat(result.rows[0].price)
    };

    res.json(item);
  } catch (error) {
    manejarError(error, res, 'Error al obtener el item');
  }
});

/**
 * @route   POST /api/items
 * @desc    Crear un nuevo item
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { name, price, type_id } = req.body;

    // Validaciones
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nombre del item requerido' });
    }

    if (!price || isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Precio válido requerido' });
    }

    if (!type_id || isNaN(type_id)) {
      return res.status(400).json({ error: 'Tipo de item válido requerido' });
    }

    // Verificar que el tipo existe
    const tipoCheck = await db.query('SELECT id FROM item_types WHERE id = $1', [type_id]);
    if (tipoCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Tipo de item no válido' });
    }

    const query = `
      INSERT INTO items (name, price, type_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await db.query(query, [
      name.trim(),
      parseFloat(price),
      parseInt(type_id)
    ]);

    // Obtener el item completo con el nombre del tipo
    const itemCompleto = await db.query(`
      SELECT 
        i.*,
        it.name as type_name
      FROM items i
      INNER JOIN item_types it ON i.type_id = it.id
      WHERE i.id = $1
    `, [result.rows[0].id]);

    const item = {
      ...itemCompleto.rows[0],
      price_formatted: formatearMoneda(itemCompleto.rows[0].price),
      price: parseFloat(itemCompleto.rows[0].price)
    };

    res.status(201).json({
      message: 'Item creado exitosamente',
      item
    });
  } catch (error) {
    if (error.code === '23505') { // Violación de unique constraint
      return res.status(400).json({ error: 'Ya existe un item con ese nombre' });
    }
    manejarError(error, res, 'Error al crear el item');
  }
});

/**
 * @route   PUT /api/items/:id
 * @desc    Actualizar un item existente
 * @access  Public
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, type_id } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de item válido requerido' });
    }

    // Verificar que el item existe
    const itemExistente = await db.query('SELECT * FROM items WHERE id = $1', [id]);
    if (itemExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    // Validaciones
    if (name && !name.trim()) {
      return res.status(400).json({ error: 'Nombre del item no válido' });
    }

    if (price && (isNaN(price) || price <= 0)) {
      return res.status(400).json({ error: 'Precio válido requerido' });
    }

    if (type_id && isNaN(type_id)) {
      return res.status(400).json({ error: 'Tipo de item válido requerido' });
    }

    // Verificar que el tipo existe si se está actualizando
    if (type_id) {
      const tipoCheck = await db.query('SELECT id FROM item_types WHERE id = $1', [type_id]);
      if (tipoCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Tipo de item no válido' });
      }
    }

    const query = `
      UPDATE items 
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        type_id = COALESCE($4, type_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const result = await db.query(query, [
      name ? name.trim() : null,
      description ? description.trim() : null,
      price ? parseFloat(price) : null,
      type_id ? parseInt(type_id) : null,
      parseInt(id)
    ]);

    // Obtener el item completo actualizado
    const itemCompleto = await db.query(`
      SELECT 
        i.*,
        it.name as type_name
      FROM items i
      INNER JOIN item_types it ON i.type_id = it.id
      WHERE i.id = $1
    `, [id]);

    const item = {
      ...itemCompleto.rows[0],
      price_formatted: formatearMoneda(itemCompleto.rows[0].price),
      price: parseFloat(itemCompleto.rows[0].price)
    };

    res.json({
      message: 'Item actualizado exitosamente',
      item
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un item con ese nombre' });
    }
    manejarError(error, res, 'Error al actualizar el item');
  }
});

/**
 * @route   DELETE /api/items/:id
 * @desc    Eliminar un item
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de item válido requerido' });
    }

    // Verificar que el item existe
    const itemExistente = await db.query('SELECT * FROM items WHERE id = $1', [id]);
    if (itemExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    // Verificar si el item está siendo usado en alguna cotización
    const usoCheck = await db.query(
      'SELECT COUNT(*) FROM cotizacion_items WHERE item_id = $1',
      [id]
    );

    if (parseInt(usoCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el item porque está siendo usado en cotizaciones' 
      });
    }

    await db.query('DELETE FROM items WHERE id = $1', [id]);

    res.json({ message: 'Item eliminado exitosamente' });
  } catch (error) {
    manejarError(error, res, 'Error al eliminar el item');
  }
});

/**
 * @route   GET /api/items/tipos
 * @desc    Obtener tipos de items
 * @access  Public
 */
router.get('/tipos', async (req, res) => {
  try {
    
    const tipos = await db.query('SELECT * FROM item_types ORDER BY name');

    res.json(tipos.rows);

  } catch (error) {
    manejarError(error, res, 'Error al obtener tipos de items');
  }
});

module.exports = router;