import React, { useState, useRef, useEffect } from "react";

export default function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // Text to speech
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "mr-IN";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  // Voice input
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("तुमचा browser voice support करत नाही. Chrome वापरा.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "mr-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
  };

  const sendMessage = async (text) => {
    const msgText = text || message;
    if (!msgText.trim() || loading) return;

    const userMsg = { role: "user", text: msgText };
    const updatedChat = [...chat, userMsg];
    setChat(updatedChat);
    setMessage("");
    setLoading(true);
    window.speechSynthesis.cancel();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const res = await fetch("https://ai-farming-frontend-production.up.railway.app/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msgText, history: chat }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const data = await res.json();
      const aiReply = data.reply;

      setChat([...updatedChat, { role: "ai", text: aiReply, feedback: null }]);

      // Auto speak AI reply
      speakText(aiReply);

    } catch (err) {
      setChat([...updatedChat, {
        role: "ai",
        text: "⏳ कनेक्शन एरर. पुन्हा प्रयत्न करा.",
        feedback: null
      }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const handleFeedback = (index, type) => {
    const updated = [...chat];
    updated[index] = { ...updated[index], feedback: type };
    setChat(updated);
  };

  const suggestedQuestions = [
    { emoji: "🌾", text: "सोयाबीन काळ्या मातीत कसे पिकवायचे?" },
    { emoji: "🐛", text: "कपाशीवरील कीड नियंत्रण कसे करावे?" },
    { emoji: "💧", text: "ठिबक सिंचनाचे फायदे काय आहेत?" },
    { emoji: "🌱", text: "गव्हासाठी सर्वोत्तम खत कोणते?" },
    { emoji: "☀️", text: "मराठवाड्यात कोणते पीक चांगले येते?" },
    { emoji: "🧪", text: "जमिनीची माती परीक्षा कशी करावी?" },
  ];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      maxWidth: 640,
      margin: "0 auto",
      fontFamily: "'Segoe UI', Arial, sans-serif",
      background: "#f0f4f0"
    }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1b5e20, #2e7d32)",
        color: "white",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
      }}>
        <div style={{
          background: "rgba(255,255,255,0.2)",
          borderRadius: "50%",
          width: 42,
          height: 42,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22
        }}>🌾</div>
        <div>
          <div style={{ fontWeight: "bold", fontSize: 18, letterSpacing: 0.5 }}>
            Krushiverse
          </div>
          <div style={{ fontSize: 11, opacity: 0.85 }}>
            AI शेती सहाय्यक • Online
          </div>
        </div>
        {speaking && (
          <button
            onClick={stopSpeaking}
            style={{
              marginLeft: "auto",
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              padding: "6px 12px",
              borderRadius: 20,
              fontSize: 12,
              cursor: "pointer"
            }}
          >
            🔇 थांबवा
          </button>
        )}
        {chat.length > 0 && !speaking && (
          <button
            onClick={() => { setChat([]); stopSpeaking(); }}
            style={{
              marginLeft: "auto",
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              padding: "6px 12px",
              borderRadius: 20,
              fontSize: 12,
              cursor: "pointer"
            }}
          >
            नवीन चॅट
          </button>
        )}
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 12
      }}>

        {/* Welcome screen */}
        {chat.length === 0 && (
          <div style={{ padding: "8px 4px" }}>
            <div style={{
              textAlign: "center",
              padding: "24px 16px 20px",
              background: "white",
              borderRadius: 16,
              marginBottom: 16,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
            }}>
              <div style={{ fontSize: 52 }}>🌱</div>
              <h2 style={{ margin: "12px 0 6px", color: "#1b5e20", fontSize: 18 }}>
                नमस्ते! मी Krushiverse
              </h2>
              <p style={{ color: "#666", fontSize: 14, margin: "0 0 8px" }}>
                शेतीविषयक कोणताही प्रश्न विचारा
              </p>
              <p style={{ color: "#888", fontSize: 12, margin: 0 }}>
                🎤 बोलून विचारा किंवा टाइप करा
              </p>
            </div>

            <p style={{ fontSize: 13, color: "#888", marginBottom: 10, paddingLeft: 4 }}>
              💬 असे विचारा:
            </p>

            {suggestedQuestions.map((q, index) => (
              <button
                key={index}
                onClick={() => sendMessage(q.text)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "12px 14px",
                  marginBottom: 8,
                  background: "white",
                  border: "1px solid #e8f5e9",
                  borderRadius: 12,
                  fontSize: 14,
                  color: "#333",
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}
              >
                <span style={{ fontSize: 20 }}>{q.emoji}</span>
                <span>{q.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {chat.map((msg, index) => (
          <div key={index} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            gap: 4
          }}>
            <div style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-end",
              gap: 8
            }}>
              {msg.role === "ai" && (
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#2e7d32",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  flexShrink: 0
                }}>🌾</div>
              )}
              <div style={{
                maxWidth: "75%",
                padding: "10px 14px",
                borderRadius: msg.role === "user"
                  ? "18px 18px 4px 18px"
                  : "18px 18px 18px 4px",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #2e7d32, #388e3c)"
                  : "white",
                color: msg.role === "user" ? "white" : "#222",
                boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap"
              }}>
                {msg.text}
              </div>
            </div>

            {/* Feedback + replay buttons for AI */}
            {msg.role === "ai" && (
              <div style={{
                display: "flex",
                gap: 6,
                marginLeft: 40,
                marginTop: 2,
                flexWrap: "wrap"
              }}>
                <button
                  onClick={() => speakText(msg.text)}
                  style={{
                    background: "white",
                    border: "1px solid #e0e0e0",
                    borderRadius: 20,
                    padding: "3px 10px",
                    fontSize: 13,
                    cursor: "pointer",
                    color: "#555"
                  }}
                >
                  🔊 ऐका
                </button>
                {msg.feedback === "up" ? (
                  <span style={{ fontSize: 13, color: "#2e7d32", padding: "3px 6px" }}>✅ धन्यवाद!</span>
                ) : msg.feedback === "down" ? (
                  <span style={{ fontSize: 13, color: "#c62828", padding: "3px 6px" }}>❌ नोंदवले</span>
                ) : (
                  <>
                    <button
                      onClick={() => handleFeedback(index, "up")}
                      style={{
                        background: "white",
                        border: "1px solid #e0e0e0",
                        borderRadius: 20,
                        padding: "3px 10px",
                        fontSize: 13,
                        cursor: "pointer",
                        color: "#555"
                      }}
                    >
                      👍 बरोबर
                    </button>
                    <button
                      onClick={() => handleFeedback(index, "down")}
                      style={{
                        background: "white",
                        border: "1px solid #e0e0e0",
                        borderRadius: 20,
                        padding: "3px 10px",
                        fontSize: 13,
                        cursor: "pointer",
                        color: "#555"
                      }}
                    >
                      👎 चुकीचे
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Thinking indicator */}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#2e7d32",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16
            }}>🌾</div>
            <div style={{
              padding: "12px 16px",
              background: "white",
              borderRadius: "18px 18px 18px 4px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
              color: "#888",
              fontSize: 14
            }}>
              विचार करत आहे... 🌱
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: "10px 12px",
        background: "white",
        borderTop: "1px solid #e0e0e0",
        display: "flex",
        gap: 8,
        alignItems: "center",
        boxShadow: "0 -2px 8px rgba(0,0,0,0.05)"
      }}>
        {/* Mic button */}
        <button
          onClick={listening ? stopListening : startListening}
          disabled={loading}
          style={{
            width: 44,
            height: 44,
            background: listening ? "#c62828" : "#e8f5e9",
            border: listening ? "2px solid #c62828" : "2px solid #c8e6c9",
            borderRadius: "50%",
            fontSize: 20,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            animation: listening ? "pulse 1s infinite" : "none"
          }}
        >
          {listening ? "⏹️" : "🎤"}
        </button>

        <input
          type="text"
          placeholder={listening ? "ऐकत आहे..." : "शेतीविषयक प्रश्न विचारा..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: 24,
            border: "1.5px solid #c8e6c9",
            fontSize: 14,
            outline: "none",
            background: loading ? "#f9f9f9" : "white",
            color: "#333"
          }}
        />

        {/* Send button */}
        <button
          onClick={() => sendMessage()}
          disabled={loading || !message.trim()}
          style={{
            width: 44,
            height: 44,
            background: loading || !message.trim() ? "#ccc" : "#2e7d32",
            color: "white",
            border: "none",
            borderRadius: "50%",
            fontSize: 20,
            cursor: loading || !message.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          {loading ? "⏳" : "➤"}
        </button>
      </div>
    </div>
  );
}