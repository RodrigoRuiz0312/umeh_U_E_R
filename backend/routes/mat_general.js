const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, cantidad, unidad,
              COALESCE(costo_unitario, 0) AS costo
         FROM mat_general`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo mat_general:', err);
    res.status(500).json({ error: 'Error obteniendo material general' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { cantidad } = req.body;
  if (!id) return res.status(400).json({ error: 'ID es requerido' });
  if (cantidad === undefined) return res.status(400).json({ error: 'cantidad es requerida' });

  try {
    const result = await pool.query(
      'UPDATE mat_general SET cantidad = $1 WHERE id = $2 RETURNING *',
      [cantidad, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar material general:', err);
    res.status(500).json({ error: 'Error al actualizar material general' });
  }
});

router.post('/', async (req, res) => {
  const { nombre, cantidad, unidad, costo_unitario } = req.body;
  if (!nombre || cantidad === undefined) {
    return res.status(400).json({ error: 'Nombre y cantidad son requeridos' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO mat_general (nombre, cantidad, unidad, costo_unitario)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nombre, cantidad, unidad || null, Number(costo_unitario ?? 0)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al insertar material general:', err);
    res.status(500).json({ error: 'Error al insertar material general' });
  }
});

module.exports = router;