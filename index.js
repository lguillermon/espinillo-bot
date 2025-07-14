const express = require('express');
const app = express();

// 👇 Middleware para formatos que usa Twilio
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // Esto solo si en algún momento usás JSON

app.post('/webhook', (req, res) => {
  console.log(req.body); // Debe mostrar { From: '...', Body: '...' }
  res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
