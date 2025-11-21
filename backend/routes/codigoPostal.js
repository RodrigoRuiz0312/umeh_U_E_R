const express = require('express');
const https = require('https');
const router = express.Router();
const codigosPostalesLocal = require('../utils/codigosPostalesLocal');

// Configuración: usar base de datos local primero, luego intentar API
const USAR_API_EXTERNA = false; // Cambiar a true para usar API como respaldo

/**
 * GET /api/codigo-postal/:cp
 * Consulta códigos postales de México
 * Primero busca en base de datos local, si no encuentra intenta API externa
 */
router.get('/:cp', (req, res) => {
  const cp = req.params.cp;

  // Validar que el código postal tenga 5 dígitos
  if (!cp || !/^\d{5}$/.test(cp)) {
    return res.status(400).json({
      error: 'El código postal debe tener exactamente 5 dígitos'
    });
  }

  // Intentar buscar en base de datos local primero
  try {
    const resultado = codigosPostalesLocal.buscarCodigoPostal(cp);
    
    // Si se encontró en la base de datos local
    if (!resultado.error) {
      console.log(`✓ Código postal ${cp} encontrado en base de datos local`);
      return res.json(resultado);
    }

    // Si no se encontró y está configurado para no usar API externa
    if (!USAR_API_EXTERNA) {
      return res.status(404).json({
        error: 'Código postal no encontrado',
        message: `El código postal ${cp} no está en la base de datos local`,
        sugerencia: 'Este es un sistema con datos locales limitados. Puedes agregar más códigos postales al archivo data/codigosPostales.json'
      });
    }

    // Si no se encontró, intentar con API externa (fallback)
    console.log(`⚠ Código postal ${cp} no encontrado localmente, intentando API externa...`);
    consultarAPIExterna(cp, res);

  } catch (error) {
    console.error('Error al buscar en base de datos local:', error);
    
    // Si hay error local y está habilitada la API externa, intentar con ella
    if (USAR_API_EXTERNA) {
      consultarAPIExterna(cp, res);
    } else {
      res.status(500).json({
        error: 'Error al consultar el código postal',
        details: error.message
      });
    }
  }
});

/**
 * Función auxiliar para consultar la API externa de SEPOMEX
 */
function consultarAPIExterna(cp, res) {
  const url = `https://sepomex.icalialabs.com/api/v1/zip_codes?zip_code=${cp}`;

  const request = https.get(url, { timeout: 10000 }, (apiRes) => {
    let data = '';

    apiRes.on('data', (chunk) => {
      data += chunk;
    });

    apiRes.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log(`✓ Código postal ${cp} encontrado en API externa`);
        res.json(jsonData);
      } catch (error) {
        console.error('Error al parsear respuesta de SEPOMEX:', error);
        res.status(500).json({
          error: 'Error al procesar la respuesta de SEPOMEX'
        });
      }
    });

  }).on('error', (error) => {
    console.error('Error al consultar SEPOMEX:', error);
    res.status(500).json({
      error: 'Error al consultar el código postal en API externa',
      details: error.message,
      sugerencia: 'La API externa no está disponible. Considera agregar este código postal a la base de datos local.'
    });
  });

  request.on('timeout', () => {
    request.destroy();
    res.status(504).json({
      error: 'Timeout al consultar API externa',
      details: 'La conexión con SEPOMEX tardó demasiado',
      sugerencia: 'Verifica tu conexión o usa la base de datos local'
    });
  });
}

module.exports = router;
