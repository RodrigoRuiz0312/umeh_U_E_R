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
}

module.exports = new ReportesController();
