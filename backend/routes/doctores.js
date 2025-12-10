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

router.get('/', async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let { sortBy, order, search } = req.query;

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    const offset = (page - 1) * limit;

    // Validate sort parameters
    const validColumns = ['id_medico', 'nombre', 'apellidos', 'cedula_prof', 'telefono', 'especialidad', 'correo'];
    const validOrder = ['ASC', 'DESC'];

    if (!order || !validOrder.includes(order.toUpperCase())) {
      order = 'ASC';
    } else {
      order = order.toUpperCase();
    }

    if (!sortBy || !validColumns.includes(sortBy)) {
      sortBy = 'id_medico';
    }

    let whereClause = '';
    const queryParams = [limit, offset];
    let paramCounter = 3;

    if (search) {
      whereClause = `WHERE (
        nombre ILIKE $${paramCounter} OR 
        apellidos ILIKE $${paramCounter} OR 
        cedula_prof ILIKE $${paramCounter} OR 
        especialidad ILIKE $${paramCounter}
      )`;
      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    const query = `
      SELECT * 
      FROM medico 
      ${whereClause}
      ORDER BY ${sortBy} ${order}
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, queryParams);

    // Count total items
    let totalQuery = 'SELECT COUNT(*) FROM medico';
    let totalParams = [];

    if (search) {
      totalQuery += ` WHERE (
        nombre ILIKE $1 OR 
        apellidos ILIKE $1 OR 
        cedula_prof ILIKE $1 OR 
        especialidad ILIKE $1
      )`;
      totalParams.push(`%${search}%`);
    }

    const totalResult = await pool.query(totalQuery, totalParams);
    const total = parseInt(totalResult.rows[0].count);

    res.json({ doctores: result.rows, total });
  } catch (err) {
    console.error('Error al obtener médicos:', err);
    res.status(500).json({ error: 'Error interno al obtener los médicos' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellidos, cedula_prof, telefono, correo, especialidad } = req.body;
    const query = `
      UPDATE medico 
      SET nombre=$1, apellidos=$2, cedula_prof=$3, telefono=$4, correo=$5, especialidad=$6 
      WHERE id_medico=$7 RETURNING *`;
    const result = await pool.query(query, [nombre, apellidos, cedula_prof, telefono, correo, especialidad, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Médico no encontrado' });
    res.json({ message: 'Médico actualizado con éxito', medico: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar médico:', err);
    res.status(500).json({ error: 'Error interno al actualizar el médico' });
  }
});

router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First delete related records in consultas
    await client.query('DELETE FROM consultas WHERE id_medico = $1', [req.params.id]);

    // Then delete the doctor
    const result = await client.query(
      'DELETE FROM medico WHERE id_medico = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Médico no encontrado' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Médico y registros relacionados eliminados con éxito' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar médico:', err);
    res.status(500).json({
      error: 'Error interno al eliminar el médico',
      details: err.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;