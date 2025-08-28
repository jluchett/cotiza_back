const PDFDocument = require('pdfkit');
const fs = require('fs');

function generarCotizacionPDF(cotizacion) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    
    // Encabezado
    doc.fontSize(20).text('COTIZACIÓN', { align: 'center' });
    doc.moveDown();
    
    // Información de la cotización
    doc.fontSize(12).text(`Número: ${cotizacion.id}`);
    doc.text(`Fecha: ${new Date(cotizacion.fecha).toLocaleDateString()}`);
    doc.text(`Cliente: ${cotizacion.cliente_nombre}`);
    doc.moveDown();
    
    // Tabla de items
    const tableTop = doc.y;
    const itemWidth = 250;
    const priceWidth = 100;
    const quantityWidth = 80;
    const totalWidth = 100;
    
    // Encabezados de tabla
    doc.font('Helvetica-Bold')
      .text('Descripción', 50, tableTop)
      .text('Precio', 50 + itemWidth, tableTop)
      .text('Cantidad', 50 + itemWidth + priceWidth, tableTop)
      .text('Total', 50 + itemWidth + priceWidth + quantityWidth, tableTop);
    
    // Línea divisoria
    doc.moveTo(50, tableTop + 20)
      .lineTo(50 + itemWidth + priceWidth + quantityWidth + totalWidth, tableTop + 20)
      .stroke();
    
    // Items
    let y = tableTop + 30;
    cotizacion.items.forEach(item => {
      const itemTotal = parseFloat(item.price) * item.quantity;
      
      doc.font('Helvetica')
        .text(item.name, 50, y)
        .text(`$${parseFloat(item.price).toFixed(2)}`, 50 + itemWidth, y)
        .text(item.quantity.toString(), 50 + itemWidth + priceWidth, y)
        .text(`$${itemTotal.toFixed(2)}`, 50 + itemWidth + priceWidth + quantityWidth, y);
      
      y += 25;
    });
    
    // Total
    doc.moveDown()
      .font('Helvetica-Bold')
      .text(`Total: $${parseFloat(cotizacion.total).toFixed(2)}`, { align: 'right' });

    doc.end();
  });
}

module.exports = {
  generarCotizacionPDF
};