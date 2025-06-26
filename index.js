const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));

app.post('/webhook', (req, res) => {
  console.log('Mensaje recibido:', req.body);
  res.send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
