const Cotizacion = require('../models/cotizaciones');
const pdfGenerator = require('../utils/pdfGenerator');

exports.crearCotizacion = async (req, res) => {
  try {
    const { clienteId, items } = req.body;
    const cotizacion = await Cotizacion.crear(clienteId, items);
    res.status(201).json(cotizacion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.obtenerCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const cotizacion = await Cotizacion.obtenerPorId(id);
    
    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    
    res.json(cotizacion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generarPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const cotizacion = await Cotizacion.obtenerPorId(id);
    
    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    
    const pdfBuffer = await pdfGenerator.generarCotizacionPDF(cotizacion);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cotizacion_${id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};