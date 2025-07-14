const express = require('express');
const app = express();

// Middleware para parsear datos x-www-form-urlencoded de Twilio
app.use(express.urlencoded({ extended: false }));

// Ruta del webhook
app.post('/webhook', (req, res) => {
  const from = req.body.From;
  const mensaje = req.body.Body;

  console.log('📥 Mensaje recibido de:', from);
  console.log('📩 Contenido:', mensaje);

  // Armar respuesta en TwiML (XML)
  const respuestaTwiML = `
    <Response>
      <Message>Hola! Gracias por tu mensaje: ${mensaje}</Message>
    </Response>
  `;

  console.log('📤 Enviando respuesta TwiML a Twilio...');
  console.log(respuestaTwiML);

  // Enviar respuesta XML correctamente a Twilio
  res.writeHead(200, { 'Content-Type': 'application/xml' });
  res.end(respuestaTwiML);
});

// Puerto dinámico para Railway u otro host
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
