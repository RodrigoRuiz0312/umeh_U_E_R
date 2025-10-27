const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.post('/', async (req, res) => {
  try {
    const { nombre, apellidos, cedula_prof, telefono, correo, especialidad, nombre_agenda } = req.body;
    const query = `
      INSERT INTO medico (nombre, apellidos, cedula_prof, telefono, correo, especialidad, nombre_agenda)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
    const result = await pool.query(query, [nombre, apellidos, cedula_prof, telefono, correo, especialidad, nombre_agenda]);
    res.status(201).json({ message: 'Médico registrado con éxito', doctor: result.rows[0] });
  } catch (err) {
    console.error('Error al registrar médico:', err);
    res.status(500).json({ error: 'Error interno al registrar al médico' });
  }
});

router.get('/', async (_, res) => {
  try {
    const result = await pool.query('SELECT * FROM medico ORDER BY id_medico ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener médicos:', err);
    res.status(500).json({ error: 'Error interno al obtener los médicos' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellidos, telefono, correo, especialidad } = req.body;
    const query = `
      UPDATE medico 
      SET nombre=$1, apellidos=$2, telefono=$3, correo=$4, especialidad=$5 
      WHERE id_medico=$6 RETURNING *`;
    const result = await pool.query(query, [nombre, apellidos, telefono, correo, especialidad, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Médico no encontrado' });
    res.json({ message: 'Médico actualizado con éxito', medico: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar médico:', err);
    res.status(500).json({ error: 'Error interno al actualizar el médico' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM medico WHERE id_medico=$1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Médico no encontrado' });
    res.json({ message: 'Médico eliminado con éxito' });
  } catch (err) {
    console.error('Error al eliminar médico:', err);
    res.status(500).json({ error: 'Error interno al eliminar el médico' });
  }
});

module.exports = router;