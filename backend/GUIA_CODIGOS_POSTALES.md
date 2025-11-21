# 📮 Guía Completa: Base de Datos Local de Códigos Postales

## ✅ Estado Actual

Tu sistema ya está configurado para usar **códigos postales locales** sin necesidad de conexión a internet.

### Archivos Creados:
- ✅ `data/codigosPostales.json` - Base de datos (actualmente 5 códigos de muestra)
- ✅ `utils/codigosPostalesLocal.js` - Módulo gestor de datos
- ✅ `routes/codigoPostal.js` - API modificada para usar datos locales
- ✅ `test/testCodigosPostales.js` - Script de pruebas

## 🚀 Cómo Usar

### Opción 1: Seguir con la muestra actual
Ya tienes 5 códigos postales funcionando:
- 01000 - Ciudad de México (San Ángel)
- 01010 - Ciudad de México (Santa Fe)
- 20000 - Aguascalientes
- 44100 - Guadalajara
- 64000 - Monterrey

### Opción 2: Descargar la base de datos COMPLETA (145,908 códigos)

#### Paso 1: Descargar desde GitHub

**Opción A - Descarga directa (más fácil):**
1. Ve a: https://github.com/redrbrt/sepomex-zip-codes
2. Descarga el repositorio como ZIP
3. Extrae el archivo y busca `sepomex.json`

**Opción B - Con Git:**
```bash
cd "c:\Users\Rodrigo Ruiz\Documents\Residencias UMEH 2025_21690098"
git clone https://github.com/redrbrt/sepomex-zip-codes.git temp_sepomex
```

#### Paso 2: Convertir el Formato

El archivo de GitHub tiene un formato diferente. Crea este script:

**Archivo: `backend/scripts/convertirSepomex.js`**
```javascript
const fs = require('fs');
const path = require('path');

console.log('🔄 Convirtiendo base de datos SEPOMEX...');

// Lee el archivo original (ajusta la ruta según donde lo descargaste)
const archivoOriginal = 'C:\\ruta\\al\\archivo\\sepomex.json';
const archivoDestino = path.join(__dirname, '../data/codigosPostales.json');

try {
  const datosOriginales = JSON.parse(fs.readFileSync(archivoOriginal, 'utf8'));
  const codigosConvertidos = {};
  
  // El formato puede variar, ajusta según la estructura real
  datosOriginales.forEach(item => {
    const cp = item.d_codigo || item.codigo;
    
    if (!codigosConvertidos[cp]) {
      codigosConvertidos[cp] = {
        zip_code: cp,
        locality: item.d_ciudad || item.ciudad,
        federal_entity: {
          key: parseInt(item.c_estado || item.id_estado),
          name: item.d_estado || item.estado,
          code: null
        },
        settlements: [],
        municipality: {
          key: parseInt(item.c_mnpio || item.id_municipio),
          name: item.D_mnpio || item.municipio
        }
      };
    }
    
    codigosConvertidos[cp].settlements.push({
      key: parseInt(item.id_asenta_cpcons || item.id),
      name: item.d_asenta || item.asentamiento,
      zone_type: item.d_zona || 'Urbano',
      settlement_type: {
        name: item.d_tipo_asenta || item.tipo_asentamiento
      }
    });
  });
  
  fs.writeFileSync(archivoDestino, JSON.stringify(codigosConvertidos, null, 2));
  
  console.log(`✅ ¡Conversión exitosa!`);
  console.log(`📊 Total de códigos postales: ${Object.keys(codigosConvertidos).length}`);
  console.log(`💾 Archivo guardado en: ${archivoDestino}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
```

#### Paso 3: Ejecutar la conversión
```bash
cd backend
node scripts/convertirSepomex.js
```

### Opción 3: Descargar desde SEPOMEX Oficial

1. **Ir al sitio oficial:**
   https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/CodigoPostal_Exportar.aspx

2. **Descargar el archivo** (formato TXT o Excel)

3. **Instalar dependencia para CSV:**
   ```bash
   npm install csv-parser
   ```

4. **Usar script de conversión** (incluido en `data/README.md`)

## 🧪 Probar el Sistema

### Prueba 1: Script de pruebas
```bash
cd backend
node test/testCodigosPostales.js
```

### Prueba 2: Probar la API
1. Inicia el servidor:
   ```bash
   cd backend
   node server.js
   ```

2. Prueba desde otro terminal o navegador:
   ```bash
   # PowerShell
   Invoke-RestMethod -Uri "http://localhost:3000/api/codigo-postal/01000"
   
   # O en navegador:
   http://localhost:3000/api/codigo-postal/01000
   ```

### Prueba 3: Verificar códigos disponibles

Respuesta esperada para código existente (01000):
```json
{
  "zip_codes": [
    {
      "zip_code": "01000",
      "locality": "Ciudad de México",
      "federal_entity": {
        "key": 9,
        "name": "Ciudad de México"
      },
      "settlements": [
        {
          "name": "San Ángel",
          "zone_type": "Urbano",
          "settlement_type": {
            "name": "Colonia"
          }
        }
      ],
      "municipality": {
        "name": "Álvaro Obregón"
      }
    }
  ]
}
```

Respuesta para código NO existente:
```json
{
  "error": "Código postal no encontrado",
  "message": "El código postal 99999 no está en la base de datos local",
  "sugerencia": "Este es un sistema con datos locales limitados..."
}
```

## ⚙️ Configuración Avanzada

### Habilitar API Externa como Respaldo

Si quieres que intente la API externa cuando no encuentra un código local:

1. Abre: `backend/routes/codigoPostal.js`
2. Cambia la línea 7:
   ```javascript
   const USAR_API_EXTERNA = true; // Cambiar a true
   ```

### Agregar Códigos Manualmente

Edita `backend/data/codigosPostales.json` y agrega:
```json
{
  "NUEVO_CP": {
    "zip_code": "NUEVO_CP",
    "locality": "Ciudad",
    "federal_entity": {
      "key": 1,
      "name": "Estado",
      "code": null
    },
    "settlements": [
      {
        "key": 1,
        "name": "Colonia",
        "zone_type": "Urbano",
        "settlement_type": {
          "name": "Colonia"
        }
      }
    ],
    "municipality": {
      "key": 1,
      "name": "Municipio"
    }
  }
}
```

## 📚 Recursos Adicionales

### Repositorios de Códigos Postales:
1. **redrbrt/sepomex-zip-codes** (145,908 registros)
   - https://github.com/redrbrt/sepomex-zip-codes
   - Incluye: JSON, CSV, SQL, XML
   - Actualizado: Abril 2016

2. **edwardharrismx/mexico-postal-codes**
   - https://github.com/edwardharrismx/mexico-postal-codes
   - Formato: CSV, TSV
   - Fuente: geonames.org

3. **COPOMEX API** (Servicio comercial)
   - https://copomex.com/
   - API actualizada automáticamente
   - Requiere registro

### APIs Alternativas (si prefieres API en lugar de local):
- **COPOMEX**: https://api.copomex.com/
- **SEPOMEX iCaliaLabs**: https://sepomex.icalialabs.com/api/v1/
- **API Postal de México**: Varios servicios de pago

## 🔧 Solución de Problemas

### Error: "Base de datos de códigos postales no disponible"
- Verifica que existe: `backend/data/codigosPostales.json`
- Verifica que el JSON es válido (usa un validador online)

### El servidor no arranca
```bash
cd backend
npm install
node server.js
```

### Agregar más códigos sin parar el servidor
El archivo JSON se carga al iniciar. Después de modificarlo:
1. Guarda los cambios
2. Reinicia el servidor (Ctrl+C y luego `node server.js`)

### Tamaño del archivo muy grande
Si la base de datos completa es muy pesada:
1. Considera usar SQLite en lugar de JSON
2. O carga solo los códigos postales de los estados que necesites

## 📊 Estadísticas

- **Códigos postales en México**: ~145,000
- **Tamaño archivo JSON completo**: ~50-100 MB
- **Tiempo de carga**: < 2 segundos
- **Tiempo de búsqueda**: < 1 ms (en memoria)

## 🎯 Próximos Pasos Recomendados

1. ✅ Descarga la base de datos completa (145,908 códigos)
2. ⚙️ Convierte el formato si es necesario
3. 🧪 Prueba con códigos postales reales de tu zona
4. 🚀 Despliega a producción
5. 📝 Considera implementar cache si usas la API externa como respaldo

## 💡 Tips

- Mantén una copia de respaldo del archivo JSON
- Actualiza la base de datos cada 6-12 meses (SEPOMEX actualiza ocasionalmente)
- Si necesitas búsqueda por colonia/municipio, considera agregar índices
- Para proyectos grandes, migra a una base de datos SQL

---

¿Necesitas ayuda? Consulta `data/README.md` para más detalles técnicos.
