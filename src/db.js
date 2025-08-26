// db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Función para inicializar la base de datos
async function inicializarBaseDeDatos() {
  try {
    console.log('Inicializando base de datos...');
    
    // Script SQL para crear las tablas
    const scriptsSQL = `
      -- Tabla de tipos de ítems
      CREATE TABLE IF NOT EXISTS item_types (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE
      );

      -- Tabla de ítems
      CREATE TABLE IF NOT EXISTS items (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          type_id INT NOT NULL,
          price NUMERIC(10, 2) NOT NULL,
          FOREIGN KEY (type_id) REFERENCES item_types(id) ON DELETE RESTRICT
      );

      -- Tabla de clientes
      CREATE TABLE IF NOT EXISTS clientes (
          id SERIAL PRIMARY KEY,
          nombre TEXT NOT NULL
      );

      -- Tabla de cotizaciones (id como TEXT personalizado)
      CREATE TABLE IF NOT EXISTS cotizaciones (
          id TEXT PRIMARY KEY,
          cliente_id INT NOT NULL,
          fecha DATE NOT NULL,
          total NUMERIC(12, 2),
          FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
      );

      -- Relación de cotizaciones e ítems
      CREATE TABLE IF NOT EXISTS cotizacion_items (
          id SERIAL PRIMARY KEY,
          cot_id TEXT NOT NULL,
          item_id INT NOT NULL,
          quantity INT NOT NULL,
          FOREIGN KEY (cot_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT
      );
    `;

    await pool.query(scriptsSQL);
    console.log('✅ Tablas creadas exitosamente');

    // Insertar datos de ejemplo (opcional)
    await insertarDatosEjemplo();
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    // No lanzamos error para que la app pueda seguir funcionando
  }
}

// Función para insertar datos de ejemplo
async function insertarDatosEjemplo() {
  try {
    // Verificar si ya existen datos
    const result = await pool.query('SELECT COUNT(*) FROM item_types');
    if (parseInt(result.rows[0].count) > 0) {
      console.log('✅ Ya existen datos en la base de datos');
      return;
    }

    console.log('Insertando datos de ejemplo...');

    // Insertar tipos de items
    await pool.query(`
      INSERT INTO item_types (name) VALUES 
      ('Software'),
      ('Hardware'),
      ('Servicios'),
      ('Licencias')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Insertar items
    await pool.query(`
      INSERT INTO items (name, type_id, price) VALUES 
      ('Windows 10 Pro', 1, 1500.00),
      ('Licencia Office 365', 4, 800.00),
      ('Servidor Dell R740', 2, 25000.00),
      ('Mantenimiento mensual', 3, 5000.00),
      ('Antivirus Enterprise', 1, 1200.00),
      ('Laptop HP EliteBook', 2, 18000.00)
      ON CONFLICT DO NOTHING;
    `);

    // Insertar clientes
    await pool.query(`
      INSERT INTO clientes (nombre) VALUES 
      ('Empresa ABC S.A. de C.V.'),
      ('Tiendas XYZ México'),
      ('Servicios Corporativos LMN'),
      ('Consultoría Tech Solutions')
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Datos de ejemplo insertados correctamente');
    
  } catch (error) {
    console.error('Error insertando datos de ejemplo:', error.message);
  }
}

// Verificar conexión a la base de datos
async function verificarConexion() {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Conexión a PostgreSQL exitosa:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    return false;
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  inicializarBaseDeDatos,
  verificarConexion,
  pool
};