const express = require("express");
const router = express.Router();
const axios = require("axios");
const { MessagingResponse } = require("twilio").twiml;
const { parseDates } = require("../utils/dateParser");
const moment = require("moment");

// Endpoint de recepción de mensajes WhatsApp
router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const mensaje = req.body.Body || "";
    console.log("📩 Mensaje recibido:", mensaje);

    // 1. Intentamos parsear las fechas
    let { fechaDesde, fechaHasta } = parseDates(mensaje);

    if (!fechaDesde || !fechaHasta) {
      twiml.message(
        "📅 Para ayudarte, decime las fechas así: 'del 18 al 22 de julio'. ¡Y te digo qué tenemos!"
      );
      res.type("text/xml").send(twiml.toString());
      return;
    }

    // ✅ Ajuste: fechaHasta debe ser día de salida (checkout),
    // entonces restamos 1 día al pedido del usuario
    const fechaHastaAjustada = moment(fechaHasta, "YYYY-MM-DD")
      .subtract(1, "days")
      .format("YYYYMMDD");

    const fechaDesdeAPI = moment(fechaDesde, "YYYY-MM-DD").format("YYYYMMDD");

    console.log(
      "📆 Fechas detectadas (usuario):",
      fechaDesde,
      "→",
      fechaHasta
    );
    console.log(
      "📆 Fechas ajustadas (API):",
      fechaDesdeAPI,
      "→",
      fechaHastaAjustada
    );

    // 2. Payload para la API (versión v4)
    const payload = {
      fechaDesde: fechaDesdeAPI,
      fechaHasta: fechaHastaAjustada,
      nro_ota: "3",
      personas: 2, // Por ahora fijo
      latitude: "",
      longitude: "",
      ip: ""
    };

    const urlAPI =
      "https://www.creadoresdesoft.com.ar/cha-man/v4/INFODisponibilidadPropietarios.php?slug=0JyNzIGZf6WYt2SYoNmIgojIkJ3XlJnYt0mbiACIgACIgACIgACIgoALio8woNWehV4RgwWZkBych2mclRlIgojIhRnblV4Yf23buJCIgACIgACIgACIgAiCsICMyAjMsVmbuFGaDJCI7ISZ3FGbjJCIgACIgACIgACIgAiCsISbvNmLslWYtdGQ4IzbsxWYiJXYj6WZyF3aiAiOiwWah2WZiACIgACIgACIgACIgowe";

    const response = await axios.post(urlAPI, payload);
    const data = response.data;

    console.log("📡 Respuesta API Espinillo:", JSON.stringify(data, null, 2));

    // 3. Procesar respuesta
    if (!data || data.resultado !== "Aceptar" || !data.datos.length) {
      twiml.message(
        `😔 Por ahora no hay disponibilidad entre el ${fechaDesde} y el ${fechaHasta}. ¿Querés que busquemos otras fechas?`
      );
    } else {
      // armamos un resumen de disponibilidad
      const tarifas = data.datos
        .map(
          (t) =>
            `🏠 ${t.nombre} (${t.mayores} adultos): Stock ${t.stock}`
        )
        .join("\n\n");

      twiml.message(
        `🎉 Tenemos disponibilidad del ${fechaDesde} al ${fechaHasta}:\n\n${tarifas}`
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
