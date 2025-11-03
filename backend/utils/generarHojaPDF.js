// utils/generarHojaPDF.js
const PDFDocument = require('pdfkit');

function generarHojaPDF(datos, res) {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="Hoja_Consulta_${datos.id_consulta}.pdf"`);

  doc.pipe(res);

  // === Encabezado ===
  doc.fontSize(18).text('HOJA DE REGISTRO UMEH', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Fecha: ${new Date(datos.fecha).toLocaleString('es-MX')}`, { align: 'center' });
  doc.text(`No. Consulta: ${datos.id_consulta}`, { align: 'center' });
  doc.moveDown();

  // === Sección: Datos del paciente ===
  doc.fontSize(14).text('DATOS DEL PACIENTE', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  doc.text(`Nombre completo: ${datos.paciente_nombre} ${datos.paciente_apellidos}`);
  doc.text(`Fecha de nacimiento: ${new Date(datos.fecha_nacimiento).toLocaleDateString('es-MX')}`);
  doc.text(`Sexo: ${datos.sexo}`);
  doc.text(`Teléfono: ${datos.paciente_telefono || 'N/A'}`);
  doc.text(`Domicilio: ${datos.calle || ''} ${datos.num || ''}, ${datos.colonia || ''}, ${datos.ciudad || ''}`);
  doc.moveDown();

  // === Sección: Somatometría ===
  doc.fontSize(14).text('SOMATOMETRÍA (LLENADO POR ENFERMERÍA)', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);
  const campos = ['TA: _______ mmHg', 'FC: _______ lpm', 'FR: _______ rpm', 'TEMP: _______ °C', 'SatO₂: _______ %'];
  doc.text(campos.join('   '));
  doc.moveDown();

  // === Sección: Anotaciones médicas ===
  doc.fontSize(14).text('ANOTACIONES MÉDICAS', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).text('Registre aquí los insumos utilizados, procedimientos aplicados y observaciones:');
  for (let i = 0; i < 6; i++) {
    doc.moveDown(0.5);
    doc.text('__________________________________________________________');
  }
  doc.moveDown();

  // === Sección: Médico asignado ===
  doc.fontSize(14).text('MÉDICO ASIGNADO', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Dr(a). ${datos.medico_nombre} ${datos.medico_apellidos}`);
  doc.text(`Especialidad: ${datos.medico_especialidad || 'N/A'}`);
  doc.text(`Cédula Profesional: ${datos.medico_cedula || 'N/A'}`);

  // === Pie de página ===
  doc.moveDown(2);
  doc.fontSize(9).text('Hoja generada automáticamente por el sistema UMEH', { align: 'center', opacity: 0.6 });

  doc.end();
}

module.exports = { generarHojaPDF };