require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./src/routes/auth");
const contentRoutes = require("./src/routes/content");
const categoryRoutes = require("./src/routes/categories");
const { optionalAuth } = require("./src/middleware/auth");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));
app.use("/api/auth", authRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/categories", categoryRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ message: "API endpoint not found" });
  res.status(404).sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
  if (err.code === 11000) return res.status(409).json({ message: "That value is already in use." });
  if (err.name === "CastError") return res.status(400).json({ message: "Invalid resource ID." });
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

const port = Number(process.env.PORT || 3000);
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cms_project")
  .then(() => {
    console.log("MongoDB connected");
    app.listen(port, () => console.log(`CMS running at http://localhost:${port}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
