/**
 * Script de prueba para verificar la funcionalidad de códigos postales locales
 */

const codigosPostalesLocal = require('../utils/codigosPostalesLocal');

console.log('=== PRUEBA DE CÓDIGOS POSTALES LOCALES ===\n');

// Prueba 1: Códigos postales existentes
console.log('📋 Prueba 1: Búsqueda de códigos postales existentes');
const codigosExistentes = ['01000', '01010', '20000', '64000', '44100'];

codigosExistentes.forEach(cp => {
  try {
    const resultado = codigosPostalesLocal.buscarCodigoPostal(cp);
    if (!resultado.error) {
      const info = resultado.zip_codes[0];
      console.log(`✓ CP ${cp}: ${info.locality}, ${info.federal_entity.name}`);
      console.log(`  Colonias: ${info.settlements.map(s => s.name).join(', ')}`);
    }
  } catch (error) {
    console.log(`✗ Error al buscar CP ${cp}: ${error.message}`);
  }
});

// Prueba 2: Código postal no existente
console.log('\n📋 Prueba 2: Búsqueda de código postal no existente');
try {
  const resultado = codigosPostalesLocal.buscarCodigoPostal('99999');
  if (resultado.error) {
    console.log(`✓ Correctamente retorna error: ${resultado.message}`);
  }
} catch (error) {
  console.log(`✗ Error inesperado: ${error.message}`);
}

// Prueba 3: Listar todos los códigos disponibles
console.log('\n📋 Prueba 3: Códigos postales disponibles');
const todosLosCodigos = codigosPostalesLocal.obtenerTodosLosCodigos();
console.log(`✓ Total de códigos postales en base de datos: ${todosLosCodigos.length}`);
console.log(`  Códigos: ${todosLosCodigos.join(', ')}`);

// Prueba 4: Agregar un nuevo código postal
console.log('\n📋 Prueba 4: Agregar nuevo código postal');
const nuevoCodigo = {
  zip_code: "50000",
  locality: "Toluca de Lerdo",
  federal_entity: {
    key: 15,
    name: "Estado de México",
    code: null
  },
  settlements: [
    {
      key: 1,
      name: "Centro",
      zone_type: "Urbano",
      settlement_type: {
        name: "Colonia"
      }
    }
  ],
  municipality: {
    key: 106,
    name: "Toluca"
  }
};

try {
  codigosPostalesLocal.agregarCodigoPostal('50000', nuevoCodigo);
  console.log('✓ Código postal 50000 agregado correctamente');
  
  // Verificar que se agregó
  const verificar = codigosPostalesLocal.buscarCodigoPostal('50000');
  if (!verificar.error) {
    console.log('✓ Verificación exitosa: el código postal se puede consultar');
  }
} catch (error) {
  console.log(`✗ Error al agregar código postal: ${error.message}`);
}

console.log('\n=== PRUEBAS COMPLETADAS ===');
