import React, { useState, useRef, useEffect } from "react";

export default function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMsg = { role: "user", text: message };
    const updatedChat = [...chat, userMsg];
    setChat(updatedChat);
    setMessage("");
    setLoading(true);

    try {
      const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60000);

const res = await fetch("https://ai-farming-frontend-production.up.railway.app/api/chat", {
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message, history: chat }),
  signal: controller.signal
});

clearTimeout(timeout);
      const data = await res.json();
      setChat([...updatedChat, { role: "ai", text: data.reply }]);
    } catch (err) {
      setChat([...updatedChat, {
        role: "ai",
        text: "Connection error. Is the backend running?"
      }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      maxWidth: 640,
      margin: "0 auto",
      fontFamily: "Arial, sans-serif",
      background: "#f5f5f5"
    }}>

      {/* Header */}
      <div style={{
        background: "#2e7d32",
        color: "white",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 10
      }}>
        <span style={{ fontSize: 28 }}>🌾</span>
        <div>
          <div style={{ fontWeight: "bold", fontSize: 18 }}>Krushiverse</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>AI Farming Assistant</div>
        </div>
      </div>

      {/* Chat messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}>

        {chat.length === 0 && (
          <div style={{
            textAlign: "center",
            color: "#888",
            marginTop: 60
          }}>
            <div style={{ fontSize: 48 }}>🌱</div>
            <p style={{ fontSize: 16, marginTop: 8 }}>
              Namaste! Ask me anything about farming.
            </p>
            <p style={{ fontSize: 13, color: "#aaa" }}>
              Crops • Soil • Fertilizers • Pests • Irrigation
            </p>
          </div>
        )}

        {chat.map((msg, index) => (
          <div key={index} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
          }}>
            <div style={{
              maxWidth: "78%",
              padding: "10px 14px",
              borderRadius: msg.role === "user"
                ? "18px 18px 4px 18px"
                : "18px 18px 18px 4px",
              background: msg.role === "user" ? "#2e7d32" : "white",
              color: msg.role === "user" ? "white" : "#222",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap"
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              padding: "10px 16px",
              background: "white",
              borderRadius: "18px 18px 18px 4px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              color: "#888",
              fontSize: 14
            }}>
              Thinking... 🌱
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: 12,
        background: "white",
        borderTop: "1px solid #e0e0e0",
        display: "flex",
        gap: 8
      }}>
        <input
          type="text"
          placeholder="Ask a farming question..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 24,
            border: "1px solid #ccc",
            fontSize: 14,
            outline: "none"
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          style={{
            padding: "10px 20px",
            background: loading ? "#aaa" : "#2e7d32",
            color: "white",
            border: "none",
            borderRadius: 24,
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold"
          }}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}