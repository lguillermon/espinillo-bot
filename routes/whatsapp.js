const express = require('express');
const router = express.Router();
const axios = require('axios');
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// -------------------
// Función de parsing
// -------------------
function parseReserva(mensaje) {
  let fechaDesde = null;
  let fechaHasta = null;
  let personas = 2;

  // Regex para personas
  const regexPersonas = /(?:personas?|pasajeros?|pax|adultos?|huespedes?)\s*(\d+)/i;
  const matchPersonas = mensaje.match(regexPersonas);
  if (matchPersonas) {
    personas = parseInt(matchPersonas[1], 10);
    console.log("👥 Detectado con palabra clave:", personas);
  } else {
    const regexPara = /para\s+(\d+)/i;
    const matchPara = mensaje.match(regexPara);
    if (matchPara) {
      personas = parseInt(matchPara[1], 10);
      console.log("👥 Detectado con 'para N':", personas);
    }
  }

  // Regex para fechas numéricas
  const regexFechaNum = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/g;
  let fechasNum = [...mensaje.matchAll(regexFechaNum)];

  // Regex para fechas en texto
  const meses = {
    enero: "01", febrero: "02", marzo: "03", abril: "04",
    mayo: "05", junio: "06", julio: "07", agosto: "08",
    septiembre: "09", setiembre: "09", octubre: "10",
    noviembre: "11", diciembre: "12", dic: "12"
  };
  const regexFechaTexto = /(\d{1,2})\s*(?:al|-|hasta|a)\s*(\d{1,2})\s*de\s*([a-zá]+)/i;
  const matchTexto = mensaje.match(regexFechaTexto);

  let hoy = new Date();
  let anio = hoy.getFullYear();

  if (fechasNum.length >= 2) {
    const [d1, m1, y1] = fechasNum[0].slice(1);
    const [d2, m2, y2] = fechasNum[1].slice(1);
    fechaDesde = `${anio}${m1.padStart(2, '0')}${d1.padStart(2, '0')}`;
    fechaHasta = `${anio}${m2.padStart(2, '0')}${d2.padStart(2, '0')}`;
    if (y1) fechaDesde = `${y1.length === 2 ? '20'+y1 : y1}${m1.padStart(2,'0')}${d1.padStart(2,'0')}`;
    if (y2) fechaHasta = `${y2.length === 2 ? '20'+y2 : y2}${m2.padStart(2,'0')}${d2.padStart(2,'0')}`;
    console.log("📅 Fechas detectadas numéricas:", fechaDesde, fechaHasta);
  } else if (matchTexto) {
    let d1 = matchTexto[1].padStart(2, '0');
    let d2 = matchTexto[2].padStart(2, '0');
    let mes = meses[matchTexto[3].toLowerCase()];
    fechaDesde = `${anio}${mes}${d1}`;
    fechaHasta = `${anio}${mes}${d2}`;
    console.log("📅 Fechas detectadas en texto:", fechaDesde, fechaHasta);
  } else {
    console.log("⚠️ No pude detectar fechas en el mensaje");
  }

  return { fechaDesde, fechaHasta, personas };
}

// -------------------
// Webhook principal
// -------------------
router.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body;
  const from = req.body.From;

  console.log("📩 Mensaje recibido:", incomingMsg, "de", from);

  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: from,
    body: "👌 Recibí tu mensaje. Estoy revisando disponibilidad..."
  });

  try {
    const { fechaDesde, fechaHasta, personas } = parseReserva(incomingMsg);

    // Mensaje debug para el cliente también
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: from,
      body: `🔎 Entendí lo siguiente:\n👉 Desde: ${fechaDesde}\n👉 Hasta: ${fechaHasta}\n👉 Personas: ${personas}`
    });

    if (!fechaDesde || !fechaHasta) {
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: from,
        body: "🤔 No pude entender bien las fechas. Por favor decímelas otra vez."
      });
      return res.sendStatus(200);
    }

    // Acá todavía podemos comentar el POST real a la API si queremos testear
    /*
    const response = await axios.post(
      process.env.CREADORES_API_URL,
      { fechaDesde, fechaHasta, nro_ota: "3", personas },
      { headers: { "Content-Type": "application/json" } }
    );
    */

  } catch (err) {
    console.error("❌ Error:", err);
  }

  res.sendStatus(200);
});

module.exports = router;
