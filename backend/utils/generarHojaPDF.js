const PDFDocument = require('pdfkit');
const path = require('path');

function generarHojaPDF(datos, res) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="Hoja_Consulta_${datos.id_consulta}.pdf"`);

  doc.pipe(res);

  // === ENCABEZADO ===
  const logoPath = path.join(__dirname, 'logo_umeh.png'); // 🔹 Logo en la esquina superior izquierda
  try {
    doc.image(logoPath, 50, 40, { width: 80 });
  } catch (error) {
    // Si no hay logo, se omite
  }

  // Encabezado centrado
  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .text('HOJA DE REGISTRO UMEH', 0, 50, { align: 'center' });

  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`Fecha: ${new Date(datos.fecha).toLocaleString('es-MX')}`, { align: 'center' })
    .text(`Consulta No.: ${datos.id_consulta}`, { align: 'center' });

  // Línea divisora centrada
  const centerLineStart = 80;
  const centerLineEnd = doc.page.width - 80;
  doc.moveTo(centerLineStart, 110).lineTo(centerLineEnd, 110).strokeColor('#000').lineWidth(1).stroke();
  doc.moveDown(2);

  // === SECCIÓN: DATOS DEL PACIENTE ===
  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .text('DATOS DEL PACIENTE', { align: 'center' });
  doc.moveDown(0.3);
  doc.moveTo(centerLineStart, doc.y).lineTo(centerLineEnd, doc.y).strokeColor('#888').lineWidth(0.5).stroke();
  doc.moveDown(0.8);

  doc.fontSize(11).font('Helvetica').fillColor('#000');
  doc.text(`Nombre completo: ${datos.paciente_nombre} ${datos.paciente_apellidos}`);
  doc.text(`Fecha de nacimiento: ${new Date(datos.fecha_nacimiento).toLocaleDateString('es-MX')}`);
  doc.text(`Sexo: ${datos.sexo}`);
  doc.text(`Teléfono: ${datos.paciente_telefono || 'N/A'}`);
  doc.text(
    `Domicilio: ${datos.calle || ''} ${datos.num || ''}, ${datos.colonia || ''}, ${datos.ciudad || ''}`
  );
  doc.moveDown(1.5);

  // === SECCIÓN: SOMATOMETRÍA ===
  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .text('SOMATOMETRÍA (LLENADO POR ENFERMERÍA)', { align: 'center' });
  doc.moveDown(0.3);
  doc.moveTo(centerLineStart, doc.y).lineTo(centerLineEnd, doc.y).strokeColor('#888').lineWidth(0.5).stroke();
  doc.moveDown(0.8);

  doc.fontSize(11).font('Helvetica');
  const campos = [
    'TA: _______ mmHg',
    'FC: _______ lpm',
    'FR: _______ rpm',
    'TEMP: _______ °C',
    'SatO₂: _______ %'
  ];
  doc.text(campos.join('     '), { align: 'center' });
  doc.moveDown(1.5);

  // === SECCIÓN: ANOTACIONES MÉDICAS ===
  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .text('ANOTACIONES MÉDICAS', { align: 'center' });
  doc.moveDown(0.3);
  doc.moveTo(centerLineStart, doc.y).lineTo(centerLineEnd, doc.y).strokeColor('#888').lineWidth(0.5).stroke();
  doc.moveDown(0.8);

  doc
    .fontSize(10)
    .font('Helvetica-Oblique')
    .text(
      'Registre aquí los insumos utilizados, procedimientos aplicados y observaciones:',
      { align: 'center' }
    );
  doc.moveDown(0.8);

  for (let i = 0; i < 10; i++) {
    doc.text('________________________________________________________________________________', {
      align: 'center'
    });
  }
  doc.moveDown(1.5);

  // === SECCIÓN: MÉDICO ASIGNADO ===
  doc
    .fontSize(13)
    .font('Helvetica-Bold')
    .text('MÉDICO ASIGNADO', { align: 'center' });
  doc.moveDown(0.3);
  doc.moveTo(centerLineStart, doc.y).lineTo(centerLineEnd, doc.y).strokeColor('#888').lineWidth(0.5).stroke();
  doc.moveDown(0.8);

  doc.fontSize(11).font('Helvetica');
  doc.text(`Dr(a). ${datos.medico_nombre} ${datos.medico_apellidos}`, { align: 'center' });
  doc.text(`Especialidad: ${datos.medico_especialidad || 'N/A'}`, { align: 'center' });
  doc.text(`Cédula Profesional: ${datos.medico_cedula || 'N/A'}`, { align: 'center' });

  // === PIE DE PÁGINA ===
  const bottom = doc.page.height - 80;
  doc.moveTo(centerLineStart, bottom).lineTo(centerLineEnd, bottom).strokeColor('#000').lineWidth(0.5).stroke();
  doc
    .fontSize(9)
    .font('Helvetica-Oblique')
    .fillColor('#444')
    .text(
      'Unidad Médica de la Huasteca (UMEH)',
      0,
      bottom + 10,
      { align: 'center' }
    );

  doc.end();
}

module.exports = { generarHojaPDF };
