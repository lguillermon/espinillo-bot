const express = require('express');
const router = express.Router();
const axios = require('axios');
const twilio = require('twilio');

// Cliente Twilio (con variables de entorno de Railway)
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

router.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body;
  const from = req.body.From;

  console.log("📩 Mensaje recibido:", incomingMsg, "de", from);

  // 1. Respuesta inmediata
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,   // ej: whatsapp:+14155238886
    to: from,
    body: "👌 Estoy verificando disponibilidad en El Espinillo... dame unos segundos."
  });

  try {
    // 2. Consulta a Creadores del Soft
    const response = await axios.post(
      process.env.CREADORES_API_URL,
      {
        fechaDesde: "20251007", // ⚠️ Hardcodeado en esta versión base
        fechaHasta: "20251009",
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
      let mensaje = "📊 Disponibilidad encontrada:\n\n";
      data.datos.forEach(hab => {
        mensaje += `🔹 ${hab.nombre} - Stock: ${hab.stock}\n`;
        if (hab.tarifas?.length > 0) {
          const tarifa = hab.tarifas[0];
          mensaje += `💲 Tarifa: ${tarifa.total} (${tarifa.cantidad_dias} noches)\n\n`;
        }
      });

      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: from,
        body: mensaje
      });
    } else {
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: from,
        body: "😔 No encontré disponibilidad para esas fechas."
      });
    }
  } catch (err) {
    console.error("❌ Error consultando disponibilidad:", err);
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: from,
      body: "⚠️ Hubo un error al consultar disponibilidad, por favor intentá de nuevo."
    });
  }

  res.sendStatus(200); // 👌 Cierre correcto para Twilio
});

module.exports = router;
