const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

// 👇 Railway asigna el puerto en process.env.PORT (por eso dejamos esto así)
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("✅ El bot Espinillo está corriendo correctamente.");
});

// Ruta del webhook de WhatsApp
app.post("/whatsapp", (req, res) => {
  console.log("📩 Mensaje recibido desde Twilio:", req.body);

  // Header para Twilio
  res.set("Content-Type", "text/xml");

  // Respuesta TwiML
  res.send(`
    <Response>
      <Message>Hola! Soy el bot Espinillo 🐦</Message>
    </Response>
  `);
});

// Inicio del servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
