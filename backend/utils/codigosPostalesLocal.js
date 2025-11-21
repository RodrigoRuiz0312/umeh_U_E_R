const fs = require('fs');
const path = require('path');

class CodigosPostalesLocal {
  constructor() {
    this.data = new Map(); // Usar Map para búsqueda rápida
    this.cargarDatos();
  }

  cargarDatos() {
    try {
      console.log('Cargando base de datos de códigos postales...');
      const filePath = path.join(__dirname, '../data/sepomex_abril-2016.json');

      if (!fs.existsSync(filePath)) {
        console.error('Error: No se encuentra el archivo de códigos postales en:', filePath);
        return;
      }

      const rawData = fs.readFileSync(filePath, 'utf8');
      // Corregir posibles errores de formato en el JSON (NULL -> null)
      const sanitizedData = rawData.replace(/: NULL/g, ': null');
      const todosLosCodigos = JSON.parse(sanitizedData);

      // Indexar por código postal para búsqueda O(1)
      todosLosCodigos.forEach(registro => {
        const cp = String(registro.cp); // Asegurar que sea string

        if (!this.data.has(cp)) {
          this.data.set(cp, []);
        }

        // Mapear al formato que espera el frontend (similar a la API externa original)
        const registroMapeado = {
          d_codigo: cp,
          d_asenta: registro.asentamiento,
          d_tipo_asenta: registro.tipo,
          d_mnpio: registro.municipio,
          d_estado: registro.estado,
          d_ciudad: registro.ciudad,
          d_CP: cp,
          c_estado: registro.idEstado,
          c_mnpio: registro.idMunicipio
        };

        this.data.get(cp).push(registroMapeado);
      });

      console.log(`✓ Base de datos local cargada: ${this.data.size} códigos postales únicos procesados.`);
    } catch (error) {
      console.error('Error al cargar base de datos local de códigos postales:', error.message);
      // Inicializar vacío en caso de error para evitar crash
      this.data = new Map();
    }
  }

  buscarCodigoPostal(cp) {
    if (!this.data || this.data.size === 0) {
      // Intentar recargar si está vacío (por si falló la primera vez o no se ha inicializado)
      this.cargarDatos();
      if (this.data.size === 0) {
        return {
          error: true,
          message: 'Base de datos de códigos postales no disponible'
        };
      }
    }

    const resultados = this.data.get(String(cp));

    if (!resultados || resultados.length === 0) {
      return {
        error: true,
        message: `El código postal ${cp} no fue encontrado`
      };
    }

    // Retornar en el formato esperado: { zip_codes: [...] }
    return {
      zip_codes: resultados
    };
  }

  obtenerTodosLosCodigos() {
    return Array.from(this.data.keys());
  }
}

// Exportar instancia singleton
module.exports = new CodigosPostalesLocal();
