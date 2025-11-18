const express = require('express')
const router = express.Router()
const { pool } = require('../db');
const PDFDocument = require('pdfkit');

// Función para obtener datos de una consulta
async function getConsultaById(id) {
    const query = `
        SELECT 
            c.*, 
            p.nombre as paciente_nombre, 
            p.apellidos as paciente_apellidos,
            p.fecha_nacimiento,
            p.sexo,
            p.calle,
            p.num,
            p.colonia,
            p.municipio,
            p.estado,
            p.codigo_postal,
            m.nombre as medico_nombre, 
            m.apellidos as medico_apellidos, 
            m.especialidad,
            m.cedula_prof,
            -- Obtener teléfonos como array
            (SELECT array_agg(telefono) 
             FROM paciente_telefonos pt 
             WHERE pt.id_paciente = p.id_paciente) as telefonos,
            -- Obtener correos como array
            (SELECT array_agg(correo) 
             FROM paciente_correos pc 
             WHERE pc.id_paciente = p.id_paciente) as correos
        FROM consultas c
        INNER JOIN paciente p ON c.id_paciente = p.id_paciente
        LEFT JOIN medico m ON c.id_medico = m.id_medico
        WHERE c.id_consulta = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
}

// Función para obtener insumos de una consulta
async function getInsumosConsulta(id) {
    const query = `
        SELECT 
            ci.*,
            CASE 
                WHEN ci.tipo = 'medicamento' THEN med.nombre
                WHEN ci.tipo = 'material' THEN mat.nombre
                WHEN ci.tipo = 'mat_general' THEN mg.nombre  
                WHEN ci.tipo = 'procedimiento' THEN proc.descripcion
                ELSE ci.descripcion
            END as nombre_insumo,
            CASE 
                WHEN ci.tipo = 'medicamento' THEN med.unidad
                WHEN ci.tipo = 'material' THEN mat.unidad
                WHEN ci.tipo = 'mat_general' THEN mg.unidad
                WHEN ci.tipo = 'procedimiento' THEN 'servicio'
                ELSE 'unidad'
            END as unidad
        FROM consulta_insumos ci
        LEFT JOIN medicamentos med ON ci.id_insumo = med.id AND ci.tipo = 'medicamento'
        LEFT JOIN mat_triage mat ON ci.id_insumo = mat.id AND ci.tipo = 'material'
        LEFT JOIN mat_general mg ON ci.id_insumo = mg.id AND ci.tipo = 'mat_general'
        LEFT JOIN procedimientos proc ON ci.id_insumo = proc.id_procedimiento AND ci.tipo = 'procedimiento'
        WHERE ci.id_consulta = $1
        ORDER BY ci.tipo, ci.id
    `;

    const result = await pool.query(query, [id]);
    return result.rows;
}

// Función para obtener extras de una consulta
async function getExtrasConsulta(id) {
    const query = `
        SELECT * FROM consulta_extras 
        WHERE id_consulta = $1
        ORDER BY id_extra
    `;

    const result = await pool.query(query, [id]);
    return result.rows;
}

// Función para generar PDF más detallado
async function generarPDFNotaRemision(datos) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Encabezado
        doc.fontSize(20).font('Helvetica-Bold').text('NOTA DE REMISIÓN', { align: 'center' });
        doc.fontSize(12).font('Helvetica');
        doc.text(`No. ${datos.consulta.id_consulta}`, { align: 'center' });
        doc.text(`Fecha: ${new Date(datos.consulta.fecha).toLocaleDateString('es-MX')}`, { align: 'center' });
        doc.moveDown(1.5);

        // Datos del paciente
        doc.fontSize(14).font('Helvetica-Bold').text('DATOS DEL PACIENTE', { underline: true });
        doc.fontSize(10).font('Helvetica');
        doc.text(`Nombre: ${datos.paciente.paciente_nombre} ${datos.paciente.paciente_apellidos}`);
        doc.text(`Fecha de Nacimiento: ${new Date(datos.paciente.fecha_nacimiento).toLocaleDateString('es-MX')}`);
        doc.text(`Sexo: ${datos.paciente.sexo || 'No especificado'}`);
        doc.text(`Teléfono(s): ${datos.paciente.telefonos ? datos.paciente.telefonos.join(', ') : 'No registrado'}`);
        doc.text(`Domicilio: ${datos.paciente.calle} #${datos.paciente.num}, Col. ${datos.paciente.colonia}, ${datos.paciente.municipio}, ${datos.paciente.estado}`);
        doc.moveDown(1);

        /*// Datos del médico
        doc.fontSize(14).font('Helvetica-Bold').text('DATOS DEL MÉDICO', { underline: true });
        doc.fontSize(10).font('Helvetica');
        doc.text(`Nombre: Dr. ${datos.paciente.medico_nombre} ${datos.paciente.medico_apellidos}`);
        doc.text(`Especialidad: ${datos.paciente.especialidad}`);
        doc.text(`Cédula Profesional: ${datos.paciente.cedula_prof}`);
        doc.moveDown(1);
        */

        // Motivo de consulta
        /*if (datos.consulta.motivo) {
            doc.fontSize(14).font('Helvetica-Bold').text('MOTIVO DE CONSULTA', { underline: true });
            doc.fontSize(10).font('Helvetica');
            doc.text(datos.consulta.motivo);
            doc.moveDown(1);
        }*/

        // Detalles de la nota
        doc.fontSize(14).font('Helvetica-Bold').text(`DETALLE ${datos.modoDetallado ? '(DETALLADO)' : '(RESUMIDO)'}`, { underline: true });
        doc.moveDown(0.5);

        // Tabla de items
        const tableTop = doc.y;
        let currentY = tableTop;

        // Encabezados de tabla
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Descripción', 50, currentY);
        if (datos.modoDetallado) {
            doc.text('Cantidad', 300, currentY, { width: 60, align: 'center' });
            doc.text('P. Unit.', 370, currentY, { width: 70, align: 'right' });
        }
        doc.text('Importe', 450, currentY, { width: 80, align: 'right' });

        currentY += 20;
        doc.fontSize(9).font('Helvetica');

        let totalGeneral = 0;

        datos.items.forEach(item => {
            if (currentY > 650) {
                doc.addPage();
                currentY = 50;
            }

            if (datos.modoDetallado) {
                doc.text(item.nombre || item.concepto, 50, currentY, { width: 240 });
                if (item.cantidad && item.unidad) {
                    doc.text(`${item.cantidad} ${item.unidad}`, 300, currentY, { width: 60, align: 'center' });
                } else {
                    doc.text('-', 300, currentY, { width: 60, align: 'center' });
                }
                doc.text(`$${(item.costo_unitario || item.costo || 0).toFixed(2)}`, 370, currentY, { width: 70, align: 'right' });
                const subtotal = item.subtotal || item.costo || 0;
                doc.text(`$${subtotal.toFixed(2)}`, 450, currentY, { width: 80, align: 'right' });
                totalGeneral += subtotal;
            } else {
                doc.text(item.nombre, 50, currentY, { width: 400 });
                const subtotal = item.subtotal || 0;
                doc.text(`$${subtotal.toFixed(2)}`, 450, currentY, { width: 80, align: 'right' });
                totalGeneral += subtotal;
            }

            currentY += 15;
        });

        // Línea separadora
        doc.moveTo(50, currentY).lineTo(530, currentY).stroke();
        currentY += 10;

        // Total
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('TOTAL:', 350, currentY, { width: 100, align: 'right' });
        doc.text(`$${totalGeneral.toFixed(2)}`, 450, currentY, { width: 80, align: 'right' });

        // Pie de página
        doc.fontSize(8).font('Helvetica');
        doc.text('Gracias por su preferencia', 50, 750, { align: 'center', width: 480 });
        doc.text('Esta nota no es válida como factura fiscal', 50, 765, { align: 'center', width: 480 });

        doc.end();
    });
}

// Ruta para generar la nota de remisión
router.get('/:id/nota-remision', async (req, res) => {
    try {
        const { id } = req.params;
        const { modo_detallado } = req.query;

        console.log(`Generando nota de remisión para consulta ${id}, modo: ${modo_detallado}`);

        // Obtener datos de la consulta
        const consulta = await getConsultaById(id);
        if (!consulta) {
            return res.status(404).json({ mensaje: 'Consulta no encontrada' });
        }

        const insumos = await getInsumosConsulta(id);
        const extras = await getExtrasConsulta(id);

        // Agrupar insumos si no es modo detallado
        let itemsNota = [];
        if (modo_detallado === 'true') {
            // Modo detallado - todos los items individualmente
            itemsNota = insumos.map(insumo => ({
                nombre: insumo.nombre_insumo || insumo.descripcion || `Insumo ${insumo.tipo}`,
                cantidad: insumo.cantidad,
                unidad: insumo.unidad,
                costo_unitario: parseFloat(insumo.costo_unitario) || 0,
                subtotal: parseFloat(insumo.subtotal) || 0,
                tipo: insumo.tipo
            }));

            // Agregar extras individualmente
            extras.forEach(extra => {
                itemsNota.push({
                    nombre: extra.concepto,
                    costo: parseFloat(extra.costo) || 0,
                    tipo: 'extra',
                    observaciones: extra.observaciones
                });
            });

            // Agregar el costo de la consulta en modo detallado
            if (consulta.costo_consulta) {
                itemsNota.push({
                    nombre: 'Costo de consulta',
                    costo: parseFloat(consulta.costo_consulta),
                    tipo: 'consulta'
                });
            }
        } else {
            // Modo resumido - agrupar por categoría
            const agrupados = {};

            // Agrupar insumos por tipo
            insumos.forEach(insumo => {
                const categoria = getCategoriaNombre(insumo.tipo);
                if (!agrupados[categoria]) {
                    agrupados[categoria] = {
                        nombre: categoria,
                        subtotal: 0
                    };
                }
                agrupados[categoria].subtotal += parseFloat(insumo.subtotal) || 0;
            });

            // Agregar el costo de la consulta
            if (consulta.costo_consulta) {
                agrupados['Consulta'] = {
                    nombre: 'Costo de consulta',
                    subtotal: parseFloat(consulta.costo_consulta)
                };
            }

            // Agregar extras como categoría separada
            if (extras.length > 0) {
                const totalExtras = extras.reduce((sum, extra) => sum + (parseFloat(extra.costo) || 0), 0);
                agrupados['Servicios Adicionales'] = {
                    nombre: 'Servicios y procedimientos adicionales',
                    subtotal: totalExtras
                };
            }

            itemsNota = Object.values(agrupados);
        }

        // Calcular total general
        const totalGeneral = itemsNota.reduce((sum, item) => sum + (item.subtotal || item.costo || 0), 0);

        // Generar PDF
        const pdfBuffer = await generarPDFNotaRemision({
            consulta,
            paciente: consulta, // Los datos del paciente ya vienen en la consulta
            items: itemsNota,
            total: totalGeneral,
            modoDetallado: modo_detallado === 'true'
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=nota_remision_${id}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generando nota de remisión:', error);
        res.status(500).json({
            mensaje: 'Error generando nota de remisión',
            error: error.message
        });
    }
});

router.patch('/:id/modo-nota', async (req, res) => {
    try {
        const { id } = req.params;
        const { modo_detallado } = req.body;

        console.log(`Modo de nota para consulta ${id}: ${modo_detallado ? 'detallado' : 'resumido'}`);

        res.json({ mensaje: 'Modo de nota actualizado correctamente' });

    } catch (error) {
        console.error('Error actualizando modo de nota:', error);
        res.status(500).json({ mensaje: 'Error actualizando modo de nota' });
    }
});

router.get('/historial', async (req, res) => {
  const { nombre, apellidos, fecha } = req.query;

  if (!nombre || !fecha) {
    return res.status(400).json({ mensaje: "El nombre y la fecha son obligatorios" });
  }

  try {
    let apellidosArray = [];
    if (apellidos && apellidos.trim() !== '') {
      apellidosArray = apellidos
        .trim()
        .split(/\s+/)
        .map(a => a.toLowerCase());
    }

    let apellidoConditions = "";
    let apellidoParams = [];

    if (apellidosArray.length > 0) {
      apellidoConditions = apellidosArray
        .map((a, index) => `LOWER(p.apellidos) LIKE $${3 + index}`)
        .join(" AND ");

      apellidoParams = apellidosArray.map(a => `%${a}%`);
    }

    const sql = `
      SELECT
        c.id_consulta,
        c.fecha,
        c.total,
        m.nombre AS medico_nombre,
        m.apellidos AS medico_apellidos,
        p.nombre AS paciente_nombre,
        p.apellidos AS paciente_apellidos
      FROM consultas c
      JOIN paciente p ON p.id_paciente = c.id_paciente
      JOIN medico m ON m.id_medico = c.id_medico
      WHERE LOWER(p.nombre) LIKE LOWER($1)
        AND c.fecha::date = $2
        ${apellidoConditions ? `AND ${apellidoConditions}` : ""}
      ORDER BY c.fecha ASC
    `;

    const params = [
      `%${nombre}%`,
      fecha,
      ...apellidoParams
    ];

    const { rows } = await pool.query(sql, params);

    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error consultando historial avanzado' });
  }
});


function getCategoriaNombre(tipo) {
    const categorias = {
        'medicamento': 'Medicamentos',
        'material': 'Material de curación',
        'mat_general': 'Material general',
        'procedimiento': 'Procedimientos médicos',
        'extra': 'Servicios adicionales'
    };
    return categorias[tipo] || 'Otros servicios';
}

module.exports = router;