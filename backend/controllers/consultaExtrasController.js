// controllers/consultaExtrasController.js
const { pool } = require('../db');

class ConsultaExtrasController {
  // Obtener todos los costos extra de una consulta
  async obtenerExtras(req, res) {
    try {
      const { id_consulta } = req.params;

      const result = await pool.query(
        `SELECT id_extra, concepto, costo, observaciones
         FROM consulta_extras
         WHERE id_consulta = $1
         ORDER BY id_extra`,
        [id_consulta]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error obteniendo extras:', error);
      res.status(500).json({ error: 'Error al obtener los costos adicionales' });
    }
  }

  // Agregar un nuevo costo extra
  async agregarExtra(req, res) {
    const client = await pool.connect();
    try {
      const { id_consulta } = req.params;
      const { concepto, costo, observaciones } = req.body;

      if (!concepto || costo === undefined) {
        return res.status(400).json({ error: 'Concepto y costo son obligatorios' });
      }

      await client.query('BEGIN');

      // Insertar nuevo registro
      const insert = await client.query(
        `INSERT INTO consulta_extras (id_consulta, concepto, costo, observaciones)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id_consulta, concepto, costo, observaciones || null]
      );

      // Actualizar total en consultas
      await client.query(
        `UPDATE consultas
         SET total = COALESCE(
             (SELECT SUM(subtotal) FROM consulta_insumos WHERE id_consulta = $1), 0
           ) 
           + COALESCE(
             (SELECT SUM(costo) FROM consulta_extras WHERE id_consulta = $1), 0
           )
           + COALESCE(costo_consulta, 0)
         WHERE id_consulta = $1`,
        [id_consulta]
      );

      await client.query('COMMIT');

      res.status(201).json({
        mensaje: 'Costo adicional agregado',
        extra: insert.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error agregando costo extra:', error);
      res.status(500).json({ error: 'Error al agregar costo extra' });
    } finally {
      client.release();
    }
  }

  // Eliminar un costo extra
  async eliminarExtra(req, res) {
    const client = await pool.connect();
    try {
      const { id_extra } = req.params;

      await client.query('BEGIN');

      // Obtener id_consulta antes de eliminar
      const extra = await client.query(
        'SELECT id_consulta FROM consulta_extras WHERE id_extra = $1',
        [id_extra]
      );

      if (extra.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Costo extra no encontrado' });
      }

      const id_consulta = extra.rows[0].id_consulta;

      // Eliminar registro
      await client.query('DELETE FROM consulta_extras WHERE id_extra = $1', [id_extra]);

      // Recalcular total
      await client.query(
        `UPDATE consultas
         SET total = COALESCE(
             (SELECT SUM(subtotal) FROM consulta_insumos WHERE id_consulta = $1), 0
           ) 
           + COALESCE(
             (SELECT SUM(costo) FROM consulta_extras WHERE id_consulta = $1), 0
           )
           + COALESCE(costo_consulta, 0)
         WHERE id_consulta = $1`,
        [id_consulta]
      );

      await client.query('COMMIT');

      res.json({ mensaje: 'Costo extra eliminado correctamente' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error eliminando costo extra:', error);
      res.status(500).json({ error: 'Error al eliminar costo extra' });
    } finally {
      client.release();
    }
  }
}

module.exports = new ConsultaExtrasController();