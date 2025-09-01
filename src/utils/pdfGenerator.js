const PDFDocument = require('pdfkit');
const fs = require('fs');

function generarCotizacionPDF(cotizacion) {
  return new Promise((resolve, reject) => {
    // Crear instancia de PDFDocument con márgenes mejorados
    const doc = new PDFDocument({ margin: 50 });
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
    doc.fontSize(12)
      .text(`Número: ${cotizacion.id}`)
      .text(`Fecha: ${new Date(cotizacion.fecha).toLocaleDateString('es-ES')}`)
      .text(`Cliente: ${cotizacion.cliente_nombre}`);
    doc.moveDown();
    
    // Configuración de la tabla
    const tableTop = doc.y;
    const descWidth = 250;
    const priceWidth = 100;
    const quantityWidth = 80;
    const totalWidth = 100;
    const pageWidth = doc.page.width - 100; // Ancho total disponible
    
    // Encabezados de tabla
    doc.font('Helvetica-Bold')
      .text('Descripción', 50, tableTop, { width: descWidth, align: 'left' })
      .text('Precio', 50 + descWidth, tableTop, { width: priceWidth, align: 'right' })
      .text('Cantidad', 50 + descWidth + priceWidth, tableTop, { width: quantityWidth, align: 'center' })
      .text('Total', 50 + descWidth + priceWidth + quantityWidth, tableTop, { width: totalWidth, align: 'right' });
  
    // Línea divisoria
    doc.moveTo(50, tableTop + 20)
      .lineTo(50 + descWidth + priceWidth + quantityWidth + totalWidth, tableTop + 20)
      .stroke();
  
    // Items
    let y = tableTop + 30;
    
    cotizacion.items.forEach(item => {
      const itemTotal = parseFloat(item.price) * item.quantity;
      
      // Verificar si necesita una nueva página
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }
      
      // Descripción con manejo de texto largo
      const descriptionHeight = doc.heightOfString(item.name, {
        width: descWidth,
        align: 'left'
      });
      
      // Precio formateado
      const precioFormateado = new Intl.NumberFormat('es-MX', { 
        style: 'currency', 
        currency: 'MXN' 
      }).format(item.price);
      
      // Total del item formateado
      const totalFormateado = new Intl.NumberFormat('es-MX', { 
        style: 'currency', 
        currency: 'MXN' 
      }).format(itemTotal);
      
      // Dibujar los valores
      doc.font('Helvetica')
        .text(item.name, 50, y, { width: descWidth, align: 'left' })
        .text(precioFormateado, 50 + descWidth, y, { width: priceWidth, align: 'right' })
        .text(item.quantity.toString(), 50 + descWidth + priceWidth, y, { width: quantityWidth, align: 'center' })
        .text(totalFormateado, 50 + descWidth + priceWidth + quantityWidth, y, { width: totalWidth, align: 'right' });
    
      y += Math.max(25, descriptionHeight + 10);
    });
    
    // Total con formato de moneda
    const totalFormateado = new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN' 
    }).format(cotizacion.total);
    
    doc.moveDown(2)
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(`Total: ${totalFormateado}`, { align: 'right' });

    doc.end();
  });
}

module.exports = {
  generarCotizacionPDF
};