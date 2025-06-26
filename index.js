const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para recibir x-www-form-urlencoded (como Twilio lo envía)
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("✅ El bot Espinillo está corriendo correctamente.");
});

app.post("/whatsapp", (req, res) => {
  const { Body, From } = req.body;

  console.log("📩 Mensaje recibido desde Twilio:");
  console.log("De:", From);
  console.log("Mensaje:", Body);

  // Enviar respuesta en formato TwiML (texto plano XML)
  res.set("Content-Type", "text/xml");
  console.log("✅ Twilio envió algo:", req.body);
  res.send(`
    <Response>
      <Message>Hola ${From}, dijiste: ${Body}</Message>
    </Response>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
