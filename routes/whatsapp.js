const express = require("express");
const router = express.Router();
const axios = require("axios");
const { MessagingResponse } = require("twilio").twiml;
const { parseDates } = require("../utils/dateParser");

// Endpoint de recepción de mensajes WhatsApp
router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const mensaje = req.body.Body || "";
    console.log("📩 Mensaje recibido:", mensaje);

    // 1. Intentamos parsear las fechas
    const { fechaDesde, fechaHasta } = parseDates(mensaje);

    if (!fechaDesde || !fechaHasta) {
      twiml.message(
        "📅 Para ayudarte, decime las fechas así: 'del 18 al 22 de julio'. ¡Y te digo qué tenemos!"
      );
      res.type("text/xml").send(twiml.toString());
      return;
    }

    console.log("📆 Fechas detectadas:", fechaDesde, "→", fechaHasta);

    // 2. Armamos el payload para la API
    const payload = {
      fechaDesde,
      fechaHasta,
      nro_ota: "3",
      personas: Number(2), // fijo en 2, pero forzado a número
      latitude: "",
      longitude: "",
      ip: ""
    };

    console.log("🔗 Payload enviado a API:", payload);

    // 3. Llamada a la API de disponibilidad
    const response = await axios.post(
      "https://www.creadoresdesoft.com.ar/cha-man/v3/INFODisponibilidadPropietarios.php?slug=0JyNzIGZf6WYt2SYoNmIgojIkJ3XlJnYt0mbiACIgACIgACIgACIgoALio8woNWehV4RgwWZkBych2mclRlIgojIhRnblV4Yf23buJCIgACIgACIgACIgAiCsICMyAjMsVmbuFGaDJCI7ISZ3FGbjJCIgACIgACIgACIgAiCsISbvNmLslWYtdGQ4IzbsxWYiJXYj6WZyF3aiAiOiwWah2WZiACIgACIgACIgACIgowe",
      payload
    );

    const data = response.data;
    console.log("📡 Respuesta API:", JSON.stringify(data, null, 2));

    // 4. Procesar respuesta
    if (!data || !data[0] || !data[0].tarifas || data[0].tarifas.length === 0) {
      twiml.message(
        `😔 Por ahora no hay disponibilidad entre el ${fechaDesde} y el ${fechaHasta}. ¿Querés que busquemos otras fechas?`
      );
    } else {
      // armamos un resumen de disponibilidad
      const tarifas = data[0].tarifas
        .map(t => `${t.nom_tarifa}: $${t.total}`)
        .join("\n");

      twiml.message(
        `🎉 Tenemos disponibilidad del ${fechaDesde} al ${fechaHasta}:\n\n${tarifas}`
      );
    }

  } catch (error) {
    console.error("❌ Error en whatsapp.js:", error.response?.data || error.message);
    twiml.message("⚠️ Ocurrió un error al procesar tu consulta. Probá de nuevo más tarde.");
  }

  res.type("text/xml").send(twiml.toString());
});

module.exports = router;
