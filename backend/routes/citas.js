const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/*-----------Citas---------------*/ 

// Agendación de citas
router.get("/agenda", async (req, res) => {
  try {
    const { fecha, especialidad:nombre_agenda } = req.query;
    if (!fecha || !nombre_agenda) {
      return res.status(400).json({ error: "Se requiere el parámetro de fecha y agenda asignada" });
    }

    const doctoresQuery = `
      SELECT id_medico, nombre AS nombre_medico, apellidos AS apellidos_medico, especialidad
      FROM medico
      WHERE nombre_agenda = $1`;

    const doctoresResult = await pool.query(doctoresQuery, [nombre_agenda]);
    const doctoresFiltrados = doctoresResult.rows;

    const citasQuery = `

    SELECT c.*,
      p.nombre AS nombre_paciente,
      p.apellidos AS apellidos_paciente
    FROM citas c
    LEFT JOIN paciente p ON c.id_paciente = p.id_paciente
    WHERE c.fecha = $1
    `;

    const citasResult = await pool.query(citasQuery,[fecha]
    );
    const citasDelDia = citasResult.rows;

    const agenda = doctoresFiltrados.map((doctor) => {
      const docId = Number(doctor.id_medico);

      const susCitas = citasDelDia.filter(
        (c) => Number(c.id_medico) === docId)
        .map((cita) => {
          return {
        ...cita,
        nombre_paciente: cita.nombre_paciente ?? null,
        apellidos_paciente: cita.apellidos_paciente ?? null,
        nombre_medico: doctor.nombre_medico,
        apellidos_medico: doctor.apellidos_medico
      };
     });
    return{
      id_medico: doctor.id_medico,
      nombre:doctor.nombre_medico,
      apellidos: doctor.apellidos_medico,
      especialidad: doctor.especialidad,
      citas: susCitas
    };
    });

    res.json(agenda);
  } catch (err) {
    console.error("Error al obtener la agenda:", err);
    res.status(500).json({ error: "Error interno al obtener la agenda" });
  }
});

// Crear una nueva cita
router.post("/", async (req, res) => {
  try {
    const { id_paciente, id_medico, fecha, hora, consultorio } = req.body;

    const query = `
      INSERT INTO citas (id_paciente, id_medico, fecha, hora, consultorio)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`;

    const values = [id_paciente, id_medico, fecha, hora, consultorio];

    const result = await pool.query(query, values);

    res.status(201).json({ message: "Cita registrada con éxito", cita: result.rows[0] });
  } catch (err) {
    console.error("Error al registrar la cita:", err);
    res.status(500).json({ error: "Error interno al registrar la cita" });
  }
});

// Encontrar consultorios libres
router.get("/consultorios-disponibles", async (req, res) => {
  try {
    const { fecha, hora } = req.query;
    if (!fecha || !hora) {
      return res.status(400).json({ error: "Se requieren fecha y hora" });
    }

    const todosLosConsultorios = [
      "Consultorio 1",
      "Consultorio 2",
      "Consultorio 3",
      "Consultorio 4",
    ];

    const query = `
      SELECT consultorio FROM citas 
      WHERE fecha = $1 AND hora = $2 AND estado NOT IN ('Finalizada', 'Cancelada')`;

    const result = await pool.query(query, [fecha, hora]);

    const consultoriosOcupados = result.rows.map((row) => row.consultorio);

    const consultoriosLibres = todosLosConsultorios.filter(
      (consultorio) => !consultoriosOcupados.includes(consultorio)
    );

    res.json(consultoriosLibres);
  } catch (err) {
    console.error("Error al buscar consultorios disponibles:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;