import express from "express";
import bodyParser from "body-parser";
import { OpenAI } from "openai";

const app = express();
const port = process.env.PORT || 3000;

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(bodyParser.json());

// Ruta básica para prueba
app.get("/", (req, res) => {
  res.send("Espinillo Bot está funcionando");
});

// Endpoint para recibir mensajes y responder con IA
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: "Falta el mensaje del usuario" });
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: userMessage }],
      model: "gpt-3.5-turbo",
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("Error al generar respuesta:", error);
    res.status(500).json({ error: "Error al generar respuesta" });
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
