const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.get("/api/test", (req, res) => {
  res.json({ msg: "Hello from backend 👺" });
});
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));