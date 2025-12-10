const express = require('express')
const router = express.Router()
const { pool } = require('../db');

// ✅ GET todos los procedimientos con paginación
router.get('/', async (req, res) => {
  try {
    // 1. Obtener parámetros
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sortColumn = req.query.sortColumn || 'id_procedimiento';
    const sortDirection = (req.query.sortDirection || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // 2. Validar columna de ordenamiento y determinar ORDER BY
    const validColumns = ['id_procedimiento', 'procedimiento', 'costo_total'];
    const orderColumn = validColumns.includes(sortColumn) ? sortColumn : 'id_procedimiento';
    
    let orderByClause;
    if (orderColumn === 'procedimiento') {
      orderByClause = 'p.descripcion';
    } else if (orderColumn === 'costo_total') {
      orderByClause = 'COALESCE(c.costo_total, 0)';
    } else {
      orderByClause = 'p.id_procedimiento';
    }

    // 3. Construir WHERE con parámetros preparados
    let whereClause = '';
    let searchParams = [];
    
    if (search.trim()) {
      whereClause = `
        WHERE (
          p.descripcion ILIKE $1 OR 
          p.observaciones ILIKE $1 OR
          CAST(p.id_procedimiento AS TEXT) ILIKE $1
        )
      `;
      searchParams.push(`%${search.trim()}%`);
    }

    // 4. Query de DATOS con CTEs
    const dataQuery = `
      WITH costos AS (
        SELECT 
          pr.id_procedimiento,
          JSON_AGG(JSON_BUILD_OBJECT('responsable', r.nombre, 'costo', pr.costo)) AS costos_detalle,
          SUM(pr.costo) AS costo_total
        FROM procedimiento_responsables pr
        JOIN responsables r ON r.id_responsable = pr.id_responsable
        GROUP BY pr.id_procedimiento
      ),
      insumos AS (
        SELECT 
          pi.id_procedimiento,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id_insumo', pi.id_insumo,
              'insumo', COALESCE(m.nombre, t.nombre, mg.nombre),
              'tipo', pi.tipo,
              'cantidad', pi.cantidad
            )
          ) AS insumos_detalle
        FROM procedimiento_insumos pi
        LEFT JOIN medicamentos m 
          ON pi.tipo = 'medicamento' AND m.id = pi.id_insumo
        LEFT JOIN mat_triage t 
          ON pi.tipo = 'material' AND t.id = pi.id_insumo
        LEFT JOIN mat_general mg
          ON pi.tipo = 'mat_general' AND mg.id = pi.id_insumo
        GROUP BY pi.id_procedimiento
      )
      SELECT 
        p.id_procedimiento,
        p.descripcion AS procedimiento,
        p.observaciones,
        COALESCE(c.costos_detalle, '[]') AS costos_detalle,
        COALESCE(c.costo_total, 0) AS costo_total,
        COALESCE(i.insumos_detalle, '[]') AS insumos_detalle
      FROM procedimientos p
      LEFT JOIN costos c ON c.id_procedimiento = p.id_procedimiento
      LEFT JOIN insumos i ON i.id_procedimiento = p.id_procedimiento
      ${whereClause}
      ORDER BY ${orderByClause} ${sortDirection}
      LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}
    `;

    // 5. Query de CONTEO
    const countQuery = `
      SELECT COUNT(*) 
      FROM procedimientos p
      ${whereClause}
    `;

    // 6. Preparar parámetros para las queries
    const dataParams = [...searchParams, limit, offset];
    const countParams = searchParams;

    // 7. Ejecutar ambas consultas en paralelo
    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, dataParams),
      pool.query(countQuery, countParams)
    ]);

    // 8. Calcular metadatos
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // 9. Responder con estructura estándar
    res.json({
      data: dataResult.rows,
      meta: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit
      }
    });

  } catch (err) {
    console.error('❌ Error obteniendo procedimientos:', err);
    res.status(500).json({ error: 'Error al obtener procedimientos' });
  }
})

// Crear un nuevo procedimiento con sus responsables e insumos
router.post('/', async (req, res) => {
  const client = await pool.connect()
  try {
    const { descripcion, observaciones, responsables, insumos } = req.body

    await client.query('BEGIN')

    // 1️⃣ Insertar el procedimiento principal
    const insertProc = await client.query(
      `INSERT INTO procedimientos (descripcion, observaciones)
       VALUES ($1, $2)
       RETURNING id_procedimiento`,
      [descripcion, observaciones]
    )

    const idProcedimiento = insertProc.rows[0].id_procedimiento

    // 2️⃣ Insertar responsables con su costo
    if (Array.isArray(responsables)) {
      for (const r of responsables) {
        const resId = await client.query(
          `SELECT id_responsable FROM responsables WHERE nombre ILIKE $1`,
          [r.nombre]
        )

        if (resId.rows.length > 0) {
          await client.query(
            `INSERT INTO procedimiento_responsables (id_procedimiento, id_responsable, costo)
             VALUES ($1, $2, $3)`,
            [idProcedimiento, resId.rows[0].id_responsable, r.costo]
          )
        }
      }
    }

    // 3️⃣ Insertar insumos con su cantidad (usa tipo + id_insumo del payload)
    if (Array.isArray(insumos)) {
      for (const i of insumos) {
        // Validaciones mínimas del payload
        if (!i || typeof i.id !== 'number' || !i.tipo || i.cantidad == null) {
          continue;
        }

        await client.query(
          `INSERT INTO procedimiento_insumos (id_procedimiento, tipo, id_insumo, cantidad)
           VALUES ($1, $2, $3, $4)`,
          [idProcedimiento, i.tipo, i.id, i.cantidad]
        )
      }
    }

    await client.query('COMMIT')
    res.json({
      message: 'Procedimiento registrado correctamente',
      id: idProcedimiento
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error al insertar procedimiento:', error)
    res.status(500).json({ error: 'Error al registrar el procedimiento' })
  } finally {
    client.release()
  }
})

// PUT actualizar un procedimiento
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { descripcion, observaciones, responsables, insumos } = req.body;
  
  if (!id) return res.status(400).json({ error: 'ID es requerido' });
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Actualizar datos básicos del procedimiento
    if (descripcion !== undefined || observaciones !== undefined) {
      const fields = [];
      const values = [];
      let idx = 1;

      if (descripcion !== undefined) { 
        fields.push(`descripcion = $${idx++}`); 
        values.push(descripcion); 
      }
      if (observaciones !== undefined) { 
        fields.push(`observaciones = $${idx++}`); 
        values.push(observaciones); 
      }

      values.push(id);
      const updateQuery = `UPDATE procedimientos SET ${fields.join(', ')} WHERE id_procedimiento = $${idx}`;
      await client.query(updateQuery, values);
    }

    // 2. Actualizar responsables si se proporcionan
    if (Array.isArray(responsables)) {
      // Eliminar responsables existentes
      await client.query('DELETE FROM procedimiento_responsables WHERE id_procedimiento = $1', [id]);
      
      // Insertar nuevos responsables
      for (const r of responsables) {
        const resId = await client.query(
          `SELECT id_responsable FROM responsables WHERE nombre ILIKE $1`,
          [r.nombre]
        );

        if (resId.rows.length > 0) {
          await client.query(
            `INSERT INTO procedimiento_responsables (id_procedimiento, id_responsable, costo)
             VALUES ($1, $2, $3)`,
            [id, resId.rows[0].id_responsable, r.costo]
          );
        }
      }
    }

    // 3. Actualizar insumos si se proporcionan
    if (Array.isArray(insumos)) {
      // Eliminar insumos existentes
      await client.query('DELETE FROM procedimiento_insumos WHERE id_procedimiento = $1', [id]);
      
      // Insertar nuevos insumos
      for (const i of insumos) {
        if (!i || typeof i.id !== 'number' || !i.tipo || i.cantidad == null) {
          continue;
        }

        await client.query(
          `INSERT INTO procedimiento_insumos (id_procedimiento, tipo, id_insumo, cantidad)
           VALUES ($1, $2, $3, $4)`,
          [id, i.tipo, i.id, i.cantidad]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Procedimiento actualizado correctamente', id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar procedimiento:', error);
    res.status(500).json({ error: 'Error al actualizar el procedimiento' });
  } finally {
    client.release();
  }
});

// DELETE eliminar un procedimiento
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'ID es requerido' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Eliminar relaciones primero (por las foreign keys)
    await client.query('DELETE FROM procedimiento_responsables WHERE id_procedimiento = $1', [id]);
    await client.query('DELETE FROM procedimiento_insumos WHERE id_procedimiento = $1', [id]);

    // Eliminar el procedimiento
    const result = await client.query(
      'DELETE FROM procedimientos WHERE id_procedimiento = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Procedimiento no encontrado' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Procedimiento eliminado', procedimiento: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar procedimiento:', error);
    res.status(500).json({ error: 'Error al eliminar el procedimiento' });
  } finally {
    client.release();
  }
});

module.exports = router
