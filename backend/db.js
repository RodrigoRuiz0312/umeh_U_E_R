const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'umeh',
    password: '21690098rrm',
    port: 5432
});

/*
const poolInsumo = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '21690098rrm',
    port: 5432
});

const poolPaciente = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'emilio_bdd',
    password: '21690098rrm',
    port: 5432
});*/



module.exports = { pool };