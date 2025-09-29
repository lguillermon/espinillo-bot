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

    // Payload común
    const payload = {
      fechaDesde,
      fechaHasta,
      nro_ota: "3", // OTA Espinillo
      personas: 2,
      latitude: "",
      longitude: "",
      ip: ""
    };

    // 2. Llamada API Espinillo (con slug)
    let response = await axios.post(
      "https://www.creadoresdesoft.com.ar/cha-man/v3/INFODisponibilidadPropietarios.php?slug=0JyNzIGZf6WYt2SYoNmIgojIkJ3XlJnYt0mbiACIgACIgACIgACIgoALio8woNWehV4RgwWZkBych2mclRlIgojIhRnblV4Yf23buJCIgACIgACIgACIgAiCsICMyAjMsVmbuFGaDJCI7ISZ3FGbjJCIgACIgACIgACIgAiCsISbvNmLslWYtdGQ4IzbsxWYiJXYj6WZyF3aiAiOiwWah2WZiACIgACIgACIgACIgowe",
      payload
    );

    let data = response.data;
    console.log("📡 Respuesta API Espinillo:", JSON.stringify(data, null, 2));

    // 3. Si no hay disponibilidad en Espinillo, probamos en General
    if (!data || !data[0] || !data[0].tarifas || data[0].tarifas.length === 0) {
      console.log("⚠️ Sin disponibilidad en Espinillo → probamos en General");

      payload.nro_ota = "1"; // OTA General
      response = await axios.post(
        "https://www.creadoresdesoft.com.ar/cha-man/v3/INFODisponibilidadPropietarios.php",
        payload
      );

      data = response.data;
      console.log("📡 Respuesta API General:", JSON.stringify(data, null, 2));

      if (!data || !data[0] || !data[0].tarifas || data[0].tarifas.length === 0) {
        twiml.message(
          `😔 Por ahora no hay disponibilidad entre el ${fechaDesde} y el ${fechaHasta}. ¿Querés que busquemos otras fechas?`
        );
      } else {
        const tarifas = data[0].tarifas
          .map(t => `${t.nom_tarifa}: $${t.total}`)
          .join("\n");

        twiml.message(
          `ℹ️ No encontramos disponibilidad en El Espinillo, pero sí en Termas del Guaychú general:\n\n${tarifas}`
        );
      }
    } else {
      // Hay disponibilidad en Espinillo
      const tarifas = data[0].tarifas
        .map(t => `${t.nom_tarifa}: $${t.total}`)
        .join("\n");

      twiml.message(
        `🎉 Tenemos disponibilidad en El Espinillo del ${fechaDesde} al ${fechaHasta}:\n\n${tarifas}`
      );
    }
  } catch (error) {
    console.error("❌ Error en whatsapp.js:", error.message);
    twiml.message(
      "⚠️ Ocurrió un error al procesar tu consulta. Probá de nuevo más tarde."
    );
  }

  res.type("text/xml").send(twiml.toString());
});

module.exports = router;
