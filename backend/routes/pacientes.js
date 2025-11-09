const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Registrar paciente
router.post('/', async (req, res) => {
  try {
    const {
      nombre, apellidos, telefono, correo, sexo, fecha_nacimiento,
      codigo_postal, calle, num, colonia, ciudad
    } = req.body;

    const query = `
      INSERT INTO paciente (
        nombre, apellidos, telefono, correo, sexo, fecha_nacimiento, 
        codigo_postal, calle, num, colonia, ciudad
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`;

    const values = [nombre, apellidos, telefono, correo, sexo, fecha_nacimiento, codigo_postal, calle, num, colonia, ciudad];
    const result = await pool.query(query, values);
    res.status(201).json({ message: 'Paciente registrado con éxito', paciente: result.rows[0] });
  } catch (err) {
    console.error('Error al registrar paciente:', err);
    res.status(500).json({ error: 'Error interno al registrar el paciente' });
  }
});

// Obtener TODOS los pacientes (sin paginación)
router.get('/', async (req, res) => {
  try {
    const pacientesResult = await pool.query(
      'SELECT * FROM paciente ORDER BY id_paciente ASC'
    );
    res.json({ pacientes: pacientesResult.rows });
  } catch (err) {
    console.error('Error al obtener pacientes:', err);
    res.status(500).json({ error: 'Error interno al obtener los pacientes' });
  }
});

// Buscar pacientes por nombre
router.get('/buscar', async (req, res) => {
  try {
    const { nombre } = req.query;
    if (!nombre) return res.status(400).json({ error: 'Se requiere un término de búsqueda' });
    const searchTerm = `%${nombre}%`;
    const query = `
      SELECT id_paciente, nombre, apellidos 
      FROM paciente 
      WHERE nombre ILIKE $1 OR apellidos ILIKE $1 
      LIMIT 10`;
    const result = await pool.query(query, [searchTerm]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al buscar pacientes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar paciente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellidos, telefono, correo, codigo_postal, calle, colonia, ciudad } = req.body;

    const query = `
      UPDATE paciente 
      SET nombre=$1, apellidos=$2, telefono=$3, correo=$4, codigo_postal=$5, calle=$6, colonia=$7, ciudad=$8
      WHERE id_paciente=$9 RETURNING *`;

    const result = await pool.query(query, [nombre, apellidos, telefono, correo, codigo_postal, calle, colonia, ciudad, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json({ message: 'Paciente actualizado con éxito', paciente: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar paciente:', err);
    res.status(500).json({ error: 'Error interno al actualizar el paciente' });
  }
});

// Eliminar paciente
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First delete related records
    await client.query('DELETE FROM consultas WHERE id_paciente = $1', [req.params.id]);
    await client.query('DELETE FROM citas WHERE id_paciente = $1', [req.params.id]);

    // Then delete the patient
    const result = await client.query('DELETE FROM paciente WHERE id_paciente = $1 RETURNING *', [req.params.id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Paciente y registros relacionados eliminados con éxito' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar paciente:', err);
    res.status(500).json({
      error: 'Error interno al eliminar el paciente',
      details: err.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;