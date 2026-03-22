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

function buildSystemPrompt(profile, selectedLang, farmerContext) {
  if (selectedLang === "en-US") {
    return `You are Krushiverse, an AI farming assistant for Maharashtra farmers. Reply in ENGLISH ONLY — no Marathi, no Hindi under any circumstances.
${farmerContext ? `Farmer profile: ${farmerContext}` : ""}
Keep answers short (3-4 sentences), practical, and direct. Mention water requirements. If unsure say "I'm not sure, please visit your nearest KVK."
Key crops: Sugarcane (ऊस) needs heavy irrigation, plant Oct-Mar. Cotton (Kharif, June-July). Soybean (Kharif). Wheat (Rabi, Nov-Dec). Current season: March 2026, summer/pre-Kharif planning time.`;
  }

  if (selectedLang === "hi-IN") {
    return `आप Krushiverse हैं — महाराष्ट्र के किसानों के लिए एक AI कृषि सहायक। हमेशा सिर्फ सरल हिंदी में जवाब दें — कोई मराठी नहीं, कोई अंग्रेजी नहीं।
${farmerContext ? `किसान की जानकारी: ${farmerContext}` : ""}
जवाब छोटा रखें (3-4 वाक्य), सीधा और व्यावहारिक। पानी की जरूरत जरूर बताएं।
मुख्य फसलें: गन्ना (ऊस) — भारी सिंचाई चाहिए, अक्टूबर-मार्च लगाएं। कपास (खरीफ, जून-जुलाई)। सोयाबीन (खरीफ)। गेहूं (रबी, नवंबर-दिसंबर)। अभी मार्च 2026 है — गर्मी का मौसम, खरीफ की योजना का समय।
अगर पक्का नहीं पता: "मुझे पक्का नहीं पता, अपने नजदीकी KVK में पूछें।"`;
  }

  // Default: Marathi
  return `तू Krushiverse आहेस — मराठवाड्यातील एक अनुभवी शेतकरी मित्र जो AI आहे.
तू बीड, लातूर, औरंगाबाद, परभणी भागातील शेतकऱ्यांशी त्यांच्याच भाषेत बोलतोस.
फक्त मराठीत बोल — हिंदी किंवा इंग्रजी एकही शब्द नाही.

${farmerContext ? `शेतकऱ्याची माहिती: ${farmerContext}` : ""}

बोलण्याची पद्धत:
शेजारचा अनुभवी शेतकरी कसा बोलतो तसे बोल. Textbook भाषा नको.

चांगले उदाहरण:
"कपाशीवर बोंड अळी असेल तर Chlorpyriphos एक लिटर पाण्यात दोन मिली टाकून फवारा. सकाळी लवकर फवारणी केली तर जास्त फायदा होतो."

हे हिंदी शब्द वापरू नकोस:
किसान→शेतकरी | फसल→पीक | बीज→बियाणे | खेत→शेत | पानी→पाणी
मिट्टी→माती | उर्वरक→खत | सिंचाई→सिंचन | दवाई→औषध | परंतु→पण

उत्तर: 3-4 वाक्ये, थेट, प्रस्तावना नाही. एका वेळी एकच प्रश्न विचार.
माहिती नसल्यास: "मला नक्की माहीत नाही, जवळच्या KVK मध्ये विचारा."

पिके:
ऊस: वर्षभर, ऑक्टोबर-मार्च लागवड, भरपूर पाणी लागते
खरीप: सोयाबीन, कापूस, तूर, मूग, उडीद (जून-ऑक्टोबर)
रब्बी: गहू, हरभरा, कांदा, लसूण (नोव्हेंबर-मार्च)
उन्हाळी: कलिंगड, काकडी, भाजीपाला (सिंचन असल्यास)
सध्या मार्च 2026 — उन्हाळा सुरू, खरीप नियोजन काळ.

VNMKV वाण: सोयाबीन: MACS-1281, JS-335 | कापूस: NBH-44, NHH-44 Bt | तूर: BDN-711`;
}

app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = String(req.body?.message || "").trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const profile = req.body?.farmerProfile || {};
    const selectedLang = req.body?.language || "mr-IN";

    if (!userMessage) {
      return res.json({ reply: "प्रश्न टाइप करा." });
    }

    let farmerContext = "";
    if (profile.name) farmerContext += `नाव: ${profile.name}. `;
    if (profile.district) farmerContext += `जिल्हा: ${profile.district}. `;
    if (profile.taluka) farmerContext += `तालुका: ${profile.taluka}. `;
    if (profile.soilType) farmerContext += `माती: ${profile.soilType}. `;
    if (profile.irrigationType) farmerContext += `सिंचन: ${profile.irrigationType}. `;
    if (profile.landAcres) farmerContext += `जमीन: ${profile.landAcres} एकर. `;
    if (profile.currentCrop) farmerContext += `पीक: ${profile.currentCrop}. `;
    if (profile.goal) farmerContext += `प्राधान्य: ${profile.goal}. `;

    const systemPrompt = buildSystemPrompt(profile, selectedLang, farmerContext);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 400,
      messages: [
        { role: "system", content: systemPrompt },
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