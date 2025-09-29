// utils/dateParser.js
function pad(n) { return String(n).padStart(2, '0'); }

const MES = {
  ene: 1, enero: 1,
  feb: 2, febrero: 2,
  mar: 3, marzo: 3,
  abr: 4, abril: 4,
  may: 5, mayo: 5,
  jun: 6, junio: 6,
  jul: 7, julio: 7,
  ago: 8, agosto: 8,
  sep: 9, sept: 9, set: 9, septiembre: 9, setiembre: 9,
  oct: 10, octubre: 10,
  nov: 11, noviembre: 11,
  dic: 12, diciembre: 12
};

function normalizar(t) {
  return (t || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // saca acentos
}

function parseDates(texto) {
  if (!texto) return {};

  const txt = normalizar(texto);
  const year = new Date().getFullYear();

  // Caso 1: "del 12 al 15 de octubre" / "12 al 15 de oct" / "12 al 15/10"
  const re1 = /(?:del|desde)?\s*(\d{1,2})(?:\s*\/\s*(\d{1,2}))?(?:\s*de)?\s*(\w+)?\s*(?:al|a)\s*(\d{1,2})(?:\s*\/\s*(\d{1,2}))?(?:\s*de)?\s*(\w+)?/i;
  const m1 = txt.match(re1);

  if (m1) {
    const d1 = parseInt(m1[1], 10);
    const d2 = parseInt(m1[4], 10);

    const m1Txt = m1[3] || m1[2]; // palabra o número
    const m2Txt = m1[6] || m1[5];

    let mm1 = null, mm2 = null;

    if (m1Txt) mm1 = isNaN(m1Txt) ? MES[m1Txt] : parseInt(m1Txt, 10);
    if (m2Txt) mm2 = isNaN(m2Txt) ? MES[m2Txt] : parseInt(m2Txt, 10);

    // Si dieron sólo el mes final, asumimos mismo mes para el inicio
    if (!mm1 && mm2) mm1 = mm2;
    // Si no dieron meses, usamos el actual
    if (!mm1 && !mm2) mm1 = mm2 = (new Date().getMonth() + 1);
    // Si dieron sólo el mes de inicio, asumimos mismo mes
    if (mm1 && !mm2) mm2 = mm1;

    const desde = new Date(year, mm1 - 1, d1);
    let hasta  = new Date(year, mm2 - 1, d2);

    // Si por redacción quedó fin < inicio y sólo informaron mes al final,
    // avanzamos 1 mes el fin (caso “30 al 2 de octubre”)
    if (hasta < desde && !m1Txt && m2Txt) {
      hasta = new Date(year, mm2, d2); // +1 mes
    }

    return {
      fechaDesde: `${desde.getFullYear()}-${pad(desde.getMonth() + 1)}-${pad(desde.getDate())}`,
      fechaHasta: `${hasta.getFullYear()}-${pad(hasta.getMonth() + 1)}-${pad(hasta.getDate())}`
    };
  }

  // Caso 2: "12/10 al 15/10" o "12-10 a 15-10"
  const re2 = /(\d{1,2})[\/\-](\d{1,2}).{0,10}?(?:al|a)\s*(\d{1,2})[\/\-](\d{1,2})/i;
  const m2 = txt.match(re2);
  if (m2) {
    const d1 = parseInt(m2[1], 10), mo1 = parseInt(m2[2], 10);
    const d2 = parseInt(m2[3], 10), mo2 = parseInt(m2[4], 10);
    return {
      fechaDesde: `${year}-${pad(mo1)}-${pad(d1)}`,
      fechaHasta: `${year}-${pad(mo2)}-${pad(d2)}`
    };
  }

  return {};
}

module.exports = { parseDates };
