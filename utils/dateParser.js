const chrono = require('chrono-node');
const moment = require('moment');

function parseDates(texto) {
  console.log("🔍 Texto recibido para   parsear:", texto);

  // --- 1) Detectar rangos explícitos tipo "del 12 al 15 de octubre" ---
  const rangoRegex = /(\d{1,2})\s*(?:al|-)\s*(\d{1,2})\s*de\s*(\w+)/i;
  const match = texto.match(rangoRegex);

  if (match) {
    const [ , diaInicio, diaFin, mesTexto ] = match;

    // Usamos chrono para resolver el mes (ej: "octubre" -> Date con mes correcto)
    const mesParse = chrono.parseDate(mesTexto);
    if (mesParse) {
      const year = moment().year();
      const mes = mesParse.getMonth() + 1; // JS devuelve 0-11

      const fechaDesde = moment(`${year}-${mes}-${diaInicio}`, "YYYY-M-D");
      const fechaHasta = moment(`${year}-${mes}-${diaFin}`, "YYYY-M-D");

      if (fechaDesde.isValid() && fechaHasta.isValid()) {
        return {
          fechaDesde: fechaDesde.format("YYYY-MM-DD"),
          fechaHasta: fechaHasta.format("YYYY-MM-DD")
        };
      }
    }
  }

  // --- 2) Si no es rango, usamos Chrono directamente ---
  const parsed = chrono.parse(texto);

  if (parsed.length >= 1) {
    const fechaDesde = moment(parsed[0].start.date());
    const fechaHasta = parsed[0].end
      ? moment(parsed[0].end.date())
      : fechaDesde;

    return {
      fechaDesde: fechaDesde.format("YYYY-MM-DD"),
      fechaHasta: fechaHasta.format("YYYY-MM-DD")
    };
  }

  // --- 3) Si no entendimos nada ---
  return {};
}

module.exports = parseDates;
