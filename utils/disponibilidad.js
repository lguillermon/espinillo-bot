const axios = require('axios');

async function consultarDisponibilidad(userMsg) {
  const body = {
    fechaDesde: "20250715",
    fechaHasta: "20250720",
    nro_ota: "3",
    personas: 2,
    latitude: "",
    longitude: "",
    ip: ""
  };

  try {
    const resp = await axios.post(
      'https://www.creadoresdesoft.com.ar/cha-man/v4/INFODisponibilidadPropietarios.php?slug=0JyNzIGZf6WYT2SYoNmIgoJklJ3XlJnYt0mbiAClgAClgAClgAClgoALio8woNWehV4RgwWZkBych2mcIRllgojhRnblV4Yf23buJClgACIgACIgACIgACIsCM',
      body,
      { headers: {'Content-Type':'application/json'} }
    );
    const datos = resp.data.datos || [];
    return datos.map(d=>`${d.nombre}: $${d.tarifas[0].total}`).join('\n');
  } catch (e) {
    console.error(e);
    return 'No se pudo consultar disponibilidad ahora.';
  }
}

module.exports = { consultarDisponibilidad };
