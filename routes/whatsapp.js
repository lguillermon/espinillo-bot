const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment');
const twilio = require('twilio');

// Cliente Twilio usando variables de entorno
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const CREADORES_API_URL = process.env.CREADORES_API_URL;

// Regex simple para detectar fechas y cantidad de personas
function parseMessage(text) {
  const fechas = text.match(/\d{1,2}\s+de\s+\w+/g); // ej: "7 de octubre"
  const personas = text.match(/(\d+)\s*(personas|personas|pax)?/i);

  return {
    fechas: fechas || [],
    cantidad: personas ? parseInt(personas[1]) : 2
  };
}

// Ruta webhook Twilio
router.post('/', async (req, res) => {
  const incomingMsg = req.body.Body;
  const from = req.body.From;

  console.log("📩 Mensaje recibido:", incomingMsg, "de", from);

  // Enviar mensaje de espera
  await client.messages.create({
    from: FROM_NUMBER,
    to: from,
    body: "👌 Estoy verificando disponibilidad en El Espinillo... dame unos segundos."
  });

  try {
    const { fechas, cantidad } = parseMessage(incomingMsg);

    // Fechas: si vienen 2, armo desde-hasta, si no pongo valores por defecto
    let fechaDesde = moment().add(1, 'days').format("YYYYMMDD");
    let fechaHasta = moment().add(2, 'days').format("YYYYMMDD");

    if (fechas.length >= 2) {
      fechaDesde = moment(fechas[0], "D [de] MMMM", 'es').format("YYYYMMDD");
      fechaHasta = moment(fechas[1], "D [de] MMMM", 'es').format("YYYYMMDD");
    }

    // Llamada al endpoint de disponibilidad
    const response = await axios.post(
      CREADORES_API_URL,
      {
        fechaDesde,
        fechaHasta,
        nro_ota: "3",
        personas: cantidad,
        latitude: "",
        longitude: "",
        ip: ""
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const data = response.data;

    let mensaje = "";

    if (data.resultado === "Aceptar" && data.datos.length > 0) {
      mensaje = "📋 *Disponibilidad encontrada:*\n\n";
      data.datos.forEach(hab => {
        mensaje += `🔹 ${hab.nombre} - Stock: ${hab.stock}\n`;
        if (hab.tarifas && hab.tarifas.length > 0) {
          const tarifa = hab.tarifas[0];
          mensaje += `💲 Tarifa: ${tarifa.total} (${tarifa.cantidad_dias} noches)\n\n`;
        }
      });
    } else {
      mensaje = "😔 No encontré disponibilidad para esas fechas.";
    }

    // Respuesta al cliente
    await client.messages.create({
      from: FROM_NUMBER,
      to: from,
      body: mensaje
    });

  } catch (err) {
    console.error("⚠️ Error en disponibilidad:", err.message);

    await client.messages.create({
      from: FROM_NUMBER,
      to: from,
      body: "⚠️ Hubo un error al consultar disponibilidad, por favor intentá de nuevo."
    });
  }

  res.sendStatus(200); // Twilio espera siempre 200
});

module.exports = router;
