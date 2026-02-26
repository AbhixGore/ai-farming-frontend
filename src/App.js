import React from "react";

function App() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f4f7f6",
      padding: "40px",
      fontFamily: "Arial"
    }}>
      
      <h1 style={{ textAlign: "center", color: "#2e7d32" }}>
        🌱 AI Farming Dashboard
      </h1>

      <div style={{
        marginTop: "40px",
        display: "flex",
        justifyContent: "space-around"
      }}>

        <div style={{
          background: "white",
          padding: "20px",
          borderRadius: "10px",
          width: "250px",
          textAlign: "center",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
        }}>
          <h3>🌾 Crop Suggestion</h3>
          <p>Best crop for your soil</p>
        </div>

        <div style={{
          background: "white",
          padding: "20px",
          borderRadius: "10px",
          width: "250px",
          textAlign: "center",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
        }}>
          <h3>🌦 Weather Prediction</h3>
          <p>Real-time weather updates</p>
        </div>

        <div style={{
          background: "white",
          padding: "20px",
          borderRadius: "10px",
          width: "250px",
          textAlign: "center",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
        }}>
          <h3>💰 Market Price</h3>
          <p>Live crop market rates</p>
        </div>

      </div>

    </div>
  );
}

export default App;