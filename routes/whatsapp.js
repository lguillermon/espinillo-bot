const express = require('express');
const router = express.Router();
const axios = require('axios');
const twilio = require('twilio');

// Cliente Twilio
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// --- Estado en memoria (simple, por usuario) ---
let sesiones = {}; 

router.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body?.trim();
  const from = req.body.From;

  console.log("📩 Mensaje recibido:", incomingMsg, "de", from);

  // Si no existe la sesión, la creo
  if (!sesiones[from]) {
    sesiones[from] = { fechaDesde: null, fechaHasta: null, personas: null, ultimaDisponibilidad: [] };
  }
  const sesion = sesiones[from];

  // --- 1. Detectar intención de cierre ---
  const cierreRegex = /(confirmo|quiero reservar|me quedo con|cómo hago la reserva|quiero ir|reservo)/i;
  if (cierreRegex.test(incomingMsg)) {
    if (sesion.ultimaDisponibilidad.length > 0) {
      const elegido = sesion.ultimaDisponibilidad[0]; // 👉 Podrías después preguntar cuál de todos
      const resumen = 
        `🙌 ¡Perfecto! Te reservo:\n\n` +
        `🏡 ${elegido.nombre}\n` +
        `📅 ${sesion.fechaDesde} al ${sesion.fechaHasta}\n` +
        `👥 Personas: ${sesion.personas}\n` +
        `💲 Tarifa: ${elegido.tarifas[0]?.total}\n\n` +
        `👉 Confirmá tu reserva en este link:\n` +
        `https://www.creadoresdesoft.com.ar/reserva?desde=${sesion.fechaDesde}&hasta=${sesion.fechaHasta}&personas=${sesion.personas}&tipo=${encodeURIComponent(elegido.nombre)}`;

      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: from,
        body: resumen
      });

      return res.sendStatus(200);
    } else {
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: from,
        body: "⚠️ Aún no tengo una disponibilidad confirmada para reservar. ¿Querés que revise fechas primero?"
      });
      return res.sendStatus(200);
    }
  }

  // --- 2. Respuesta inmediata mientras procesa ---
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: from,
    body: "👌 Recibí tu mensaje. Estoy revisando disponibilidad..."
  });

  try {
    // Consulta a Creadores del Soft
    const response = await axios.post(
      process.env.CREADORES_API_URL,
      {
        fechaDesde: sesion.fechaDesde || "20251007", // fallback
        fechaHasta: sesion.fechaHasta || "20251009",
        nro_ota: "3",
        personas: sesion.personas || 2,
        latitude: "",
        longitude: "",
        ip: ""
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const data = response.data;

    if (data.resultado === "Aceptar" && data.datos.length > 0) {
      sesion.ultimaDisponibilidad = data.datos; // ✅ Guardamos para cierre posterior

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

  res.sendStatus(200);
});

module.exports = router;
