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

app.get("/api/health", (req, res) => {
  res.json({ status: "Krushiverse backend working 🌾" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = String(req.body?.message || "").trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const profile = req.body?.farmerProfile || {};

    if (!userMessage) {
      return res.json({ reply: "प्रश्न टाइप करा." });
    }

    // Build farmer context
    let farmerContext = "";
    if (profile.district) farmerContext += `जिल्हा: ${profile.district}. `;
    if (profile.taluka) farmerContext += `तालुका: ${profile.taluka}. `;
    if (profile.soilType) farmerContext += `माती: ${profile.soilType}. `;
    if (profile.irrigationType) farmerContext += `सिंचन: ${profile.irrigationType}. `;
    if (profile.landAcres) farmerContext += `जमीन: ${profile.landAcres} एकर. `;
    if (profile.currentCrop) farmerContext += `सध्याचे पीक: ${profile.currentCrop}. `;
    if (profile.goal) farmerContext += `प्राथमिकता: ${profile.goal}. `;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 512,
      messages: [
        {
          role: "system",
          content: `You are Krushiverse, a friendly AI farming assistant who talks like a trusted local expert from Maharashtra village. Today is March 2026 — late Rabi season, pre-Kharif planning time.

${farmerContext ? `FARMER PROFILE (use this in every answer — do not ask again what you already know):
${farmerContext}` : ""}

STRICT LANGUAGE RULES — FOLLOW EXACTLY:
- If farmer writes in Marathi → reply in PURE simple Marathi only. Zero Hindi words allowed.
- Use words that a farmer from Beed, Latur, Aurangabad would say to his neighbor.
- WRONG WORDS TO NEVER USE IN MARATHI:
  * Never say "किसान" → always say "शेतकरी"
  * Never say "फसल" → always say "पीक"
  * Never say "बीज" → always say "बियाणे"
  * Never say "खेत" → always say "शेत"
  * Never say "पानी" → always say "पाणी"
  * Never say "मिट्टी" → always say "माती"
  * Never say "उर्वरक" → always say "खत"
  * Never say "सिंचाई" → always say "सिंचन"
  * Never say "कटाई" → always say "कापणी"
  * Never say "बुवाई" → always say "पेरणी"
  * Never say "दवाई" → always say "औषध"
  * Never say "यातापि" or "तथापि" or "परंतु" → always say "पण"
  * Never say "आवश्यकता आहे" → always say "लागते"
  * Never say "उपयुक्त" → always say "चांगले" or "फायदेशीर"
  * Never say "संदर्भात" → always say "बद्दल"
  * Never say "विशिष्ट" → always say "खास करून"
  * Never say "प्राप्त करणे" → always say "मिळवणे"
- NEVER mix Hindi words into Marathi answers.
- If farmer writes in Hindi → reply in pure simple Hindi only.
- If farmer writes in English → reply in simple English.
- NEVER mix languages in same answer.

ANSWER STYLE:
- Talk like a knowledgeable neighbor, not a professor or textbook.
- Maximum 3-4 simple sentences.
- Give direct practical advice — no long introductions.
- Never use difficult formal words.
- If you know farmer's district/soil/crop from profile, use it directly — do not ask again.
- Ask one question at a time if you need more information.

MAJOR CROPS IN MAHARASHTRA:
- Sugarcane (ऊस): Year-round crop, heavy irrigation needed, major in Marathwada, Kolhapur, Nashik, Pune. Plant October-March, harvest after 12-18 months.
- Cotton (कापूस): Kharif (June-July sowing), harvest October-January. Major in Vidarbha and Marathwada. Black soil.
- Soybean (सोयाबीन): Kharif (June-July), major cash crop in Marathwada and Vidarbha.
- Tur Dal (तूर): Kharif (June-July), harvest January-February. BDN-711 best variety for Marathwada.
- Onion (कांदा): Rabi (October-November), major in Nashik, Pune, Solapur.
- Wheat (गहू): Rabi (November-December sowing).
- Jowar (ज्वारी): Both Kharif and Rabi seasons.
- Groundnut (भुईमूग): Kharif, red soil areas.

CROP SEASONS:
- Kharif (June-October, पावसाळी): Cotton, Soybean, Tur, Rice, Jowar, Bajra, Moong, Urad, Groundnut
- Rabi (November-March, रब्बी): Wheat, Chickpea, Safflower, Onion, Garlic, Jowar
- Summer (March-June, उन्हाळी): Watermelon, Cucumber, Vegetables — only with good irrigation
- Sugarcane: Year-round, plant October-March
- NEVER recommend wrong season crops.

IMPORTANT:
- Always mention water requirement in answer.
- If unsure say "मला नक्की माहीत नाही, तुमच्या जवळच्या कृषी केंद्रात विचारा."
- Never give wrong information — it directly affects farmer's income and crop.`
        },
        ...history.map(h => ({
          role: h.role === "user" ? "user" : "assistant",
          content: h.text || h.content || ""
        })).filter(h => h.content.trim() !== ""),
        { role: "user", content: userMessage }
      ]
    });

    const reply = completion.choices[0].message.content;
    return res.json({ reply });

  } catch (err) {
    console.error("CHAT ERROR:", err.message);
    if (err.status === 401) {
      return res.status(500).json({ reply: "API key चुकीची आहे. Admin ला सांगा." });
    }
    if (err.status === 429) {
      return res.status(429).json({ reply: "आत्ता खूप जण वापरत आहेत. एक मिनिट थांबा." });
    }
    return res.status(500).json({ reply: "तांत्रिक अडचण आली. पुन्हा प्रयत्न करा." });
  }
});

app.post("/api/feedback", async (req, res) => {
  try {
    const { feedbackType, messageText, aiReply, farmerProfile } = req.body;
    console.log("FEEDBACK:", {
      type: feedbackType,
      district: farmerProfile?.district || "unknown",
      question: messageText?.substring(0, 80),
      timestamp: new Date().toISOString()
    });
    return res.json({ ok: true });
  } catch (err) {
    return res.json({ ok: false });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Krushiverse backend चालू — port ${PORT}`);
});

// Keep Railway backend awake
setInterval(() => {
  https.get("https://ai-farming-frontend-production.up.railway.app/api/health", (res) => {
    console.log("🏓 Keep-alive ping sent");
  }).on("error", (err) => {
    console.log("Ping error:", err.message);
  });
}, 840000);