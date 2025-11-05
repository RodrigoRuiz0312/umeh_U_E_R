const { Pool, types } = require('pg');

// Configurar parsers globales ANTES de crear el pool
types.setTypeParser(1700, function(val) {
  return val === null ? null : parseFloat(val);
});

types.setTypeParser(20, function(val) {
  return val === null ? null : parseInt(val, 10);
});

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'umeh',
    password: 'umeh2025',
    port: 5432
});

module.exports = { pool };