const express = require('express');
const app = express();

// Middleware para parsear application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Endpoint para recibir mensajes tipo Twilio
app.post('/webhook', (req, res) => {
  const body = req.body.Body || 'Sin mensaje';
  console.log(`📩 Mensaje recibido: ${body}`);

  // Podés procesarlo o responder algo
  res.send(`Recibido: ${body}`);
});

// Puerto dinámico asignado por Railway o 8080 local
const PORT = process.env.PORT || 8080;
app.get('/', (req, res) => {
  res.send('✅ Servidor vivo');
});
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
