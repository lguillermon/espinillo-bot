require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require('openai');
const twilio = require('twilio');
const { consultarDisponibilidad } = require('./utils/disponibilidad');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

app.post('/webhook', async (req, res) => {
  const userMsg = req.body.Body;
  const userNum = req.body.From;

  const opciones = await consultarDisponibilidad(userMsg);

  const prompt = `Cliente: "${userMsg}". Estoy en El Espinillo. Disponibilidad?:\n${opciones}\n
Responde como asesor amable y persuasivo. Sugiere fechas, precios, beneficios, e invita a reservar.`;

  const chat = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: [{role:'user', content: prompt}]
  });
  const respuesta = chat.data.choices[0].message.content;

  await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_NUMBER}`,
    to: userNum,
    body: respuesta
  });

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
