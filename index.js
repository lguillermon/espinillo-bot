const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Ruta base para verificar si está funcionando
app.get('/', (req, res) => {
  res.send('🟢 El bot Espinillo está corriendo correctamente.');
});

// Webhook de prueba (podés luego cambiarlo al que uses para Twilio)
app.post('/webhook', (req, res) => {
  console.log('📩 Webhook recibido:', req.body);
  res.status(200).send('✅ Mensaje recibido');
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Servidor escuchando en el puerto ${port}`);
});
