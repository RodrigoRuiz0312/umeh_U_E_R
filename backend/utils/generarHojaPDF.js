const PDFDocument = require('pdfkit');
const path = require('path');

function generarHojaPDF(datos, res) {
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 20, 
    autoFirstPage: false 
  });

  doc.addPage();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="Hoja_Consulta_${datos.id_consulta}.pdf"`);

  doc.pipe(res);

  // --- CONFIGURACIÓN ESTILOS ---
  const colorBorde = '#000000';
  const colorFondoHeader = '#b2ebf2'; 
  const colorTexto = '#000000';
  
  const pageW = doc.page.width; 
  const margin = 25;
  const contentW = pageW - (margin * 2);
  const halfHeight = 396; 

  // --- FUNCIÓN DE DIBUJADO (Igual que antes) ---
  function dibujarCelda(x, y, w, h, titulo, valor, alinearValor = 'left', fondo = false, ajusteY = 0) {
    if (fondo) {
      doc.rect(x, y, w, 12).fillAndStroke(colorFondoHeader, colorBorde); 
      doc.rect(x, y + 12, w, h - 12).stroke(colorBorde); 
    } else {
      doc.rect(x, y, w, h).stroke(colorBorde);
    }

    doc.fontSize(6).font('Helvetica-Bold').fillColor(colorTexto);
    doc.text(titulo.toUpperCase(), x + 2, y + 3, { width: w - 4, align: 'center' });

    if (valor) {
      doc.fontSize(8).font('Helvetica').fillColor(colorTexto);
      const textY = (fondo ? y + 16 : y + 12) + ajusteY; 
      doc.text(valor, x + 4, textY, { width: w - 8, align: alinearValor });
    }
  }

  let currentY = margin;

  // 1. ENCABEZADO
  // Logo en el lado izquierdo
  const logoPath = path.join(__dirname, '..', 'public', 'logo_umeh.png');
  try {
    doc.image(logoPath, 35, 20, { width: 100, height: 35 });
  } catch (error) {
    console.log('No se pudo cargar el logo:', error.message);
  }

  doc.fontSize(14).font('Helvetica-Bold').text('HOJA DE REGISTRO', margin, currentY, { align: 'center', width: contentW });
  doc.fontSize(8).font('Helvetica').text('UNIDAD MÉDICA DE LA HUASTECA', margin, currentY + 16, { align: 'center', width: contentW });
  
  // Folio y Fecha en el lado derecho
  doc.fontSize(7).text(`FOLIO: ${datos.id_consulta}`, pageW - margin - 100, currentY + 5);
  doc.text(`FECHA: ${new Date(datos.fecha).toLocaleDateString('es-MX')}`, pageW - margin - 100, currentY + 15);

  currentY += 35; 

  // --- FILA 1: PACIENTE ---
  const row1H = 30; 
  const wNombre = contentW * 0.40;
  const wEdad = contentW * 0.10;
  const wSexo = contentW * 0.10;
  const wTel = contentW * 0.40; 

  dibujarCelda(margin, currentY, wNombre, row1H, 'PACIENTE', `${datos.paciente_nombre} ${datos.paciente_apellidos}`, 'center', true);
  dibujarCelda(margin + wNombre, currentY, wEdad, row1H, 'EDAD', calcularEdad(datos.fecha_nacimiento), 'center', true);
  dibujarCelda(margin + wNombre + wEdad, currentY, wSexo, row1H, 'SEXO', datos.sexo, 'center', true);
  dibujarCelda(margin + wNombre + wEdad + wSexo, currentY, wTel, row1H, 'TELÉFONOS', datos.paciente_telefono || 'N/A', 'center', true);

  currentY += row1H; 

  // --- FILA 2: DIRECCIÓN Y SOMATOMETRÍA BÁSICA ---
  const row2H = 35; 
  const wDir = contentW * 0.60;
  const wPeso = contentW * 0.20;
  const wTalla = contentW * 0.20;

  dibujarCelda(margin, currentY, wDir, row2H, 'DIRECCIÓN', formatDireccion(datos), 'center', true, 3);
  dibujarCelda(margin + wDir, currentY, wPeso, row2H, 'PESO (kg)', "_______", 'center', true, 8);
  dibujarCelda(margin + wDir + wPeso, currentY, wTalla, row2H, 'TALLA (cm)', "_______", 'center', true, 8);

  currentY += row2H;

  // --- FILA 3: SIGNOS VITALES ---
  const row3H = 35;
  const colsVitals = 5; 
  const wVital = contentW / colsVitals;

  dibujarCelda(margin, currentY, wVital, row3H, 'T/A (mmHg)', "_______", 'center', true, 8);
  dibujarCelda(margin + wVital, currentY, wVital, row3H, 'F.C. (lpm)', "_______", 'center', true, 8);
  dibujarCelda(margin + (wVital*2), currentY, wVital, row3H, 'F.R. (rpm)', "_______", 'center', true, 8);
  dibujarCelda(margin + (wVital*3), currentY, wVital, row3H, 'TEMP (°C)', "_______", 'center', true, 8);
  dibujarCelda(margin + (wVital*4), currentY, wVital, row3H, 'SAT O2 (%)', "_______", 'center', true, 8);

  currentY += row3H; // Quitamos el espacio extra aquí para apretar un poco

  currentY += 5; // Espacio antes de la tabla

  // --- TABLA PRINCIPAL (REDUCIDA) ---
  const mainTableY = currentY;
  // Reducimos altura de 170 a 115 para que quepan las nuevas filas abajo
  const mainTableH = 115; 
  
  const col1X = margin;
  const col1W = 100; 
  const col3W = 60; 
  const col3X = pageW - margin - col3W;
  const col2X = col1X + col1W; 
  const col2W = contentW - col1W - col3W;

  // Encabezados
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#000');
  
  doc.rect(col1X, mainTableY, col1W, 15).fillAndStroke('#e0e0e0', '#000');
  doc.fillColor('#000').text('CATEGORÍA', col1X, mainTableY + 5, { width: col1W, align: 'center' });

  doc.rect(col2X, mainTableY, col2W, 15).fillAndStroke('#e0e0e0', '#000');
  doc.fillColor('#000').text('DESCRIPCIÓN / NOTAS MÉDICAS', col2X, mainTableY + 5, { width: col2W, align: 'center' });

  doc.rect(col3X, mainTableY, col3W, 15).fillAndStroke('#e0e0e0', '#000');
  doc.fillColor('#000').text('IMPORTE', col3X, mainTableY + 5, { width: col3W, align: 'center' });

  // Cuerpo y Líneas
  const bodyY = mainTableY + 15;
  doc.rect(col1X, bodyY, col1W, mainTableH).stroke(); 
  doc.rect(col2X, bodyY, col2W, mainTableH).stroke(); 
  doc.rect(col3X, bodyY, col3W, mainTableH).stroke(); 

  // Servicios
  const servicios = ['CONSULTA', 'LABORATORIO', 'APLICACIÓN', 'MEDICAMENTOS', 'MATERIAL', 'OTRO'];
  let servY = bodyY + 8;
  doc.fontSize(6).font('Helvetica-Bold'); // Fuente un poco más chica para que quepan bien
  
  servicios.forEach(serv => {
    doc.text(serv, col1X + 2, servY);
    servY += 19; // Espaciado más ajustado
    doc.moveTo(col1X, servY - 8).lineTo(col1X + col1W, servY - 8).dash(1, { space: 2 }).strokeColor('#ccc').stroke().undash().strokeColor('#000');
  });

  // Renglones centrales
  const numLineas = 8; // Menos líneas porque la tabla es más chica
  const alturaLinea = mainTableH / numLineas;
  doc.fontSize(9).font('Helvetica').text('', col2X + 5, bodyY + 5); 
  
  for(let i = 0; i < numLineas; i++) {
    let ly = bodyY + (i * alturaLinea);
    doc.moveTo(col2X, ly).lineTo(col2X + col2W, ly).strokeColor('#eee').lineWidth(0.5).stroke();
  }
  
  // Texto Motivo
  doc.strokeColor('#000'); 
  doc.text(datos.motivo_consulta || '', col2X + 5, bodyY + 5, {
    width: col2W - 10,
    height: mainTableH - 10,
    align: 'left'
  });

  // Total (misma altura que OBSERVACIONES)
  const footerTableY = bodyY + mainTableH;

  // --- FILA 5 (NUEVA): OBSERVACIONES Y TOTAL ---
  const obsH = 25; // Altura para observaciones
  dibujarCelda(margin, footerTableY, col1W + col2W, obsH, 'OBSERVACIONES', '', 'left', true);
  
  // Total con la misma altura que observaciones
  doc.rect(col3X, footerTableY, col3W, obsH).stroke();
  doc.fontSize(6).font('Helvetica-Bold').fillColor(colorTexto);
  doc.text('TOTAL:', col3X + 2, footerTableY + 2, { width: col3W - 4, align: 'left' });
  doc.text('$', col3X + 2, footerTableY + 10, { width: col3W - 4, align: 'left' });

  // --- PIE DE PÁGINA (NUEVO): FIRMAS Y ENCARGADOS ---
  const signaturesY = footerTableY + obsH + 5;
  const signatureH = 40;
  const boxW = contentW / 3; // Dividimos en 3: Recepción, Enfermería, Médico

  // Caja 1: Recepción
  dibujarCelda(margin, signaturesY, boxW, signatureH, 'RECEPCIÓN', '', 'center', true);
  
  // Caja 2: Enfermería
  dibujarCelda(margin + boxW, signaturesY, boxW, signatureH, 'ENFERMERÍA', '', 'center', true);

  // Caja 3: Médico Tratante
  const datosMedico = `DR. ${datos.medico_nombre} ${datos.medico_apellidos}\n${datos.medico_especialidad || ''}`;
  dibujarCelda(margin + (boxW * 2), signaturesY, boxW, signatureH, 'MÉDICO TRATANTE', datosMedico, 'center', true, 2);

  // Corte
  doc.moveTo(0, halfHeight).lineTo(pageW, halfHeight).dash(5, { space: 5 }).strokeColor('#999').stroke();
  doc.fontSize(6).text('', 0, halfHeight - 8, { align: 'center', width: pageW });

  doc.end();
}

// Helpers
function calcularEdad(fechaNacimiento) {
  try {
    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) { edad--; }
    return `${edad} años`;
  } catch (error) { return 'N/A'; }
}

function formatDireccion(datos) {
  try {
    const parts = [datos.calle + ' #'+ datos.num, datos.colonia, datos.municipio].filter(p => p && p.trim() !== '');
    return parts.length > 0 ? parts.join(', ') : 'No especificado';
  } catch (error) { return 'No especificado'; }
}

module.exports = { generarHojaPDF };