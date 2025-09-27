require('dotenv').config();
const express = require('express');
const app = express();

// Middleware necesario
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Rutas
const whatsappRouter = require('./routes/whatsapp');
app.use('/', whatsappRouter);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
