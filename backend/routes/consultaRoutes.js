// routes/consultaRoutes.js
const express = require('express');
const router = express.Router();
const consultaController = require('../controllers/consultaController');
const { generarHojaPDF } = require('../utils/generarHojaPDF');

// Búsqueda de pacientes
router.get('/pacientes/buscar', consultaController.buscarPaciente);

// Obtener lista de médicos
router.get('/medicos', consultaController.obtenerMedicos);

// Crear nueva consulta
router.post('/crearConsulta', consultaController.crearConsulta);

// Obtener datos para hoja de consulta
router.get('/:id_consulta/hoja-pdf', async (req, res) => {
    try {
        const { id_consulta } = req.params;
        const result = await consultaController.obtenerHojaConsultaInterna(id_consulta);
        if (!result) {
            return res.status(404).json({ error: 'Consulta no encontrada' });
        }
        generarHojaPDF(result, res);
    } catch (error) {
        console.error('Error generando PDF:', error);
        res.status(500).json({ error: 'Error generando hoja PDF' });
    }
});

// Actualizar estatus de consulta
router.patch('/actConsulta/:id_consulta/estatus', consultaController.actualizarEstatus);

// Obtener insumos de una consulta
router.get('/consultas/:id_consulta/insumos', consultaController.obtenerInsumosConsulta);

// Agregar insumo a consulta
router.post('/consultas/:id_consulta/insumos', consultaController.agregarInsumo);

// Eliminar insumo de consulta
router.delete('/consulta-insumos/:id_insumo_consulta', consultaController.eliminarInsumo);

// Finalizar consulta y generar nota de remisión
router.post('/finalizarConsulta/:id_consulta/finalizar', consultaController.finalizarConsulta);

// Búsqueda de insumos disponibles
router.get('/medicamentos/buscar', consultaController.buscarMedicamentos);
router.get('/materiales/buscar', consultaController.buscarMateriales);
router.get('/procedimientos/buscar', consultaController.buscarProcedimientos);

module.exports = router;