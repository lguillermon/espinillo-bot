const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Webhook directo sin router
app.post('/webhook', (req, res) => {
  console.log("📩 Webhook recibido en /webhook");
  console.log("➡️ Body:", req.body);

  const from = req.body.From || "desconocido";
  const body = req.body.Body || "";
  console.log(`📩 Mensaje recibido: ${body} de ${from}`);

  res.send('<Response><Message>✅ Recibido en webhook!</Message></Response>');
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});
