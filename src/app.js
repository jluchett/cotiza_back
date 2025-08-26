const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cotizacionesRoutes = require('./routes/cotizaciones');
const itemsRoutes = require('./routes/items');
const clientesRoutes = require('./routes/clientes');
const { inicializarBaseDeDatos, verificarConexion } = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Rutas
app.use('/api/cotizaciones', cotizacionesRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/clientes', clientesRoutes);

// Ruta de salud para verificar que el servidor funciona
app.get('/api/health', async (req, res) => {
  const dbStatus = await verificarConexion();
  res.json({
    status: 'Servidor funcionando',
    database: dbStatus ? 'Conectado' : 'Desconectado',
    timestamp: new Date().toISOString()
  });
});

// Ruta para forzar inicialización de BD (útil para desarrollo)
app.post('/api/init-db', async (req, res) => {
  try {
    await inicializarBaseDeDatos();
    res.json({ message: 'Base de datos inicializada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Algo salió mal!');
});

const PORT = process.env.PORT || 3000;
const URL = process.env.DB_URL_INT;

// Inicializar la aplicación
async function iniciarServidor() {
  try {
    // Verificar conexión a la base de datos
    const conexionExitosa = await verificarConexion();
    
    if (conexionExitosa) {
      // Inicializar base de datos (crear tablas si no existen)
      await inicializarBaseDeDatos();
    } else {
      console.warn('⚠️  La aplicación iniciará sin conexión a base de datos');
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`📍 Health check: ${URL}/api/health`);
      if (!conexionExitosa) {
        console.warn('⚠️  Verifica las variables de entorno de la base de datos');
      }
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Iniciar la aplicación
iniciarServidor();