const express = require("express");
const router = express.Router();
const { parseDates } = require("../utils/dateParser"); // 👈 import correcto
const axios = require("axios");

// Ruta para recibir mensajes de WhatsApp
router.post("/", async (req, res) => {
  try {
    const mensaje = req.body.Body;
    console.log("📩 Mensaje recibido:", mensaje);

    // Usamos el parser de fechas
    const { fechaDesde, fechaHasta } = parseDates(mensaje);

    console.log("📅 Fechas interpretadas:", fechaDesde, fechaHasta);

    // ⚡ Acá podés meter la llamada a la API de disponibilidad
    // Ejemplo básico de respuesta:
    if (!fechaDesde || !fechaHasta) {
      return res.send(
        "📅 Para ayudarte, decime las fechas así: 'del 18 al 22 de julio'. ¡Y te digo qué tenemos!"
      );
    }

    res.send(
      `Estoy buscando disponibilidad entre el ${fechaDesde} y el ${fechaHasta}...`
    );
  } catch (error) {
    console.error("❌ Error en whatsapp.js:", error);
    res.status(500).send("Ocurrió un error procesando tu mensaje.");
  }
});

module.exports = router;
