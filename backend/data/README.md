# Base de Datos de Códigos Postales de México

Este directorio contiene la base de datos local de códigos postales de México.

## Archivo Actual

`codigosPostales.json` - Contiene una muestra de códigos postales para pruebas.

## Cómo Descargar la Base de Datos Completa

### Opción 1: Repositorio GitHub (Recomendado)

**Base de datos completa: 145,908 registros**

1. Descarga el archivo JSON desde:
   ```
   https://github.com/redrbrt/sepomex-zip-codes
   ```

2. Busca el archivo `sepomex.json` en el repositorio

3. Reemplaza el contenido de `codigosPostales.json` con el formato correcto

### Opción 2: API de COPOMEX

```bash
# Puedes consultar su API para obtener códigos específicos
curl https://api.copomex.com/query/info_cp/01000?token=TU_TOKEN
```

Sitio: https://copomex.com/

### Opción 3: SEPOMEX Oficial

Descarga directamente desde el servicio postal mexicano:
- URL: https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/CodigoPostal_Exportar.aspx
- Formato: TXT o Excel
- Necesitarás convertirlo a JSON

## Estructura del Archivo JSON

```json
{
  "CODIGO_POSTAL": {
    "zip_code": "01000",
    "locality": "Ciudad de México",
    "federal_entity": {
      "key": 9,
      "name": "Ciudad de México",
      "code": null
    },
    "settlements": [
      {
        "key": 1,
        "name": "Nombre de la Colonia",
        "zone_type": "Urbano",
        "settlement_type": {
          "name": "Colonia"
        }
      }
    ],
    "municipality": {
      "key": 10,
      "name": "Nombre del Municipio"
    }
  }
}
```

## Cómo Convertir Datos de SEPOMEX a JSON

Si descargas el archivo oficial de SEPOMEX en formato TXT/Excel:

1. Abre el archivo en Excel
2. Las columnas principales son:
   - d_codigo (código postal)
   - d_asenta (colonia)
   - d_tipo_asenta (tipo de asentamiento)
   - D_mnpio (municipio)
   - d_estado (estado)
   - d_ciudad (ciudad)
   - d_CP (código postal adicional)
   - c_estado (clave estado)
   - c_oficina (clave oficina)
   - c_CP (clave)
   - c_tipo_asenta (clave tipo asentamiento)
   - c_mnpio (clave municipio)
   - id_asenta_cpcons (id asentamiento)
   - d_zona (zona: Urbano/Rural)
   - c_cve_ciudad (clave ciudad)

3. Usa un script para convertir a JSON (ver `convertir_sepomex.js` a continuación)

## Script de Conversión (opcional)

Crea un archivo `convertir_sepomex.js` para convertir CSV/TXT a JSON:

```javascript
const fs = require('fs');
const csv = require('csv-parser');

const codigosPostales = {};

fs.createReadStream('sepomex.txt')
  .pipe(csv({ separator: '|' }))
  .on('data', (row) => {
    const cp = row.d_codigo;
    
    if (!codigosPostales[cp]) {
      codigosPostales[cp] = {
        zip_code: cp,
        locality: row.d_ciudad || row.D_mnpio,
        federal_entity: {
          key: parseInt(row.c_estado),
          name: row.d_estado,
          code: null
        },
        settlements: [],
        municipality: {
          key: parseInt(row.c_mnpio),
          name: row.D_mnpio
        }
      };
    }
    
    codigosPostales[cp].settlements.push({
      key: parseInt(row.id_asenta_cpcons),
      name: row.d_asenta,
      zone_type: row.d_zona,
      settlement_type: {
        name: row.d_tipo_asenta
      }
    });
  })
  .on('end', () => {
    fs.writeFileSync('codigosPostales.json', JSON.stringify(codigosPostales, null, 2));
    console.log('Conversión completada');
  });
```

## Agregar Códigos Postales Manualmente

Simplemente agrega nuevas entradas al archivo JSON siguiendo la estructura:

```json
{
  "NUEVO_CP": {
    "zip_code": "NUEVO_CP",
    "locality": "Ciudad",
    ...
  }
}
```

## Recursos Adicionales

- **GitHub redrbrt/sepomex-zip-codes**: https://github.com/redrbrt/sepomex-zip-codes
- **GitHub edwardharrismx/mexico-postal-codes**: https://github.com/edwardharrismx/mexico-postal-codes
- **COPOMEX API**: https://copomex.com/
- **SEPOMEX Oficial**: https://www.correosdemexico.gob.mx/
