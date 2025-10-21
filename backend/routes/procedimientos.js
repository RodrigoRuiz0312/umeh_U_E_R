const express = require('express')
const router = express.Router()
const { pool } = require('../db');

router.get('/', async (req, res) => {
  try {
    const query = `
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
          'insumo', COALESCE(m.nombre, t.nombre),
          'tipo', pi.tipo,
          'cantidad', pi.cantidad
        )
      ) AS insumos_detalle
  FROM procedimiento_insumos pi
  LEFT JOIN medicamentos m 
    ON pi.tipo = 'medicamento' AND m.id = pi.id_insumo
  LEFT JOIN mat_triage t 
    ON pi.tipo = 'material' AND t.id = pi.id_insumo
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
ORDER BY p.id_procedimiento;
    `

    const result = await pool.query(query)
    const procedimientos = result.rows
    res.json(procedimientos)
  } catch (err) {
    console.error('Error obteniendo procedimientos:', err)
    res.status(500).json({ error: 'Error obteniendo procedimientos' })
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

module.exports = router
