const express = require('express');
const bodyParser = require('body-parser');
const whatsappRoutes = require('./routes/whatsapp');

const app = express();

// Twilio envía x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ✅ Montamos el router en /webhook
app.use('/webhook', whatsappRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});
