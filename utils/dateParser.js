// utils/dateParser.js
const { DateTime } = require('luxon');

function parseDates(texto) {
  if (!texto) return {};

  const mesMap = {
    // Ene
    ene: 1, enero: 1,
    // Feb
    feb: 2, febrero: 2,
    // Mar
    mar: 3, marzo: 3,
    // Abr
    abr: 4, abril: 4,
    // May
    may: 5, mayo: 5,
    // Jun
    jun: 6, junio: 6,
    // Jul
    jul: 7, julio: 7,
    // Ago
    ago: 8, agosto: 8,
    // Sep – variantes
    sep: 9, sept: 9, septiembre: 9, setiembre: 9, set: 9,
    // Oct
    oct: 10, octubre: 10,
    // Nov
    nov: 11, noviembre: 11,
    // Dic
    dic: 12, diciembre: 12
  };

  // del 1 al 5 de septiembre / 1-5 sep / 1 al 5/9
  const re = /(?:del\s*)?(\d{1,2})(?:\s*\/\s*(\d{1,2}))?(?:\s*de)?\s*(\w+)?\s*(?:al|-)\s*(\d{1,2})(?:\s*\/\s*(\d{1,2}))?(?:\s*de)?\s*(\w+)?/i;
  const match = texto.match(re);
  if (!match) return {};

  const d1 = parseInt(match[1], 10);
  const m1Txt = match[3] || match[2]; // mes palabra o num en 1ra parte
  const d2 = parseInt(match[4], 10);
  const m2Txt = match[6] || match[5]; // mes palabra o num en 2da parte

  const year = DateTime.now().year;
  let m1 = null, m2 = null;

  if (m1Txt) m1 = isNaN(m1Txt) ? mesMap[m1Txt.toLowerCase()] : parseInt(m1Txt, 10);
  if (m2Txt) m2 = isNaN(m2Txt) ? mesMap[m2Txt.toLowerCase()] : parseInt(m2Txt, 10);

  // Si dieron solo el mes de fin -> inferí el de inicio como el anterior
  if (!m1 && m2) m1 = (m2 === 1 ? 12 : m2 - 1);

  // Si dieron solo el mes de inicio, asumimos mismo mes
  if (m1 && !m2) m2 = m1;

  // Si no dieron ningún mes, asumimos el actual
  if (!m1 && !m2) m1 = m2 = DateTime.now().month;

  let desde = DateTime.local(year, m1, d1);
  let hasta = DateTime.local(year, m2, d2);

  if (!desde.isValid || !hasta.isValid) return {};

  // Si por inferencias la fecha fin quedó antes del inicio y no dieron mes, sumá 1 mes
  if (hasta < desde) hasta = hasta.plus({ months: 1 });

  return {
    fechaDesde: desde,
    fechaHasta: hasta
  };
}

module.exports = parseDates;
