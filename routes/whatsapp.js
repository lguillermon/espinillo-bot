// routes/whatsapp.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { MessagingResponse } = require('twilio').twiml;
const moment = require('moment');
const parseDates = require('../utils/dateParser');

router.post('/webhook', async (req, res) => {
  const twiml = new MessagingResponse();
  const mensaje = req.body.Body || '';
  const numero = req.body.From;

  console.log('📩 Mensaje recibido:', mensaje);

  // Intentar extraer fechas del mensaje
  const { fechaDesde, fechaHasta } = parseDates(mensaje);

  if (!fechaDesde || !fechaHasta) {
    twiml.message('📅 Para ayudarte, decime las fechas así: "del 18 al 22 de julio". ¡Y te digo qué tenemos!');
    return res.type('text/xml').send(twiml.toString());
  }

  

try {
  // Formateo final para API externa
  const body = {
    fechaDesde: moment(fechaDesde).format('YYYY-MM-DD'),
    fechaHasta: moment(fechaHasta).format('YYYY-MM-DD'),
    nro_ota: '3',
    personas: '2',
    latitude: '',
    longitude: '',
    ip: ''
  };

  console.log('🔗 Consultando la disponibilidad real:', body);
  console.log("🌍 URL usada para API:", process.env.CREADORES_API_URL);

  const response = await axios.post(
    process.env.CREADORES_API_URL,
    body
  );

  console.log("✅ Respuesta completa de la API:", JSON.stringify(response.data, null, 2));

  const data = response.data;

  if (Array.isArray(data) && data.length > 0) {
    const opciones = data.map((item, i) => 
      `👉 ${item.descripcion}: $${item.precio} (${item.stock} disponibles)`
    ).join('\n');

    twiml.message(`📅 ¡Genial! Tengo opciones disponibles del ${moment(fechaDesde).format('DD/MM/YYYY')} al ${moment(fechaHasta).format('DD/MM/YYYY')}:\n\n${opciones}\n\n¿Querés el link para reservar?`);
  } else {
    twiml.message(`😕 Por ahora no hay disponibilidad entre el ${moment(fechaDesde).format('DD/MM/YYYY')} y el ${moment(fechaHasta).format('DD/MM/YYYY')}. ¿Querés que busquemos otras fechas?`);
  }
} catch (error) {
  console.error('❌ Error consultando disponibilidad:', error.message);
  if (error.response) {
   console.error("📩 Respuesta de error API:", error.response.data);
  }
  twiml.message('⚠️ Tuvimos un error al buscar disponibilidad. ¿Probamos de nuevo en unos minutos?');
}

  res.type('text/xml').send(twiml.toString());
});

module.exports = router;
