const express = require('express');
const bodyParser = require('body-parser');
const whatsappRoutes = require('./routes/whatsapp');

const app = express();

// Middleware para parsear x-www-form-urlencoded (Twilio manda así)
app.use(bodyParser.urlencoded({ extended: false }));
// Middleware para parsear JSON
app.use(bodyParser.json());

// Rutas
app.use('/', whatsappRoutes);

// Debug para confirmar que el server recibe el body
app.post('/webhook-test', (req, res) => {
  console.log("📩 Webhook recibido en /webhook-test");
  console.log("Body recibido:", req.body);   // 👀 Deberías ver From y Body acá
  res.sendStatus(200);
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});
