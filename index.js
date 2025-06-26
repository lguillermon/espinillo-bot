const express = require("express");
const app = express();
app.use(express.urlencoded({ extended: true }));

app.post("/webhook", (req, res) => {
  console.log("📨 Mensaje recibido:", req.body);
  res.send('<Response><Message>Recibido OK ✅</Message></Response>');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
