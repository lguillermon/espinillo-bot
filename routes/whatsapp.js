const express = require('express');
const router = express.Router();
const axios = require('axios');
const twilio = require('twilio');

// ==== Twilio client (envs en Railway) ====
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM_NUMBER = process.env.TWILIO_WHATSAPP_FROM;       // ej: whatsapp:+14155238886
const CREADORES_URL = process.env.CREADORES_API_URL;        // v4 de INFODisponibilidad...

// ==== Estado simple en memoria para conversación (por número) ====
const sessions = new Map(); 
// Estructura: sessions.set(From, { checkin, checkout, people, awaiting: 'people'|'dates'|'checkout'|'checkin', ts })

// ==== Utilidades de fecha ====
const MONTHS = {
  enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6,
  julio:7, agosto:8, septiembre:9, setiembre:9, oct:10, octubre:10,
  nov:11, noviembre:11, dic:12, diciembre:12
};
function pad(n) { return String(n).padStart(2, '0'); }
function ymd(d) {
  const y = d.getFullYear();
  const m = pad(d.getMonth()+1);
  const day = pad(d.getDate());
  return `${y}${m}${day}`;
}
function addDays(d, n) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}
function parseYearSafe(yearStr) {
  if (!yearStr) return null;
  const y = parseInt(yearStr, 10);
  if (y < 100) return 2000 + y;
  return y;
}

// Si solo viene DD/MM => usamos año actual
function makeDateDDMMYYYY(dd, mm, yyyy) {
  const today = new Date();
  const year = yyyy ? parseYearSafe(yyyy) : today.getFullYear();
  const d = new Date(year, parseInt(mm,10)-1, parseInt(dd,10));
  return isNaN(d.getTime()) ? null : d;
}

// Si viene “mes” por nombre
function makeDateDDMesYYYY(dd, mesStr, yyyy) {
  const today = new Date();
  const month = MONTHS[mesStr.toLowerCase()];
  if (!month) return null;
  const year = yyyy ? parseYearSafe(yyyy) : today.getFullYear();
  const d = new Date(year, month-1, parseInt(dd,10));
  return isNaN(d.getTime()) ? null : d;
}

// Rango tipo “del 7 al 10 de octubre” o “20-22 de noviembre”
function coerceRangeWithMonth(d1, d2, mesStr) {
  const today = new Date();
  const month = MONTHS[mesStr.toLowerCase()];
  if (!month) return null;
  const year = today.getFullYear();
  const start = new Date(year, month-1, parseInt(d1,10));
  const end   = new Date(year, month-1, parseInt(d2,10));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  // si el rango “pasó”, podríamos subir el año para mantener futuro (opcional)
  return { start, end };
}

// ==== Parser de personas ====
function extractPeople(text) {
  const t = text.toLowerCase();

  // “…, 3 pax”, “4 personas”, “2 pasajeros”, “3 adultos/mayores”
  let m = t.match(/(?:^|[, ]+)(?:para\s+|somos\s+)?(\d{1,2})\s*(?:pax|personas?|pasajeros?|adultos?|mayores)\b/);
  if (m) return parseInt(m[1], 10);

  // “para 4”
  m = t.match(/\bpara\s+(\d{1,2})\b/);
  if (m) return parseInt(m[1], 10);

  // “somos 3”
  m = t.match(/\bsomos\s+(\d{1,2})\b/);
  if (m) return parseInt(m[1], 10);

  return null;
}

// ==== Parser de fechas ====
function extractDates(text) {
  const t = text.toLowerCase().replace(/,/g, ' ');
  const today = new Date();

  // 1) dd/mm[/yyyy] al dd/mm[/yyyy]
  let m = t.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\s*(?:al|a)\s*(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (m) {
    const inD = makeDateDDMMYYYY(m[1], m[2], m[3]);
    const outD = makeDateDDMMYYYY(m[4], m[5], m[6]);
    if (inD && outD) return { checkin: inD, checkout: outD };
  }

  // 2) del dd al dd de mes
  m = t.match(/\bdel\s+(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+([a-zá]+)\b/);
  if (m) {
    const r = coerceRangeWithMonth(m[1], m[2], m[3]);
    if (r) return { checkin: r.start, checkout: r.end };
  }

  // 3) dd - dd de mes (ej: 20-22 de noviembre)
  m = t.match(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})\s+de\s+([a-zá]+)\b/);
  if (m) {
    const r = coerceRangeWithMonth(m[1], m[2], m[3]);
    if (r) return { checkin: r.start, checkout: r.end };
  }

  // 4) del dd al dd (mes actual)
  m = t.match(/\bdel\s+(\d{1,2})\s+al\s+(\d{1,2})\b/);
  if (m) {
    const year = today.getFullYear();
    const month = today.getMonth();
    const start = new Date(year, month, parseInt(m[1],10));
    const end   = new Date(year, month, parseInt(m[2],10));
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) return { checkin: start, checkout: end };
  }

  // 5) dd de mes al dd de mes (más explícito)
  m = t.match(/\b(\d{1,2})\s+de\s+([a-zá]+)\s+(?:al|a)\s+(\d{1,2})\s+de\s+([a-zá]+)\b/);
  if (m) {
    const inD  = makeDateDDMesYYYY(m[1], m[2]);
    const outD = makeDateDDMesYYYY(m[3], m[4]);
    if (inD && outD) return { checkin: inD, checkout: outD };
  }

  // 6) fallback: cualquier dd/mm y dd/mm sueltos en texto (primero check-in, segundo check-out)
  const all = [...t.matchAll(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/g)];
  if (all.length >= 2) {
    const inD  = makeDateDDMMYYYY(all[0][1], all[0][2], all[0][3]);
    const outD = makeDateDDMMYYYY(all[1][1], all[1][2], all[1][3]);
    if (inD && outD) return { checkin: inD, checkout: outD };
  }

  return { checkin: null, checkout: null };
}

// ==== Mensajes auxiliares ====
async function say(to, body) {
  await client.messages.create({
    from: FROM_NUMBER,
    to,
    body
  });
}

// ==== Flujo principal ====
router.post('/webhook', async (req, res) => {
  const from = req.body.From;
  const body = (req.body.Body || '').trim();

  // 1) Ack rápido
  await say(from, '👌 Recibí tu mensaje. Estoy revisando disponibilidad...');

  // 2) Intentar extraer datos
  const { checkin, checkout } = extractDates(body);
  let people = extractPeople(body);

  console.log('🧩 Parser> dates:', checkin && checkin.toISOString(), checkout && checkout.toISOString(), ' people:', people);

  // 3) Leer/crear sesión
  const s = sessions.get(from) || { checkin: null, checkout: null, people: null, awaiting: null, ts: Date.now() };
  if (checkin)  s.checkin  = checkin;
  if (checkout) s.checkout = checkout;
  if (people)   s.people   = people;

  // 4) Si falta algo, preguntamos de forma dirigida
  if (!s.checkin && !s.checkout) {
    s.awaiting = 'dates';
    sessions.set(from, s);
    await say(from, '📅 ¿Podés indicarme **fecha de entrada y salida**? (ej: "del 7 al 10 de octubre" o "15/10 al 18/10")');
    return res.sendStatus(200);
  }
  if (s.checkin && !s.checkout) {
    s.awaiting = 'checkout';
    sessions.set(from, s);
    await say(from, '📆 Gracias. ¿Y la **fecha de salida**?');
    return res.sendStatus(200);
  }
  if (!s.people) {
    s.awaiting = 'people';
    sessions.set(from, s);
    await say(from, '👥 ¿Para **cuántas personas** es la reserva? (ej: "3 pax" o "somos 2")');
    return res.sendStatus(200);
  }

  // 5) Ya tenemos todo -> echo de lo entendido
  const humanIn  = `${pad(s.checkin.getDate())}/${pad(s.checkin.getMonth()+1)}/${s.checkin.getFullYear()}`;
  const humanOut = `${pad(s.checkout.getDate())}/${pad(s.checkout.getMonth()+1)}/${s.checkout.getFullYear()}`;

  await say(from, [
    '🔎 Entendí lo siguiente:',
    `👉 Desde: ${ymd(s.checkin)} (${humanIn})`,
    `👉 Hasta: ${ymd(s.checkout)} (${humanOut})`,
    `👉 Personas: ${s.people}`
  ].join('\n'));

  // 6) Preparar payload para la API (⚠️ Restar 1 día al checkout)
  const apiDesde = ymd(s.checkin);
  const apiHasta = ymd(addDays(s.checkout, -1)); // <-- checkout - 1 día

  try {
    // Consultar API Creadores
    const resp = await axios.post(
      CREADORES_URL,
      {
        fechaDesde: apiDesde,
        fechaHasta: apiHasta,
        nro_ota: "3",
        personas: s.people,
        latitude: "",
        longitude: "",
        ip: ""
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const data = resp.data;
    console.log('📦 Respuesta API:', JSON.stringify(data).slice(0, 500));

    if (data.resultado === 'Aceptar' && Array.isArray(data.datos) && data.datos.length) {
      let msg = '📊 Disponibilidad encontrada:\n\n';
      for (const hab of data.datos) {
        msg += `🔹 ${hab.nombre} - Stock: ${hab.stock}\n`;
        if (hab.tarifas?.length) {
          const t = hab.tarifas[0];
          msg += `💲 Tarifa: ${t.total} (${t.cantidad_dias} noches)\n\n`;
        }
      }
      await say(from, msg.trim());
    } else {
      await say(from, '😔 No encontré disponibilidad para esas fechas.');
    }
  } catch (e) {
    console.error('❌ Error consultando disponibilidad:', e?.response?.data || e.message);
    await say(from, '⚠️ Hubo un error al consultar disponibilidad, por favor intentá de nuevo.');
  }

  // 7) Opcional: cerrar sesión (o mantenerla unos minutos)
  sessions.delete(from);
  res.sendStatus(200);
});

module.exports = router;
