const express = require('express');
const router = express.Router();
const axios = require('axios');
const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const FROM = process.env.TWILIO_WHATSAPP_FROM; // ej: whatsapp:+14155238886
const CREADORES_URL = process.env.CREADORES_API_URL;

// --- Estado simple en memoria por contacto ---
const sessions = new Map(); // key: from, value: { pending: 'ask_dates'|'ask_people'|null, data: { entrada, salida, personas } }

function getSession(from) {
  if (!sessions.has(from)) sessions.set(from, { pending: null, data: {} });
  return sessions.get(from);
}

// ---- Utilidades de fechas ----
const MONTHS = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre'
];

function zero(n){ return n < 10 ? '0'+n : ''+n; }
function yyyymmdd(d){ return d.getFullYear() + zero(d.getMonth()+1) + zero(d.getDate()); }
function ddmmyyyy(d){ return zero(d.getDate()) + '/' + zero(d.getMonth()+1) + '/' + d.getFullYear(); }

/**
 * Intenta parsear fechas en textos tipo:
 * - "del 7 al 10 de octubre"
 * - "15/10 al 18/10"
 * - "finde 20-22 de noviembre"
 * - "7 al 10/10"
 * Devuelve {entrada: Date, salida: Date} o null.
 * Asume año actual, y si pasó esa fecha, usa año siguiente.
 */
function parseDates(text) {
  const now = new Date();
  const thisYear = now.getFullYear();

  const norm = text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

  // 1) "del 7 al 10 de octubre" / "15 al 18 de nov"
  const reWord = /\b(?:del\s*)?(\d{1,2})\s*(?:al|-|a)\s*(\d{1,2})\s*(?:de\s*)?([a-zñ\.]+)/i;
  // 2) "15/10 al 18/10" / "15/10 a 18/10"
  const reSlash = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:al|-|a)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i;
  // 3) "fin de 20-22 de noviembre" / "20-22 noviembre"
  const reFinde = /\b(?:fin(?:de)?|finde|fin de)\s*(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(?:de\s*)?([a-zñ\.]+)/i;

  const monthIdx = (mstr) => {
    const s = mstr.replace(/\./g, '');
    const i = MONTHS.findIndex(m => s.startsWith(m.slice(0, Math.max(3, Math.min(4, m.length)))));
    return i; // -1 si no la encuentra
  };

  // palabra + mes
  let m = norm.match(reWord);
  if (m) {
    const d1 = parseInt(m[1], 10);
    const d2 = parseInt(m[2], 10);
    const mi = monthIdx(m[3]);
    if (mi >= 0) {
      let y = thisYear;
      const entrada = new Date(y, mi, d1);
      const salida = new Date(y, mi, d2);
      // si ya pasó salida completa este año, probar año siguiente
      if (salida < now) {
        y = thisYear + 1;
        entrada.setFullYear(y);
        salida.setFullYear(y);
      }
      if (entrada < salida) return { entrada, salida };
    }
  }

  // con barra
  m = norm.match(reSlash);
  if (m) {
    let d1 = parseInt(m[1],10), mo1 = parseInt(m[2],10)-1, y1 = m[3]? parseInt(m[3],10) : thisYear;
    let d2 = parseInt(m[4],10), mo2 = parseInt(m[5],10)-1, y2 = m[6]? parseInt(m[6],10) : y1;
    if (y1 < 100) y1 += 2000;
    if (y2 < 100) y2 += 2000;
    const entrada = new Date(y1, mo1, d1);
    const salida  = new Date(y2, mo2, d2);
    if (salida < now) { entrada.setFullYear(entrada.getFullYear()+1); salida.setFullYear(salida.getFullYear()+1); }
    if (entrada < salida) return { entrada, salida };
  }

  // finde 20-22 noviembre
  m = norm.match(reFinde);
  if (m) {
    const d1 = parseInt(m[1],10);
    const d2 = parseInt(m[2],10);
    const mi = monthIdx(m[3]);
    if (mi >= 0) {
      let y = thisYear;
      const entrada = new Date(y, mi, d1);
      const salida = new Date(y, mi, d2);
      if (salida < now) { y = thisYear + 1; entrada.setFullYear(y); salida.setFullYear(y); }
      if (entrada < salida) return { entrada, salida };
    }
  }

  return null;
}

/**
 * Personas:
 * - "3 pax", "3 personas", "somos 4", "para 2", "2 pasajeros", "2 adultos", "2 mayores"
 */
function parsePeople(text) {
  const norm = text.toLowerCase();
  const reList = [
    /\b(\d{1,2})\s*(?:pax|personas?|pasajeros?|adultos?|mayores?)\b/i,
    /\bsomos\s+(\d{1,2})\b/i,
    /\bpara\s+(\d{1,2})\b/i
  ];
  for (const re of reList) {
    const m = norm.match(re);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function nightsBetween(a,b){ return Math.round((b - a) / (1000*60*60*24)); }

// --- Mensajería ---
async function say(to, body){
  await client.messages.create({ from: FROM, to: to, body });
}

// --- Flujo principal ---
router.post('/webhook', async (req, res) => {
  const from = req.body.From;
  const msg  = (req.body.Body || '').trim();

  console.log('📩 Mensaje recibido:', msg, 'de', from);

  const session = getSession(from);

  // Palabras de “continuación” que no aportan datos (evitan ruido)
  const fillers = /^(ok|dale|perfecto|listo|si|sí|gracias)\.?$/i;

  // 1) Si hay una pregunta pendiente, intentamos completar solo eso
  if (session.pending === 'ask_people') {
    const p = parsePeople(msg);
    if (p) {
      session.data.personas = p;
      session.pending = null;
    } else if (!fillers.test(msg)) {
      await say(from, '👥 ¿Para *cuántas personas* es la reserva? (ej: "3 pax" o "somos 2")');
      res.sendStatus(200);
      return;
    }
  } else if (session.pending === 'ask_dates') {
    const d = parseDates(msg);
    if (d) {
      session.data.entrada = d.entrada;
      session.data.salida  = d.salida;
      session.pending = null;
    } else if (!fillers.test(msg)) {
      await say(from, '📆 ¿Podés indicarme *fecha de entrada y salida*? (ej: "del 7 al 10 de octubre" o "15/10 al 18/10")');
      res.sendStatus(200);
      return;
    }
  }

  // 2) Intentamos parsear lo nuevo del mensaje (completa o pisa lo anterior)
  const parsedDates = parseDates(msg);
  const parsedPeople = parsePeople(msg);

  if (parsedDates) { session.data.entrada = parsedDates.entrada; session.data.salida = parsedDates.salida; }
  if (parsedPeople) { session.data.personas = parsedPeople; }

  const { entrada, salida, personas } = session.data;

  // 3) Validar faltantes (y preguntar por lo que falte)
  if (!entrada || !salida) {
    session.pending = 'ask_dates';
    if (!fillers.test(msg)) {
      await say(from, '📆 ¿Podés indicarme *fecha de entrada y salida*? (ej: "del 7 al 10 de octubre" o "15/10 al 18/10")');
    }
    res.sendStatus(200);
    return;
  }
  if (!personas) {
    session.pending = 'ask_people';
    if (!fillers.test(msg)) {
      await say(from, '👥 ¿Para *cuántas personas* es la reserva? (ej: "3 pax" o "somos 2")');
    }
    res.sendStatus(200);
    return;
  }

  // 4) Ya tenemos todo → confirmo lo entendido y consulto la API
  const noches = nightsBetween(entrada, salida);
  const hastaAPI = (() => {
    const d = new Date(salida); // checkout
    d.setDate(d.getDate() - 1); // API: hasta = salida - 1 día
    return yyyymmdd(d);
  })();

  const payload = {
    fechaDesde: yyyymmdd(entrada),
    fechaHasta: hastaAPI,
    nro_ota: "3",
    personas: personas,
    latitude: "",
    longitude: "",
    ip: ""
  };

  await say(from,
    `🔎 Entendí lo siguiente:\n` +
    `👉 Desde: ${yyyymmdd(entrada)} (${ddmmyyyy(entrada)})\n` +
    `👉 Hasta: ${hastaAPI} (${ddmmyyyy(new Date(salida.getFullYear(), salida.getMonth(), salida.getDate()-1))})\n` +
    `👉 Personas: ${personas}\n\n` +
    `👌 Estoy verificando disponibilidad en El Espinillo...`
  );

  try {
    const resp = await axios.post(CREADORES_URL, payload, { headers: { 'Content-Type': 'application/json' } });
    const data = resp.data;

    if (data?.resultado === 'Aceptar' && Array.isArray(data.datos) && data.datos.length) {
      let mensaje = '📊 *Disponibilidad encontrada:*\n\n';
      for (const hab of data.datos) {
        mensaje += `🔹 ${hab.nombre} – Stock: ${hab.stock}\n`;
        if (hab.tarifas?.length) {
          const t = hab.tarifas[0];
          mensaje += `💲 Tarifa: ${Number(t.total).toLocaleString('es-AR')} (${noches} noches)\n\n`;
        }
      }
      await say(from, mensaje.trim());
    } else {
      await say(from, '😔 No encontré disponibilidad para esas fechas.');
    }
  } catch (e) {
    console.error('❌ Error consultando disponibilidad:', e?.response?.data || e.message);
    await say(from, '⚠️ Hubo un error al consultar disponibilidad, por favor intentá de nuevo.');
  }

  res.sendStatus(200);
});

module.exports = router;
