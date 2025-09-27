const chrono = require('chrono-node');

/**
 * Parsea una frase en español y devuelve un rango de fechas.
 * - Si encuentra "del 12 al 15 de octubre" → devuelve start y end.
 * - Si encuentra una sola fecha → devuelve start = end.
 */
function parseDates(texto) {
  const results = chrono.es.parse(texto);

  if (results.length > 0) {
    const result = results[0];

    if (result.start && result.end) {
      // Caso de rango de fechas
      const startDate = result.start.date();
      const endDate = result.end.date();

      return {
        start: startDate,
        end: endDate
      };
    } else if (result.start) {
      // Caso de fecha única
      const startDate = result.start.date();

      return {
        start: startDate,
        end: startDate
      };
    }
  }

  return null;
}

module.exports = { parseDates };
