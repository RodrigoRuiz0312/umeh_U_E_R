// routes/medicamentos.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ✅ GET todos los medicamentos (read)
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        m.id, 
        m.nombre, 
        m.cantidad, 
        m.unidad,
        COALESCE(m.costo_unitario, 0) AS costo,
        COALESCE(
          (
            SELECT json_agg(ma2.nombre)
            FROM medicamento_metodo mm2
            LEFT JOIN metodos_aplicacion ma2 ON ma2.id = mm2.metodo_id
            WHERE mm2.medicamento_id = m.id
          ), 
          '[]'::json
        ) AS metodo_aplicacion
      FROM medicamentos m
      ORDER BY m.id`;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error obteniendo medicamentos:', err);
    res.status(500).json({ error: 'Error obteniendo medicamentos' });
  }
});

// POST crear medicamento con métodos de aplicación
router.post('/', async (req, res) => {
  const { nombre, cantidad, unidad, costo_unitario, metodo_aplicacion } = req.body;

  if (!nombre || cantidad === undefined) {
    return res.status(400).json({ error: 'Nombre y cantidad son requeridos' });
  }
  if (costo_unitario !== undefined && Number.isNaN(Number(costo_unitario))) {
    return res.status(400).json({ error: 'costo_unitario debe ser numérico' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insertar medicamento
    const result = await client.query(
      `INSERT INTO medicamentos (nombre, cantidad, unidad, costo_unitario) 
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [nombre, cantidad, unidad || null, Number(costo_unitario ?? 0)]
    );
    const { id: nuevoId } = result.rows[0];

    // Insertar métodos de aplicación si existen
    if (Array.isArray(metodo_aplicacion) && metodo_aplicacion.length > 0) {
      const insertPromises = metodo_aplicacion.map((metodoId) =>
        client.query(
          `INSERT INTO medicamento_metodo (medicamento_id, metodo_id) VALUES ($1, $2)`,
          [nuevoId, metodoId]
        )
      );
      await Promise.all(insertPromises);
    }

    // Recuperar el registro completo con agregación de métodos y alias de costo
    const fullQuery = `
      SELECT 
        m.id,
        m.nombre,
        m.cantidad,
        m.unidad,
        COALESCE(m.costo_unitario, 0) AS costo,
        COALESCE(
          (
            SELECT json_agg(ma2.nombre)
            FROM medicamento_metodo mm2
            LEFT JOIN metodos_aplicacion ma2 ON ma2.id = mm2.metodo_id
            WHERE mm2.medicamento_id = m.id
          ), 
          '[]'::json
        ) AS metodo_aplicacion
      FROM medicamentos m
      WHERE m.id = $1`;

    const fullResult = await client.query(fullQuery, [nuevoId]);

    await client.query('COMMIT');
    res.status(201).json(fullResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error al insertar medicamento:', err);
    res.status(500).json({ error: 'Error al insertar medicamento' });
  } finally {
    client.release();
  }
});

// ✅ PUT actualizar un medicamento (update)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, cantidad, unidad, costo_unitario } = req.body;

  if (!id) return res.status(400).json({ error: 'ID es requerido' });
  if (nombre === undefined && cantidad === undefined && unidad === undefined && costo_unitario === undefined) {
    return res.status(400).json({ error: 'Debe proporcionar al menos un campo a actualizar' });
  }

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (nombre !== undefined) { fields.push(`nombre = $${idx++}`); values.push(nombre); }
    if (cantidad !== undefined) { fields.push(`cantidad = $${idx++}`); values.push(cantidad); }
    if (unidad !== undefined) { fields.push(`unidad = $${idx++}`); values.push(unidad); }
    if (costo_unitario !== undefined) { fields.push(`costo_unitario = $${idx++}`); values.push(costo_unitario); }

    values.push(id);

    const query = `UPDATE medicamentos SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rowCount === 0) return res.status(404).json({ error: 'Medicamento no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error al actualizar medicamento:', err);
    res.status(500).json({ error: 'Error al actualizar medicamento' });
  }
});

// ✅ DELETE eliminar un medicamento (delete)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'ID es requerido' });

  try {
    const result = await pool.query('DELETE FROM medicamentos WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Medicamento no encontrado' });
    res.json({ message: 'Medicamento eliminado', medicamento: result.rows[0] });
  } catch (err) {
    console.error('❌ Error al eliminar medicamento:', err);
    res.status(500).json({ error: 'Error al eliminar medicamento' });
  }
});

// GET todos los métodos de aplicación
router.get('/metodos-aplicacion', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre FROM metodos_aplicacion ORDER BY nombre');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error obteniendo métodos de aplicación:', err);
    res.status(500).json({ error: 'Error obteniendo métodos de aplicación' });
  }
});

module.exports = router;