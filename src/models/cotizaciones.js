const db = require('../db');
const { generarIdCotizacion } = require('../utils/pdfGenerator');

class Cotizacion {
  static async crear(clienteId, items) {
    const id = generarIdCotizacion();
    const fecha = new Date().toISOString().split('T')[0];
    
    await db.query('BEGIN');
    
    try {
      // Insertar cotización
      const cotRes = await db.query(
        'INSERT INTO cotizaciones (id, cliente_id, fecha) VALUES ($1, $2, $3) RETURNING *',
        [id, clienteId, fecha]
      );
      
      // Calcular total e insertar items
      let total = 0;
      for (const item of items) {
        const itemRes = await db.query('SELECT price FROM items WHERE id = $1', [item.id]);
        const price = itemRes.rows[0].price;
        total += price * item.quantity;
        
        await db.query(
          'INSERT INTO cotizacion_items (cot_id, item_id, quantity) VALUES ($1, $2, $3)',
          [id, item.id, item.quantity]
        );
      }
      
      // Actualizar total
      await db.query(
        'UPDATE cotizaciones SET total = $1 WHERE id = $2',
        [total, id]
      );
      
      await db.query('COMMIT');
      
      return {
        ...cotRes.rows[0],
        total,
        items
      };
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  }

  static async obtenerPorId(id) {
    const cotRes = await db.query(
      `SELECT c.*, cl.nombre as cliente_nombre 
       FROM cotizaciones c
       JOIN clientes cl ON c.cliente_id = cl.id
       WHERE c.id = $1`,
      [id]
    );
    
    if (cotRes.rows.length === 0) {
      return null;
    }
    
    const itemsRes = await db.query(
      `SELECT ci.quantity, i.id, i.name, i.price, it.name as type_name
       FROM cotizacion_items ci
       JOIN items i ON ci.item_id = i.id
       JOIN item_types it ON i.type_id = it.id
       WHERE ci.cot_id = $1`,
      [id]
    );
    
    return {
      ...cotRes.rows[0],
      items: itemsRes.rows
    };
  }
}

module.exports = Cotizacion;