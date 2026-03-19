require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const https = require("https");

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend working 🌾" });
});

// Chat route
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = String(req.body?.message || "").trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!userMessage) {
      return res.json({ reply: "Type a question first." });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are Krushiverse, an expert AI farming assistant for farmers across India.

YOUR BEHAVIOR:
- You help farmers with crop selection, fertilizers, pest control, irrigation, soil health, and weather.
- Before giving crop recommendations, ask ONE question at a time to collect context:
  1. State (if not mentioned)
  2. District (if not mentioned)
  3. Current season or month
  4. Soil type (black/red/sandy/loamy)
  5. Water availability (well/borewell/canal/rainfed)
- Once you have enough context, give specific practical advice.
- For pest/disease/fertilizer questions, answer directly without asking location.

CORRECT CROP SEASONS FOR MAHARASHTRA:
- Kharif (June-October, monsoon): Soybean, Cotton, Tur dal, Rice, Jowar, Bajra, Moong, Urad, Groundnut
- Rabi (November-March, winter): Wheat, Chickpea (Harbhara), Safflower, Sunflower, Onion, Garlic
- Summer (March-June): Watermelon, Muskmelon, Cucumber, Bottle gourd, Bitter gourd, Chilli, Tomato — only with proper irrigation. Moong and Urad are NOT summer crops.

IMPORTANT RULES:
- Never recommend Kharif crops in summer or Rabi crops in monsoon.
- Always mention water requirements.
- If unsure, say "Please confirm with your local Krishi Kendra."
- Keep answers short and practical.
- If farmer writes in Marathi, ALWAYS reply in proper Marathi using Devanagari script. Never use Roman letters for Marathi words.
- If farmer writes in Hindi, reply in proper Hindi using Devanagari script.
- If farmer writes in English, reply in simple English.`
        },
        ...history.map(h => ({
          role: h.role === "user" ? "user" : "assistant",
          content: h.text
        })),
        { role: "user", content: userMessage }
      ]
    });

    const reply = completion.choices[0].message.content;
    return res.json({ reply });

  } catch (err) {
    console.error("CHAT ERROR:", err.message);
    return res.status(500).json({
      reply: "Server error. Check your API key in .env file."
    });
  }
});

app.listen(5000, () => {
  console.log("✅ Krushiverse backend running on port 5000");
});

// Keep backend awake
setInterval(() => {
  https.get("https://krushiverse-backend-pnw1.onrender.com/api/health", (res) => {
    console.log("Keep alive ping sent");
  }).on("error", (err) => {
    console.log("Ping error:", err.message);
  });
}, 840000);