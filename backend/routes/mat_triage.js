// routes/mat_triage.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// 📦 GET todo el material de triage
router.get('/', async (req, res) => {
  try {
    // Alias costo_unitario como costo y forzar 0 cuando venga NULL
    const result = await pool.query(
      `SELECT id, nombre, cantidad, unidad,
              COALESCE(costo_unitario, 0) AS costo
         FROM mat_triage`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo mat_triage:', err);
    res.status(500).json({ error: 'Error obteniendo material de triage' });
  }
});

// ✏️ Actualizar cantidad por ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { cantidad } = req.body;
  if (!id) return res.status(400).json({ error: 'ID es requerido' });
  if (cantidad === undefined) return res.status(400).json({ error: 'cantidad es requerida' });

  try {
    const result = await pool.query(
      'UPDATE mat_triage SET cantidad = $1 WHERE id = $2 RETURNING *',
      [cantidad, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar triage:', err);
    res.status(500).json({ error: 'Error al actualizar triage' });
  }
});

// POST crear nuevo material
router.post('/', async (req, res) => {
  const { nombre, cantidad, unidad, costo_unitario } = req.body;
  if (!nombre || cantidad === undefined) {
    return res.status(400).json({ error: 'Nombre y cantidad son requeridos' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO mat_triage (nombre, cantidad, unidad, costo_unitario)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nombre, cantidad, unidad || null, Number(costo_unitario ?? 0)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al insertar material:', err);
    res.status(500).json({ error: 'Error al insertar material' });
  }
});

module.exports = router;