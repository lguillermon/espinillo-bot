require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');
const axios = require('axios');
const { MessagingResponse } = require('twilio').twiml;

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Instancia de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Función para consultar disponibilidad en El Espinillo
async function consultarDisponibilidad() {
  const body = {
    fechaDesde: "20250715",
    fechaHasta: "20250720",
    nro_ota: "3",
    personas: 2,
    latitude: "",
    longitude: "",
    ip: ""
  };

  try {
    const resp = await axios.post(
      'https://www.creadoresdesoft.com.ar/cha-man/v4/INFODisponibilidadPropietarios.php?slug=0JyNzIGZf6WYT2SYoNmIgoJklJ3XlJnYt0mbiAClgAClgAClgAClgoALio8woNWehV4RgwWZkBych2mcIRllgojhRnblV4Yf23buJClgACIgACIgACIgACIsCM',
      body,
      { headers: { 'Content-Type': 'application/json' } }
    );

    const datos = resp.data.datos || [];
    if (datos.length === 0) return "No se encontró disponibilidad para las fechas solicitadas.";
    return datos.map(d => `${d.nombre}: $${d.tarifas[0].total}`).join('\n');
  } catch (e) {
    console.error(e);
    return 'Hubo un error al consultar disponibilidad. Intente más tarde.';
  }
}

// Ruta para recibir mensajes de Twilio WhatsApp
app.post('/whatsapp', async (req, res) => {
  const mensajeUsuario = req.body.Body;
  const twiml = new MessagingResponse();

  // Si el usuario menciona "disponibilidad" o "fecha", consultamos la API
  if (/disponibilidad|fecha|reservar|reserva/i.test(mensajeUsuario)) {
    const respuestaDisponibilidad = await consultarDisponibilidad();
    twiml.message(`🔍 Disponibilidad:\n${respuestaDisponibilidad}`);
  } else {
    // Caso general: responde con GPT
    try {
      co
