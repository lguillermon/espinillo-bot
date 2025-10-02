const express = require('express');
const router = express.Router();
const axios = require('axios');
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Webhook de WhatsApp
router.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body;
  const from = req.body.From;

  // 1. Mensaje inicial de "espera"
  await client.messages.create({
    from: 'whatsapp:+14155238886', // Tu Twilio Sandbox
    to: from,
    body: "👌 Estoy verificando disponibilidad en El Espinillo... dame unos segundos."
  });

  try {
    // 2. Consulta al endpoint
    const response = await axios.post(
      'https://www.creadoresdesoft.com.ar/cha-man/v4/INFODisponibilidadPropietarios.php?slug=...',
      {
        fechaDesde: "20251007",
        fechaHasta: "20251009", // 🔹 recordar: fechaHasta = fechaSalida - 1 día
        nro_ota: "3",
        personas: 2,
        latitude: "",
        longitude: "",
        ip: ""
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const data = response.data;

    if (data.resultado === "Aceptar" && data.datos.length > 0) {
      let mensaje = "🏡 Disponibilidad encontrada:\n\n";

      data.datos.forEach(hab => {
        mensaje += `🔹 ${hab.nombre} - Stock: ${hab.stock}\n`;
        if (hab.tarifas && hab.tarifas.length > 0) {
          const tarifa = hab.tarifas[0]; // ejemplo: tomo la primera
          mensaje += `💲 Tarifa: ${tarifa.total} (${tarifa.cantidad_dias} noches)\n\n`;
        }
      });

      // 3. Enviar disponibilidad al cliente
      await client.messages.create({
        from: 'whatsapp:+14155238886',
        to: from,
        body: mensaje
      });
    } else {
      await client.messages.create({
        from: 'whatsapp:+14155238886',
        to: from,
        body: "😔 No encontré disponibilidad para esas fechas."
      });
    }
  } catch (err) {
    console.error(err);
    await client.messages.create({
      from: 'whatsapp:+14155238886',
      to: from,
      body: "⚠️ Hubo un error al consultar disponibilidad, por favor intentá de nuevo."
    });
  }

  // Twilio siempre espera un 200 OK
  res.sendStatus(200);
});

module.exports = router;
