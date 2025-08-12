const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cotizacionesRoutes = require('./routes/cotizaciones');
const itemsRoutes = require('./routes/items');
const clientesRoutes = require('./routes/clientes');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Rutas
app.use('/api/cotizaciones', cotizacionesRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/clientes', clientesRoutes);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Algo salió mal!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});