const express = require('express');
const router = express.Router();
const axios = require('axios');
const twilio = require('twilio');

// Inicializar Twilio con variables de entorno
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

// ------------------
// 📅 Parser de Fechas
// ------------------
const monthMap = {
  "enero": "01",
  "febrero": "02",
  "marzo": "03",
  "abril": "04",
  "mayo": "05",
  "junio": "06",
  "julio": "07",
  "agosto": "08",
  "septiembre": "09",
  "octubre": "10",
  "noviembre": "11",
  "diciembre": "12"
};

function parseFechasDesdeTexto(texto) {
  texto = texto.toLowerCase();

  const hoy = new Date();
  const year = hoy.getFullYear();

  // Buscar días tipo "7 al 10"
  const regex = /(\d{1,2})\s*(?:al|-|hasta)\s*(\d{1,2})/;
  const match = texto.match(regex);

  // Buscar mes
  let mesDetectado = null;
  for (const mes in monthMap) {
    if (texto.includes(mes)) {
      mesDetectado = monthMap[mes];
      break;
    }
  }

  if (match && mesDetectado) {
    let diaInicio = match[1].padStart(2, '0');
    let diaFin = match[2].padStart(2, '0');

    let fechaDesde = `${year}${mesDetectado}${diaInicio}`;
    // ⚠️ fechaHasta es día de salida -1
    let fechaHasta = `${year}${mesDetectado}${(parseInt(diaFin) - 1).toString().padStart(2, '0')}`;

    return { fechaDesde, fechaHasta };
  }

  return null; // si no se detectó nada
}

// ------------------
// 📲 Webhook WhatsApp
// ------------------
router.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body || "";
  const from = req.body.From;

  console.log(`📩 Mensaje recibido: ${incomingMsg} de ${from}`);

  // Intentar parsear fechas
  const fechas = parseFechasDesdeTexto(incomingMsg);

  let fechaDesde = "20251007"; // fallback
  let fechaHasta = "20251009"; // fallback
  let personas = 2; // por ahora fijo, después lo parseamos también

  if (fechas) {
    fechaDesde = fechas.fechaDesde;
    fechaHasta = fechas.fechaHasta;
  } else {
    console.log("⚠️ No se pudieron detectar fechas en el mensaje.");
  }

  // 1. Avisar que está procesando
  await client.messages.create({
    from: TWILIO_FROM,
    to: from,
    body: "👌 Estoy verificando disponibilidad en El Espinillo... dame unos segundos."
  });

  try {
    // 2. Consulta al endpoint
    const response = await axios.post(
      process.env.CREADORES_API_URL,
      {
        fechaDesde,
        fechaHasta,
        nro_ota: "3",
        personas,
        latitude: "",
        longitude: "",
        ip: ""
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const data = response.data;

    if (data.resultado === "Aceptar" && data.datos.length > 0) {
      let mensaje = "📋 Disponibilidad encontrada:\n\n";

      data.datos.forEach(hab => {
        mensaje += `🔹 ${hab.nombre} - Stock: ${hab.stock}\n`;
        if (hab.tarifas && hab.tarifas.length > 0) {
          const tarifa = hab.tarifas[0];
          mensaje += `💲 Tarifa: ${tarifa.total} (${tarifa.cantidad_dias} noches)\n\n`;
        }
      });

      // 3. Enviar disponibilidad
      await client.messages.create({
        from: TWILIO_FROM,
        to: from,
        body: mensaje
      });
    } else {
      await client.messages.create({
        from: TWILIO_FROM,
        to: from,
        body: "😔 No encontré disponibilidad para esas fechas."
      });
    }
  } catch (err) {
    console.error("❌ Error consultando API:", err.message);
    await client.messages.create({
      from: TWILIO_FROM,
      to: from,
      body: "⚠️ Hubo un error al consultar disponibilidad, por favor intentá de nuevo."
    });
  }

  // Twilio espera un 200 OK
  res.sendStatus(200);
});

module.exports = router;
