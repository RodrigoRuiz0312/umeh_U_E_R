// routes/consultaExtrasRoutes.js
const express = require('express');
const router = express.Router();
const consultaExtrasController = require('../controllers/consultaExtrasController');

// Obtener todos los costos adicionales de una consulta
router.get('/:id_consulta/extras', consultaExtrasController.obtenerExtras);

// Agregar nuevo costo adicional
router.post('/:id_consulta/extras', consultaExtrasController.agregarExtra);

// Eliminar costo adicional
router.delete('/extras/:id_extra', consultaExtrasController.eliminarExtra);

module.exports = router;