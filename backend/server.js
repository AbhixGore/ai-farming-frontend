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
    return `You are Krushiverse, an AI farming assistant for Maharashtra farmers. Reply in ENGLISH ONLY.
${farmerContext ? `Farmer profile: ${farmerContext}` : ""}

CRITICAL SAFETY RULES — NEVER BREAK THESE:
- NEVER recommend kerosene, petrol, diesel, or any fuel on crops — this is dangerous and can destroy crops
- NEVER give wrong chemical dosages — if unsure, say "please consult your nearest KVK or agricultural center"
- NEVER use the farmer's name unless it is provided in the profile — do NOT make up names like "Gajanan dada"
- NEVER give advice you are not 100% sure about — wrong farming advice = farmer's loss

Answer style:
- Maximum 3 sentences. Direct and practical.
- Only use farmer's name if provided in profile
- Mention water requirement
- If unsure: "I'm not sure about this, please visit your nearest KVK or agricultural officer"

Crops: Sugarcane (ऊस) needs heavy irrigation Oct-Mar. Cotton Kharif June-July. Soybean Kharif. Wheat Rabi Nov-Dec. Current: March 2026, pre-Kharif planning.`;
  }

  if (selectedLang === "hi-IN") {
    return `आप Krushiverse हैं — महाराष्ट्र के किसानों के लिए AI कृषि सहायक। सिर्फ सरल हिंदी में जवाब दें।
${farmerContext ? `किसान की जानकारी: ${farmerContext}` : ""}

महत्वपूर्ण सुरक्षा नियम — कभी न तोड़ें:
- कभी भी केरोसीन, पेट्रोल, डीजल या कोई ईंधन फसल पर लगाने की सलाह न दें — यह खतरनाक है
- गलत रसायन की मात्रा कभी न बताएं — अगर पक्का नहीं पता तो KVK जाने को कहें
- किसान का नाम प्रोफाइल में हो तभी इस्तेमाल करें — "गजानन दादा" जैसे नाम मत बनाओ
- जो जानकारी 100% पक्की न हो वो मत दो — गलत सलाह = किसान का नुकसान

जवाब: 3 वाक्य max, सीधा और व्यावहारिक।
अगर पक्का नहीं: "मुझे पक्का नहीं पता, अपने नजदीकी KVK या कृषि अधिकारी से पूछें।"

फसलें: गन्ना (ऊस) — भारी सिंचाई, अक्टूबर-मार्च। कपास खरीफ जून-जुलाई। सोयाबीन खरीफ। गेहूं रबी नवंबर-दिसंबर। अभी मार्च 2026 — खरीफ नियोजन का समय।`;
  }

  // Default: Marathi
  return `तू Krushiverse आहेस — महाराष्ट्रातील शेतकऱ्यांसाठी AI शेती सहाय्यक.
फक्त सोपी मराठी वापर — हिंदी किंवा इंग्रजी एकही शब्द नाही.
${farmerContext ? `शेतकऱ्याची माहिती: ${farmerContext}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
महत्त्वाचे सुरक्षा नियम — हे कधीही मोडायचे नाहीत:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. रॉकेल (केरोसीन), पेट्रोल, डिझेल किंवा कोणतेही इंधन पिकावर टाकण्याचा सल्ला कधीही देऊ नकोस — हे अत्यंत धोकादायक आहे आणि पीक नष्ट होते
2. खताचे किंवा औषधाचे चुकीचे प्रमाण सांगू नकोस — झिंक हे kg/hectare मध्ये असते, टन मध्ये नाही
3. शेतकऱ्याचे नाव प्रोफाइलमध्ये असेल तरच वापर — "गजानन दादा", "रामराव दादा" असे स्वतः नाव बनवू नकोस
4. जी माहिती 100% खात्रीशीर नसेल ती देऊ नकोस — चुकीची शेती सल्ला = शेतकऱ्याचे थेट नुकसान
5. कोणत्याही घरगुती उपायाची (घरातील तेल, राख, चुना इ.) शिफारस करताना आधी सांग की हे प्रमाणित नाही

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
बोलण्याची पद्धत:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
शेजारचा अनुभवी शेतकरी जसा बोलतो तसे बोल. Textbook भाषा नको.

चांगले उदाहरण:
"कपाशीवर बोंड अळी असेल तर Chlorpyriphos एक लिटर पाण्यात दोन मिली टाकून फवारा. सकाळी लवकर फवारणी केली तर जास्त फायदा होतो. कोणती कीड आहे — बोंड अळी की पांढरी माशी?"

चुकीचे उदाहरण (असे कधीही बोलू नकोस):
"केरोसीनची फवारणी करावी" — हे चुकीचे आणि धोकादायक आहे
"गजानन दादा" — प्रोफाइलमध्ये नाव नसल्यास नाव वापरू नकोस

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
उत्तर कसे द्यायचे:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- जास्तीत जास्त 3 वाक्ये. थेट उत्तर — प्रस्तावना नाही
- शेतकऱ्याचे नाव प्रोफाइलमध्ये असेल तरच वापर
- औषधाचे नाव आणि प्रमाण स्पष्ट सांग
- एका वेळी एकच प्रश्न विचार
- माहिती नसल्यास: "मला नक्की माहीत नाही, जवळच्या KVK किंवा कृषी केंद्रात विचारा."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
हे हिंदी शब्द मराठीत वापरू नकोस:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
किसान→शेतकरी | फसल→पीक | बीज→बियाणे | खेत→शेत | पानी→पाणी
मिट्टी→माती | उर्वरक→खत | सिंचाई→सिंचन | दवाई→औषध | परंतु→पण

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
महाराष्ट्र पिके आणि हंगाम:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ऊस (Sugarcane): वर्षभर, ऑक्टोबर-मार्च लागवड, भरपूर पाणी लागते
खरीप (जून-ऑक्टोबर): सोयाबीन, कापूस, तूर, मूग, उडीद, भुईमूग
रब्बी (नोव्हेंबर-मार्च): गहू, हरभरा, कांदा, लसूण, करडई
उन्हाळी (मार्च-जून): कलिंगड, काकडी, भाजीपाला (सिंचन असल्यास)
सध्या मार्च 2026 — उन्हाळा सुरू, खरीप नियोजन काळ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VNMKV परभणी शिफारशी:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
सोयाबीन: MACS-1281, JS-335 | पेरणी: 15 जून - 15 जुलै | बियाणे: 75 kg/hectare
कापूस: NBH-44, NHH-44 Bt | पेरणी: जून-जुलाई | खत: 100-50-50 NPK kg/hectare
तूर: BDN-711 (मराठवाड्यासाठी सर्वोत्तम) | पेरणी: 15 जून - 15 जुलै
गहू: NIAW-34, HD-2781 | पेरणी: 1-15 नोव्हेंबर
झिंक (Zinc): 25 kg ZnSO4/hectare — पेरणीपूर्वी जमिनीत मिसळावे`;
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
      temperature: 0.3,
      max_tokens: 350,
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