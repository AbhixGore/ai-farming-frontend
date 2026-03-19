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

// ─────────────────────────────────────────────────────────────────────────────
// SEASON DETECTOR — tells the AI what time of year it is right now
// ─────────────────────────────────────────────────────────────────────────────
function getCurrentSeasonContext() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const year = now.getFullYear();

  let season, seasonMarathi, advice;

  if (month >= 6 && month <= 10) {
    season = "Kharif (Monsoon)";
    seasonMarathi = "खरीप हंगाम (पावसाळा)";
    advice = "पेरणीसाठी सोयाबीन, कापूस, तूर, मूग, उडीद योग्य आहेत. पाऊस आधारित शेती.";
  } else if (month >= 11 || month <= 2) {
    season = "Rabi (Winter)";
    seasonMarathi = "रब्बी हंगाम (हिवाळा)";
    advice = "गहू, हरभरा, कांदा, लसूण, करडई पेरणीसाठी योग्य वेळ आहे.";
  } else if (month >= 3 && month <= 5) {
    season = "Summer / Pre-Kharif planning";
    seasonMarathi = "उन्हाळा / खरीप नियोजन काळ";
    advice = "उन्हाळी भाजीपाला (सिंचन असल्यास), पुढील खरीप हंगामाचे नियोजन, जमीन तयारी, बियाणे खरेदी नियोजन.";
  }

  return {
    currentDate: `${day}/${month}/${year}`,
    season,
    seasonMarathi,
    seasonalAdvice: advice
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VNMKV KNOWLEDGE BASE
// When your teammates return with data from VNMKV Parbhani, add it here.
// Format: topic → Marathi text with specific variety names, yields, recommendations.
// The system will inject relevant sections based on the farmer's question.
// ─────────────────────────────────────────────────────────────────────────────
const VNMKV_KNOWLEDGE = {
  soybean: `
VNMKV Parbhani - सोयाबीन शिफारशी (Marathwada):
- जाती: MACS-1281, JS-335, JS-9305, फुले कल्याणी, KDS-726 (फुले संगम)
- पेरणी वेळ: 15 जून ते 15 जुलै (पाऊस सुरू झाल्यावर)
- बियाणे दर: 75 kg/hectare
- खत: 25 kg N + 50 kg P2O5 + 30 kg K2O per hectare
- उत्पादन क्षमता: 20-25 quintal/hectare (चांगल्या वर्षी)
- महत्त्वाचे: पेरणीपूर्वी Rhizobium + PSB बीजप्रक्रिया करावी
`,
  cotton: `
VNMKV Parbhani - कापूस शिफारशी (Marathwada):
- जाती: NBH-44 (नांदेड 44), PKV Hy-2, Bt कापूस (NHH-44 Bt, RCH-2 Bt)
- पेरणी वेळ: 1 मे ते 15 जून (कोरडवाहू); पाऊस पडल्यावर जून 15 ते जुलै 15
- अंतर: 120×45 cm (Bt कापूस); 90×60 cm (देशी कापूस)
- खत: 100 kg N + 50 kg P2O5 + 50 kg K2O per hectare
- उत्पादन: 20-25 quintal कापूस/hectare (Bt)
- गुलाबी बोंड अळी नियंत्रण: Chlorpyriphos 20 EC (2 ml/liter पाणी)
`,
  tur: `
VNMKV Parbhani - तूर (अरहर) शिफारशी (Marathwada):
- जाती: BDN-711 (बसवंत-711), BSMR-736, PKV-Tara, Maruti
- पेरणी वेळ: 15 जून ते 15 जुलै
- बियाणे दर: 12-15 kg/hectare
- खत: 25 kg N + 50 kg P2O5 per hectare
- उत्पादन: 12-18 quintal/hectare
- BDN-711 ही वाण Marathwada साठी सर्वात शिफारशीय आहे
`,
  wheat: `
VNMKV Parbhani - गहू शिफारशी (Marathwada):
- जाती: NIAW-34, HD-2781, GW-322, NW-1014
- पेरणी वेळ: 1 नोव्हेंबर ते 15 नोव्हेंबर (उशीर झाल्यास 30 नोव्हेंबर पर्यंत)
- बियाणे दर: 100-125 kg/hectare
- खत: 120 kg N + 60 kg P2O5 + 40 kg K2O per hectare
- सिंचन: 5-6 वेळा (CRI, tillering, jointing, flowering, grain filling, dough stage)
- उत्पादन: 40-50 quintal/hectare (सिंचन असल्यास)
`,
  chickpea: `
VNMKV Parbhani - हरभरा शिफारशी (Marathwada):
- जाती: Vishal (JAKI-9218), Vijay (ICC-4958), PKV-4, Phule Vikram
- पेरणी वेळ: 15 ऑक्टोबर ते 15 नोव्हेंबर
- बियाणे दर: 75-80 kg/hectare
- खत: 25 kg N + 50 kg P2O5 per hectare
- उत्पादन: 15-20 quintal/hectare
`,
  onion: `
VNMKV Parbhani - कांदा शिफारशी (Marathwada):
- जाती: Phule Samarth, N-2-4-1, Baswant-780, Agrifound Dark Red
- रोपवाटिका: ऑगस्ट-सप्टेंबर (खरीप); नोव्हेंबर (रब्बी)
- लागवड: सप्टेंबर-ऑक्टोबर (खरीप); डिसेंबर-जानेवारी (रब्बी)
- खत: 110 kg N + 50 kg P2O5 + 50 kg K2O per hectare
- उत्पादन: 250-350 quintal/hectare
`
};

// Detects which crop topic is being discussed and returns relevant VNMKV data
function getRelevantKnowledge(message, history) {
  const fullText = (message + " " + history.map(h => h.text || "").join(" ")).toLowerCase();

  const matches = [];

  if (fullText.match(/सोयाबीन|soybean/i)) matches.push(VNMKV_KNOWLEDGE.soybean);
  if (fullText.match(/कापूस|कपाश|cotton/i)) matches.push(VNMKV_KNOWLEDGE.cotton);
  if (fullText.match(/तूर|tur|arhar/i)) matches.push(VNMKV_KNOWLEDGE.tur);
  if (fullText.match(/गहू|wheat/i)) matches.push(VNMKV_KNOWLEDGE.wheat);
  if (fullText.match(/हरभरा|chickpea|gram/i)) matches.push(VNMKV_KNOWLEDGE.chickpea);
  if (fullText.match(/कांदा|onion/i)) matches.push(VNMKV_KNOWLEDGE.onion);

  return matches.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// FARMER PROFILE FORMATTER
// Converts the profile object sent from frontend into clear context for the AI
// ─────────────────────────────────────────────────────────────────────────────
function formatFarmerProfile(profile) {
  if (!profile || Object.keys(profile).length === 0) return "";

  const lines = ["--- शेतकरी माहिती (Farmer Profile) ---"];

  if (profile.name) lines.push(`नाव: ${profile.name}`);
  if (profile.district) lines.push(`जिल्हा: ${profile.district}`);
  if (profile.taluka) lines.push(`तालुका: ${profile.taluka}`);
  if (profile.landAcres) lines.push(`जमीन: ${profile.landAcres} एकर`);
  if (profile.soilType) lines.push(`माती प्रकार: ${profile.soilType}`);
  if (profile.irrigationType) lines.push(`सिंचन: ${profile.irrigationType}`);
  if (profile.currentCrop) lines.push(`सध्याचे पीक: ${profile.currentCrop}`);
  if (profile.lastCrop) lines.push(`मागील पीक: ${profile.lastCrop}`);
  if (profile.goal) lines.push(`प्राधान्य: ${profile.goal}`);

  lines.push("--- ---");
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
// Builds a complete, grounded system prompt using all available context
// ─────────────────────────────────────────────────────────────────────────────
function buildSystemPrompt(farmerProfile, seasonContext, relevantKnowledge) {
  return `तू Krushiverse आहेस — महाराष्ट्रातील शेतकऱ्यांसाठी एक विश्वासू AI शेती सल्लागार.
तू VNMKV परभणी आणि महाराष्ट्र कृषी विभागाच्या माहितीवर आधारित सल्ला देतोस.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
आजची तारीख आणि हंगाम:
तारीख: ${seasonContext.currentDate}
हंगाम: ${seasonContext.seasonMarathi}
या हंगामात: ${seasonContext.seasonalAdvice}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${farmerProfile ? `शेतकऱ्याची माहिती:
${farmerProfile}` : "शेतकऱ्याची माहिती अजून मिळाली नाही — गरज वाटल्यास जिल्हा किंवा पीक विचारा."}

${relevantKnowledge ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VNMKV परभणी - संशोधन माहिती:
${relevantKnowledge}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` : ""}

═══════════════════════════════════════
भाषा नियम — हे नियम कधीही मोडायचे नाहीत:
═══════════════════════════════════════
- शेतकरी मराठीत बोलला → 100% शुद्ध मराठी उत्तर द्यायचे. एकही हिंदी शब्द नाही.
- शेतकरी हिंदीत बोलला → 100% शुद्ध हिंदी उत्तर.
- शेतकरी इंग्रजीत बोलला → इंग्रजीत उत्तर.
- भाषा मिसळायची नाही.

चुकीचे शब्द → बरोबर शब्द (मराठीत):
किसान → शेतकरी | फसल → पीक | बीज → बियाणे | खेत → शेत
पानी → पाणी | मिट्टी → माती | उर्वरक → खत | सिंचाई → सिंचन
कटाई → कापणी | बुवाई → पेरणी | दवाई → औषध | यातापि/तथापि → पण
आवश्यकता आहे → लागते | उपयुक्त → फायदेशीर | संदर्भात → बद्दल

═══════════════════════════════════════
बोलण्याची पद्धत:
═══════════════════════════════════════
- शेजारच्या अनुभवी शेतकऱ्यासारखे बोल — textbook नाही.
- Marathwada भागातील शेतकऱ्याला समजेल अशी सोपी भाषा वापर.
- जास्तीत जास्त 3-4 वाक्ये. थेट उत्तर द्यायचे — प्रस्तावना नाही.
- एका वेळी एकच प्रश्न विचार.
- VNMKV माहिती उपलब्ध असल्यास — जातींची नावे (BDN-711, MACS-1281 इ.) आणि खत दर नक्की सांग.
- माहिती नसल्यास: "मला नक्की माहीत नाही, तुमच्या जवळच्या कृषी केंद्रात किंवा KVK मध्ये विचारा."
- चुकीची माहिती देणे हे शेतकऱ्याच्या उत्पन्नावर थेट परिणाम करते — माहिती खात्रीशीर असेल तरच सांग.

═══════════════════════════════════════
महाराष्ट्र पिके व हंगाम:
═══════════════════════════════════════
खरीप (जून-ऑक्टोबर): सोयाबीन, कापूस, तूर, मूग, उडीद, भुईमूग, ज्वारी, बाजरी
रब्बी (नोव्हेंबर-मार्च): गहू, हरभरा, कांदा, लसूण, करडई, ज्वारी
उन्हाळी (मार्च-जून, सिंचन): कलिंगड, काकडी, भाजीपाला
ऊस: वर्षभर, ऑक्टोबर-मार्च लागवड

चुकीच्या हंगामाची शिफारस कधीही करायची नाही.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  const season = getCurrentSeasonContext();
  res.json({
    status: "Krushiverse backend चालू आहे 🌾",
    currentSeason: season.seasonMarathi,
    date: season.currentDate
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CHAT ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = String(req.body?.message || "").trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const farmerProfile = req.body?.farmerProfile || {};

    if (!userMessage) {
      return res.json({ reply: "प्रश्न टाइप करा किंवा बोलून सांगा." });
    }

    // Build context
    const seasonContext = getCurrentSeasonContext();
    const relevantKnowledge = getRelevantKnowledge(userMessage, history);
    const profileText = formatFarmerProfile(farmerProfile);
    const systemPrompt = buildSystemPrompt(profileText, seasonContext, relevantKnowledge);

    // Map history — handle both h.text and h.content for safety
    const historyMessages = history.map(h => ({
      role: h.role === "user" ? "user" : "assistant",
      content: h.text || h.content || ""
    })).filter(h => h.content.trim() !== "");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,       // Lower = more consistent, less hallucination
      max_tokens: 512,        // Keep answers short for mobile farmers
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: userMessage }
      ]
    });

    const reply = completion.choices[0].message.content;
    return res.json({ reply });

  } catch (err) {
    console.error("CHAT ERROR:", err.message);

    // Marathi error messages — never show English to farmers
    if (err.message?.includes("API key")) {
      return res.status(500).json({ reply: "सर्व्हर सेटअप चुकीचा आहे. admin ला सांगा." });
    }
    if (err.message?.includes("rate limit") || err.status === 429) {
      return res.status(429).json({ reply: "आत्ता खूप जण वापरत आहेत. एक मिनिट थांबून पुन्हा प्रयत्न करा." });
    }
    return res.status(500).json({ reply: "तांत्रिक अडचण आली. थोड्या वेळाने पुन्हा प्रयत्न करा." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK ENDPOINT
// Captures thumbs up/down with message context — ready for DB later
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/feedback", async (req, res) => {
  try {
    const { messageText, aiReply, feedbackType, farmerProfile } = req.body;

    // Log for now — when you add a DB, save here
    console.log("📊 FEEDBACK:", {
      type: feedbackType,         // "up" or "down"
      district: farmerProfile?.district || "unknown",
      question: messageText?.substring(0, 100),
      answer: aiReply?.substring(0, 100),
      timestamp: new Date().toISOString()
    });

    return res.json({ ok: true });
  } catch (err) {
    return res.json({ ok: false });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  const season = getCurrentSeasonContext();
  console.log(`✅ Krushiverse backend चालू — port ${PORT}`);
  console.log(`🌾 सध्याचा हंगाम: ${season.seasonMarathi}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// KEEP ALIVE — pings YOUR Railway backend (not the old Render URL)
// Change this URL if your Railway URL changes
// ─────────────────────────────────────────────────────────────────────────────
const BACKEND_URL = "ai-farming-frontend-production.up.railway.app";

setInterval(() => {
  https.get(`https://${BACKEND_URL}/api/health`, (res) => {
    console.log(`🏓 Keep-alive ping — status: ${res.statusCode}`);
  }).on("error", (err) => {
    console.log("⚠️ Ping error:", err.message);
  });
}, 840000); // every 14 minutes