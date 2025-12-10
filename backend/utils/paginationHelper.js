// utils/paginationHelper.js

/**
 * Función genérica para paginar cualquier tabla
 * * @param {Object} pool - Conexión a la base de datos
 * @param {String} tableName - Nombre de la tabla (ej: 'medicamentos')
 * @param {String} alias - Alias para la tabla (ej: 'm')
 * @param {Array} searchFields - Campos donde se buscará (ej: ['m.nombre', 'm.descripcion'])
 * @param {Array} validSortColumns - Columnas permitidas para ordenar
 * @param {Object} queryParams - El objeto req.query de Express
 * @param {String} extraSelect - (Opcional) Campos extra o JOINS si la consulta es compleja
 */
async function getPaginatedData(pool, tableName, alias, searchFields, validSortColumns, queryParams, extraSelect = null) {
  
  // 1. Obtener parámetros (con valores por defecto)
  const page = parseInt(queryParams.page) || 1;
  const limit = parseInt(queryParams.limit) || 10;
  const offset = (page - 1) * limit;
  const search = queryParams.search || '';
  const sortColumn = queryParams.sortColumn || validSortColumns[0]; // Por defecto la primera válida
  const sortDirection = (queryParams.sortDirection || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  // 2. Validación de seguridad para la columna de ordenamiento
  const orderBy = validSortColumns.includes(sortColumn) ? sortColumn : validSortColumns[0];

  // 3. Construcción del WHERE dinámico
  let whereClause = '';
  let values = [];
  
  if (search.trim()) {
    // Genera algo como: WHERE (m.nombre ILIKE $1 OR m.descripcion ILIKE $1)
    const conditions = searchFields.map(field => `${field} ILIKE $1`).join(' OR ');
    whereClause = `WHERE (${conditions})`;
    values.push(`%${search.trim()}%`);
  }

  // 4. Consulta para obtener el TOTAL de items (para la paginación)
  // Nota: Si hay búsqueda, el COUNT debe respetar el WHERE
  const countQuery = `SELECT COUNT(*) FROM ${tableName} ${alias} ${whereClause}`;
  
  // 5. Consulta para obtener los DATOS
  // Si no se pasa un select personalizado, se hace un SELECT alias.*
  const selectClause = extraSelect ? extraSelect : `SELECT ${alias}.* FROM ${tableName} ${alias}`;
  
  // IMPORTANTE: Manejo de índices de parámetros ($1, $2...)
  // Si hay búsqueda, el $1 es el término de búsqueda. El limit y offset van después.
  let queryParamsSQL = [...values]; // Copia de los valores
  let limitParamIndex = values.length + 1;
  let offsetParamIndex = values.length + 2;

  const dataQuery = `
    ${selectClause}
    ${whereClause}
    ORDER BY ${orderBy} ${sortDirection}
    LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
  `;

  queryParamsSQL.push(limit, offset);

  try {
    // Ejecutar ambas consultas en paralelo para mayor velocidad
    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, values),
      pool.query(dataQuery, queryParamsSQL)
    ]);

    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: dataResult.rows,
      meta: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit
      }
    };

  } catch (error) {
    throw error; // Lanzamos el error para que lo maneje el router
  }
}

module.exports = { getPaginatedData };