// controllers/reportesController.js
const { pool } = require('../db');

class ReportesController {

  // Obtener reporte de insumos diarios
  async obtenerReporteInsumosDiarios(req, res) {
    try {
      const { fecha } = req.query;

      // Si no se proporciona fecha, usar la fecha actual
      const fechaConsulta = fecha || new Date().toISOString().split('T')[0];

      const result = await pool.query(
        `SELECT 
          ci.tipo,
          ci.id_insumo,
          CASE 
            WHEN ci.tipo = 'medicamento' THEN m.nombre
            WHEN ci.tipo = 'material' THEN mt.nombre
            WHEN ci.tipo = 'mat_general' THEN mg.nombre
            WHEN ci.tipo = 'procedimiento' THEN p.descripcion
          END as nombre_insumo,
          CASE 
            WHEN ci.tipo = 'medicamento' THEN m.unidad
            WHEN ci.tipo = 'material' THEN mt.unidad
            WHEN ci.tipo = 'mat_general' THEN mg.unidad
            ELSE 'servicio'
          END as unidad,
          SUM(ci.cantidad) as cantidad_total,
          ci.costo_unitario,
          SUM(ci.subtotal) as subtotal_total,
          COUNT(DISTINCT ci.id_consulta) as num_consultas
        FROM consulta_insumos ci
        INNER JOIN consultas c ON ci.id_consulta = c.id_consulta
        LEFT JOIN medicamentos m ON ci.tipo = 'medicamento' AND ci.id_insumo = m.id
        LEFT JOIN mat_triage mt ON ci.tipo = 'material' AND ci.id_insumo = mt.id
        LEFT JOIN mat_general mg ON ci.tipo = 'mat_general' AND ci.id_insumo = mg.id
        LEFT JOIN procedimientos p ON ci.tipo = 'procedimiento' AND ci.id_insumo = p.id_procedimiento
        WHERE DATE(c.fecha) = $1 AND c.estatus = 'completada'
        GROUP BY ci.tipo, ci.id_insumo, ci.costo_unitario, 
                 CASE 
                   WHEN ci.tipo = 'medicamento' THEN m.nombre
                   WHEN ci.tipo = 'material' THEN mt.nombre
                   WHEN ci.tipo = 'mat_general' THEN mg.nombre
                   WHEN ci.tipo = 'procedimiento' THEN p.descripcion
                 END,
                 CASE 
                   WHEN ci.tipo = 'medicamento' THEN m.unidad
                   WHEN ci.tipo = 'material' THEN mt.unidad
                   WHEN ci.tipo = 'mat_general' THEN mg.unidad
                   ELSE 'servicio'
                 END
        ORDER BY ci.tipo, nombre_insumo`,
        [fechaConsulta]
      );

      // Calcular totales por tipo
      const totalesPorTipo = {
        medicamento: 0,
        material: 0,
        mat_general: 0,
        procedimiento: 0
      };

      result.rows.forEach(row => {
        const subtotal = parseFloat(row.subtotal_total);
        if (totalesPorTipo.hasOwnProperty(row.tipo)) {
          totalesPorTipo[row.tipo] += subtotal;
        }
      });

      const totalGeneral = Object.values(totalesPorTipo).reduce((sum, val) => sum + val, 0);

      // Convertir tipos de datos
      const insumos = result.rows.map(insumo => ({
        ...insumo,
        id_insumo: parseInt(insumo.id_insumo, 10),
        cantidad_total: parseFloat(insumo.cantidad_total),
        costo_unitario: parseFloat(insumo.costo_unitario),
        subtotal_total: parseFloat(insumo.subtotal_total),
        num_consultas: parseInt(insumo.num_consultas, 10)
      }));

      // Obtener costos de consultas y extras
      const costosResult = await pool.query(
        `SELECT 
          COALESCE(SUM(costo_consulta), 0) as total_costo_consultas,
          COALESCE(SUM((SELECT SUM(costo) FROM consulta_extras WHERE id_consulta = c.id_consulta)), 0) as total_extras
        FROM consultas c
        WHERE DATE(c.fecha) = $1 AND c.estatus = 'completada'`,
        [fechaConsulta]
      );

      const costoConsultas = parseFloat(costosResult.rows[0].total_costo_consultas);
      const costoExtras = parseFloat(costosResult.rows[0].total_extras);

      res.json({
        fecha: fechaConsulta,
        insumos,
        totalesPorTipo,
        totalInsumos: totalGeneral,
        costoConsultas,
        costoExtras,
        totalGeneral: totalGeneral + costoConsultas + costoExtras
      });
    } catch (error) {
      console.error('Error obteniendo reporte de insumos:', error);
      res.status(500).json({ error: 'Error al obtener reporte de insumos diarios' });
    }
  }

  // Obtener reporte de insumos por rango de fechas
  async obtenerReporteInsumosRango(req, res) {
    try {
      const { fecha_inicio, fecha_fin } = req.query;

      if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Se requieren fecha_inicio y fecha_fin' });
      }

      const result = await pool.query(
        `SELECT 
          ci.tipo,
          ci.id_insumo,
          CASE 
            WHEN ci.tipo = 'medicamento' THEN m.nombre
            WHEN ci.tipo = 'material' THEN mt.nombre
            WHEN ci.tipo = 'mat_general' THEN mg.nombre
            WHEN ci.tipo = 'procedimiento' THEN p.descripcion
          END as nombre_insumo,
          CASE 
            WHEN ci.tipo = 'medicamento' THEN m.unidad
            WHEN ci.tipo = 'material' THEN mt.unidad
            WHEN ci.tipo = 'mat_general' THEN mg.unidad
            ELSE 'servicio'
          END as unidad,
          SUM(ci.cantidad) as cantidad_total,
          ci.costo_unitario,
          SUM(ci.subtotal) as subtotal_total,
          COUNT(DISTINCT ci.id_consulta) as num_consultas
        FROM consulta_insumos ci
        INNER JOIN consultas c ON ci.id_consulta = c.id_consulta
        LEFT JOIN medicamentos m ON ci.tipo = 'medicamento' AND ci.id_insumo = m.id
        LEFT JOIN mat_triage mt ON ci.tipo = 'material' AND ci.id_insumo = mt.id
        LEFT JOIN mat_general mg ON ci.tipo = 'mat_general' AND ci.id_insumo = mg.id
        LEFT JOIN procedimientos p ON ci.tipo = 'procedimiento' AND ci.id_insumo = p.id_procedimiento
        WHERE DATE(c.fecha) BETWEEN $1 AND $2 AND c.estatus = 'completada'
        GROUP BY ci.tipo, ci.id_insumo, ci.costo_unitario,
                 CASE 
                   WHEN ci.tipo = 'medicamento' THEN m.nombre
                   WHEN ci.tipo = 'material' THEN mt.nombre
                   WHEN ci.tipo = 'mat_general' THEN mg.nombre
                   WHEN ci.tipo = 'procedimiento' THEN p.descripcion
                 END,
                 CASE 
                   WHEN ci.tipo = 'medicamento' THEN m.unidad
                   WHEN ci.tipo = 'material' THEN mt.unidad
                   WHEN ci.tipo = 'mat_general' THEN mg.unidad
                   ELSE 'servicio'
                 END
        ORDER BY ci.tipo, nombre_insumo`,
        [fecha_inicio, fecha_fin]
      );

      // Calcular totales por tipo
      const totalesPorTipo = {
        medicamento: 0,
        material: 0,
        mat_general: 0,
        procedimiento: 0
      };

      result.rows.forEach(row => {
        const subtotal = parseFloat(row.subtotal_total);
        if (totalesPorTipo.hasOwnProperty(row.tipo)) {
          totalesPorTipo[row.tipo] += subtotal;
        }
      });

      const totalGeneral = Object.values(totalesPorTipo).reduce((sum, val) => sum + val, 0);

      // Convertir tipos de datos
      const insumos = result.rows.map(insumo => ({
        ...insumo,
        id_insumo: parseInt(insumo.id_insumo, 10),
        cantidad_total: parseFloat(insumo.cantidad_total),
        costo_unitario: parseFloat(insumo.costo_unitario),
        subtotal_total: parseFloat(insumo.subtotal_total),
        num_consultas: parseInt(insumo.num_consultas, 10)
      }));

      // Obtener costos de consultas y extras
      const costosResult = await pool.query(
        `SELECT 
          COALESCE(SUM(costo_consulta), 0) as total_costo_consultas,
          COALESCE(SUM((SELECT SUM(costo) FROM consulta_extras WHERE id_consulta = c.id_consulta)), 0) as total_extras
        FROM consultas c
        WHERE DATE(c.fecha) BETWEEN $1 AND $2 AND c.estatus = 'completada'`,
        [fecha_inicio, fecha_fin]
      );

      const costoConsultas = parseFloat(costosResult.rows[0].total_costo_consultas);
      const costoExtras = parseFloat(costosResult.rows[0].total_extras);

      res.json({
        fecha_inicio,
        fecha_fin,
        insumos,
        totalesPorTipo,
        totalInsumos: totalGeneral,
        costoConsultas,
        costoExtras,
        totalGeneral: totalGeneral + costoConsultas + costoExtras
      });
    } catch (error) {
      console.error('Error obteniendo reporte de insumos por rango:', error);
      res.status(500).json({ error: 'Error al obtener reporte de insumos por rango' });
    }
  }

  // Obtener resumen de consultas del día
  async obtenerResumenConsultasDia(req, res) {
    try {
      const { fecha } = req.query;
      const fechaConsulta = fecha || new Date().toISOString().split('T')[0];

      const result = await pool.query(
        `SELECT 
          COUNT(*) as total_consultas,
          COUNT(*) FILTER (WHERE estatus = 'completada') as completadas,
          COUNT(*) FILTER (WHERE estatus = 'cancelada') as canceladas,
          COALESCE(SUM(total) FILTER (WHERE estatus = 'completada'), 0) as total_ingresos
        FROM consultas
        WHERE DATE(fecha) = $1`,
        [fechaConsulta]
      );

      const resumen = {
        fecha: fechaConsulta,
        total_consultas: parseInt(result.rows[0].total_consultas, 10),
        completadas: parseInt(result.rows[0].completadas, 10),
        canceladas: parseInt(result.rows[0].canceladas, 10),
        total_ingresos: parseFloat(result.rows[0].total_ingresos)
      };

      res.json(resumen);
    } catch (error) {
      console.error('Error obteniendo resumen de consultas:', error);
      res.status(500).json({ error: 'Error al obtener resumen de consultas del día' });
    }
  }

  // Generar PDF del reporte diario
  async generarReportePDF(req, res) {
    try {
      const { fecha } = req.query;
      const fechaConsulta = fecha || new Date().toISOString().split('T')[0];
      const PDFDocument = require('pdfkit');

      // 1. Obtener datos (reutilizando lógica existente)
      const resultInsumos = await pool.query(
        `SELECT 
          ci.tipo,
          CASE 
            WHEN ci.tipo = 'medicamento' THEN m.nombre
            WHEN ci.tipo = 'material' THEN mt.nombre
            WHEN ci.tipo = 'mat_general' THEN mg.nombre
            WHEN ci.tipo = 'procedimiento' THEN p.descripcion
          END as nombre_insumo,
          CASE 
            WHEN ci.tipo = 'medicamento' THEN m.unidad
            WHEN ci.tipo = 'material' THEN mt.unidad
            WHEN ci.tipo = 'mat_general' THEN mg.unidad
            ELSE 'servicio'
          END as unidad,
          SUM(ci.cantidad) as cantidad_total,
          ci.costo_unitario,
          SUM(ci.subtotal) as subtotal_total
        FROM consulta_insumos ci
        INNER JOIN consultas c ON ci.id_consulta = c.id_consulta
        LEFT JOIN medicamentos m ON ci.tipo = 'medicamento' AND ci.id_insumo = m.id
        LEFT JOIN mat_triage mt ON ci.tipo = 'material' AND ci.id_insumo = mt.id
        LEFT JOIN mat_general mg ON ci.tipo = 'mat_general' AND ci.id_insumo = mg.id
        LEFT JOIN procedimientos p ON ci.tipo = 'procedimiento' AND ci.id_insumo = p.id_procedimiento
        WHERE DATE(c.fecha) = $1 AND c.estatus = 'completada'
        GROUP BY ci.tipo, ci.id_insumo, ci.costo_unitario, 
                 CASE 
                   WHEN ci.tipo = 'medicamento' THEN m.nombre
                   WHEN ci.tipo = 'material' THEN mt.nombre
                   WHEN ci.tipo = 'mat_general' THEN mg.nombre
                   WHEN ci.tipo = 'procedimiento' THEN p.descripcion
                 END,
                 CASE 
                   WHEN ci.tipo = 'medicamento' THEN m.unidad
                   WHEN ci.tipo = 'material' THEN mt.unidad
                   WHEN ci.tipo = 'mat_general' THEN mg.unidad
                   ELSE 'servicio'
                 END
        ORDER BY ci.tipo, nombre_insumo`,
        [fechaConsulta]
      );

      const resultResumen = await pool.query(
        `SELECT 
          COUNT(*) as total_consultas,
          COUNT(*) FILTER (WHERE estatus = 'completada') as completadas,
          COUNT(*) FILTER (WHERE estatus = 'cancelada') as canceladas,
          COALESCE(SUM(total) FILTER (WHERE estatus = 'completada'), 0) as total_ingresos
        FROM consultas
        WHERE DATE(fecha) = $1`,
        [fechaConsulta]
      );

      const costosResult = await pool.query(
        `SELECT 
          COALESCE(SUM(costo_consulta), 0) as total_costo_consultas,
          COALESCE(SUM((SELECT SUM(costo) FROM consulta_extras WHERE id_consulta = c.id_consulta)), 0) as total_extras
        FROM consultas c
        WHERE DATE(c.fecha) = $1 AND c.estatus = 'completada'`,
        [fechaConsulta]
      );

      // Procesar datos
      const insumos = resultInsumos.rows.map(i => ({
        ...i,
        cantidad_total: parseFloat(i.cantidad_total),
        costo_unitario: parseFloat(i.costo_unitario),
        subtotal_total: parseFloat(i.subtotal_total)
      }));

      const resumen = resultResumen.rows[0];
      const costoConsultas = parseFloat(costosResult.rows[0].total_costo_consultas);
      const costoExtras = parseFloat(costosResult.rows[0].total_extras);

      // Calcular totales por tipo
      const totalesPorTipo = {
        medicamento: 0,
        material: 0,
        mat_general: 0,
        procedimiento: 0
      };

      insumos.forEach(i => {
        if (totalesPorTipo.hasOwnProperty(i.tipo)) {
          totalesPorTipo[i.tipo] += i.subtotal_total;
        }
      });

      const totalInsumos = Object.values(totalesPorTipo).reduce((a, b) => a + b, 0);
      const totalGeneral = totalInsumos + costoConsultas + costoExtras;

      // 2. Generar PDF
      const doc = new PDFDocument({ margin: 30, size: 'Letter' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="reporte_diario_${fechaConsulta}.pdf"`);

      doc.pipe(res);

      // --- ENCABEZADO ---
      doc.image('public/logo_umeh.png', 30, 30, { height: 50 });

      doc.fontSize(16).font('Helvetica-Bold').text('REPORTE DIARIO DE OPERACIONES', 150, 45, { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Fecha: ${fechaConsulta}`, 150, 65, { align: 'center' });

      doc.moveDown(3);

      // --- RESUMEN ---
      const startY = doc.y;

      // Caja de Resumen
      doc.rect(30, startY, 550, 70).stroke();

      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('RESUMEN DEL DÍA', 40, startY + 10);

      doc.font('Helvetica');
      doc.text(`Total Consultas: ${resumen.total_consultas}`, 40, startY + 30);
      doc.text(`Completadas: ${resumen.completadas}`, 150, startY + 30);
      doc.text(`Canceladas: ${resumen.canceladas}`, 260, startY + 30);
      doc.text(`Total Ingresos: $${parseFloat(resumen.total_ingresos).toFixed(2)}`, 370, startY + 30);

      doc.moveDown(5);

      // --- COSTOS ---
      doc.fontSize(12).font('Helvetica-Bold').text('DESGLOSE DE COSTOS', 30, doc.y);
      doc.moveDown(0.5);

      const costosY = doc.y;
      doc.fontSize(10).font('Helvetica');
      doc.text('Costos de Consultas:', 40, costosY);
      doc.text(`$${costoConsultas.toFixed(2)}`, 400, costosY, { align: 'right' });

      doc.text('Procedimientos Extras:', 40, costosY + 15);
      doc.text(`$${costoExtras.toFixed(2)}`, 400, costosY + 15, { align: 'right' });

      doc.text('Costos de Insumos:', 40, costosY + 30);
      doc.text(`$${totalInsumos.toFixed(2)}`, 400, costosY + 30, { align: 'right' });

      doc.lineWidth(1).moveTo(40, costosY + 45).lineTo(450, costosY + 45).stroke();

      doc.font('Helvetica-Bold');
      doc.text('TOTAL GENERAL:', 40, costosY + 50);
      doc.text(`$${totalGeneral.toFixed(2)}`, 400, costosY + 50, { align: 'right' });

      doc.moveDown(4);

      // --- DETALLE DE INSUMOS ---
      doc.addPage(); // Nueva página para la tabla de insumos

      doc.fontSize(14).font('Helvetica-Bold').text('DETALLE DE INSUMOS UTILIZADOS', 30, 30);
      doc.moveDown();

      // Configuración de tabla
      const tableTop = doc.y;
      const colX = { tipo: 30, nombre: 130, unidad: 330, cant: 380, costo: 430, subtotal: 500 };

      // Encabezados
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('TIPO', colX.tipo, tableTop);
      doc.text('NOMBRE', colX.nombre, tableTop);
      doc.text('UNIDAD', colX.unidad, tableTop);
      doc.text('CANT', colX.cant, tableTop);
      doc.text('P.UNIT', colX.costo, tableTop);
      doc.text('SUBTOTAL', colX.subtotal, tableTop);

      doc.lineWidth(1).moveTo(30, tableTop + 12).lineTo(580, tableTop + 12).stroke();

      let currentY = tableTop + 20;

      // Filas
      doc.font('Helvetica').fontSize(8);

      insumos.forEach(insumo => {
        if (currentY > 700) { // Nueva página si se acaba el espacio
          doc.addPage();
          currentY = 30;
        }

        doc.text(insumo.tipo.toUpperCase(), colX.tipo, currentY, { width: 90 });
        doc.text(insumo.nombre_insumo, colX.nombre, currentY, { width: 190 });
        doc.text(insumo.unidad, colX.unidad, currentY, { width: 40 });
        doc.text(insumo.cantidad_total.toString(), colX.cant, currentY, { width: 40 });
        doc.text(`$${insumo.costo_unitario.toFixed(2)}`, colX.costo, currentY, { width: 60 });
        doc.text(`$${insumo.subtotal_total.toFixed(2)}`, colX.subtotal, currentY, { width: 70 });

        currentY += 15;
        doc.lineWidth(0.5).strokeColor('#cccccc').moveTo(30, currentY - 3).lineTo(580, currentY - 3).stroke();
      });

      // Totales por tipo al final
      doc.moveDown(2);
      currentY += 20;

      if (currentY > 650) {
        doc.addPage();
        currentY = 30;
      }

      doc.strokeColor('#000000');
      doc.fontSize(10).font('Helvetica-Bold').text('RESUMEN POR TIPO', 30, currentY);
      currentY += 20;

      const tipos = {
        medicamento: 'Medicamentos',
        material: 'Material Triage',
        mat_general: 'Material General',
        procedimiento: 'Procedimientos'
      };

      Object.entries(totalesPorTipo).forEach(([key, val]) => {
        if (val > 0) {
          doc.font('Helvetica').text(tipos[key], 30, currentY);
          doc.text(`$${val.toFixed(2)}`, 200, currentY);
          currentY += 15;
        }
      });

      doc.end();

    } catch (error) {
      console.error('Error generando PDF:', error);
      res.status(500).json({ error: 'Error generando el reporte PDF' });
    }
  }
}

module.exports = new ReportesController();
