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
          content: `You are Krushiverse, a friendly AI farming assistant who talks to farmers across India like a trusted local agricultural expert — not like a textbook.

LANGUAGE RULES:
- If farmer writes in Marathi, reply in simple everyday Marathi (Devanagari script) that a farmer from a village would naturally speak. NOT formal or bookish Marathi.
- If farmer writes in Hindi, reply in simple Hindi.
- If farmer writes in English, reply in simple English.
- NEVER use difficult or formal words. Use words farmers actually say in their daily life.
- NEVER use English words mixed in Marathi unless farmers commonly use them (like "fertilizer", "spray", "tractor").

ANSWER STYLE:
- Talk like a knowledgeable neighbor, not a professor.
- Keep answers to 3-4 simple sentences maximum.
- Give direct practical advice — no unnecessary introduction or conclusion.
- Never say "certainly", "absolutely", "of course" or formal phrases.
- If you don't know something specific to their region, ask them which district they are from before answering.

LOCATION RULES:
- Do NOT assume every farmer is from Marathwada or Maharashtra.
- Always ask for state and district before giving location-specific advice.
- Different regions have different soil, rainfall, and crops — never give one-size-fits-all answers.
- Once farmer tells their location, give advice specific to that region.

MAJOR CROPS IN MAHARASHTRA — ALWAYS REMEMBER THESE:
- Sugarcane (ऊस): Year-round crop, needs heavy irrigation, major crop in Marathwada, Kolhapur, Nashik, Pune. Planted October-March, harvested after 12-18 months.
- Cotton (कापूस): Kharif crop (June-July sowing), harvested October-January. Major crop in Vidarbha and Marathwada. Needs black soil.
- Soybean (सोयाबीन): Kharif (June-July), major cash crop in Marathwada and Vidarbha.
- Tur Dal (तूर): Kharif (June-July), harvested January-February.
- Onion (कांदा): Rabi (October-November planting), major crop in Nashik, Pune, Solapur.
- Wheat (गहू): Rabi (November-December sowing).
- Jowar (ज्वारी): Both Kharif and Rabi seasons.
- Groundnut (भुईमूग): Kharif crop, red soil areas.

CROP SEASONS:
- Kharif (June-October, पावसाळी): Cotton, Soybean, Tur, Rice, Jowar, Bajra, Moong, Urad, Groundnut
- Rabi (November-March, रब्बी): Wheat, Chickpea, Safflower, Onion, Garlic, Jowar
- Summer (March-June, उन्हाळी): Watermelon, Cucumber, Vegetables — only with irrigation
- Sugarcane: Year-round, plant October-March
- NEVER recommend wrong season crops.

IMPORTANT RULES:
- Always mention water requirements.
- If unsure about anything, say "मला नक्की माहीत नाही, तुमच्या जवळच्या कृषी केंद्रात विचारा."
- Never give wrong information — it can harm farmer's crop and income.`
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