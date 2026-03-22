import React, { useState, useRef, useEffect } from "react";

const BACKEND = "https://ai-farming-frontend-production.up.railway.app";

const LANGUAGES = [
  { code: "mr-IN", label: "मराठी", flag: "🌾", desc: "Marathi" },
  { code: "hi-IN", label: "हिंदी", flag: "🇮🇳", desc: "Hindi" },
  { code: "en-US", label: "English", flag: "🌍", desc: "English" }
];

const UI = {
  "mr-IN": {
    appSubtitle: "AI शेती सहाय्यक",
    greeting: "नमस्ते! मी Krushiverse",
    subgreeting: "शेतीविषयक कोणताही प्रश्न विचारा",
    askLabel: "💬 असे विचारा:",
    placeholder: "शेतीविषयक प्रश्न विचारा...",
    listening: "ऐकत आहे...",
    thinking: "विचार करत आहे... 🌱",
    listen: "🔊 ऐका",
    stop: "⏹ थांबवा",
    correct: "👍 बरोबर",
    wrong: "👎 चुकीचे",
    thankyou: "✅ धन्यवाद!",
    noted: "❌ नोंदवले",
    newChat: "नवीन चॅट",
    editProfile: "माहिती बदला",
    laterBtn: "नंतर सांगतो",
    startBtn: "सुरू करा →",
    connError: "⏳ कनेक्शन एरर. पुन्हा प्रयत्न करा.",
    voiceHint: "🎤 बोलून विचारा किंवा टाइप करा",
    chooseLang: "भाषा निवडा",
    chooseDesc: "तुम्हाला कोणत्या भाषेत बोलायचे आहे?",
    continueBtn: "पुढे जा →",
    suggestions: [
      { emoji: "🌾", text: "या हंगामात कोणते पीक घ्यायचे?" },
      { emoji: "🌱", text: "सोयाबीनसाठी कोणती जात चांगली?" },
      { emoji: "🐛", text: "कपाशीवरील कीड नियंत्रण कसे करावे?" },
      { emoji: "💧", text: "ठिबक सिंचनाचे फायदे काय आहेत?" },
      { emoji: "🧪", text: "जमिनीची माती परीक्षा कशी करावी?" },
      { emoji: "💰", text: "सोयाबीन विकायला कधी जावे?" },
    ]
  },
  "hi-IN": {
    appSubtitle: "AI कृषि सहायक",
    greeting: "नमस्ते! मैं Krushiverse हूँ",
    subgreeting: "खेती से जुड़ा कोई भी सवाल पूछें",
    askLabel: "💬 ऐसे पूछें:",
    placeholder: "खेती से जुड़ा सवाल पूछें...",
    listening: "सुन रहा हूँ...",
    thinking: "सोच रहा हूँ... 🌱",
    listen: "🔊 सुनें",
    stop: "⏹ रोकें",
    correct: "👍 सही",
    wrong: "👎 गलत",
    thankyou: "✅ धन्यवाद!",
    noted: "❌ दर्ज किया",
    newChat: "नई चैट",
    editProfile: "जानकारी बदलें",
    laterBtn: "बाद में बताऊंगा",
    startBtn: "शुरू करें →",
    connError: "⏳ कनेक्शन एरर. फिर से कोशिश करें.",
    voiceHint: "🎤 बोलकर पूछें या टाइप करें",
    chooseDesc: "आप किस भाषा में बात करना चाहते हैं?",
    continueBtn: "आगे बढ़ें →",
    suggestions: [
      { emoji: "🌾", text: "इस मौसम में कौन सी फसल लगाएं?" },
      { emoji: "🌱", text: "सोयाबीन के लिए कौन सी किस्म अच्छी है?" },
      { emoji: "🐛", text: "कपास पर कीट नियंत्रण कैसे करें?" },
      { emoji: "💧", text: "ड्रिप सिंचाई के क्या फायदे हैं?" },
      { emoji: "🧪", text: "मिट्टी की जांच कैसे करें?" },
      { emoji: "💰", text: "सोयाबीन बेचने का सही समय कब है?" },
    ]
  },
  "en-US": {
    appSubtitle: "AI Farming Assistant",
    greeting: "Hello! I'm Krushiverse",
    subgreeting: "Ask any farming question",
    askLabel: "💬 Try asking:",
    placeholder: "Ask a farming question...",
    listening: "Listening...",
    thinking: "Thinking... 🌱",
    listen: "🔊 Listen",
    stop: "⏹ Stop",
    correct: "👍 Correct",
    wrong: "👎 Wrong",
    thankyou: "✅ Thanks!",
    noted: "❌ Noted",
    newChat: "New Chat",
    editProfile: "Edit Profile",
    laterBtn: "Skip for now",
    startBtn: "Get Started →",
    connError: "⏳ Connection error. Please try again.",
    voiceHint: "🎤 Speak or type your question",
    chooseDesc: "Which language do you prefer?",
    continueBtn: "Continue →",
    suggestions: [
      { emoji: "🌾", text: "Which crop should I grow this season?" },
      { emoji: "🌱", text: "Which soybean variety is best?" },
      { emoji: "🐛", text: "How to control pests on cotton?" },
      { emoji: "💧", text: "What are the benefits of drip irrigation?" },
      { emoji: "🧪", text: "How to test soil health?" },
      { emoji: "💰", text: "When is the best time to sell soybean?" },
    ]
  }
};

// SCREEN 1: Language Picker
function LanguageScreen({ onSelect }) {
  const [selected, setSelected] = useState("mr-IN");
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "linear-gradient(135deg, #1b5e20, #2e7d32)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000, padding: 24
    }}>
      <div style={{
        background: "white", borderRadius: 24, padding: "32px 24px",
        width: "100%", maxWidth: 360,
        boxShadow: "0 16px 48px rgba(0,0,0,0.3)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🌾</div>
          <h1 style={{ margin: "0 0 6px", color: "#1b5e20", fontSize: 22, fontWeight: "700" }}>
            Krushiverse
          </h1>
          <p style={{ color: "#888", fontSize: 14, margin: 0 }}>
            AI Farming Assistant
          </p>
        </div>

        <p style={{ textAlign: "center", color: "#555", fontSize: 15, marginBottom: 20, fontWeight: "500" }}>
          Choose your language / भाषा निवडा / भाषा चुनें
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 18px", borderRadius: 14,
                border: selected === lang.code ? "2.5px solid #2e7d32" : "1.5px solid #e0e0e0",
                background: selected === lang.code ? "#f0faf0" : "white",
                cursor: "pointer", textAlign: "left",
                transition: "all 0.15s",
                fontFamily: "'Segoe UI', Arial, sans-serif"
              }}
            >
              <span style={{ fontSize: 28 }}>{lang.flag}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 16, fontWeight: "600",
                  color: selected === lang.code ? "#1b5e20" : "#333"
                }}>
                  {lang.label}
                </div>
                <div style={{ fontSize: 12, color: "#888" }}>{lang.desc}</div>
              </div>
              {selected === lang.code && (
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "#2e7d32", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: "white", fontSize: 13, fontWeight: "bold"
                }}>✓</div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => onSelect(LANGUAGES.find(l => l.code === selected))}
          style={{
            width: "100%", padding: "14px", borderRadius: 14, border: "none",
            background: "linear-gradient(135deg, #1b5e20, #2e7d32)",
            color: "white", fontSize: 16, fontWeight: "600",
            cursor: "pointer", fontFamily: "'Segoe UI', Arial, sans-serif"
          }}
        >
          {UI[selected].continueBtn}
        </button>
      </div>
    </div>
  );
}

// SCREEN 2: Profile Form
function ProfileModal({ onSave, ui }) {
  const [form, setForm] = useState({
    name: "", district: "", taluka: "", landAcres: "",
    soilType: "", irrigationType: "", currentCrop: "", goal: ""
  });
  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1.5px solid #c8e6c9", fontSize: 14, outline: "none",
    background: "white", color: "#333", boxSizing: "border-box",
    fontFamily: "'Segoe UI', Arial, sans-serif"
  };
  const labelStyle = { fontSize: 13, color: "#2e7d32", fontWeight: "600", marginBottom: 4, display: "block" };
  const rowStyle = { marginBottom: 14 };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16
    }}>
      <div style={{
        background: "white", borderRadius: 20, padding: "24px 20px",
        width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40 }}>🌾</div>
          <h2 style={{ margin: "8px 0 4px", color: "#1b5e20", fontSize: 18 }}>आपली माहिती द्या</h2>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>चांगला सल्ला मिळण्यासाठी — सर्व ऐच्छिक आहे</p>
        </div>

        <div style={rowStyle}>
          <label style={labelStyle}>तुमचे नाव</label>
          <input style={inputStyle} placeholder="उदा: रामराव पाटील" value={form.name} onChange={e => update("name", e.target.value)} />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>जिल्हा *</label>
          <select style={inputStyle} value={form.district} onChange={e => update("district", e.target.value)}>
            <option value="">जिल्हा निवडा</option>
            <optgroup label="मराठवाडा">
              <option>औरंगाबाद (छत्रपती संभाजीनगर)</option>
              <option>बीड</option><option>नांदेड</option><option>लातूर</option>
              <option>उस्मानाबाद (धाराशिव)</option><option>परभणी</option>
              <option>हिंगोली</option><option>जालना</option>
            </optgroup>
            <optgroup label="विदर्भ">
              <option>नागपूर</option><option>अमरावती</option><option>अकोला</option>
              <option>यवतमाळ</option><option>वर्धा</option><option>बुलढाणा</option><option>वाशीम</option>
            </optgroup>
            <optgroup label="पश्चिम महाराष्ट्र">
              <option>पुणे</option><option>नाशिक</option><option>सोलापूर</option>
              <option>सातारा</option><option>सांगली</option><option>कोल्हापूर</option><option>अहमदनगर</option>
            </optgroup>
            <optgroup label="कोकण">
              <option>मुंबई</option><option>रत्नागिरी</option><option>रायगड</option>
              <option>सिंधुदुर्ग</option><option>ठाणे</option>
            </optgroup>
          </select>
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>तालुका</label>
          <input style={inputStyle} placeholder="उदा: गेवराई" value={form.taluka} onChange={e => update("taluka", e.target.value)} />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>जमीन (एकरात)</label>
          <input style={inputStyle} type="number" placeholder="उदा: 5" value={form.landAcres} onChange={e => update("landAcres", e.target.value)} />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>माती प्रकार</label>
          <select style={inputStyle} value={form.soilType} onChange={e => update("soilType", e.target.value)}>
            <option value="">माती प्रकार निवडा</option>
            <option>काळी माती (Heavy Black Soil)</option><option>मध्यम काळी माती</option>
            <option>हलकी काळी माती</option><option>लाल माती</option>
            <option>वालुकामय माती</option><option>मुरमाड माती</option>
          </select>
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>सिंचन प्रकार</label>
          <select style={inputStyle} value={form.irrigationType} onChange={e => update("irrigationType", e.target.value)}>
            <option value="">सिंचन प्रकार निवडा</option>
            <option>कोरडवाहू (फक्त पाऊस)</option><option>बोरवेल</option>
            <option>विहीर</option><option>कालवा / नहर</option>
            <option>ठिबक सिंचन</option><option>तुषार सिंचन</option>
          </select>
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>सध्याचे / नियोजित पीक</label>
          <input style={inputStyle} placeholder="उदा: सोयाबीन" value={form.currentCrop} onChange={e => update("currentCrop", e.target.value)} />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>तुमची प्राथमिकता</label>
          <select style={inputStyle} value={form.goal} onChange={e => update("goal", e.target.value)}>
            <option value="">प्राथमिकता निवडा</option>
            <option>जास्त नफा (High Profit)</option><option>स्थिर उत्पन्न (Stable Income)</option>
            <option>कमी खर्च (Low Cost)</option><option>पाण्याची बचत (Water Saving)</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={() => onSave({})} style={{
            flex: 1, padding: "11px", borderRadius: 12, border: "1.5px solid #c8e6c9",
            background: "white", color: "#2e7d32", fontSize: 14, cursor: "pointer",
            fontFamily: "'Segoe UI', Arial, sans-serif"
          }}>{ui.laterBtn}</button>
          <button onClick={() => onSave(form)} style={{
            flex: 2, padding: "11px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #1b5e20, #2e7d32)",
            color: "white", fontSize: 14, fontWeight: "600", cursor: "pointer",
            fontFamily: "'Segoe UI', Arial, sans-serif"
          }}>{ui.startBtn}</button>
        </div>
      </div>
    </div>
  );
}

// MAIN APP
export default function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [farmerProfile, setFarmerProfile] = useState(null);
  const [language, setLanguage] = useState(null); // null = show language screen
  const [showLangPicker, setShowLangPicker] = useState(false);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");

  const ui = language ? UI[language.code] : UI["mr-IN"];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  useEffect(() => {
    if (chat.length > 0) window.history.pushState({ chat: true }, "");
    else window.history.pushState({ chat: false }, "");
    const handleBack = () => { setChat([]); window.speechSynthesis.cancel(); setSpeakingIndex(null); };
    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, [chat]);

  const handleSpeakToggle = (index, text) => {
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    setSpeakingIndex(null);
    if (!window.speechSynthesis) return;
    const cleanText = text.replace(/[*#•-]/g, "").replace(/\d+\./g, "")
      .replace(/\n+/g, ". ").replace(/[:]/g, "").replace(/\s+/g, " ").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const langCode = language?.code || "mr-IN";
    const langVoice = voices.find(v => v.lang === langCode);
    const fallback = voices.find(v => v.lang === "hi-IN");
    if (langVoice) { utterance.voice = langVoice; utterance.lang = langCode; }
    else if (fallback) { utterance.voice = fallback; utterance.lang = "hi-IN"; }
    else { utterance.lang = langCode; }
    utterance.rate = 0.85; utterance.pitch = 1.1; utterance.volume = 1;
    utterance.onstart = () => setSpeakingIndex(index);
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice not supported. Use Chrome."); return; }
    const currentText = message.trim() ? message.trim() + " " : "";
    finalTranscriptRef.current = currentText;
    const recognition = new SR();
    recognition.lang = language?.code || "mr-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      let newFinal = ""; let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) newFinal += t + " ";
        else interim += t;
      }
      if (newFinal) {
        const updated = finalTranscriptRef.current + newFinal;
        finalTranscriptRef.current = updated;
        setMessage(updated.trim());
      } else setMessage(finalTranscriptRef.current + interim);
    };
    recognition.onerror = () => { setListening(false); setMessage(finalTranscriptRef.current.trim()); };
    recognition.onend = () => { setListening(false); setMessage(finalTranscriptRef.current.trim()); };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setListening(false);
  };

  const sendMessage = async (text) => {
    const msgText = text || message;
    if (!msgText.trim() || loading) return;
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setListening(false);
    finalTranscriptRef.current = "";
    const userMsg = { role: "user", text: msgText };
    const updatedChat = [...chat, userMsg];
    setChat(updatedChat);
    setMessage("");
    setLoading(true);
    window.speechSynthesis.cancel();
    setSpeakingIndex(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(`${BACKEND}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msgText, history: chat,
          farmerProfile: farmerProfile || {},
          language: language?.code || "mr-IN"
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      const aiReply = data.reply;
      const newIndex = updatedChat.length;
      setChat([...updatedChat, { role: "ai", text: aiReply, feedback: null, userMsg: msgText }]);
      setTimeout(() => handleSpeakToggle(newIndex, aiReply), 300);
    } catch (err) {
      setChat([...updatedChat, { role: "ai", text: ui.connError, feedback: null }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") sendMessage(); };

  const handleFeedback = async (index, type) => {
    const updated = [...chat];
    updated[index] = { ...updated[index], feedback: type };
    setChat(updated);
    try {
      await fetch(`${BACKEND}/api/feedback`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackType: type, messageText: chat[index]?.userMsg || "",
          aiReply: chat[index]?.text || "", farmerProfile: farmerProfile || {}
        })
      });
    } catch (_) {}
  };

  const ProfileBadge = () => {
    if (!farmerProfile || !farmerProfile.district) return null;
    return (
      <div style={{
        fontSize: 11, background: "rgba(255,255,255,0.15)", borderRadius: 12,
        padding: "3px 8px", color: "rgba(255,255,255,0.9)",
        maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
      }}>📍 {farmerProfile.district}{farmerProfile.landAcres ? ` · ${farmerProfile.landAcres}ac` : ""}</div>
    );
  };

  // SCREEN 1: Language selection
  if (!language) {
    return <LanguageScreen onSelect={(lang) => { setLanguage(lang); }} />;
  }

  // SCREEN 2: Profile form
  if (farmerProfile === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 640, margin: "0 auto", fontFamily: "'Segoe UI', Arial, sans-serif", background: "#f0f4f0" }}>
        <ProfileModal onSave={(p) => setFarmerProfile(p)} ui={ui} />
      </div>
    );
  }

  // SCREEN 3: Chat
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 640, margin: "0 auto", fontFamily: "'Segoe UI', Arial, sans-serif", background: "#f0f4f0" }}>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #1b5e20, #2e7d32)", color: "white", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
        <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🌾</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: "bold", fontSize: 17, letterSpacing: 0.5 }}>Krushiverse</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, opacity: 0.85 }}>{ui.appSubtitle}</span>
            <ProfileBadge />
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
          {/* Language switcher in header */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowLangPicker(!showLangPicker)} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "5px 10px", borderRadius: 16, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              {language.flag} {language.label}
            </button>
            {showLangPicker && (
              <div style={{ position: "absolute", top: 36, right: 0, background: "white", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", zIndex: 100, overflow: "hidden", minWidth: 130 }}>
                {LANGUAGES.map(lang => (
                  <button key={lang.code} onClick={() => { setLanguage(lang); setShowLangPicker(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", border: "none", background: language.code === lang.code ? "#e8f5e9" : "white", color: "#333", fontSize: 14, cursor: "pointer", fontFamily: "'Segoe UI', Arial, sans-serif", borderBottom: "1px solid #f0f0f0" }}>
                    <span>{lang.flag}</span>
                    <span style={{ fontWeight: language.code === lang.code ? "600" : "400" }}>{lang.label}</span>
                    {language.code === lang.code && <span style={{ marginLeft: "auto", color: "#2e7d32" }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setFarmerProfile(null)} title={ui.editProfile} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "5px 9px", borderRadius: 16, fontSize: 13, cursor: "pointer" }}>✏️</button>
          {chat.length > 0 && (
            <button onClick={() => { setChat([]); window.speechSynthesis.cancel(); setSpeakingIndex(null); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "5px 10px", borderRadius: 16, fontSize: 12, cursor: "pointer" }}>{ui.newChat}</button>
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 12 }} onClick={() => showLangPicker && setShowLangPicker(false)}>
        {chat.length === 0 && (
          <div style={{ padding: "8px 4px" }}>
            <div style={{ textAlign: "center", padding: "24px 16px 20px", background: "white", borderRadius: 16, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: 48 }}>🌱</div>
              <h2 style={{ margin: "10px 0 4px", color: "#1b5e20", fontSize: 18 }}>
                {farmerProfile?.name ? `${language.code === "en-US" ? "Hello" : "नमस्ते"}, ${farmerProfile.name}!` : ui.greeting}
              </h2>
              <p style={{ color: "#666", fontSize: 14, margin: "0 0 6px" }}>{ui.subgreeting}</p>
              {farmerProfile?.district && (
                <p style={{ color: "#2e7d32", fontSize: 13, margin: "0 0 4px", fontWeight: "500" }}>
                  📍 {farmerProfile.district}
                  {farmerProfile.irrigationType ? ` · ${farmerProfile.irrigationType}` : ""}
                  {farmerProfile.landAcres ? ` · ${farmerProfile.landAcres} ${language.code === "en-US" ? "acres" : "एकर"}` : ""}
                </p>
              )}
              <p style={{ color: "#999", fontSize: 12, margin: 0 }}>{ui.voiceHint}</p>
            </div>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 10, paddingLeft: 4 }}>{ui.askLabel}</p>
            {ui.suggestions.map((q, index) => (
              <button key={index} onClick={() => sendMessage(q.text)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 14px", marginBottom: 8, background: "white", border: "1px solid #e8f5e9", borderRadius: 12, fontSize: 14, color: "#333", cursor: "pointer", textAlign: "left", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
                <span style={{ fontSize: 18 }}>{q.emoji}</span>
                <span>{q.text}</span>
              </button>
            ))}
          </div>
        )}

        {chat.map((msg, index) => (
          <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
              {msg.role === "ai" && (
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#2e7d32", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>🌾</div>
              )}
              <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: msg.role === "user" ? "linear-gradient(135deg, #2e7d32, #388e3c)" : "white", color: msg.role === "user" ? "white" : "#222", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                {msg.text}
              </div>
            </div>
            {msg.role === "ai" && (
              <div style={{ display: "flex", gap: 6, marginLeft: 38, marginTop: 2, flexWrap: "wrap" }}>
                <button onClick={() => handleSpeakToggle(index, msg.text)} style={{ background: speakingIndex === index ? "#e8f5e9" : "white", border: speakingIndex === index ? "1px solid #2e7d32" : "1px solid #e0e0e0", borderRadius: 20, padding: "3px 10px", fontSize: 13, cursor: "pointer", color: speakingIndex === index ? "#2e7d32" : "#555", fontFamily: "'Segoe UI', Arial, sans-serif", transition: "all 0.2s" }}>
                  {speakingIndex === index ? ui.stop : ui.listen}
                </button>
                {msg.feedback === "up" ? (
                  <span style={{ fontSize: 13, color: "#2e7d32", padding: "3px 6px" }}>{ui.thankyou}</span>
                ) : msg.feedback === "down" ? (
                  <span style={{ fontSize: 13, color: "#c62828", padding: "3px 6px" }}>{ui.noted}</span>
                ) : (
                  <>
                    <button onClick={() => handleFeedback(index, "up")} style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: 20, padding: "3px 10px", fontSize: 13, cursor: "pointer", color: "#555", fontFamily: "'Segoe UI', Arial, sans-serif" }}>{ui.correct}</button>
                    <button onClick={() => handleFeedback(index, "down")} style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: 20, padding: "3px 10px", fontSize: 13, cursor: "pointer", color: "#555", fontFamily: "'Segoe UI', Arial, sans-serif" }}>{ui.wrong}</button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#2e7d32", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🌾</div>
            <div style={{ padding: "11px 16px", background: "white", borderRadius: "18px 18px 18px 4px", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", color: "#888", fontSize: 14 }}>{ui.thinking}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* INPUT BAR */}
      <div style={{ padding: "10px 12px", background: "white", borderTop: "1px solid #e0e0e0", display: "flex", gap: 8, alignItems: "center", boxShadow: "0 -2px 8px rgba(0,0,0,0.05)" }}>
        <button onClick={listening ? stopListening : startListening} disabled={loading} style={{ width: 44, height: 44, background: listening ? "#c62828" : "#e8f5e9", border: listening ? "2px solid #c62828" : "2px solid #c8e6c9", borderRadius: "50%", fontSize: 20, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {listening ? "⏹️" : "🎤"}
        </button>
        <input type="text" placeholder={listening ? ui.listening : ui.placeholder} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={handleKeyDown} disabled={loading} style={{ flex: 1, padding: "10px 16px", borderRadius: 24, border: "1.5px solid #c8e6c9", fontSize: 14, outline: "none", background: loading ? "#f9f9f9" : "white", color: "#333", fontFamily: "'Segoe UI', Arial, sans-serif" }} />
        <button onClick={() => sendMessage()} disabled={loading || !message.trim()} style={{ width: 44, height: 44, background: loading || !message.trim() ? "#ccc" : "#2e7d32", color: "white", border: "none", borderRadius: "50%", fontSize: 20, cursor: loading || !message.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {loading ? "⏳" : "➤"}
        </button>
      </div>
    </div>
  );
}