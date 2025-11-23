const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(cors(/*{
  origin: ['http://localhost:4200', 'http://192.168.37.222:4200', 'http://192.168.37.222:4000'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}*/));

// Rutas INSUMOS MEDICOS
const medicamentosRouter = require('./routes/medicamentos');
const triageRouter = require('./routes/mat_triage');
const procedimientosRouter = require('./routes/procedimientos');
const reportesRouter = require('./routes/reportes');
const dashboardRouter = require('./routes/dashboard');
const configuracionRouter = require('./routes/configuracion');

// Rutas PACIENTES
const pacientesRouter = require('./routes/pacientes');
const doctoresRouter = require('./routes/doctores');
const citasRouter = require('./routes/citas');
const consultaRouter = require('./routes/consultaRoutes');
const mat_generalRouter = require('./routes/mat_general');
const codigoPostalRouter = require('./routes/codigoPostal');


// Rutas API INSUMOS
app.use('/api/medicamentos', medicamentosRouter);
app.use('/api/triage', triageRouter);
app.use('/api/procedimientos', procedimientosRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/configuracion', configuracionRouter);
app.use('/api/pacientes', pacientesRouter);
app.use('/api/mat_general', mat_generalRouter);

// Rutas API PACIENTES
app.use('/api/pacientes', pacientesRouter);
app.use('/api/doctores', doctoresRouter);
app.use('/api/citas', citasRouter);
//app.use('/api', testConexionRouter);
app.use('/api/consultas', consultaRouter);
app.use('/api/codigo-postal', codigoPostalRouter);

const consultaExtrasRoutes = require('./routes/consultaExtrasRoutes');
app.use('/api/consultas/extras', consultaExtrasRoutes);

const notaRoutes = require('./routes/nota');
app.use('/api/notas', notaRoutes);

// Servir Angular (build de producción) - ajusta 'umeh' si tu carpeta difiere DESCOMENTAR CUANDO GENEREMOS LA CARPETA DIST (PRODUCCIÓN)
/* const angularDistPath = path.join(__dirname, 'dist', 'umeh', 'browser');
app.use(express.static(angularDistPath)); */

// app.get(/.*/, (req, res) => {
//   res.sendFile(path.join(angularDistPath, 'index.html'));
// });

app.get('/', (req, res) => {
  res.send('Servidor Backend corriendo correctamente. Usa el puerto 4200 para el Frontend.');
});


const PORT = process.env.PORT || 4000;
// Escucha en 0.0.0.0 para aceptar conexiones desde la LAN
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});