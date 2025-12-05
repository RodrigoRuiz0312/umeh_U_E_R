const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Registrar paciente
// EN: pacientes.js

// Registrar paciente (¡ACTUALIZADO!)
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      nombre, apellidos, sexo, fecha_nacimiento,
      codigo_postal, calle, num, colonia, municipio, estado,
      // Esperamos arrays para teléfonos y correos
      telefonos, // Ejemplo: ['111222333', '444555666']
      correos    // Ejemplo: ['paciente@mail.com']
    } = req.body;

    // Iniciar transacción
    await client.query('BEGIN');

    // 1. Insertar el paciente (sin teléfono ni correo)
    const pacienteQuery = `
      INSERT INTO paciente (
        nombre, apellidos, sexo, fecha_nacimiento, 
        codigo_postal, calle, num, colonia, municipio, estado
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id_paciente`;

    const pacienteValues = [nombre, apellidos, sexo, fecha_nacimiento, codigo_postal, calle, num, colonia, municipio, estado];
    const resultPaciente = await client.query(pacienteQuery, pacienteValues);
    const nuevoPacienteId = resultPaciente.rows[0].id_paciente;

    // 2. Insertar los teléfonos (si existen)
    if (telefonos && telefonos.length > 0) {
      const telefonoQuery = 'INSERT INTO paciente_telefonos (id_paciente, telefono) VALUES ($1, $2)';
      for (const tel of telefonos) {
        if (tel) { // Evitar guardar strings vacíos
          await client.query(telefonoQuery, [nuevoPacienteId, tel]);
        }
      }
    }

    // 3. Insertar los correos (si existen)
    if (correos && correos.length > 0) {
      const correoQuery = 'INSERT INTO paciente_correos (id_paciente, correo) VALUES ($1, $2)';
      for (const correo of correos) {
        if (correo) { // Evitar guardar strings vacíos
          await client.query(correoQuery, [nuevoPacienteId, correo]);
        }
      }
    }

    // Confirmar transacción
    await client.query('COMMIT');

    res.status(201).json({ message: 'Paciente registrado con éxito', paciente: { id_paciente: nuevoPacienteId, ...req.body } });

  } catch (err) {
    // Revertir transacción en caso de error
    await client.query('ROLLBACK');
    console.error('Error al registrar paciente:', err);
    res.status(500).json({ error: 'Error interno al registrar el paciente' });
  } finally {
    // Liberar la conexión
    client.release();
  }
});

// Obtener TODOS los pacientes
router.get('/', async (req, res) => {
  try {
    
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    let { sortBy, order, search } = req.query;
    
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    const offset = (page - 1) * limit;

    // Validate sort parameters
    const validColumns = ['id_paciente', 'nombre', 'apellidos', 'sexo'];
    const validOrder = ['ASC', 'DESC'];
    
    if (!order || !validOrder.includes(order.toUpperCase())) {
      order = 'ASC';
    } else {
      order = order.toUpperCase();
    }

    let orderByClause = 'p.id_paciente ASC'; // Default

    if (sortBy === 'telefonos') {
      orderByClause = `MIN(t.telefono) ${order}`;
    } else if (sortBy === 'correos') {
      orderByClause = `MIN(c.correo) ${order}`;
    } else if (validColumns.includes(sortBy)) {
      orderByClause = `p.${sortBy} ${order}`;
    } else if (sortBy === 'numero') {
       orderByClause = `p.id_paciente ${order}`;
    }

    // Build WHERE clause for search
    let whereClause = '';
    const queryParams = [limit, offset];
    let paramCounter = 3;

    if (search) {
      whereClause = `WHERE (p.nombre ILIKE $${paramCounter} OR p.apellidos ILIKE $${paramCounter})`;
      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    const query = `
      SELECT 
        p.*, 
        COALESCE(json_agg(DISTINCT t.telefono) FILTER (WHERE t.telefono IS NOT NULL), '[]') AS telefonos,
        COALESCE(json_agg(DISTINCT c.correo) FILTER (WHERE c.correo IS NOT NULL), '[]') AS correos
      FROM 
        paciente p
      LEFT JOIN 
        paciente_telefonos t ON p.id_paciente = t.id_paciente
      LEFT JOIN 
        paciente_correos c ON p.id_paciente = c.id_paciente
      ${whereClause}
      GROUP BY 
        p.id_paciente
      ORDER BY 
        ${orderByClause}
      LIMIT $1 OFFSET $2;
    `;

    const pacientesResult = await pool.query(query, queryParams);

    // Count total items (with filter if applicable)
    let totalQuery = 'SELECT COUNT(*) FROM paciente p';
    let totalParams = [];
    
    if (search) {
      totalQuery += ` WHERE (p.nombre ILIKE $1 OR p.apellidos ILIKE $1)`;
      totalParams.push(`%${search}%`);
    }

    const totalResult = await pool.query(totalQuery, totalParams);
    const total = parseInt(totalResult.rows[0].count);

    res.json({ pacientes: pacientesResult.rows, total });

  } catch (err) {
    console.error('Error al obtener pacientes:', err);
    res.status(500).json({ error: 'Error interno al obtener los pacientes' });
  }
});

// Buscar pacientes por nombre y/o apellidos
router.get('/buscar', async (req, res) => {
  try {
    const { nombre, apellidos } = req.query;
    
    // Validar que al menos uno de los parámetros esté presente
    if (!nombre && !apellidos) {
      return res.status(400).json({ error: 'Se requiere al menos nombre o apellidos para la búsqueda' });
    }

    // Construir condiciones dinámicas
    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (nombre) {
      conditions.push(`nombre ILIKE $${paramCount}`);
      params.push(`%${nombre}%`);
      paramCount++;
    }

    if (apellidos) {
      conditions.push(`apellidos ILIKE $${paramCount}`);
      params.push(`%${apellidos}%`);
      paramCount++;
    }

    const query = `
      SELECT id_paciente, nombre, apellidos, calle
      FROM paciente 
      WHERE ${conditions.join(' AND ')}
      LIMIT 10`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al buscar pacientes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar paciente (¡ACTUALIZADO!)
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  const { id } = req.params; // id_paciente a actualizar

  try {
    const {
      nombre, apellidos, sexo, fecha_nacimiento, // Datos de la tabla 'paciente'
      codigo_postal, calle, num, colonia, municipio, estado, // Domicilio

      telefonos, // Array de teléfonos: ['111', '222']
      correos    // Array de correos: ['a@b.com']
    } = req.body;

    // Iniciar transacción
    await client.query('BEGIN');

    // 1. Actualizar la tabla principal 'paciente'
    // (Asegúrate de incluir todos los campos que permites editar)
    const pacienteQuery = `
      UPDATE paciente 
      SET 
        nombre = $1, 
        apellidos = $2, 
        sexo = $3, 
        fecha_nacimiento = $4, 
        codigo_postal = $5, 
        calle = $6, 
        num = $7, 
        colonia = $8, 
        municipio = $9, 
        estado = $10
      WHERE id_paciente = $11`;

    const pacienteValues = [
      nombre, apellidos, sexo, fecha_nacimiento,
      codigo_postal, calle, num, colonia, municipio, estado,
      id
    ];

    await client.query(pacienteQuery, pacienteValues);

    // 2. Sincronizar teléfonos: Borrar todos los anteriores del paciente
    await client.query('DELETE FROM paciente_telefonos WHERE id_paciente = $1', [id]);

    // 2b. Insertar los nuevos teléfonos
    if (telefonos && telefonos.length > 0) {
      const telefonoQuery = 'INSERT INTO paciente_telefonos (id_paciente, telefono) VALUES ($1, $2)';
      for (const tel of telefonos) {
        if (tel) { // Evitar guardar strings vacíos
          await client.query(telefonoQuery, [id, tel]);
        }
      }
    }

    // 3. Sincronizar correos: Borrar todos los anteriores
    await client.query('DELETE FROM paciente_correos WHERE id_paciente = $1', [id]);

    // 3b. Insertar los nuevos correos
    if (correos && correos.length > 0) {
      const correoQuery = 'INSERT INTO paciente_correos (id_paciente, correo) VALUES ($1, $2)';
      for (const correo of correos) {
        if (correo) { // Evitar guardar strings vacíos
          await client.query(correoQuery, [id, correo]);
        }
      }
    }

    // Confirmar transacción
    await client.query('COMMIT');

    res.json({ message: 'Paciente actualizado con éxito', paciente: { id_paciente: id, ...req.body } });

  } catch (err) {
    // Revertir en caso de error
    await client.query('ROLLBACK');
    console.error('Error al actualizar paciente:', err);
    res.status(500).json({ error: 'Error interno al actualizar el paciente' });
  } finally {
    // Liberar la conexión
    client.release();
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