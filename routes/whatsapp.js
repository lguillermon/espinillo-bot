app.post('/webhook', async (req, res) => {
  const incomingMsg = req.body.Body;
  const from = req.body.From;

  // 1. Mensaje inicial de "espera"
  await client.messages.create({
    from: 'whatsapp:+14155238886', // tu Twilio Sandbox number
    to: from,
    body: "👌 Estoy verificando disponibilidad en El Espinillo... dame unos segundos."
  });

  try {
    // 2. Consulta al endpoint
    const response = await axios.post(
      'https://www.creadoresdesoft.com.ar/cha-man/v4/INFODisponibilidadPropietarios.php?slug=...',
      {
        fechaDesde: "20251007",
        fechaHasta: "20251009",
        nro_ota: "3",
        personas: 2,
        latitude: "",
        longitude: "",
        ip: ""
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const data = response.data;

    if (data.resultado === "Aceptar" && data.datos.length > 0) {
      let mensaje = "🏡 Disponibilidad encontrada:\n\n";

      data.datos.forEach(hab => {
        mensaje += `🔹 ${hab.nombre} - Stock: ${hab.stock_disponible}\n`;
        if (hab.tarifas && hab.tarifas.length > 0) {
          const tarifa = hab.tarifas[0]; // ejemplo: tomo la primera
          mensaje += `💲 Tarifa: ${tarifa.total} (${tarifa.cantidad_dias} noches)\n\n`;
        }
      });

      // 3. Enviar disponibilidad al cliente
      await client.messages.create({
        from: 'whatsapp:+14155238886',
        to: from,
        body: mensaje
      });
    } else {
      await client.messages.create({
        from: 'whatsapp:+14155238886',
        to: from,
        body: "😔 No encontré disponibilidad para esas fechas."
      });
    }
  } catch (err) {
    console.error(err);
    await client.messages.create({
      from: 'whatsapp:+14155238886',
      to: from,
      body: "⚠️ Hubo un error al consultar disponibilidad, por favor intentá de nuevo."
    });
  }

  res.sendStatus(200);
});
