require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");

const app = express();
app.use(cors());
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
          content: `You are Krushiverse, an expert AI farming assistant for farmers in Maharashtra, India, especially the Marathwada region. Give practical, simple farming advice about crops, soil, fertilizers, pests, irrigation. Keep answers short (3-5 lines). If farmer writes in Hindi or Marathi, reply in same language. Common crops: soybean, cotton, tur dal, wheat, onion, jowar, sugarcane.`
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