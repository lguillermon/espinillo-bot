const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: false })); // <- para recibir datos de Twilio

app.post('/webhook', (req, res) => {
    const from = req.body.From;
    const mensaje = req.body.Body;

    console.log('📥 Mensaje recibido de:', from);
    console.log('📨 Contenido:', mensaje);

    // Podés responder automáticamente con TwiML si querés
    res.set('Content-Type', 'text/xml');
    res.send(`
        <Response>
            <Message>Hola! Gracias por tu mensaje: ${mensaje}</Message>
        </Response>
    `);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
