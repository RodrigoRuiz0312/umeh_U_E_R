const express = require('express')
const router = express.Router()
const { pool } = require('../db');
const PDFDocument = require('pdfkit');
const reportesController = require('../controllers/reportesController');

//  GET reporte PDF de medicamentos
router.get('/ver', async (req, res) => {
    try {
        const query = `
            SELECT
                m.id,
                m.nombre,
                m.cantidad,
                m.unidad,
                COALESCE(m.costo_unitario, 0) AS costo,
                COALESCE(
                    (
                        SELECT json_agg(ma2.nombre)
                        FROM medicamento_metodo mm2
                                LEFT JOIN metodos_aplicacion ma2 ON ma2.id = mm2.metodo_id
                WHERE mm2.medicamento_id = m.id
                    ), 
                    '[]'::json
                            ) AS metodo_aplicacion
            FROM medicamentos m
            ORDER BY m.id`;

        const result = await pool.query(query);
        const medicamentos = result.rows;

        //  Obtener fecha actual formateada
        const fechaActual = new Date();
        const opciones = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'America/Mexico_City' // Zona horaria de México
        };
        const fechaFormateada = fechaActual.toLocaleDateString('es-MX');

        const doc = new PDFDocument({ margin: 30, size: 'Letter' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="reporte_medicamentos.pdf"');

        doc.pipe(res);

        /***********************************************************************/
        // ENCABEZADOS LOGO Y FECHA
        // Logo
        doc.image('public/logo_umeh.png', 20, 20, { height: 50 });
        // Fecha
        doc.fontSize(13).fillColor('#ffffffff')
            .text(`${fechaFormateada}`, 470, 40, { align: 'center' });
        /***********************************************************************/

        /***********************************************************************/
        // CUERPO DEL REPORTE
        // Título
        doc.fontSize(15).fillColor('#0000').text('Reporte de Medicamentos', 30, 85, { align: 'center' });
        doc.fillColor('black'); // Restaurar color negro
        doc.moveDown(1.5);

        // Encabezados de tabla
        const tableTop = doc.y;
        const columnWidths = {
            id: 15,
            nombre: 110,
            cantidad: 50,
            unidad: 50,
            costo: 80,
            metodo: 100
        };

        const opcionesTexto = {
            align: 'center',
            lineBreak: false,
            continued: false
        };

        doc.fontSize(12).text('Id', 50, tableTop, { width: columnWidths.id, ...opcionesTexto });
        doc.text('Nombre', 90, tableTop, { width: columnWidths.nombre, ...opcionesTexto });
        doc.text('Cantidad', 220, tableTop, { width: columnWidths.cantidad, ...opcionesTexto });
        doc.text('Unidad', 290, tableTop, { width: columnWidths.unidad, ...opcionesTexto });
        doc.text('Costo Unitario', 360, tableTop, { width: columnWidths.costo, ...opcionesTexto });
        doc.text('Método Aplicación', 455, tableTop, { width: columnWidths.metodo, ...opcionesTexto });

        // línea bajo encabezados
        doc.lineWidth(2).strokeColor('#888').moveTo(40, doc.y + 8).lineTo(572, doc.y + 8).stroke();

        doc.moveDown();

        // Restaurar estilo normal para las filas
        doc.lineWidth(0.5).strokeColor('#000'); // negro fino

        // Filas con altura adaptativa y centrado vertical
        // Filas
        medicamentos.forEach((m) => {
            const startY = doc.y + 5;

            // Columnas del registro
            const columns = [
                { text: m.id.toString(), x: 50, width: columnWidths.id },
                { text: m.nombre, x: 90, width: columnWidths.nombre },
                { text: m.cantidad.toString(), x: 220, width: columnWidths.cantidad },
                { text: m.unidad, x: 290, width: columnWidths.unidad },
                { text: `$${m.costo}`, x: 360, width: columnWidths.costo },
                { text: m.metodo_aplicacion.join(', '), x: 455, width: columnWidths.metodo }
            ];

            // Escribir cada celda una sola vez
            doc.fontSize(10);
            columns.forEach(col => {
                doc.text(col.text, col.x, startY, {
                    width: col.width,
                    align: 'center',
                    lineBreak: true
                });
            });

            // Mover el cursor hacia abajo (ajustar separación entre filas)
            doc.moveDown(2);

            // Línea separadora entre registros
            doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
            doc.moveDown(0.5);
        });


        doc.end();
    } catch (err) {
        console.error('❌ Error generando reporte:', err);
        res.status(500).json({ error: 'Error generando reporte PDF' });
    }
});

//  Nuevas rutas para reportes de insumos
// GET reporte de insumos diarios
router.get('/insumos-diarios', reportesController.obtenerReporteInsumosDiarios);

// GET reporte de insumos por rango de fechas
router.get('/insumos-rango', reportesController.obtenerReporteInsumosRango);

// GET resumen de consultas del día
router.get('/resumen-consultas', reportesController.obtenerResumenConsultasDia);

// GET reporte PDF diario
router.get('/pdf-diario', reportesController.generarReportePDF);

module.exports = router;