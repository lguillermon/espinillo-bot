const express = require('express');
const app = express();

// Middleware para parsear datos x-www-form-urlencoded de Twilio
app.use(express.urlencoded({ extended: false }));

// Ruta del webhook de Twilio
app.post('/webhook', (req, res) => {
  const from = req.body.From;
  const mensaje = req.body.Body;

  console.log('📥 Mensaje recibido de:', from);
  console.log('📩 Contenido:', mensaje);

  // TwiML (respuesta automática a Twilio)
  const respuestaTwiML = `
    <Response>
      <Message>Hola! Gracias por tu mensaje: ${mensaje}</Message>
    </Response>
  `.trim(); // <- trim evita espacios accidentales

  console.log('📤 Enviando respuesta TwiML a Twilio...');
  console.log(respuestaTwiML);

  // Responder correctamente como XML
  res.writeHead(200, { 'Content-Type': 'application/xml' });
  res.end(respuestaTwiML);
});

// Iniciar servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
