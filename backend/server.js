require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const https = require("https");
const admin = require("firebase-admin");

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

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

// Feedback endpoint
app.post("/api/feedback", async (req, res) => {
  try {
    const { feedbackType, messageText, aiReply, farmerProfile } = req.body;
    await db.collection("feedback").add({
      feedbackType,
      question: messageText || "",
      aiReply: aiReply || "",
      district: farmerProfile?.district || "unknown",
      soilType: farmerProfile?.soilType || "",
      irrigationType: farmerProfile?.irrigationType || "",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`FEEDBACK [${feedbackType}] saved`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Feedback error:", err.message);
    res.json({ ok: false });
  }
});

// Chat route
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
      messages: [
        {
          role: "system",
          content: `You are Krushiverse, a friendly AI farming assistant who talks like a trusted local expert from Maharashtra village. Today is March 2026 — late Rabi season, pre-Kharif planning time.

${farmerContext ? `FARMER PROFILE (use this in every answer — do not ask again what you already know):
${farmerContext}` : ""}

STRICT LANGUAGE RULES:
- If farmer writes in Marathi → reply in PURE simple Marathi only. Zero Hindi words.
- Use words a farmer from Beed, Latur, Aurangabad says to his neighbor.
- NEVER use these Hindi words in Marathi:
  * "किसान" → "शेतकरी"
  * "फसल" → "पीक"
  * "बीज" → "बियाणे"
  * "खेत" → "शेत"
  * "पानी" → "पाणी"
  * "मिट्टी" → "माती"
  * "उर्वरक" → "खत"
  * "सिंचाई" → "सिंचन"
  * "कटाई" → "कापणी"
  * "बुवाई" → "पेरणी"
  * "दवाई" → "औषध"
  * "परंतु / तथापि / यातापि" → "पण"
  * "आवश्यकता आहे" → "लागते"
  * "उपयुक्त" → "चांगले"
  * "संदर्भात" → "बद्दल"
  * "विशिष्ट" → "खास करून"
- If farmer writes in Hindi → pure Hindi only.
- If farmer writes in English → simple English.
- NEVER mix languages.

ANSWER STYLE:
- Talk like a knowledgeable neighbor, not a professor.
- Maximum 3-4 simple sentences.
- Direct practical advice.
- Use farmer profile — don't ask again what you already know.

MAJOR CROPS IN MAHARASHTRA:
- Sugarcane (ऊस): Year-round, heavy irrigation, major in Marathwada, Kolhapur, Nashik. Plant Oct-Mar.
- Cotton (कापूस): Kharif June-July, harvest Oct-Jan. Black soil. Major in Vidarbha, Marathwada.
- Soybean (सोयाबीन): Kharif June-July. Major cash crop Marathwada, Vidarbha.
- Tur Dal (तूर): Kharif June-July, harvest Jan-Feb. BDN-711 popular variety.
- Onion (कांदा): Rabi Oct-Nov. Major in Nashik, Pune, Solapur.
- Wheat (गहू): Rabi Nov-Dec.
- Jowar (ज्वारी): Both Kharif and Rabi.
- Groundnut (भुईमूग): Kharif, red soil.

CROP SEASONS:
- Kharif (June-Oct): Cotton, Soybean, Tur, Rice, Jowar, Bajra, Moong, Urad, Groundnut
- Rabi (Nov-Mar): Wheat, Chickpea, Safflower, Onion, Garlic, Jowar
- Summer (Mar-Jun): Watermelon, Cucumber, Vegetables — irrigation only
- NEVER recommend wrong season crops.

IMPORTANT:
- Always mention water requirement.
- If unsure: "मला नक्की माहीत नाही, तुमच्या जवळच्या कृषी केंद्रात विचारा."
- Never give wrong info — affects farmer income directly.`
        },
        ...history.map(h => ({
          role: h.role === "user" ? "user" : "assistant",
          content: h.text || h.content || ""
        })),
        { role: "user", content: userMessage }
      ]
    });

    const reply = completion.choices[0].message.content;

    // Save to Firebase
    try {
      await db.collection("chats").add({
        question: userMessage,
        answer: reply,
        district: profile?.district || "unknown",
        soilType: profile?.soilType || "",
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.error("Firebase save error:", e.message);
    }

    return res.json({ reply });

  } catch (err) {
    console.error("CHAT ERROR:", err.message);
    return res.status(500).json({
      reply: "माफ करा, काहीतरी चूक झाली. पुन्हा प्रयत्न करा."
    });
  }
});

app.listen(5000, () => {
  console.log("✅ Krushiverse backend running on port 5000");
});

// Keep Railway backend awake
setInterval(() => {
  https.get("https://ai-farming-frontend-production.up.railway.app/api/health", (res) => {
    console.log("Keep alive ping sent");
  }).on("error", (err) => {
    console.log("Ping error:", err.message);
  });
}, 840000);