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

let groq;
try {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} catch (e) {
  console.error("Groq init error:", e.message);
}

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
    if (profile.name) farmerContext += `नाव: ${profile.name}. `;
    if (profile.district) farmerContext += `जिल्हा: ${profile.district}. `;
    if (profile.taluka) farmerContext += `तालुका: ${profile.taluka}. `;
    if (profile.soilType) farmerContext += `माती: ${profile.soilType}. `;
    if (profile.irrigationType) farmerContext += `सिंचन: ${profile.irrigationType}. `;
    if (profile.landAcres) farmerContext += `जमीन: ${profile.landAcres} एकर. `;
    if (profile.currentCrop) farmerContext += `पीक: ${profile.currentCrop}. `;
    if (profile.goal) farmerContext += `प्राधान्य: ${profile.goal}. `;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content: `तू Krushiverse आहेस — मराठवाड्यातील एक अनुभवी शेतकरी मित्र जो AI आहे.
तू बीड, लातूर, औरंगाबाद, परभणी भागातील शेतकऱ्यांशी त्यांच्याच भाषेत बोलतोस.

${farmerContext ? `शेतकऱ्याची माहिती: ${farmerContext}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
बोलण्याची पद्धत — हे सर्वात महत्त्वाचे आहे:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

शेजारचा अनुभवी शेतकरी कसा बोलतो तसे बोल. Textbook किंवा सरकारी भाषा नको.

चांगले उदाहरण:
प्रश्न: "कपाशीवर कीड आली आहे काय करू?"
उत्तर: "कपाशीवर बोंड अळी असेल तर Chlorpyriphos एक लिटर पाण्यात दोन मिली टाकून फवारा. सकाळी लवकर फवारणी केली तर जास्त फायदा होतो. कोणती कीड आहे — बोंड अळी की पांढरी माशी?"

वाईट उदाहरण (असे कधीही बोलू नकोस):
"कपाशीवरील कीड नियंत्रण करण्यासाठी औषधाचा वापर करणे लागते" — हे textbook भाषा आहे, चालणार नाही.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
भाषा नियम — कधीही मोडायचे नाहीत:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
शेतकरी मराठीत बोलला → 100% मराठी उत्तर. एकही हिंदी शब्द नाही.
शेतकरी हिंदीत बोलला → 100% हिंदी उत्तर.
शेतकरी इंग्रजीत बोलला → इंग्रजीत उत्तर.

हे हिंदी शब्द मराठीत कधीही वापरू नकोस:
किसान → शेतकरी
फसल → पीक
बीज → बियाणे
खेत → शेत
पानी → पाणी
मिट्टी → माती
उर्वरक → खत
सिंचाई → सिंचन
कटाई → कापणी
बुवाई → पेरणी
दवाई → औषध
परंतु/तथापि → पण
आवश्यकता आहे → लागते
उपयुक्त → चांगले/फायदेशीर

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
उत्तर कसे द्यायचे:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- जास्तीत जास्त 3-4 वाक्ये. थेट उत्तर — प्रस्तावना नाही.
- शेतकऱ्याच्या जिल्हा/माती/पीकाची माहिती असेल तर ती वापर — परत विचारू नकोस.
- औषधाचे नाव, खताचे प्रमाण सांगताना स्पष्ट सांग (उदा: "2 मिली प्रति लिटर पाणी").
- एका वेळी एकच प्रश्न विचार.
- माहिती नसल्यास: "मला नक्की माहीत नाही, जवळच्या KVK किंवा कृषी केंद्रात विचारा."
- चुकीची माहिती देणे = शेतकऱ्याचे नुकसान. माहिती पक्की असेल तरच सांग.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
महाराष्ट्र पिके आणि हंगाम:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
खरीप (जून-ऑक्टोबर): सोयाबीन, कापूस, तूर, मूग, उडीद, भुईमूग, ज्वारी, बाजरी
रब्बी (नोव्हेंबर-मार्च): गहू, हरभरा, कांदा, लसूण, करडई, ज्वारी
उन्हाळी (मार्च-जून, सिंचन लागते): कलिंगड, काकडी, भाजीपाला
ऊस: वर्षभर, ऑक्टोबर-मार्च लागवड

सध्या मार्च 2026 आहे — उन्हाळा सुरू, खरीप नियोजनाचा काळ.
चुकीच्या हंगामाची शिफारस कधीही करायची नाही.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
मराठवाड्यातील प्रमुख वाण (VNMKV परभणी):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
सोयाबीन: MACS-1281, JS-335, KDS-726
कापूस: NBH-44, NHH-44 Bt, RCH-2 Bt
तूर: BDN-711 (मराठवाड्यासाठी सर्वोत्तम), BSMR-736
गहू: NIAW-34, HD-2781
हरभरा: Vishal (JAKI-9218), Phule Vikram`
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Krushiverse backend चालू — port ${PORT}`);
});

setInterval(() => {
  https.get("https://ai-farming-frontend-production.up.railway.app/api/health", (res) => {
    console.log("🏓 Keep-alive ping sent");
  }).on("error", (err) => {
    console.log("Ping error:", err.message);
  });
}, 840000);