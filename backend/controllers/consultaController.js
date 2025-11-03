// controllers/consultaController.js
const { pool } = require('../db');

class ConsultaController {

  // Buscar paciente por nombre y apellidos
  async buscarPaciente(req, res) {
    try {
      const { nombre, apellidos } = req.query;

      let query = `
        SELECT id_paciente, nombre, apellidos, fecha_nacimiento, telefono, 
               correo, sexo, calle, num, colonia, ciudad, codigo_postal
        FROM paciente 
        WHERE LOWER(nombre) LIKE LOWER($1)
      `;
      const params = [`%${nombre}%`];

      if (apellidos) {
        query += ` AND LOWER(apellidos) LIKE LOWER($2)`;
        params.push(`%${apellidos}%`);
      }

      query += ` ORDER BY nombre, apellidos LIMIT 10`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error buscando paciente:', error);
      res.status(500).json({ error: 'Error al buscar paciente' });
    }
  }

  // Crear nueva consulta
  async crearConsulta(req, res) {
    const client = await pool.connect();
    try {
      const { id_paciente, id_medico, motivo } = req.body;

      // Validar que se reciban los datos necesarios
      if (!id_paciente || !id_medico) {
        return res.status(400).json({
          error: 'Datos incompletos',
          mensaje: 'Se requiere id_paciente e id_medico'
        });
      }

      await client.query('BEGIN');

      // Verificar que el paciente existe
      const pacienteExiste = await client.query(
        'SELECT id_paciente FROM paciente WHERE id_paciente = $1',
        [id_paciente]
      );

      if (pacienteExiste.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'Paciente no encontrado',
          mensaje: `El paciente con ID ${id_paciente} no existe en la base de datos`
        });
      }

      // Verificar que el médico existe
      const medicoExiste = await client.query(
        'SELECT id_medico FROM medico WHERE id_medico = $1',
        [id_medico]
      );

      if (medicoExiste.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'Médico no encontrado',
          mensaje: `El médico con ID ${id_medico} no existe en la base de datos`
        });
      }

      // Crear la consulta
      const result = await client.query(
        `INSERT INTO consultas (id_paciente, id_medico, motivo, estatus, fecha)
         VALUES ($1, $2, $3, 'espera', NOW())
         RETURNING id_consulta, fecha, estatus`,
        [id_paciente, id_medico, motivo]
      );

      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creando consulta:', error);

      // Mensajes de error más específicos
      if (error.code === '23503') {
        return res.status(400).json({
          error: 'Error de integridad referencial',
          mensaje: 'El paciente o médico especificado no existe'
        });
      }

      res.status(500).json({
        error: 'Error al crear consulta',
        mensaje: error.message
      });
    } finally {
      client.release();
    }
  }

  // Obtener datos completos para hoja de consulta
  async obtenerHojaConsulta(req, res) {
    try {
      const { id_consulta } = req.params;

      const result = await pool.query(
        `SELECT 
          c.id_consulta,
          c.fecha,
          c.motivo,
          c.estatus,
          p.nombre as paciente_nombre,
          p.apellidos as paciente_apellidos,
          p.fecha_nacimiento,
          p.telefono as paciente_telefono,
          p.sexo,
          p.calle,
          p.num,
          p.colonia,
          p.ciudad,
          p.codigo_postal,
          m.nombre as medico_nombre,
          m.apellidos as medico_apellidos,
          m.especialidad as medico_especialidad,
          m.cedula_prof as medico_cedula
        FROM consultas c
        INNER JOIN paciente p ON c.id_paciente = p.id_paciente
        LEFT JOIN medico m ON c.id_medico = m.id_medico
        WHERE c.id_consulta = $1`,
        [id_consulta]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Consulta no encontrada' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error obteniendo hoja de consulta:', error);
      res.status(500).json({ error: 'Error al obtener datos de consulta' });
    }
  }

  // Actualizar estatus de consulta
  async actualizarEstatus(req, res) {
    try {
      const { id_consulta } = req.params;
      const { estatus } = req.body;

      const result = await pool.query(
        `UPDATE consultas 
         SET estatus = $1 
         WHERE id_consulta = $2
         RETURNING id_consulta, estatus`,
        [estatus, id_consulta]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Consulta no encontrada' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error actualizando estatus:', error);
      res.status(500).json({ error: 'Error al actualizar estatus' });
    }
  }

  // Agregar insumo/medicamento/material a la consulta
  async agregarInsumo(req, res) {
    const client = await pool.connect();
    try {
      const { id_consulta } = req.params;
      const { id_insumo, tipo, cantidad, descripcion } = req.body;

      await client.query('BEGIN');

      // Verificar inventario disponible
      let inventarioDisponible = false;
      let costoUnitario = 0;

      if (tipo === 'medicamento') {
        const med = await client.query(
          'SELECT nombre, cantidad, costo_unitario FROM medicamentos WHERE id = $1',
          [id_insumo]
        );
        if (med.rows.length > 0 && med.rows[0].cantidad >= cantidad) {
          inventarioDisponible = true;
          costoUnitario = med.rows[0].costo_unitario;
        }
      } else if (tipo === 'material') {
        const mat = await client.query(
          'SELECT cantidad, costo_unitario FROM mat_triage WHERE id = $1',
          [id_insumo]
        );
        if (mat.rows.length > 0 && mat.rows[0].cantidad >= cantidad) {
          inventarioDisponible = true;
          costoUnitario = mat.rows[0].costo_unitario;
        }
      } else if (tipo === 'procedimiento') {
        // Para procedimientos, verificar que todos sus insumos estén disponibles
        const verificacion = await client.query(
          `SELECT 
            COALESCE(
              BOOL_AND(
                CASE 
                  WHEN pi.tipo = 'medicamento' THEN m.cantidad >= (pi.cantidad * $2)
                  WHEN pi.tipo = 'material' THEN mt.cantidad >= (pi.cantidad * $2)
                  ELSE true
                END
              ), 
              true
            ) as disponible
          FROM procedimiento_insumos pi
          LEFT JOIN medicamentos m ON pi.tipo = 'medicamento' AND pi.id_insumo = m.id
          LEFT JOIN mat_triage mt ON pi.tipo = 'material' AND pi.id_insumo = mt.id
          WHERE pi.id_procedimiento = $1`,
          [id_insumo, cantidad]
        );

        inventarioDisponible = verificacion.rows[0].disponible;

        // Obtener costo del procedimiento
        const costoProcedimiento = await client.query(
          'SELECT costo_total FROM vista_costo_procedimientos WHERE id_procedimiento = $1',
          [id_insumo]
        );

        if (costoProcedimiento.rows.length > 0) {
          costoUnitario = costoProcedimiento.rows[0].costo_total;
        }
      }

      if (!inventarioDisponible) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Inventario insuficiente',
          mensaje: 'No hay suficiente stock disponible para este insumo o procedimiento'
        });
      }

      // Insertar insumo en consulta (el trigger descontará automáticamente)
      const insert = await client.query(
        `INSERT INTO consulta_insumos 
   (id_consulta, id_insumo, tipo, cantidad, costo_unitario, descripcion)
   VALUES ($1, $2, $3, $4, $5, $6)
   RETURNING id`,
        [id_consulta, id_insumo, tipo, cantidad, costoUnitario, descripcion]
      );

      // Consultar el insumo recién insertado con su nombre y unidad
      const result = await client.query(
        `SELECT 
    ci.id,
    ci.id_insumo,
    ci.tipo,
    ci.cantidad,
    ci.costo_unitario,
    ci.subtotal,
    ci.descripcion,
    CASE 
      WHEN ci.tipo = 'medicamento' THEN m.nombre
      WHEN ci.tipo = 'material' THEN mt.nombre
      WHEN ci.tipo = 'procedimiento' THEN p.descripcion
    END as nombre_insumo,
    CASE 
      WHEN ci.tipo = 'medicamento' THEN m.unidad
      WHEN ci.tipo = 'material' THEN mt.unidad
      ELSE 'procedimiento'
    END as unidad
  FROM consulta_insumos ci
  LEFT JOIN medicamentos m ON ci.tipo = 'medicamento' AND ci.id_insumo = m.id
  LEFT JOIN mat_triage mt ON ci.tipo = 'material' AND ci.id_insumo = mt.id
  LEFT JOIN procedimientos p ON ci.tipo = 'procedimiento' AND ci.id_insumo = p.id_procedimiento
  WHERE ci.id = $1`,
        [insert.rows[0].id]
      );


      // Obtener total actualizado de la consulta
      const totalConsulta = await client.query(
        'SELECT total FROM consultas WHERE id_consulta = $1',
        [id_consulta]
      );

      // Dentro de agregarInsumo (antes de COMMIT)
      console.log('✅ INSERTANDO INSUMO EN CONSULTA:', { id_consulta, id_insumo, tipo, cantidad, costoUnitario });

      await client.query('COMMIT');

      res.status(201).json({
        insumo: result.rows[0],
        totalConsulta: totalConsulta.rows[0].total
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error agregando insumo:', error);
      res.status(500).json({ error: 'Error al agregar insumo' });
    } finally {
      client.release();
    }
  }

  // Eliminar insumo de la consulta (y restaurar inventario)
  async eliminarInsumo(req, res) {
    const client = await pool.connect();
    try {
      const { id_insumo_consulta } = req.params;

      await client.query('BEGIN');

      // Obtener datos del insumo antes de eliminarlo
      const insumoData = await client.query(
        'SELECT id_insumo, tipo, cantidad FROM consulta_insumos WHERE id = $1',
        [id_insumo_consulta]
      );

      if (insumoData.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Insumo no encontrado' });
      }

      const { id_insumo, tipo, cantidad } = insumoData.rows[0];

      // Restaurar inventario
      if (tipo === 'medicamento') {
        await client.query(
          'UPDATE medicamentos SET cantidad = cantidad + $1 WHERE id = $2',
          [cantidad, id_insumo]
        );
      } else if (tipo === 'material') {
        await client.query(
          'UPDATE mat_triage SET cantidad = cantidad + $1 WHERE id = $2',
          [cantidad, id_insumo]
        );
      } else if (tipo === 'procedimiento') {
        // Restaurar insumos del procedimiento
        await client.query(
          `UPDATE medicamentos m
           SET cantidad = cantidad + (pi.cantidad * $1)
           FROM procedimiento_insumos pi
           WHERE pi.id_procedimiento = $2
           AND pi.tipo = 'medicamento'
           AND pi.id_insumo = m.id`,
          [cantidad, id_insumo]
        );

        await client.query(
          `UPDATE mat_triage mt
           SET cantidad = cantidad + (pi.cantidad * $1)
           FROM procedimiento_insumos pi
           WHERE pi.id_procedimiento = $2
           AND pi.tipo = 'material'
           AND pi.id_insumo = mt.id`,
          [cantidad, id_insumo]
        );
      }

      // Eliminar el registro
      const result = await client.query(
        'DELETE FROM consulta_insumos WHERE id = $1 RETURNING id_consulta',
        [id_insumo_consulta]
      );

      // Obtener total actualizado
      const totalConsulta = await client.query(
        'SELECT total FROM consultas WHERE id_consulta = $1',
        [result.rows[0].id_consulta]
      );

      await client.query('COMMIT');

      res.json({
        mensaje: 'Insumo eliminado correctamente',
        totalConsulta: totalConsulta.rows[0].total
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error eliminando insumo:', error);
      res.status(500).json({ error: 'Error al eliminar insumo' });
    } finally {
      client.release();
    }
  }

  // Obtener todos los insumos de una consulta
  async obtenerInsumosConsulta(req, res) {
    try {
      const { id_consulta } = req.params;

      const result = await pool.query(
        `SELECT 
          ci.id,
          ci.id_insumo,
          ci.tipo,
          ci.cantidad,
          ci.costo_unitario,
          ci.subtotal,
          ci.descripcion,
          CASE 
            WHEN ci.tipo = 'medicamento' THEN m.nombre
            WHEN ci.tipo = 'material' THEN mt.nombre
            WHEN ci.tipo = 'procedimiento' THEN p.descripcion
          END as nombre_insumo,
          CASE 
            WHEN ci.tipo = 'medicamento' THEN m.unidad
            WHEN ci.tipo = 'material' THEN mt.unidad
            ELSE 'procedimiento'
          END as unidad
        FROM consulta_insumos ci
        LEFT JOIN medicamentos m ON ci.tipo = 'medicamento' AND ci.id_insumo = m.id
        LEFT JOIN mat_triage mt ON ci.tipo = 'material' AND ci.id_insumo = mt.id
        LEFT JOIN procedimientos p ON ci.tipo = 'procedimiento' AND ci.id_insumo = p.id_procedimiento
        WHERE ci.id_consulta = $1
        ORDER BY ci.id`,
        [id_consulta]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error obteniendo insumos:', error);
      res.status(500).json({ error: 'Error al obtener insumos' });
    }
  }

  // Finalizar consulta y generar nota de remisión
  async finalizarConsulta(req, res) {
    const client = await pool.connect();
    try {
      const { id_consulta } = req.params;
      const { observaciones } = req.body;

      await client.query('BEGIN');

      // Actualizar observaciones y estatus
      await client.query(
        `UPDATE consultas 
         SET estatus = 'completada', observaciones = $1 
         WHERE id_consulta = $2`,
        [observaciones, id_consulta]
      );

      // Obtener datos completos para la nota de remisión
      const notaRemision = await client.query(
        `SELECT 
          c.id_consulta,
          c.fecha,
          c.total,
          c.observaciones,
          p.nombre as paciente_nombre,
          p.apellidos as paciente_apellidos,
          p.telefono as paciente_telefono,
          m.nombre as medico_nombre,
          m.apellidos as medico_apellidos,
          json_agg(
            json_build_object(
              'nombre', CASE 
                WHEN ci.tipo = 'medicamento' THEN med.nombre
                WHEN ci.tipo = 'material' THEN mat.nombre
                WHEN ci.tipo = 'procedimiento' THEN proc.descripcion
              END,
              'cantidad', ci.cantidad,
              'unidad', CASE 
                WHEN ci.tipo = 'medicamento' THEN med.unidad
                WHEN ci.tipo = 'material' THEN mat.unidad
                ELSE 'procedimiento'
              END,
              'costo_unitario', ci.costo_unitario,
              'subtotal', ci.subtotal
            ) ORDER BY ci.id
          ) as insumos
        FROM consultas c
        INNER JOIN paciente p ON c.id_paciente = p.id_paciente
        LEFT JOIN medico m ON c.id_medico = m.id_medico
        LEFT JOIN consulta_insumos ci ON c.id_consulta = ci.id_consulta
        LEFT JOIN medicamentos med ON ci.tipo = 'medicamento' AND ci.id_insumo = med.id
        LEFT JOIN mat_triage mat ON ci.tipo = 'material' AND ci.id_insumo = mat.id
        LEFT JOIN procedimientos proc ON ci.tipo = 'procedimiento' AND ci.id_insumo = proc.id_procedimiento
        WHERE c.id_consulta = $1
        GROUP BY c.id_consulta, c.fecha, c.total, c.observaciones, 
                 p.nombre, p.apellidos, p.telefono, m.nombre, m.apellidos`,
        [id_consulta]
      );

      await client.query('COMMIT');

      res.json({
        mensaje: 'Consulta finalizada',
        notaRemision: notaRemision.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error finalizando consulta:', error);
      res.status(500).json({ error: 'Error al finalizar consulta' });
    } finally {
      client.release();
    }
  }

  // Buscar medicamentos disponibles
  async buscarMedicamentos(req, res) {
    try {
      const { busqueda } = req.query;

      const result = await pool.query(
        `SELECT id, nombre, cantidad, unidad, costo_unitario
         FROM medicamentos
         WHERE activo = true 
         AND LOWER(nombre) LIKE LOWER($1)
         AND cantidad > 0
         ORDER BY nombre
         LIMIT 20`,
        [`%${busqueda}%`]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error buscando medicamentos:', error);
      res.status(500).json({ error: 'Error al buscar medicamentos' });
    }
  }

  // Buscar materiales disponibles
  async buscarMateriales(req, res) {
    try {
      const { busqueda } = req.query;

      const result = await pool.query(
        `SELECT id, nombre, cantidad, unidad, costo_unitario
         FROM mat_triage
         WHERE activo = true 
         AND LOWER(nombre) LIKE LOWER($1)
         AND cantidad > 0
         ORDER BY nombre
         LIMIT 20`,
        [`%${busqueda}%`]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error buscando materiales:', error);
      res.status(500).json({ error: 'Error al buscar materiales' });
    }
  }

  // Buscar procedimientos disponibles
  async buscarProcedimientos(req, res) {
    try {
      const { busqueda } = req.query;

      const result = await pool.query(
        `SELECT 
          vcp.id_procedimiento as id,
          vcp.descripcion as nombre,
          vcp.costo_total as costo_unitario,
          'procedimiento' as unidad
         FROM vista_costo_procedimientos vcp
         INNER JOIN procedimientos p ON vcp.id_procedimiento = p.id_procedimiento
         WHERE p.activo = true 
         AND LOWER(vcp.descripcion) LIKE LOWER($1)
         ORDER BY vcp.descripcion
         LIMIT 20`,
        [`%${busqueda}%`]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error buscando procedimientos:', error);
      res.status(500).json({ error: 'Error al buscar procedimientos' });
    }
  }

  // Obtener lista de médicos activos
  async obtenerMedicos(req, res) {
    try {
      const result = await pool.query(
        `SELECT id_medico, nombre, apellidos, especialidad
         FROM medico
         ORDER BY nombre, apellidos`
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error obteniendo médicos:', error);
      res.status(500).json({ error: 'Error al obtener médicos' });
    }
  }
}

async function obtenerHojaConsultaInterna(id_consulta) {
  const { pool } = require('../db');
  const result = await pool.query(
    `SELECT 
      c.id_consulta, c.fecha, c.motivo, c.estatus,
      p.nombre as paciente_nombre, p.apellidos as paciente_apellidos, 
      p.fecha_nacimiento, p.telefono as paciente_telefono, p.sexo,
      p.calle, p.num, p.colonia, p.ciudad, p.codigo_postal,
      m.nombre as medico_nombre, m.apellidos as medico_apellidos, 
      m.especialidad as medico_especialidad, m.cedula_prof as medico_cedula
     FROM consultas c
     INNER JOIN paciente p ON c.id_paciente = p.id_paciente
     LEFT JOIN medico m ON c.id_medico = m.id_medico
     WHERE c.id_consulta = $1`,
    [id_consulta]
  );

  return result.rows[0] || null;
}

const controller = new ConsultaController();

// Función auxiliar fuera de la clase
controller.obtenerHojaConsultaInterna = async function (id_consulta) {
  const result = await pool.query(
    `SELECT 
      c.id_consulta, c.fecha, c.motivo, c.estatus,
      p.nombre as paciente_nombre, p.apellidos as paciente_apellidos, 
      p.fecha_nacimiento, p.telefono as paciente_telefono, p.sexo,
      p.calle, p.num, p.colonia, p.ciudad, p.codigo_postal,
      m.nombre as medico_nombre, m.apellidos as medico_apellidos, 
      m.especialidad as medico_especialidad, m.cedula_prof as medico_cedula
     FROM consultas c
     INNER JOIN paciente p ON c.id_paciente = p.id_paciente
     LEFT JOIN medico m ON c.id_medico = m.id_medico
     WHERE c.id_consulta = $1`,
    [id_consulta]
  );

  return result.rows[0] || null;
};

module.exports = controller;