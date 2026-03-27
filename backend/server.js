require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const https = require("https");
const rateLimit = require("express-rate-limit");

const app = express();

// ─────────────────────────────────────────────────────────────────────────────
// FIX 1: CORS — only allow your actual frontend, not the whole internet
// ─────────────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "https://ai-farming-frontend.vercel.app",
  "http://localhost:3000" // for local development
];
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps, curl, Postman during dev)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json({ limit: "20kb" })); // reject oversized payloads

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2: RATE LIMITING — protect Groq quota from abuse
// ─────────────────────────────────────────────────────────────────────────────
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 20,                    // max 20 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { reply: "खूप जास्त प्रश्न आले. एक मिनिट थांबा आणि पुन्हा विचारा." }
});

let groq;
try {
  if (!process.env.GROQ_API_KEY) {
    console.error("⚠️  WARNING: GROQ_API_KEY not set — chat will not work");
  } else {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    console.log("✅ Groq initialized");
  }
} catch (e) {
  console.error("Groq init error:", e.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// SOIL DATABASE — 243 lab reports, 35 villages, Chhatrapati Sambhajinagar district
// Source: Sanjivani Soil Testing Lab, VNMKV Parbhani, 10/03/2026
// ─────────────────────────────────────────────────────────────────────────────
const SOIL_DB = {
  "BHANDEGAO":      { ph_avg:7.74, ec_avg:0.405, oc_avg:0.850, n_avg:192.3, p_avg:39.2, k_avg:597.9, zn_avg:3.24, fe_avg:1.06, mn_avg:4.66, b_avg:0.052, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "BORWADI":        { ph_avg:7.72, ec_avg:0.409, oc_avg:0.867, n_avg:188.2, p_avg:31.4, k_avg:596.0, zn_avg:2.74, fe_avg:0.84, mn_avg:7.70, b_avg:0.054, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "DERHAL":         { ph_avg:7.90, ec_avg:0.297, oc_avg:0.831, n_avg:166.2, p_avg:31.2, k_avg:748.9, zn_avg:1.86, fe_avg:0.78, mn_avg:6.30, b_avg:0.028, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:4 },
  "DIVSHI":         { ph_avg:7.96, ec_avg:0.342, oc_avg:0.713, n_avg:175.6, p_avg:24.2, k_avg:508.5, zn_avg:2.64, fe_avg:0.59, mn_avg:5.99, b_avg:0.033, n_status:"LOW", p_status:"LOW",    k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:3 },
  "DOONGAON":       { ph_avg:8.06, ec_avg:0.309, oc_avg:0.720, n_avg:195.1, p_avg:38.2, k_avg:637.8, zn_avg:3.92, fe_avg:0.70, mn_avg:7.06, b_avg:0.056, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "GADHANA":        { ph_avg:7.74, ec_avg:0.330, oc_avg:0.779, n_avg:179.8, p_avg:37.6, k_avg:766.4, zn_avg:3.17, fe_avg:1.25, mn_avg:7.32, b_avg:0.051, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "GHODEGAO":       { ph_avg:8.03, ec_avg:0.293, oc_avg:0.831, n_avg:189.6, p_avg:48.8, k_avg:711.7, zn_avg:3.14, fe_avg:0.85, mn_avg:5.17, b_avg:0.053, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "GOLEGAO":        { ph_avg:8.10, ec_avg:0.327, oc_avg:0.843, n_avg:196.5, p_avg:40.2, k_avg:558.8, zn_avg:2.39, fe_avg:0.64, mn_avg:7.69, b_avg:0.041, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "JAMBHALA":       { ph_avg:7.71, ec_avg:0.266, oc_avg:0.931, n_avg:169.3, p_avg:25.3, k_avg:727.8, zn_avg:2.88, fe_avg:0.63, mn_avg:4.28, b_avg:0.050, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:2 },
  "KANADGAO":       { ph_avg:8.13, ec_avg:0.343, oc_avg:0.848, n_avg:195.1, p_avg:32.1, k_avg:647.7, zn_avg:3.91, fe_avg:1.04, mn_avg:4.58, b_avg:0.048, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "KANAKSHIL":      { ph_avg:8.31, ec_avg:0.284, oc_avg:0.756, n_avg:197.9, p_avg:30.2, k_avg:577.6, zn_avg:3.70, fe_avg:0.89, mn_avg:4.49, b_avg:0.040, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "KHADIPIMPALGAO": { ph_avg:8.05, ec_avg:0.285, oc_avg:0.889, n_avg:184.0, p_avg:29.0, k_avg:669.3, zn_avg:2.37, fe_avg:0.80, mn_avg:9.27, b_avg:0.043, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "KINVAL":         { ph_avg:7.90, ec_avg:0.325, oc_avg:0.903, n_avg:191.7, p_avg:30.4, k_avg:556.6, zn_avg:3.70, fe_avg:1.21, mn_avg:4.56, b_avg:0.046, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:7 },
  "MALKAPUR":       { ph_avg:8.05, ec_avg:0.556, oc_avg:0.723, n_avg:213.2, p_avg:48.7, k_avg:325.2, zn_avg:1.68, fe_avg:0.60, mn_avg:7.12, b_avg:0.080, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:1 },
  "MAMNAPUR":       { ph_avg:7.98, ec_avg:0.452, oc_avg:0.872, n_avg:184.0, p_avg:59.4, k_avg:545.5, zn_avg:3.43, fe_avg:0.89, mn_avg:8.32, b_avg:0.051, n_status:"LOW", p_status:"HIGH",   k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "MANAPURVADI":    { ph_avg:7.92, ec_avg:0.326, oc_avg:0.665, n_avg:188.2, p_avg:47.9, k_avg:572.2, zn_avg:2.34, fe_avg:0.98, mn_avg:4.44, b_avg:0.030, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:4 },
  "PACHPIRVADI":    { ph_avg:7.86, ec_avg:0.322, oc_avg:0.738, n_avg:200.7, p_avg:33.6, k_avg:642.1, zn_avg:4.62, fe_avg:1.46, mn_avg:5.41, b_avg:0.050, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:4 },
  "PEKALWADI":      { ph_avg:8.10, ec_avg:0.362, oc_avg:0.512, n_avg:178.8, p_avg:26.0, k_avg:566.5, zn_avg:2.22, fe_avg:1.27, mn_avg:4.95, b_avg:0.035, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:4 },
  "PIMPALWADI":     { ph_avg:8.12, ec_avg:0.428, oc_avg:0.834, n_avg:188.2, p_avg:34.5, k_avg:622.1, zn_avg:3.60, fe_avg:1.18, mn_avg:4.55, b_avg:0.044, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "POTUL":          { ph_avg:8.03, ec_avg:0.417, oc_avg:0.726, n_avg:180.6, p_avg:36.4, k_avg:506.2, zn_avg:3.50, fe_avg:0.86, mn_avg:4.72, b_avg:0.048, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:5 },
  "RAYPUR":         { ph_avg:7.77, ec_avg:0.343, oc_avg:0.709, n_avg:190.9, p_avg:39.0, k_avg:394.4, zn_avg:4.23, fe_avg:1.01, mn_avg:5.02, b_avg:0.043, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "SARAI":          { ph_avg:7.98, ec_avg:0.335, oc_avg:0.810, n_avg:188.2, p_avg:35.3, k_avg:455.5, zn_avg:2.98, fe_avg:1.11, mn_avg:4.43, b_avg:0.050, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "SHANKARPURWADI": { ph_avg:8.19, ec_avg:0.315, oc_avg:0.786, n_avg:189.6, p_avg:34.7, k_avg:710.2, zn_avg:3.68, fe_avg:1.18, mn_avg:6.11, b_avg:0.048, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "SHIRODI KHURDA": { ph_avg:8.04, ec_avg:0.398, oc_avg:0.827, n_avg:181.2, p_avg:41.0, k_avg:480.1, zn_avg:3.81, fe_avg:0.89, mn_avg:4.88, b_avg:0.073, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "SONKHEDA":       { ph_avg:8.04, ec_avg:0.331, oc_avg:0.786, n_avg:168.6, p_avg:35.2, k_avg:683.9, zn_avg:2.68, fe_avg:0.71, mn_avg:6.91, b_avg:0.042, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "TAJNAPUR":       { ph_avg:7.91, ec_avg:0.254, oc_avg:0.836, n_avg:177.0, p_avg:29.9, k_avg:535.4, zn_avg:3.28, fe_avg:0.93, mn_avg:4.18, b_avg:0.039, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "TAKLI":          { ph_avg:8.05, ec_avg:0.275, oc_avg:0.829, n_avg:188.2, p_avg:34.9, k_avg:444.7, zn_avg:3.78, fe_avg:0.88, mn_avg:5.04, b_avg:0.051, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:8 },
  "TAKLI (KODAM)":  { ph_avg:8.17, ec_avg:0.290, oc_avg:0.824, n_avg:164.5, p_avg:34.2, k_avg:547.5, zn_avg:2.68, fe_avg:0.70, mn_avg:4.80, b_avg:0.047, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "TAKLIVADI":      { ph_avg:7.82, ec_avg:0.373, oc_avg:0.677, n_avg:181.9, p_avg:23.4, k_avg:812.4, zn_avg:2.46, fe_avg:0.41, mn_avg:4.25, b_avg:0.035, n_status:"LOW", p_status:"LOW",    k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:2 },
  "TALYACHIVADI":   { ph_avg:8.06, ec_avg:0.329, oc_avg:0.677, n_avg:163.1, p_avg:35.5, k_avg:626.3, zn_avg:2.20, fe_avg:2.18, mn_avg:4.29, b_avg:0.030, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:4 },
  "VADOD BUDRUK":   { ph_avg:8.04, ec_avg:0.222, oc_avg:0.622, n_avg:172.8, p_avg:39.1, k_avg:523.7, zn_avg:2.77, fe_avg:0.92, mn_avg:5.28, b_avg:0.039, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "VARZADI":        { ph_avg:7.67, ec_avg:0.358, oc_avg:0.594, n_avg:175.6, p_avg:42.9, k_avg:523.4, zn_avg:4.43, fe_avg:1.22, mn_avg:5.46, b_avg:0.050, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:5 },
  "YESGAON-1":      { ph_avg:8.08, ec_avg:0.278, oc_avg:0.752, n_avg:185.4, p_avg:34.7, k_avg:532.1, zn_avg:3.30, fe_avg:0.77, mn_avg:5.12, b_avg:0.040, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "YESGAON-2":      { ph_avg:7.93, ec_avg:0.376, oc_avg:0.653, n_avg:190.9, p_avg:38.5, k_avg:546.3, zn_avg:4.09, fe_avg:1.04, mn_avg:4.22, b_avg:0.043, n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:9 },
  "ZATI":           { ph_avg:7.82, ec_avg:0.533, oc_avg:0.831, n_avg:175.6, p_avg:24.8, k_avg:267.5, zn_avg:2.96, fe_avg:0.88, mn_avg:4.72, b_avg:0.070, n_status:"LOW", p_status:"LOW",    k_status:"MEDIUM", zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE", samples:1 }
};

// ─────────────────────────────────────────────────────────────────────────────
// FIX 3: DISTRICT_AVERAGE — all fields filled so nothing shows as undefined
// ─────────────────────────────────────────────────────────────────────────────
const DISTRICT_AVERAGE = {
  ph_avg:7.99, ec_avg:0.335, oc_avg:0.784,
  n_avg:184.9, p_avg:36.5, k_avg:582.2,
  zn_avg:3.27, fe_avg:0.96, mn_avg:5.63, b_avg:0.047,
  n_status:"LOW", p_status:"MEDIUM", k_status:"HIGH",
  zn_status:"ADEQUATE", fe_status:"DEFICIENT", ph_type:"ALKALINE",
  samples:243,
  note:"छत्रपती संभाजीनगर जिल्हा सरासरी (243 नमुने) — गाव माहिती उपलब्ध नाही"
};

// ─────────────────────────────────────────────────────────────────────────────
// FIX 4: VILLAGE ALIASES — common spelling variations farmers or devs might type
// ─────────────────────────────────────────────────────────────────────────────
const VILLAGE_ALIASES = {
  "YESGAON": "YESGAON-1",
  "TAKLIKODAM": "TAKLI (KODAM)",
  "TAKLI KODAM": "TAKLI (KODAM)",
  "SHIRODIKHURDA": "SHIRODI KHURDA",
  "VADODBUDRUK": "VADOD BUDRUK",
  "KHADIPIMPAL": "KHADIPIMPALGAO",
};

// Lookup: exact → alias → district average (NOT taluka fallback)
function getSoilProfile(village) {
  if (!village) return null;
  const v = village.toString().trim().toUpperCase();
  if (SOIL_DB[v]) return SOIL_DB[v];
  const aliasKey = VILLAGE_ALIASES[v];
  if (aliasKey && SOIL_DB[aliasKey]) return SOIL_DB[aliasKey];
  return null; // caller decides whether to use district average
}

function buildSoilBlock(profile, village, lang) {
  // FIX 4: only use village for lookup, never taluka
  const soilData = profile || DISTRICT_AVERAGE;
  const isDistrictAvg = !!soilData.note;
  const src = isDistrictAvg
    ? `(${soilData.note})`
    : `(${soilData.samples} प्रत्यक्ष नमुने, सजीवनी लॅब 2026)`;

  const caveat = isDistrictAvg
    ? `\n⚠️  नोंद: तुमचे गाव आमच्या माहितीत नाही — हा जिल्हा सरासरी आहे. शेतकऱ्याला स्वतःची माती तपासणी करण्याचा सल्ला द्या.`
    : "";

  if (lang === "en-US") {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERIFIED SOIL DATA — ${village ? village.toUpperCase() : "CHHATRAPATI SAMBHAJINAGAR DISTRICT"} ${src}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pH: ${soilData.ph_avg} (${soilData.ph_type}) | OC: ${soilData.oc_avg}% | EC: ${soilData.ec_avg} dS/m
Nitrogen (N): ${soilData.n_avg} kg/ha → ${soilData.n_status} — most fields in this area are low on N, recommend Urea/DAP before sowing
Phosphorus (P₂O₅): ${soilData.p_avg} kg/ha → ${soilData.p_status}${soilData.p_status === "LOW" ? " — recommend SSP or DAP" : soilData.p_status === "HIGH" ? " — no extra P needed" : " — apply lightly if needed"}
Potassium (K): ${soilData.k_avg} kg/ha → ${soilData.k_status} — soil is generally rich in K, avoid unnecessary potash
Iron (Fe): ${soilData.fe_avg} ppm → ${soilData.fe_status} — recommend FeSO₄ for Fe-sensitive crops
Zinc (Zn): ${soilData.zn_avg} ppm → ${soilData.zn_status}
Boron (B): ${soilData.b_avg} ppm → generally low in this district — recommend Borax for cotton/soybean
${caveat}
GUIDANCE (based on lab averages, not individual field tests):
- Alkaline pH (${soilData.ph_avg}) — never recommend rice, potato for this soil type
- N is commonly low — Urea 100–120 kg/ha is a safe general recommendation, adjust per crop
- K is generally abundant — avoid potash unless farmer reports clear deficiency symptoms
- Always tell farmer: these are area averages, personal soil test gives best results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  // Default: Marathi (hi-IN also gets Marathi for now)
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${village ? village.toUpperCase() : "छत्रपती संभाजीनगर जिल्हा"} — माती तपासणी अहवाल ${src}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pH: ${soilData.ph_avg} (क्षारीय) | OC: ${soilData.oc_avg}% | EC: ${soilData.ec_avg} dS/m
नत्र (N): ${soilData.n_avg} kg/ha → या भागात बहुतांश शेतांत नत्र कमी आहे — पेरणीपूर्वी युरिया/DAP सुचवावे
स्फुरद (P₂O₅): ${soilData.p_avg} kg/ha → ${soilData.p_status === "LOW" ? "कमी — SSP किंवा DAP द्यावे" : soilData.p_status === "HIGH" ? "जास्त — स्फुरद खत नको" : "मध्यम — गरजेनुसार द्यावे"}
पालाश (K): ${soilData.k_avg} kg/ha → या भागात पालाश भरपूर आहे — MOP/SOP टाळावे
लोह (Fe): ${soilData.fe_avg} ppm → कमी आहे — लोहाच्या पिकांसाठी FeSO₄ 25 kg/ha सुचवावे
जस्त (Zn): ${soilData.zn_avg} ppm → पुरेसे
बोरॉन (B): ${soilData.b_avg} ppm → या जिल्ह्यात बोरॉन कमी — कापूस/सोयाबीनसाठी Borax सुचवावे
${caveat}
हे आकडे गाव सरासरी आहेत, एकट्या शेताचे नाहीत. शेतकऱ्याला स्वतःच्या शेताची माती तपासणी करण्याचा सल्ला द्यायला विसरू नकोस.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "Krushiverse backend working 🌾" });
});

function buildSystemPrompt(profile, selectedLang, farmerContext) {
  // FIX 4: only village for lookup — never use taluka as village substitute
  const village = profile?.village || null;
  const soilProfile = getSoilProfile(village);
  // if village not found, fall back to district average (not null)
  const soilBlock = buildSoilBlock(soilProfile, village, selectedLang);

  if (selectedLang === "en-US") {
    return `You are Krushiverse, an AI farming assistant for Maharashtra farmers. Reply in ENGLISH ONLY.
${farmerContext ? `Farmer profile: ${farmerContext}` : ""}
${soilBlock}

CRITICAL SAFETY RULES — NEVER BREAK THESE:
- NEVER recommend kerosene, petrol, diesel, or any fuel on crops
- NEVER give wrong chemical dosages — if unsure, say "please consult your nearest KVK or agricultural center"
- NEVER use the farmer's name unless it is provided in the profile
- NEVER give advice you are not 100% sure about — wrong farming advice = farmer's loss
- ALWAYS remind farmer that soil data is area average, not their personal field test

Answer style:
- Maximum 3 sentences. Direct and practical.
- When recommending fertilizer, use the actual soil numbers above
- If unsure: "I'm not sure about this, please visit your nearest KVK or agricultural officer"

Crops: Sugarcane needs heavy irrigation Oct-Mar. Cotton Kharif June-July. Soybean Kharif. Wheat Rabi Nov-Dec. Current: March 2026, pre-Kharif planning.`;
  }

  if (selectedLang === "hi-IN") {
    return `आप Krushiverse हैं — महाराष्ट्र के किसानों के लिए AI कृषि सहायक। सिर्फ सरल हिंदी में जवाब दें।
${farmerContext ? `किसान की जानकारी: ${farmerContext}` : ""}
${soilBlock}

महत्वपूर्ण सुरक्षा नियम:
- कभी भी केरोसीन, पेट्रोल, डीजल फसल पर लगाने की सलाह न दें
- गलत रसायन की मात्रा कभी न बताएं — अगर पक्का नहीं पता तो KVK जाने को कहें
- किसान का नाम प्रोफाइल में हो तभी इस्तेमाल करें
- हमेशा बताएं कि मिट्टी के आंकड़े क्षेत्र औसत हैं, व्यक्तिगत खेत परीक्षण नहीं

जवाब: 3 वाक्य max। खाद की सलाह में असली मिट्टी के नंबर इस्तेमाल करें।
अगर पक्का नहीं: "मुझे पक्का नहीं पता, अपने नजदीकी KVK से पूछें।"`;
  }

  // Default: Marathi
  return `तू Krushiverse आहेस — महाराष्ट्रातील शेतकऱ्यांसाठी AI शेती सहाय्यक.
फक्त सोपी मराठी वापर — हिंदी एकही शब्द नाही.
${farmerContext ? `शेतकऱ्याची माहिती: ${farmerContext}` : ""}
${soilBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
महत्त्वाचे सुरक्षा नियम — हे कधीही मोडायचे नाहीत:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. रॉकेल, पेट्रोल, डिझेल पिकावर टाकण्याचा सल्ला कधीही देऊ नकोस
2. खताचे किंवा औषधाचे चुकीचे प्रमाण सांगू नकोस
3. शेतकऱ्याचे नाव प्रोफाइलमध्ये असेल तरच वापर — स्वतः नाव बनवू नकोस
4. माती डेटा हा गाव सरासरी आहे, एकट्या शेताचा नाही — हे शेतकऱ्याला सांग
5. माहिती नसल्यास: "मला नक्की माहीत नाही, जवळच्या KVK किंवा कृषी केंद्रात विचारा."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
बोलण्याची पद्धत:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
शेजारचा अनुभवी शेतकरी जसा बोलतो तसे बोल. Textbook भाषा नको.
जास्तीत जास्त 3 वाक्ये. थेट उत्तर — प्रस्तावना नाही.
खत सुचवताना वरील माती अहवालातील खरे आकडे वापर.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
हे हिंदी शब्द मराठीत वापरू नकोस:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
किसान→शेतकरी | फसल→पीक | बीज→बियाणे | खेत→शेत | पानी→पाणी
मिट्टी→माती | उर्वरक→खत | सिंचाई→सिंचन | दवाई→औषध | परंतु→पण

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
महाराष्ट्र पिके आणि हंगाम:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ऊस: वर्षभर, ऑक्टोबर-मार्च लागवड, भरपूर पाणी लागते
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
झिंक: 25 kg ZnSO4/hectare — पेरणीपूर्वी जमिनीत मिसळावे`;
}

app.post("/api/chat", chatLimiter, async (req, res) => {
  try {
    const userMessage = String(req.body?.message || "").trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const profile = req.body?.farmerProfile || {};
    const selectedLang = req.body?.language || "mr-IN";

    if (!userMessage) {
      return res.json({ reply: "प्रश्न टाइप करा." });
    }

    // Basic message length guard
    if (userMessage.length > 500) {
      return res.json({ reply: "प्रश्न जास्त मोठा आहे. थोडक्यात विचारा." });
    }

    if (!groq) {
      return res.status(503).json({ reply: "सेवा सध्या उपलब्ध नाही. थोड्या वेळाने पुन्हा प्रयत्न करा." });
    }

    let farmerContext = "";
    if (profile.name)          farmerContext += `नाव: ${profile.name}. `;
    if (profile.district)      farmerContext += `जिल्हा: ${profile.district}. `;
    if (profile.taluka)        farmerContext += `तालुका: ${profile.taluka}. `;
    if (profile.village)       farmerContext += `गाव: ${profile.village}. `;
    if (profile.soilType)      farmerContext += `माती: ${profile.soilType}. `;
    if (profile.irrigationType)farmerContext += `सिंचन: ${profile.irrigationType}. `;
    if (profile.landAcres)     farmerContext += `जमीन: ${profile.landAcres} एकर. `;
    if (profile.currentCrop)   farmerContext += `पीक: ${profile.currentCrop}. `;
    if (profile.goal)          farmerContext += `प्राधान्य: ${profile.goal}. `;

    const systemPrompt = buildSystemPrompt(profile, selectedLang, farmerContext);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 350,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-6).map(h => ({        // only last 6 messages to avoid huge payloads
          role: h.role === "user" ? "user" : "assistant",
          content: String(h.text || h.content || "").substring(0, 500)
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

// ─────────────────────────────────────────────────────────────────────────────
// FIX 5: FEEDBACK — log more useful data to actually improve the app
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/feedback", async (req, res) => {
  try {
    const { feedbackType, messageText, aiReply, farmerProfile } = req.body;

    const village = farmerProfile?.village || "unknown";
    const soilFound = getSoilProfile(village) ? "yes" : "no (district avg used)";

    console.log("FEEDBACK:", JSON.stringify({
      type: feedbackType,                              // thumbs_up / thumbs_down
      district: farmerProfile?.district || "unknown",
      taluka: farmerProfile?.taluka || "unknown",
      village: village,
      soil_data_found: soilFound,
      crop: farmerProfile?.currentCrop || "unknown",
      lang: farmerProfile?.language || "unknown",
      question: messageText?.substring(0, 120),        // enough to see the topic
      ai_reply: aiReply?.substring(0, 200),            // enough to review quality
      timestamp: new Date().toISOString()
    }));

    return res.json({ ok: true });
  } catch (err) {
    return res.json({ ok: false });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Krushiverse backend चालू — port ${PORT}`);
  console.log(`🌱 Soil DB: ${Object.keys(SOIL_DB).length} villages, 243 lab reports`);
  console.log(`🔒 CORS: ${allowedOrigins.join(", ")}`);
});

setInterval(() => {
  https.get("https://ai-farming-frontend-production.up.railway.app/api/health", (res) => {
    console.log("🏓 Keep-alive ping sent");
  }).on("error", (err) => {
    console.log("Ping error:", err.message);
  });
}, 840000);