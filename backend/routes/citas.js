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
      SELECT id_medico, nombre, apellidos, especialidad
      FROM medico
      WHERE nombre_agenda = $1`;

    const doctoresResult = await pool.query(doctoresQuery, [nombre_agenda]);
    const doctoresFiltrados = doctoresResult.rows;

    const citasResult = await pool.query(
      "SELECT * FROM citas WHERE fecha = $1",
      [fecha]
    );
    const citasDelDia = citasResult.rows;

    const agenda = doctoresFiltrados.map((doctor) => {
      const susCitas = citasDelDia.filter(
        (cita) => cita.id_medico === doctor.id_medico
      );
      return {
        ...doctor,
        citas: susCitas,
      };
    });

    res.json(agenda);
  } catch (err) {
    console.error("Error al obtener la agenda:", err);
    res.status(500).json({ error: "Error interno al obtener la agenda" });
  }
});

// Crear una nueva cita
router.post("/citas", async (req, res) => {
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