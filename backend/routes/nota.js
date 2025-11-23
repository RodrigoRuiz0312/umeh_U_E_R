const express = require('express')
const router = express.Router()
const { pool } = require('../db');
const PDFDocument = require('pdfkit');
const path = require('path');

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
            m.nombre_agenda,
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

// Función para obtener el orden de prioridad de un tipo de insumo
function getOrdenPrioridad(tipo) {
    const orden = {
        'medicamento': 1,
        'mat_general': 2,
        'material': 3,
        'procedimiento': 4,
        'consulta': 5,
        'extra': 6
    };
    return orden[tipo] || 999; // Items sin tipo definido van al final
}

// Función para generar PDF Nota de Remisión (Media Carta - Estilo Oficial UMEH)
async function generarPDFNotaRemision(datos) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'LETTER',
            margin: 20,
            autoFirstPage: false
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.addPage();

        // --- CONFIGURACIÓN DE ESTILOS ---
        const colorBorde = '#000000'; // Negro para líneas
        const colorFondoHeader = '#b2ebf2'; // Mismo cian que la hoja de consulta
        const colorTexto = '#000000'; // Texto negro
        const colorFolio = '#c0392b'; // Rojo oscuro para el folio (como en los recibos)

        const pageW = doc.page.width;
        const margin = 25;
        const contentW = pageW - (margin * 2);
        const halfHeight = 396; // Límite de media carta

        // --- HELPER PARA DIBUJAR CELDAS ---
        function dibujarCelda(x, y, w, h, titulo, valor, alinearValor = 'left', fondo = false, ajustey = 0) {
            // Fondo y Borde
            if (fondo) {
                doc.rect(x, y, w, 12).fillAndStroke(colorFondoHeader, colorBorde);
                doc.rect(x, y + 12, w, h - 12).stroke(colorBorde);
            } else {
                doc.rect(x, y, w, h).stroke(colorBorde);
            }

            // Título
            doc.fontSize(6).font('Helvetica-Bold').fillColor(colorTexto);
            doc.text(titulo.toUpperCase(), x + 2, y + 3, { width: w - 4, align: 'center' });

            // Valor
            if (valor) {
                doc.fontSize(9).font('Helvetica').fillColor(colorTexto); // Letra un poco más grande
                const textY = (fondo ? y + 16 : y + 12) + ajustey;
                doc.text(valor, x + 4, textY, { width: w - 8, align: alinearValor });
            }
        }

        let currentY = margin;

        // 1. ENCABEZADO Y FOLIO
        // Logo en el lado izquierdo
        const logoPath = path.join(__dirname, '..', 'public', 'logo_umeh.png');
        try {
            doc.image(logoPath, 35, 20, { width: 100, height: 35 });
        } catch (error) {
            console.log('No se pudo cargar el logo:', error.message);
        }

        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000').text('NOTA DE REMISIÓN', margin, currentY, { align: 'center', width: contentW });
        doc.fontSize(8).font('Helvetica').text('UNIDAD MÉDICA DE LA HUASTECA', margin, currentY + 16, { align: 'center', width: contentW });

        // Lado Derecho: Folio (Color Rojo)
        doc.fontSize(14).font('Helvetica-Bold').fillColor(colorFolio);
        doc.text(`No. ${datos.consulta.id_consulta}`, pageW - margin - 100, currentY + 5, { align: 'right', width: 100 });

        currentY += 40;

        // 2. FILA: PACIENTE Y FECHA (DÍA | MES | AÑO)
        const rowH = 35;

        // Cálculo de anchos para la fecha
        const wDateBox = 35; // Ancho de cada cajita de fecha
        const totalWDate = wDateBox * 3;
        const wPaciente = contentW - totalWDate; // El resto para el nombre

        // Datos de fecha
        const fechaObj = new Date(datos.consulta.fecha);
        const dia = fechaObj.getDate().toString().padStart(2, '0');
        const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
        const anio = fechaObj.getFullYear().toString().slice(-2); // Solo últimos 2 dígitos (ej. 25)

        // Dibujar Paciente
        const nombrePaciente = `${datos.paciente.paciente_nombre} ${datos.paciente.paciente_apellidos}`;
        dibujarCelda(margin, currentY, wPaciente, rowH, 'PACIENTE', nombrePaciente, 'center', true, 5);

        // Dibujar Fecha (3 cajitas pegadas)
        const xDate = margin + wPaciente;
        dibujarCelda(xDate, currentY, wDateBox, rowH, 'DÍA', dia, 'center', true, 5);
        dibujarCelda(xDate + wDateBox, currentY, wDateBox, rowH, 'MES', mes, 'center', true, 5);
        dibujarCelda(xDate + (wDateBox * 2), currentY, wDateBox, rowH, 'AÑO', anio, 'center', true, 5);

        currentY += rowH + 5;

        // 3. TABLA DE CONCEPTOS
        const tableY = currentY;
        const tableH = 180;

        // --- Definición de columnas ---
        let colCatW = 0, colCantW = 0, colDescW = 0, colUnitW = 0, colImpW = 0;
        let colCatX = 0, colCantX = 0, colDescX = 0, colUnitX = 0, colImpX = 0;

        // Configuración de anchos según modo
        if (datos.modoDetallado) {
            colCatW = 90;  // Categoría nombre completo
            colCantW = 40;
            colUnitW = 50;
            colImpW = 60;
            colDescW = contentW - colCatW - colCantW - colUnitW - colImpW;
        } else {
            // Modo resumido
            colCatW = 0;
            colCantW = 0;
            colUnitW = 0;
            colImpW = 80;
            colDescW = contentW - colImpW;
        }

        // Posiciones X
        colCatX = margin;
        colCantX = colCatX + colCatW;
        colDescX = colCantX + colCantW;
        colUnitX = colDescX + colDescW;
        colImpX = colUnitX + colUnitW;

        // --- Encabezados ---
        const headerH = 15;
        doc.fontSize(7).font('Helvetica-Bold').fillColor(colorTexto);

        // Función helper para encabezado
        const drawHeader = (x, w, text) => {
            doc.rect(x, tableY, w, headerH).fillAndStroke('#b2ebf2', colorBorde);
            doc.fillColor(colorTexto).text(text, x, tableY + 5, { width: w, align: 'center' });
        };

        if (datos.modoDetallado) {
            drawHeader(colCatX, colCatW, 'CATEGORÍA');
            drawHeader(colCantX, colCantW, 'CANT.');
            drawHeader(colUnitX, colUnitW, 'P.UNIT');
            drawHeader(colDescX, colDescW, 'CONCEPTO / DESCRIPCIÓN');
        } else {
            drawHeader(colDescX, colDescW, 'CONCEPTO / DESCRIPCIÓN');
        }

        drawHeader(colImpX, colImpW, 'IMPORTE');

        // --- Cuerpo (Rectángulos vacíos) ---
        const bodyY = tableY + headerH;

        if (datos.modoDetallado) {
            doc.rect(colCatX, bodyY, colCatW, tableH).stroke();
            doc.rect(colCantX, bodyY, colCantW, tableH).stroke();
            doc.rect(colUnitX, bodyY, colUnitW, tableH).stroke();
            doc.rect(colDescX, bodyY, colDescW, tableH).stroke();
        } else {
            doc.rect(colDescX, bodyY, colDescW, tableH).stroke();
        }
        doc.rect(colImpX, bodyY, colImpW, tableH).stroke();

        // --- Rellenado de Ítems ---
        let itemY = bodyY + 8;
        doc.fontSize(8).font('Helvetica');

        // Helper para obtener la agenda del médico
        const agendaMedico = datos.consulta.nombre_agenda || 'General';

        datos.items.forEach(item => {
            if (itemY > (bodyY + tableH - 10)) return;

            if (datos.modoDetallado) {
                // Categoría (nombre completo)
                const categoriaNombre = getCategoriaNombre(item.tipo);
                doc.fontSize(8).text(categoriaNombre, colCatX + 5, itemY, { width: colCatW - 4, align: 'left' });
                doc.fontSize(8);
                // Cantidad
                doc.text(item.cantidad || '-', colCantX, itemY, { width: colCantW, align: 'center' });
                // P. Unit
                doc.text(`$${(item.costo_unitario || item.costo || 0).toFixed(2)}`, colUnitX, itemY, { width: colUnitW - 2, align: 'center' });
                // Descripción
                let nombre = item.nombre || item.concepto || 'Servicio';
                // Agregar leyenda de médico si es costo de consulta
                if (item.tipo === 'consulta') {
                    nombre = `${nombre} (Atendido por: Médico ${agendaMedico})`;
                }
                doc.text(nombre, colDescX + 4, itemY, { width: colDescW - 8 });
            } else {
                // Modo resumido
                // Descripción
                let nombre = item.nombre || item.concepto || 'Servicio';
                // Agregar leyenda de médico si es costo de consulta
                if (nombre === 'Costo de consulta') {
                    nombre = `${nombre} (Atendido por: Médico ${agendaMedico})`;
                }
                doc.text(nombre, colDescX + 4, itemY, { width: colDescW - 8 });
            }

            // Importe
            doc.text(`$${(item.subtotal || item.costo || 0).toFixed(2)}`, colImpX, itemY, { width: colImpW - 4, align: 'center' });

            itemY += 15;
        });

        // 4. PIE DE PÁGINA Y TOTALES
        const footerTableY = bodyY + tableH;

        // Total
        doc.rect(colImpX, footerTableY, colImpW, 20).stroke();
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('TOTAL:', colImpX - 60, footerTableY + 6, { align: 'right', width: 55 });
        doc.text(`$${datos.total.toFixed(2)}`, colImpX, footerTableY + 6, { width: colImpW - 5, align: 'right' });

        // --- DIRECCIÓN Y TELÉFONOS (Estilo Pie de Recibo) ---
        const addressY = footerTableY + 30;
        doc.fontSize(7).font('Helvetica').fillColor('#444');

        // Dirección
        doc.text('Calle Manuel J. Othón No. 723, Col. Altavista, C.P. 79050, Cd. Valles, S.L.P.', margin, addressY, { align: 'center', width: contentW });

        // Teléfonos
        doc.font('Helvetica-Bold');
        doc.text('Tel. 481 382 4043  /  481 380 9184', margin, addressY + 10, { align: 'center', width: contentW });

        // Disclaimer pequeño
        doc.fontSize(6).font('Helvetica-Oblique').fillColor('#666');
        doc.text('ESTA NOTA NO ES VÁLIDA COMO FACTURA FISCAL', margin, addressY + 22, { align: 'center', width: contentW });

        // Línea de Corte
        doc.moveTo(0, halfHeight).lineTo(pageW, halfHeight).dash(5, { space: 5 }).strokeColor('#999').stroke();
        doc.fontSize(6).text('', 0, halfHeight - 8, { align: 'center', width: pageW });

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
                        subtotal: 0,
                        tipo: insumo.tipo // Preservar el tipo para ordenamiento
                    };
                }
                agrupados[categoria].subtotal += parseFloat(insumo.subtotal) || 0;
            });

            // Agregar el costo de la consulta
            if (consulta.costo_consulta) {
                agrupados['Consulta'] = {
                    nombre: 'Costo de consulta',
                    subtotal: parseFloat(consulta.costo_consulta),
                    tipo: 'consulta'
                };
            }

            // Agregar extras como categoría separada
            if (extras.length > 0) {
                const totalExtras = extras.reduce((sum, extra) => sum + (parseFloat(extra.costo) || 0), 0);
                agrupados['Servicios Adicionales'] = {
                    nombre: 'Servicios y procedimientos adicionales',
                    subtotal: totalExtras,
                    tipo: 'extra'
                };
            }

            itemsNota = Object.values(agrupados);
        }

        // Ordenar items según la prioridad definida
        itemsNota.sort((a, b) => {
            return getOrdenPrioridad(a.tipo) - getOrdenPrioridad(b.tipo);
        });

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
    const { nombre, apellidos, fecha_inicio, fecha_fin } = req.query;

    if (!nombre) {
        return res.status(400).json({ mensaje: "El nombre es obligatorio" });
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
        let paramIndex = 2; // Empezamos en 2 porque $1 es el nombre

        if (apellidosArray.length > 0) {
            apellidoConditions = apellidosArray
                .map((a, index) => `LOWER(p.apellidos) LIKE $${paramIndex + index}`)
                .join(" AND ");

            apellidoParams = apellidosArray.map(a => `%${a}%`);
            paramIndex += apellidosArray.length;
        }

        // Construir condiciones de fecha
        let fechaCondition = "";
        let fechaParams = [];

        if (fecha_inicio && fecha_fin) {
            // Rango de fechas
            fechaCondition = `AND c.fecha::date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            fechaParams = [fecha_inicio, fecha_fin];
        } else if (fecha_inicio) {
            // Solo fecha de inicio (desde esa fecha en adelante)
            fechaCondition = `AND c.fecha::date >= $${paramIndex}`;
            fechaParams = [fecha_inicio];
        } else if (fecha_fin) {
            // Solo fecha fin (hasta esa fecha)
            fechaCondition = `AND c.fecha::date <= $${paramIndex}`;
            fechaParams = [fecha_fin];
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
        AND LOWER(TRIM(c.estatus)) = 'completada'
        ${fechaCondition}
        ${apellidoConditions ? `AND ${apellidoConditions}` : ""}
      ORDER BY c.fecha DESC
    `;

    const params = [
        `%${nombre}%`,
        ...apellidoParams,
        ...fechaParams
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
        'material': 'Material Triage',
        'mat_general': 'Material general',
        'procedimiento': 'Procedimientos',
        'consulta': 'Consulta',
        'extra': 'Servicios adicionales'
    };
    return categorias[tipo] || 'Otros servicios';
}

module.exports = router;