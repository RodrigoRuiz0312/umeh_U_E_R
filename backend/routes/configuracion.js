const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Obtener configuración actual
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT limite_stock FROM configuracion LIMIT 1');
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar configuración
router.put('/', async (req, res) => {
  const { limiteStock } = req.body;
  try {
    await pool.query('UPDATE configuracion SET limite_stock = $1 WHERE id = 1', [limiteStock]);
    res.json({ message: 'Configuración actualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;