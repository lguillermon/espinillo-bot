// utils/dateParser.js
const { DateTime } = require('luxon');

function parseDates(texto) {
  const mesMap = {
    enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4,
    may: 5, mayo: 5, jun: 6, junio: 6, jul: 7, julio: 7,
    ago: 8, agosto: 8, sep: 9, septiembre: 9,
    oct: 10, octubre: 10, nov: 11, noviembre: 11,
    dic: 12, diciembre: 12
  };

  const regex = /(?:del\s*)?(\d{1,2})(?:\s*\/\s*(\d{1,2}))?(?:\s*de)?\s*(\w+)?\s*(?:al|-)\s*(\d{1,2})(?:\s*\/\s*(\d{1,2}))?(?:\s*de)?\s*(\w+)?/i;
  const match = texto.match(regex);
  if (!match) return {};

  const diaInicio = parseInt(match[1]);
  const mesInicioTexto = match[3] || match[2];
  const diaFin = parseInt(match[4]);
  const mesFinTexto = match[6] || match[5];
  const año = DateTime.now().year;

  let mesInicio = mesInicioTexto ? (isNaN(mesInicioTexto) ? mesMap[mesInicioTexto.toLowerCase()] : parseInt(mesInicioTexto)) : null;
  let mesFin = mesFinTexto ? (isNaN(mesFinTexto) ? mesMap[mesFinTexto.toLowerCase()] : parseInt(mesFinTexto)) : null;

  if (!mesInicio && mesFin) mesInicio = mesFin === 1 ? 12 : mesFin - 1;
  if (mesInicio && !mesFin) mesFin = mesInicio;
  if (!mesInicio && !mesFin) mesInicio = mesFin = DateTime.now().month;

  const fechaDesde = DateTime.local(año, mesInicio, diaInicio);
  const fechaHasta = DateTime.local(año, mesFin, diaFin);

  if (!fechaDesde.isValid || !fechaHasta.isValid) return {};
  return { fechaDesde, fechaHasta };
}

module.exports = parseDates;
