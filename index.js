const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const { DateTime } = require('luxon');

const app = express();
app.use(express.urlencoded({ extended: false }));

// Función mejorada para extraer fechas con cruce de mes
function extraerRangoDeFechas(texto) {
  const mesMap = {
    enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4,
    may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7,
    ago: 8, agosto: 8, sep: 9, septiembre: 9,
    oct: 10, octubre: 10, nov: 11, noviembre: 11,
    dic: 12, diciembre: 12
  };

  const regex = /(?:del\s*)?(\d{1,2})(?:\s*\/\s*(\d{1,2}))?(?:\s*de)?\s*(\w+)?\s*(?:al|-)\s*(\d{1,2})(?:\s*\/\s*(\d{1,2}))?(?:\s*de)?\s*(\w+)?/i;
  const match = texto.match(regex);

  if (!match) return null;

  const diaInicio = parseInt(match[1]);
  const mesInicioTexto = match[3] || match[2];
  const diaFin = parseInt(match[4]);
  const mesFinTexto = match[6] || match[5];

  const año = DateTime.now().year;
  let mesInicio = null;
  let mesFin = null;

  if (mesInicioTexto) {
    mesInicio = isNaN(mesInicioTexto) ? mesMap[mesInicioTexto.toLowerCase()] : parseInt(mesInicioTexto);
  }

  if (mesFinTexto) {
    mesFin = isNaN(mesFinTexto) ? mesMap[mesFinTexto.toLowerCase()] : parseInt(mesFinTexto);
  }

  if (!mesInicio && mesFin) {
    mesInicio = mesFin === 1 ? 12 : mesFin - 1;
  } else if (mesInicio && !mesFin) {
    mesFin = mesInicio;
  }

  if (!mesInicio && !mesFin) {
    const mesActual = DateTime.now().month;
    mesInicio = mesFin = mesActual;
  }

  const fechaInicio = DateTime.local(año, mesInicio, diaInicio);
  const fechaFin = DateTime.local(año, mesFin, diaFin);

  if (!fechaInicio.isValid || !fechaFin.isValid) return null;

  return {
    inicio: fechaInicio.toFormat('dd/MM/yyyy'),
    fin: fechaFin.toFormat('dd/MM/yyyy')
  };
}

// Ruta webhook
app.post('/webhook', async (req, res) => {
  const twiml = new MessagingResponse();
  const mensaje = req.body.Body || '';
  const numero = req.body.From;

  console.log('📩 Mensaje recibido:', mensaje);

  const fechas = extraerRangoDeFechas(mensaje);

  if (fechas) {
    // ⚙️ Acá luego podrías consultar disponibilidad real
    twiml.message(`🗓️ ¡Genial! Estoy buscando disponibilidad entre el ${fechas.inicio} y el ${fechas.fin}. Te confirmo en un momento...`);
  } else {
    twiml.message(`📅 Para ayudarte, decime las fechas así: "del 18 al 22 de julio" o "del 25/7 al 2/8". ¡Y te digo qué tenemos!`);
  }

  res.set('Content-Type', 'text/xml');
  res.send(twiml.toString());
});

// Iniciar server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
