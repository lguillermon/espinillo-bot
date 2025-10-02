const express = require("express");
const router = express.Router();
const axios = require("axios");
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const { parseFechasDesdeTexto, parseCantidadPersonas } = require("../utils/dateParser");

// Webhook de WhatsApp
router.post("/webhook", async (req, res) => {
  const incomingMsg = req.body.Body || "";
  const from = req.body.From;

  console.log("📩 Mensaje recibido:", incomingMsg);

  // 1. Parseamos fechas y personas
  const fechas = parseFechasDesdeTexto(incomingMsg);
  const cantidadPersonas = parseCantidadPersonas(incomingMsg) || 2;

  if (!fechas) {
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: from,
      body: "📅 Para ayudarte necesito que me indiques las fechas. Ejemplo: 'del 7 al 10 de octubre para 2 personas'."
    });
    return res.sendStatus(200);
  }

  const { fechaDesde, fechaHasta, fechaTextoDesde, fechaTextoHasta } = fechas;

  // 2. Aviso de espera
  await client.messages.create({
    from: "whatsapp:+14155238886",
    to: from,
    body: `👌 Estoy verificando disponibilidad en El Espinillo del ${fechaTextoDesde} (check-in) al ${fechaTextoHasta} (check-out) para ${cantidadPersonas} persona(s)...`
  });

  try {
    // 3. Consulta al endpoint
    const response = await axios.post(
      "https://www.creadoresdesoft.com.ar/cha-man/v4/INFODisponibilidadPropietarios.php?slug=...",
      {
        fechaDesde,
        fechaHasta, // ojo: ya viene con -1 día en el parser
        nro_ota: "3",
        personas: cantidadPersonas,
        latitude: "",
        longitude: "",
        ip: ""
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const data = response.data;
    console.log("📡 Respuesta API:", JSON.stringify(data, null, 2));

    // 4. Procesamos respuesta
    if (data.resultado === "Aceptar" && data.datos.length > 0) {
      let mensaje = `🏡 Disponibilidad en El Espinillo del ${fechaTextoDesde} (check-in) al ${fechaTextoHasta} (check-out):\n\n`;

      data.datos.forEach((hab) => {
        mensaje += `🔹 ${hab.nombre} - Stock: ${hab.stock_disponible}\n`;
        if (hab.tarifas && hab.tarifas.length > 0) {
          const tarifa = hab.tarifas[0];
          mensaje += `💲 Tarifa: $${tarifa.total} (${tarifa.cantidad_dias} noches)\n\n`;
        }
      });

      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: from,
        body: mensaje
      });
    } else {
      await client.messages.create({
        from: "whatsapp:+14155238886",
        to: from,
        body: `😔 No encontré disponibilidad del ${fechaTextoDesde} al ${fechaTextoHasta}. ¿Querés que te sugiera otras fechas o que busque en el resto del complejo Termal?`
      });
    }
  } catch (err) {
    console.error("❌ Error al consultar API:", err.message);
    await client.messages.create({
      from: "whatsapp:+14155238886",
      to: from,
      body: "⚠️ Hubo un error al consultar disponibilidad, por favor intentá de nuevo."
    });
  }

  res.sendStatus(200);
});

module.exports = router;
