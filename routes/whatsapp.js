// routes/whatsapp.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Función auxiliar para formatear fecha -> YYYYMMDD
function formatFecha(fechaStr) {
  const meses = {
    enero: 0, febrero: 1, marzo: 2, abril: 3,
    mayo: 4, junio: 5, julio: 6, agosto: 7,
    septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
  };

  const partes = fechaStr.toLowerCase().split(" ");
  const dia = parseInt(partes[0], 10);
  const mes = meses[partes[2]];

  const fecha = new Date(2025, mes, dia);
  return fecha.toISOString().slice(0,10).replace(/-/g,"");
}

// Webhook principal
router.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body;
  const from = req.body.From;

  console.log("📩 Mensaje recibido:", incomingMsg, "de", from);

  // 1. Aviso inicial
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: from,
    body: "👌 Estoy verificando disponibilidad en El Espinillo... dame unos segundos."
  });

  try {
    // 🔎 Parseamos fechas y cantidad
    const match = incomingMsg.match(/(\d+)\s+al\s+(\d+)\s+de\s+([a-zA-Z]+).*?(\d+)\s+personas/i);
    if (!match) {
      throw new Error("No se pudo interpretar la fecha/cantidad del mensaje");
    }

    const diaInicio = match[1];
    const diaFin = match[2];
    const mes = match[3];
    const personas = parseInt(match[4], 10);

    const fechaDesde = formatFecha(`${diaInicio} de ${mes}`);
    const fechaHasta = formatFecha(`${diaFin} de ${mes}`);

    console.log("➡️ Fechas parseadas:", fechaDesde, fechaHasta, "Personas:", personas);

    // 2. Consulta API
    const response = await axios.post(
      process.env.CREADORES_API_URL,
      {
        fechaDesde,
        fechaHasta,
        nro_ota: "3",
        personas,
        latitude: "",
        longitude: "",
        ip: ""
      },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("📦 Respuesta API:", JSON.stringify(response.data, null, 2));  // 👀 Debug

    const data = response.data;

    if (data.resultado === "Aceptar" && data.datos.length > 0) {
      let mensaje = "📋 Disponibilidad encontrada:\n\n";

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
    console.error("❌ Error en webhook:", err.message);
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: from,
      body: "⚠️ Hubo un error al consultar disponibilidad, revisá el formato de tu mensaje."
    });
  }

  res.sendStatus(200);
});

module.exports = router;
