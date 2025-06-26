const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Ruta raíz para verificar que el servidor esté vivo
app.get("/", (req, res) => {
  res.send("✅ El bot Espinillo está corriendo correctamente.");
});

// Ruta webhook para WhatsApp
app.post("/whatsapp", (req, res) => {
  console.log("📩 Mensaje recibido desde Twilio:", req.body);

  res.set("Content-Type", "text/xml"); // ✅ Encabezado necesario para Twilio
  res.send(`
    <Response>
      <Message>Hola! Soy el bot Espinillo 🐦</Message>
    </Response>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
