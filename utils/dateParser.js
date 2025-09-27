// utils/dateParser.js
const chrono = require('chrono-node');
const moment = require('moment');

const fmt = d => moment(d).format('YYYY-MM-DD');

function parseDates(texto) {
  console.log("🔍 Texto recibido para parsear:", texto);

  const ref = new Date();
  const results = chrono.es.parse(texto, ref, { forwardDate: true });

  if (results.length) {
    const r = results[0];
    const start = r.start ? r.start.date() : null;
    const end = r.end ? r.end.date() : start;

    console.log("📅 Resultado chrono:", start, end);

    return {
      fechaDesde: start ? fmt(start) : null,
      fechaHasta: end ? fmt(end) : null
    };
  }

  // fallback regex simple (ej: 12/10 al 15/10)
  const m = texto.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\s*(?:al|a)\s*(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/i);
  if (m) {
    const [ , d1, mo1, y1, d2, mo2, y2 ] = m;
    const year1 = y1 ? (y1.length === 2 ? `20${y1}` : y1) : String(ref.getFullYear());
    const year2 = y2 ? (y2.length === 2 ? `20${y2}` : y2) : String(ref.getFullYear());
    const from = new Date(`${year1}-${mo1}-${d1}`);
    const to   = new Date(`${year2}-${mo2}-${d2}`);
    return { fechaDesde: fmt(from), fechaHasta: fmt(to) };
  }

  return { fechaDesde: null, fechaHasta: null };
}

module.exports = parseDates;
