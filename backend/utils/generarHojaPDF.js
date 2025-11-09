const PDFDocument = require('pdfkit');
const path = require('path');

function generarHojaPDF(datos, res) {
  const doc = new PDFDocument({
    margin: 50,
    size: 'A4'
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="Hoja_Consulta_${datos.id_consulta}.pdf"`);

  doc.pipe(res);

  // Configuración de márgenes y medidas
  const pageWidth = doc.page.width - 100;
  const lineStart = 50;
  const lineEnd = doc.page.width - 50;

  // === ENCABEZADO MEJORADO ===
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .fillColor('#2c3e50')
    .text('HOJA DE REGISTRO MÉDICO', 0, 60, { align: 'center' });

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#666')
    .text('UNIDAD MÉDICA DE LA HUASTECA', 0, 80, { align: 'center' });

  // Línea divisora del encabezado
  doc
    .moveTo(lineStart, 100)
    .lineTo(lineEnd, 100)
    .strokeColor('#3498db')
    .lineWidth(2)
    .stroke();

  // Información de la consulta
  const infoY = 115;
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#2c3e50');

  // Fecha
  doc.text(`FECHA: ${new Date(datos.fecha).toLocaleDateString('es-MX')}`, lineStart, infoY);

  // Hora y consulta
  const fecha = new Date(datos.fecha);
  doc.text(`HORA: ${fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`, lineEnd - 150, infoY);
  doc.text(`NO. CONSULTA: ${datos.id_consulta}`, lineEnd - 150, infoY + 15);

  // === SECCIÓN: DATOS DEL PACIENTE ===
  const sectionY = 150;
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#2c3e50')
    .text('DATOS DEL PACIENTE', 0, sectionY, { align: 'center' });

  // Línea de sección
  doc
    .moveTo(lineStart, sectionY + 15)
    .lineTo(lineEnd, sectionY + 15)
    .strokeColor('#7f8c8d')
    .lineWidth(0.8)
    .stroke();

  // Datos del paciente en formato organizado
  const dataStartY = sectionY + 30;
  let currentY = dataStartY;

  // Primera columna
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#34495e')
    .text('Nombre completo:', lineStart, currentY);
  doc
    .font('Helvetica')
    .fillColor('#000')
    .text(`${datos.paciente_nombre} ${datos.paciente_apellidos}`, lineStart + 90, currentY);

  currentY += 18;

  const fechaNacimiento = new Date(datos.fecha_nacimiento);
  const dia = String(fechaNacimiento.getDate()).padStart(2, '0');
  const mes = String(fechaNacimiento.getMonth() + 1).padStart(2, '0');
  const anio = fechaNacimiento.getFullYear();
  const fechaFormateada = `${dia}/${mes}/${anio}`;

  doc
    .font('Helvetica')
    .fillColor('#000')
    .text(fechaFormateada, lineStart + 105, currentY);


  doc
    .font('Helvetica-Bold')
    .fillColor('#34495e')
    .text('Fecha de nacimiento:', lineStart, currentY);
  doc
    .font('Helvetica')
    .fillColor('#000')
    .text(fechaFormateada, lineStart + 105, currentY);

  currentY += 18;

  doc
    .font('Helvetica-Bold')
    .fillColor('#34495e')
    .text('Sexo:', lineStart, currentY);
  doc
    .font('Helvetica')
    .fillColor('#000')
    .text(datos.sexo, lineStart + 30, currentY);

  currentY += 18;

  doc
    .font('Helvetica-Bold')
    .fillColor('#34495e')
    .text('Edad:', lineStart, currentY);
  doc
    .font('Helvetica')
    .fillColor('#000')
    .text(calcularEdad(datos.fecha_nacimiento), lineStart + 32, currentY);

  // Segunda columna
  currentY = dataStartY;

  doc
    .font('Helvetica-Bold')
    .fillColor('#34495e')
    .text('Teléfono:', lineStart + 250, currentY);
  doc
    .font('Helvetica')
    .fillColor('#000')
    .text(datos.paciente_telefono || 'N/A', lineStart + 250 + 48, currentY);

  currentY += 18;

  doc
    .font('Helvetica-Bold')
    .fillColor('#34495e')
    .text('Domicilio:', lineStart + 250, currentY);
  const direccion = formatDireccion(datos);
  doc
    .font('Helvetica')
    .fillColor('#000')
    .text(direccion, lineStart + 250 + 50, currentY, {
      width: 200,
      align: 'left'
    });

  // === SECCIÓN: SOMATOMETRÍA ===
  const somatoY = dataStartY + 75;
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#2c3e50')
    .text('SOMATOMETRÍA', 0, somatoY, { align: 'center' });

  // Línea de sección
  doc
    .moveTo(lineStart, somatoY + 25)
    .lineTo(lineEnd, somatoY + 25)
    .strokeColor('#7f8c8d')
    .lineWidth(0.8)
    .stroke();

  // Campos de somatometría
  const somatoDataY = somatoY + 40;

  // Fila 1
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#34495e')
    .text('T/A:', lineStart, somatoDataY);
  doc
    .font('Helvetica')
    .fillColor('#000')
    .text('_______ mmHg', lineStart + 25, somatoDataY);

  doc
    .font('Helvetica-Bold')
    .text('F/C:', lineStart + 120, somatoDataY);
  doc
    .font('Helvetica')
    .text('_______ lpm', lineStart + 145, somatoDataY);

  doc
    .font('Helvetica-Bold')
    .text('F/R:', lineStart + 240, somatoDataY);
  doc
    .font('Helvetica')
    .text('_______ rpm', lineStart + 265, somatoDataY);

  // Fila 2
  doc
    .font('Helvetica-Bold')
    .text('TEMP:', lineStart + 360, somatoDataY);
  doc
    .font('Helvetica')
    .text('_______ °C', lineStart + 395, somatoDataY);

  doc
    .font('Helvetica-Bold')
    .text('SATO2:', lineStart, somatoDataY + 25);
  doc
    .font('Helvetica')
    .text('_______ %', lineStart + 35, somatoDataY + 25);

  doc
    .font('Helvetica-Bold')
    .text('Peso:', lineStart + 120, somatoDataY + 25);
  doc
    .font('Helvetica')
    .text('_______ kg', lineStart + 150, somatoDataY + 25);

  doc
    .font('Helvetica-Bold')
    .text('Talla:', lineStart + 240, somatoDataY + 25);
  doc
    .font('Helvetica')
    .text('_______ cm', lineStart + 265, somatoDataY + 25);

  // === SECCIÓN: ANOTACIONES MÉDICAS ===
  const notesY = somatoDataY + 60;
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#2c3e50')
    .text('ANOTACIONES MÉDICAS', 0, notesY, { align: 'center' });

  // Línea de sección
  doc
    .moveTo(lineStart, notesY + 15)
    .lineTo(lineEnd, notesY + 15)
    .strokeColor('#7f8c8d')
    .lineWidth(0.8)
    .stroke();

  // Área de anotaciones con líneas
  const notesStartY = notesY + 40;
  const lineHeight = 20;
  const numLines = 12;

  for (let i = 0; i < numLines; i++) {
    const lineY = notesStartY + (i * lineHeight);

    // Dibujar línea
    doc
      .moveTo(lineStart, lineY)
      .lineTo(lineEnd, lineY)
      .strokeColor('#ecf0f1')
      .lineWidth(0.5)
      .stroke();

    // Números de línea
    doc
      .fontSize(7)
      .fillColor('#bdc3c7')
      .text((i + 1).toString().padStart(2, '0'), lineStart - 15, lineY - 5);
  }

  // === SECCIÓN: MÉDICO ASIGNADO ===
  const doctorY = notesStartY + (numLines * lineHeight) + 20;

  // Verificar si hay espacio suficiente, si no, crear nueva página
  if (doctorY > doc.page.height - 100) {
    doc.addPage();
    doc.y = 50;
  }

  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#2c3e50')
    .text('MÉDICO TRATANTE', 0, doc.y, { align: 'center' });

  // Línea de sección
  doc
    .moveTo(lineStart, doc.y + 15)
    .lineTo(lineEnd, doc.y + 15)
    .strokeColor('#7f8c8d')
    .lineWidth(0.8)
    .stroke();

  // Información del médico
  doc.y += 30;

  doc
    .fontSize(11)
    .font('Helvetica-Bold')
    .fillColor('#2c3e50')
    .text(`Dr. ${datos.medico_nombre} ${datos.medico_apellidos}`, 0, doc.y, { align: 'center' });

  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#000')
    .text(`Especialidad: ${datos.medico_especialidad || 'No especificada'}`, 0, doc.y + 10, { align: 'center' });

  doc
    .fontSize(9)
    .text(`Cédula Profesional: ${datos.medico_cedula || 'No especificada'}`, 0, doc.y + 13, { align: 'center' });

  // === PIE DE PÁGINA ===
  const footerY = doc.page.height - 50;

  doc
    .moveTo(lineStart, footerY - 20)
    .lineTo(lineEnd, footerY - 20)
    .strokeColor('#bdc3c7')
    .lineWidth(0.5)
    .stroke();

  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#7f8c8d')
    .text('Unidad Médica de la Huasteca (UMEH)', 0, footerY - 15, { align: 'center' });

  doc.end();
}

// Funciones auxiliares
function calcularEdad(fechaNacimiento) {
  try {
    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }

    return `${edad} años`;
  } catch (error) {
    return 'N/A';
  }
}

function formatDireccion(datos) {
  try {
    const parts = [
      datos.calle,
      datos.num,
      datos.colonia,
      datos.ciudad
    ].filter(part => part && part.trim() !== '');

    return parts.length > 0 ? parts.join(', ') : 'No especificado';
  } catch (error) {
    return 'No especificado';
  }
}

module.exports = { generarHojaPDF };