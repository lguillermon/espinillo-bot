const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Tu endpoint de prueba
app.get('/', (req, res) => {
  res.send('Espinillo bot está funcionando 🚀');
});

// Aquí iría tu lógica de disponibilidad, por ejemplo:
const { consultarDisponibilidad } = require('./consultarDisponibilidad');

app.post('/disponibilidad', async (req, res) => {
  const userMsg = req.body.mensaje || '';
  const resultado = await consultarDisponibilidad(userMsg);
  res.send(resultado);
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
