const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { tokenFor, requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Name, email, and password are required." });
    if (String(password).length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) return res.status(409).json({ message: "An account with this email already exists." });
    const count = await User.countDocuments();
    const passwordHash = await bcrypt.hash(password, 12);
    // The first account is admin; subsequent public registrations are authors.
    const user = await User.create({ name, email, passwordHash, role: count === 0 ? "admin" : "author" });
    res.status(201).json({ token: tokenFor(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || "").toLowerCase().trim() }).select("+passwordHash");
    if (!user || !await bcrypt.compare(password || "", user.passwordHash)) return res.status(401).json({ message: "Invalid email or password." });
    res.json({ token: tokenFor(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role } });
});

module.exports = router;
