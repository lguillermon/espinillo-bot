const express = require("express");
const router = express.Router();
const axios = require("axios");
const { MessagingResponse } = require("twilio").twiml;
const { parseDates } = require("../utils/dateParser");

// extrae "2 personas", "para 4 personas", etc.
function parsePersonas(text) {
  const m = (text || '').match(/(\d+)\s*personas?/i);
  return m ? Number(m[1]) : 2;
}

router.post("/", async (req, res) => {
  const twiml = new MessagingResponse();

  try {
    const mensaje = req.body.Body || "";
    console.log("📩 Mensaje recibido:", mensaje);

    const { fechaDesde, fechaHasta } = parseDates(mensaje);

    if (!fechaDesde || !fechaHasta) {
      console.log("❓ Parser no encontró fechas en:", mensaje);
      twiml.message("📅 Para ayudarte, decime las fechas así: 'del 18 al 22 de julio'. ¡Y te digo qué tenemos!");
      return res.type("text/xml").send(twiml.toString());
    }

    const personas = parsePersonas(mensaje);
    console.log("📆 Fechas detectadas:", fechaDesde, "→", fechaHasta, "| 👥 Personas:", personas);

    const payload = {
      fechaDesde,
      fechaHasta,
      nro_ota: "3",
      personas,
      latitude: "",
      longitude: "",
      ip: ""
    };

    console.log("🔗 Payload enviado a API:", payload);

    const url = `https://www.creadoresdesoft.com.ar/cha-man/v3/INFODisponibilidadPropietarios.php?slug=${process.env.ESPINILLO_SLUG || "TU_SLUG_LARGO"}`;

    const response = await axios.post(url, payload);
    const data = response.data;

    console.log("📡 Respuesta API:", JSON.stringify(data, null, 2));

    if (!Array.isArray(data) || !data[0] || !Array.isArray(data[0].tarifas) || data[0].tarifas.length === 0) {
      twiml.message(`😔 Por ahora no hay disponibilidad entre el ${fechaDesde} y el ${fechaHasta}. ¿Querés que busquemos otras fechas?`);
    } else {
      const tarifas = data[0].tarifas
        .map(t => `${t.nom_tarifa}: $${t.total}`)
        .join("\n");

      twiml.message(`🎉 Tenemos disponibilidad del ${fechaDesde} al ${fechaHasta} para ${personas} persona(s):\n\n${tarifas}`);
    }

  } catch (error) {
    console.error("❌ Error en whatsapp.js:", error.response?.data || error.message);
    twiml.message("⚠️ Ocurrió un error al procesar tu consulta. Probá de nuevo más tarde.");
  }

  res.type("text/xml").send(twiml.toString());
});

module.exports = router;
