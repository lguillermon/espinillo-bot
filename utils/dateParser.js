// utils/dateParser.js
const chrono = require('chrono-node');
const moment = require('moment');

function parseDates(texto) {
  if (!texto) return {};

  console.log("🔍 Texto recibido para parsear:", texto);

  // Usamos el parser en español
  const results = chrono.es.parse(texto);

  if (!results || results.length === 0) {
    console.log("⚠️ No se pudo parsear la fecha");
    return {};
  }

  let fechaDesde = null;
  let fechaHasta = null;

  if (results[0].start) {
    fechaDesde = moment(results[0].start.date()).format('YYYY-MM-DD');
  }

  if (results[0].end) {
    fechaHasta = moment(results[0].end.date()).format('YYYY-MM-DD');
  }

  // Caso especial: si solo detecta  una fecha, usamos la misma para ambos extremos
  if (fechaDesde && !fechaHasta) {
    fechaHasta = fechaDesde;
  }

  console.log("📅 Resultado chrono:", fechaDesde, fechaHasta);

  return { fechaDesde, fechaHasta };
}

module.exports = parseDates;
