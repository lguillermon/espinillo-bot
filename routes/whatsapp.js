const express = require('express');
const router = express.Router();
const axios = require('axios');
const twilio = require('twilio');

// Inicializar cliente Twilio
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Función auxiliar: restar 1 día a la fecha de salida
function ajustarFechaHasta(fechaHasta) {
  const fecha = new Date(
    fechaHasta.slice(0, 4),      // Año
    parseInt(fechaHasta.slice(4, 6)) - 1, // Mes (0-based)
    fechaHasta.slice(6, 8)       // Día
  );
  fecha.setDate(fecha.getDate() - 1);

  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');

  return `${yyyy}${mm}${dd}`;
}

// 📌 Webhook de WhatsApp
router.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body;
  const from = req.body.From;

  console.log("📩 Mensaje recibido:", incomingMsg);

  // Mensaje inicial al usuario
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: from,
    body: "👌 Estoy verificando disponibilidad en El Espinillo... dame unos segundos."
  });

  try {
    // 🔹 Para ahora usamos fechas fijas de prueba (después reemplazamos con parser de fechas del mensaje)
    const fechaDesde = "20251007";
    const fechaSalida = "20251010"; // Usuario pide hasta el 10
    const fechaHasta = ajustarFechaHasta(fechaSalida); // API espera hasta 9
    console.log("➡️ Consulta API:", { fechaDesde, fechaHasta });

    // Consulta al endpoint de disponibilidad
    const response = await axios.post(
      process.env.CREADORES_API_URL,
      {
        fechaDesde,
        fechaHasta,
        nro_ota: "3",
        personas: 2,
        latitude: "",
        longitude: "",
        ip: ""
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const data = response.data;
    console.log("✅ Respuesta API:", JSON.stringify(data, null, 2));

    if (data.resultado === "Aceptar" && data.datos.length > 0) {
      let mensaje = "🏡 Disponibilidad encontrada en El Espinillo:\n\n";

      data.datos.forEach(hab => {
        mensaje += `🔹 ${hab.nombre} - Stock: ${hab.stock}\n`;
        if (hab.tarifas && hab.tarifas.length > 0) {
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
        body: "😔 No encontré disponibilidad para esas fechas en El Espinillo."
      });
    }

  } catch (err) {
    console.error("❌ Error en webhook:", err.message);
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: from,
      body: "⚠️ Hubo un error al consultar disponibilidad, por favor intentá de nuevo."
    });
  }

  // Twilio espera siempre un 200 OK
  res.sendStatus(200);
});

module.exports = router;
