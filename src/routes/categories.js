const express = require("express");
const Category = require("../models/Category");
const { requireAuth, requireRole } = require("../middleware/auth");
const router = express.Router();

const makeSlug = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

router.get("/", async (_req, res, next) => {
  try { res.json({ categories: await Category.find().sort({ name: 1 }) }); }
  catch (err) { next(err); }
});

router.post("/", requireAuth, requireRole("admin", "editor"), async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Category name is required." });
    const category = await Category.create({ name, slug: makeSlug(req.body.slug || name) });
    res.status(201).json({ category });
  } catch (err) { next(err); }
});

router.delete("/:id", requireAuth, requireRole("admin", "editor"), async (req, res, next) => {
  try { await Category.findByIdAndDelete(req.params.id); res.json({ message: "Category deleted." }); }
  catch (err) { next(err); }
});

module.exports = router;
