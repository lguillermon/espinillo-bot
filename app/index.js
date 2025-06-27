const express = require('express');
const app = express();

const PORT = process.env.PORT || 8080;

app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('✅ ¡Servidor vivo y respondiendo en la raíz!');
});

// Ruta POST de prueba para webhook
app.post('/webhook', (req, res) => {
  console.log('🟢 Webhook recibido:', req.body);
  res.json({ status: 'ok', received: req.body });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
