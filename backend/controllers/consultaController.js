// controllers/consultaController.js
const { pool } = require('../db');

class ConsultaController {

  // Buscar paciente por nombre y apellidos
  async buscarPaciente(req, res) {
    try {
      const { nombre, apellidos } = req.query;

      // Primero obtenemos los datos básicos del paciente
      let query = `
        SELECT p.id_paciente, p.nombre, p.apellidos, p.fecha_nacimiento, 
               p.sexo, p.calle, p.num, p.colonia, p.municipio, p.estado, p.codigo_postal
        FROM paciente p
        WHERE LOWER(p.nombre) LIKE LOWER($1)
      `;
      const params = [`%${nombre}%`];

      if (apellidos) {
        query += ` AND LOWER(p.apellidos) LIKE LOWER($${params.length + 1})`;
        params.push(`%${apellidos}%`);
      }

      query += ` ORDER BY p.nombre, p.apellidos LIMIT 10`;

      // Ejecutamos la consulta principal
      const pacientesResult = await pool.query(query, params);
      
      if (pacientesResult.rows.length === 0) {
        return res.json([]);
      }

      // Obtenemos los IDs de los pacientes encontrados
      const pacientesIds = pacientesResult.rows.map(p => p.id_paciente);
      
      // Consulta para obtener los teléfonos de los pacientes
      const telefonosQuery = `
        SELECT pt.id_paciente, array_agg(pt.telefono) as telefonos
        FROM paciente_telefonos pt
        WHERE pt.id_paciente = ANY($1::bigint[])
        GROUP BY pt.id_paciente
      `;
      
      // Consulta para obtener los correos de los pacientes
      const correosQuery = `
        SELECT pc.id_paciente, array_agg(pc.correo) as correos
        FROM paciente_correos pc
        WHERE pc.id_paciente = ANY($1::bigint[])
        GROUP BY pc.id_paciente
      `;
      
      // Ejecutamos ambas consultas en paralelo
      const [telefonosResult, correosResult] = await Promise.all([
        pool.query(telefonosQuery, [pacientesIds]),
        pool.query(correosQuery, [pacientesIds])
      ]);
      
      // Creamos mapas para acceder rápidamente a los teléfonos y correos por ID de paciente
      const telefonosMap = new Map(
        telefonosResult.rows.map(row => [row.id_paciente, row.telefonos])
      );
      
      const correosMap = new Map(
        correosResult.rows.map(row => [row.id_paciente, row.correos])
      );
      
      // Combinamos los resultados
      const pacientes = pacientesResult.rows.map(paciente => ({
        ...paciente,
        telefonos: telefonosMap.get(paciente.id_paciente) || [],
        correos: correosMap.get(paciente.id_paciente) || []
      }));
      
      res.json(pacientes);
    } catch (error) {
      console.error('Error buscando paciente:', error);
      res.status(500).json({ error: 'Error al buscar paciente' });
    }
  }

  // Crear una nueva consulta
  async crearConsulta(req, res) {
    const client = await pool.connect();
    try {
      const { id_paciente, id_medico, motivo } = req.body;

      if (!id_paciente || !id_medico) {
        return res.status(400).json({ error: 'Faltan datos requeridos.' });
      }

      await client.query('BEGIN');

      const query = `
      INSERT INTO consultas (id_paciente, id_medico, motivo, estatus, fecha, fecha_sesion, activo)
      VALUES ($1, $2, $3, 'espera', NOW(), CURRENT_DATE, true)
      RETURNING id_consulta, id_paciente, id_medico, estatus, fecha;
    `;
      const { rows } = await client.query(query, [id_paciente, id_medico, motivo]);

      await client.query('COMMIT');
      res.status(201).json(rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al crear consulta:', error);
      res.status(500).json({ error: 'Error al crear la consulta' });
    } finally {
      client.release();
    }
  }

  // Consultas activas del día
  async obtenerConsultasActivas(req, res) {
    try {
      const { rows } = await pool.query(`
      SELECT c.id_consulta, c.fecha, c.estatus, c.motivo,
             p.nombre AS paciente_nombre, p.apellidos AS paciente_apellidos,
             m.nombre AS medico_nombre, m.apellidos AS medico_apellidos
      FROM consultas c
      JOIN paciente p ON c.id_paciente = p.id_paciente
      JOIN medico m ON c.id_medico = m.id_medico
      WHERE c.fecha_sesion = CURRENT_DATE AND c.activo = true
      ORDER BY c.fecha ASC;
    `);

      res.json(rows);
    } catch (error) {
      console.error('Error al obtener consultas activas:', error);
      res.status(500).json({ error: 'Error al obtener consultas activas' });
    }
  }


  // Obtener datos completos para hoja de consulta
  async obtenerHojaConsulta(req, res) {
    try {
      const { id_consulta } = req.params;

      const result = await pool.query(
        `SELECT 
          c.id_consulta,
          c.id_paciente,
          c.id_medico,
          c.fecha,
          c.motivo,
          c.estatus,
          p.nombre as paciente_nombre,
          p.apellidos as paciente_apellidos,
          p.fecha_nacimiento,
          (SELECT telefono FROM paciente_telefonos WHERE id_paciente = p.id_paciente LIMIT 1) as paciente_telefono,
          p.sexo,
          p.calle,
          p.num,
          p.colonia,
          p.municipio,
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

  // Cambiar estatus
  async actualizarEstatus(req, res) {
    try {
      const { id_consulta } = req.params;
      const { nuevoEstatus } = req.body;

      await pool.query(
        'UPDATE consultas SET estatus = $1 WHERE id_consulta = $2',
        [nuevoEstatus, id_consulta]
      );

      res.json({ message: `Estatus actualizado a ${nuevoEstatus}` });
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
          costoUnitario = parseFloat(med.rows[0].costo_unitario); // ✅ Convertir aquí
        }
      } else if (tipo === 'material') {
        const mat = await client.query(
          'SELECT cantidad, costo_unitario FROM mat_triage WHERE id = $1',
          [id_insumo]
        );
        if (mat.rows.length > 0 && mat.rows[0].cantidad >= cantidad) {
          inventarioDisponible = true;
          costoUnitario = parseFloat(mat.rows[0].costo_unitario); // ✅ Convertir aquí
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
          costoUnitario = parseFloat(costoProcedimiento.rows[0].costo_total); // ✅ Convertir aquí
        }
      }

      if (!inventarioDisponible) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Inventario insuficiente',
          mensaje: 'No hay suficiente stock disponible para este insumo o procedimiento'
        });
      }

      // Insertar insumo en consulta (el trigger descontar_inventario() descuenta automáticamente)
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

      // ✅ Convertir tipos de datos del insumo insertado
      const insumoConvertido = {
        ...result.rows[0],
        id: parseInt(result.rows[0].id, 10),
        id_insumo: parseInt(result.rows[0].id_insumo, 10),
        cantidad: parseFloat(result.rows[0].cantidad),
        costo_unitario: parseFloat(result.rows[0].costo_unitario),
        subtotal: parseFloat(result.rows[0].subtotal)
      };

      // Obtener total actualizado de la consulta
      const totalConsulta = await client.query(
        'SELECT total FROM consultas WHERE id_consulta = $1',
        [id_consulta]
      );

      // Dentro de agregarInsumo (antes de COMMIT)
      console.log('✅ INSERTANDO INSUMO EN CONSULTA:', { id_consulta, id_insumo, tipo, cantidad, costoUnitario });

      await client.query('COMMIT');

      res.status(201).json({
        insumo: insumoConvertido, // ✅ Enviar el insumo convertido
        totalConsulta: parseFloat(totalConsulta.rows[0].total) // ✅ Convertir total también
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
      const id_insumo_consulta = parseInt(req.params.id_insumo_consulta, 10);

      if (isNaN(id_insumo_consulta)) {
        return res.status(400).json({ error: 'ID de insumo inválido' });
      }

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
        await client.query(
          `UPDATE medicamentos m
         SET cantidad = m.cantidad + (pi.cantidad * $1)
         FROM procedimiento_insumos pi
         WHERE pi.id_procedimiento = $2
         AND pi.tipo = 'medicamento'
         AND pi.id_insumo = m.id`,
          [cantidad, id_insumo]
        );

        await client.query(
          `UPDATE mat_triage mt
         SET cantidad = mt.cantidad + (pi.cantidad * $1)
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

      // ✅ Convertir tipos de datos correctamente
      const insumos = result.rows.map(insumo => ({
        ...insumo,
        id: parseInt(insumo.id, 10),                    // bigint → number
        id_insumo: parseInt(insumo.id_insumo, 10),      // bigint → number
        cantidad: parseFloat(insumo.cantidad),          // numeric → number
        costo_unitario: parseFloat(insumo.costo_unitario), // numeric → number
        subtotal: parseFloat(insumo.subtotal)           // numeric → number
      }));

      res.json(insumos);
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
      SET estatus = 'completada', activo = false, fecha = NOW()
      WHERE id_consulta = $1`,
        [id_consulta]
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
        (SELECT telefono FROM paciente_telefonos WHERE id_paciente = p.id_paciente LIMIT 1) as paciente_telefono,
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
        p.id_paciente, p.nombre, p.apellidos, m.nombre, m.apellidos`,
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

  // ✅ NUEVO: Cancelar consulta y restaurar todo el inventario
  async cancelarConsulta(req, res) {
    const client = await pool.connect();
    try {
      const { id_consulta } = req.params;

      await client.query('BEGIN');

      // Obtener todos los insumos de la consulta antes de cancelarla
      const insumosResult = await client.query(
        'SELECT id_insumo, tipo, cantidad FROM consulta_insumos WHERE id_consulta = $1',
        [id_consulta]
      );

      // Restaurar inventario para cada insumo
      for (const insumo of insumosResult.rows) {
        const { id_insumo, tipo, cantidad } = insumo;

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
          // Restaurar los insumos del procedimiento
          await client.query(
            `UPDATE medicamentos m
             SET cantidad = m.cantidad + (pi.cantidad * $1)
             FROM procedimiento_insumos pi
             WHERE pi.id_procedimiento = $2
             AND pi.tipo = 'medicamento'
             AND pi.id_insumo = m.id`,
            [cantidad, id_insumo]
          );

          await client.query(
            `UPDATE mat_triage mt
             SET cantidad = mt.cantidad + (pi.cantidad * $1)
             FROM procedimiento_insumos pi
             WHERE pi.id_procedimiento = $2
             AND pi.tipo = 'material'
             AND pi.id_insumo = mt.id`,
            [cantidad, id_insumo]
          );
        }
      }

      // Marcar consulta como cancelada
      await client.query(
        `UPDATE consultas 
         SET estatus = 'cancelada', activo = false 
         WHERE id_consulta = $1`,
        [id_consulta]
      );

      await client.query('COMMIT');

      res.json({
        mensaje: 'Consulta cancelada y inventario restaurado correctamente',
        insumosRestaurados: insumosResult.rows.length
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error cancelando consulta:', error);
      res.status(500).json({ error: 'Error al cancelar consulta' });
    } finally {
      client.release();
    }
  }
}

async function obtenerHojaConsultaInterna(id_consulta) {
  const { pool } = require('../db');
  
  // Primero obtenemos los datos básicos de la consulta
  const consultaQuery = `
    SELECT 
      c.id_consulta, c.fecha, c.motivo, c.estatus,
      p.id_paciente, p.nombre as paciente_nombre, p.apellidos as paciente_apellidos,
      p.fecha_nacimiento, p.sexo, p.calle, p.num, p.colonia, p.municipio, p.codigo_postal,
      m.nombre as medico_nombre, m.apellidos as medico_apellidos,
      m.especialidad as medico_especialidad, m.cedula_prof as medico_cedula
    FROM consultas c
    INNER JOIN paciente p ON c.id_paciente = p.id_paciente
    LEFT JOIN medico m ON c.id_medico = m.id_medico
    WHERE c.id_consulta = $1`;

  const consultaResult = await pool.query(consultaQuery, [id_consulta]);
  
  if (!consultaResult.rows[0]) {
    return null;
  }
  
  const consultaData = consultaResult.rows[0];
  
  // Obtenemos los teléfonos del paciente
  const telefonosQuery = `
    SELECT telefono 
    FROM paciente_telefonos 
    WHERE id_paciente = $1`;
  
  const telefonosResult = await pool.query(telefonosQuery, [consultaData.id_paciente]);
  const telefonos = telefonosResult.rows.map(t => t.telefono);
  
  // Obtenemos los correos del paciente
  const correosQuery = `
    SELECT correo 
    FROM paciente_correos 
    WHERE id_paciente = $1`;
  
  const correosResult = await pool.query(correosQuery, [consultaData.id_paciente]);
  const correos = correosResult.rows.map(c => c.correo);
  
  // Combinamos los resultados
  return {
    ...consultaData,
    paciente_telefono: telefonos[0] || null, // Tomamos el primer teléfono como principal
    telefonos,
    correos
  };
}

const controller = new ConsultaController();

// Función auxiliar fuera de la clase
controller.obtenerHojaConsultaInterna = obtenerHojaConsultaInterna;

module.exports = controller;