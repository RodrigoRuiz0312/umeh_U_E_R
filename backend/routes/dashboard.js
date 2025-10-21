const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/resumen', async (req, res) => {
    try {
    const [meds, stockBajo, triage] = await Promise.all([
      pool.query('SELECT SUM(cantidad) AS total_meds FROM medicamentos'),
      pool.query('SELECT COUNT(*) AS stock_bajo FROM medicamentos WHERE cantidad < 2'),
      pool.query('SELECT SUM(cantidad) AS total_triage FROM mat_triage')
    ]);

    res.json({
      total_meds: Number(meds.rows[0].total_meds) || 0,
      stock_bajo: Number(stockBajo.rows[0].stock_bajo) || 0,
      total_triage: Number(triage.rows[0].total_triage) || 0
    });

  } catch (err) {
    console.error('❌ Error obteniendo resumen:', err);
    res.status(500).json({ error: 'Error obteniendo resumen de inventario' });
  }
});

module.exports = router;