# 🤖 Espinillo Bot – Integración con GPT y API de disponibilidad

Este proyecto utiliza Node.js, Express y la API de OpenAI para responder automáticamente mensajes de usuarios sobre disponibilidad y reservas.

## 🚀 Tecnologías

- Node.js
- Express
- OpenAI API
- Railway (Deploy automático)

## 📦 Requisitos

- Node.js v18+
- Cuenta en OpenAI con una API Key válida
- Cuenta en Railway

## 🔐 Variables de entorno

Estas se cargan desde Railway en **Settings > Variables**:

| Variable         | Descripción                        |
|------------------|------------------------------------|
| `OPENAI_API_KEY` | Tu clave de API de OpenAI          |
| `PORT`           | Puerto para correr el servidor (opcional) |

## 🛠 Comandos

- `npm install` — Instala dependencias
- `node index.js` — Ejecuta el bot localmente

## 🌐 Endpoints

- `GET /` — Muestra si el bot está activo
- `POST /chat` — Recibe `{ message: "Hola" }` y responde con texto IA

## 🧠 Autor

Espinillo Bot - Proyecto IA para Termas del Guaychú
