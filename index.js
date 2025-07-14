const express = require('express');
const axios = require('axios');
const { MessagingResponse } = require('twilio').twiml;
const app = express();

app.use(express.urlencoded({ extended: false }));

// 🧠 Utilidad simple para detectar fechas (puede mejorarse luego con NLP)
function extraerFechasDesdeTexto(mensaje) {
  const match = mensaje.match(/(\d{1,2})\s*(al|hasta)\s*(\d{1,2})\s*de\s*(julio|agosto)/i);
  if (!match) return null;

  const diaDesde = match[1].padStart(2, '0');
  const diaHasta = match[3].padStart(2, '0');
  const mesTexto = match[4].toLowerCase();
  const mes = mesTexto === 'julio' ? '07' : mesTexto === 'agosto' ? '08' : '01';

  return {
    fechaDesde: `2025${mes}${diaDesde}`,
    fechaHasta: `2025${mes}${diaHasta}`,
  };
}

app.post('/webhook', async (req, res) => {
  const twiml = new MessagingResponse();
  const mensaje = req.body.Body || '';
  const numero = req.body.From;

  console.log('📥 Mensaje recibido:', mensaje);

  const fechas = extraerFechasDesdeTexto(mensaje);

  if (!fechas) {
    twiml.message('📅 Para ayudarte, decime las fechas así: "del 18 al 22 de julio". ¡Y te digo qué tenemos!');
    return res.type('text/xml').send(twiml.toString());
  }

  try {
    // 🎯 Consulta a la API de El Espinillo
    const respuesta = await axios.post(
      'https://www.creadoresdesoft.com.ar/cha-man/v3/INFODisponibilidadPropietarios.php?slug=oJyNzlGZf6WYt2SYoNmlgojlkJ3XlJnYt0mbiAClgAClgAClgoAClgAClo8woNWehV4RgwWZkBych2mclRIlgojlhRnbIV4Yf23bujClgAClgAClgAClgAClgAiCsIMyAjMsVmbuFGaDJC7ISZ3FGbjClgAClgAClgAClgowe',
      {
        fechaDesde: fechas.fechaDesde,
        fechaHasta: fechas.fechaHasta,
        nro_ota: '3',
        personas: 2,
        latitude: '',
        longitude: '',
        ip: ''
      }
    );

    const data = respuesta.data;

    if (data.resultado !== 'Aceptar') {
      twiml.message('🛑 No pude consultar la disponibilidad ahora. ¿Podés intentar más tarde?');
      return res.type('text/xml').send(twiml.toString());
    }

    const alojamiento = data.datos[0]; // Primer bungalow disponible
    const nombre = alojamiento.nombre;
    const tarifa = alojamiento.tarifas[0];
    const total = tarifa.total;
    const promedio = tarifa.promedio;
    const promo = alojamiento.tarifas.find(t => t.nom_tarifa.includes('PROMO'));
    const promoTexto = promo ? `💥 Tenemos promo: ${promo.nom_tarifa} a $${promo.promedio} por noche.` : '';

    const fotos = alojamiento.imagenes?.slice(0, 2).map(i => i.src);

    // 🧠 Mensaje persuasivo
    let texto = `✨ ¡Tenemos disponibilidad en ${nombre}!\n\n`;
    texto += `🛏️ Precio regular: $${promedio}/noche\n`;
    if (promoTexto) texto += `${promoTexto}\n`;
    texto += `🧾 Total por tu estadía: $${total}\n\n`;
    texto += `¿Querés que te pase el link para reservarlo ahora mismo?`;

    const mensajeTwilio = twiml.message();
    mensajeTwilio.body(texto);
    if (fotos?.length) mensajeTwilio.media(fotos[0]);

    res.type('text/xml').send(twiml.toString());

  } catch (err) {
    console.error('❌ Error al consultar la API:', err.message);
    twiml.message('Ups! Tuvimos un error al buscar disponibilidad. ¿Probamos de nuevo en unos minutos?');
    res.type('text/xml').send(twiml.toString());
  }
});

// 🔁 Railway Port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Bot escuchando en puerto ${PORT}`);
});
