const express = require("express");
const Content = require("../models/Content");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const router = express.Router();

const makeSlug = (s) => String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const populateFields = "title slug excerpt body category tags status author publishedAt createdAt updatedAt revisions";

function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map(t => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 20);
}

router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const { q, category, tag, status, page = 1, limit = 10, mine } = req.query;
    const filter = {};
    if (req.user && (status === "draft" || status === "published") && (mine === "true" || status === "draft")) {
      filter.status = status;
      if (mine === "true" || status === "draft") filter.author = req.user._id;
    } else {
      filter.status = "published";
    }
    if (category) filter.category = category;
    if (tag) filter.tags = String(tag).toLowerCase();
    if (q) filter.$text = { $search: String(q) };
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const [items, total] = await Promise.all([
      Content.find(filter).select("-body -revisions").populate("category", "name slug").populate("author", "name").sort({ publishedAt: -1, updatedAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit),
      Content.countDocuments(filter)
    ]);
    res.json({ items, page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) });
  } catch (err) { next(err); }
});

router.get("/:idOrSlug", optionalAuth, async (req, res, next) => {
  try {
    const key = req.params.idOrSlug;
    const isId = /^[0-9a-fA-F]{24}$/.test(key);
    const item = await Content.findOne(isId ? { _id: key } : { slug: key }).populate("category", "name slug").populate("author", "name");
    if (!item) return res.status(404).json({ message: "Content not found." });
    const isOwner = req.user && item.author && item.author._id.toString() === req.user._id.toString();
    if (item.status !== "published" && !isOwner && req.user?.role !== "admin" && req.user?.role !== "editor") {
      return res.status(404).json({ message: "Content not found." });
    }
    res.json({ item });
  } catch (err) { next(err); }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { title, body, excerpt, category, status } = req.body;
    if (!title?.trim() || !body?.trim()) return res.status(400).json({ message: "Title and body are required." });
    let slug = makeSlug(req.body.slug || title) || `content-${Date.now()}`;
    if (await Content.exists({ slug })) slug = `${slug}-${Date.now().toString().slice(-6)}`;
    const publish = status === "published";
    const item = await Content.create({
      title: title.trim(), slug, body: body.trim(), excerpt: String(excerpt || "").trim(),
      category: category || null, tags: cleanTags(req.body.tags), status: publish ? "published" : "draft",
      publishedAt: publish ? new Date() : null, author: req.user._id
    });
    res.status(201).json({ item });
  } catch (err) { next(err); }
});

router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const item = await Content.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Content not found." });
    const isOwner = item.author.toString() === req.user._id.toString();
    if (!isOwner && !["admin", "editor"].includes(req.user.role)) return res.status(403).json({ message: "You cannot edit this content." });
    if (item.title !== req.body.title || item.body !== req.body.body) {
      item.revisions.push({ title: item.title, body: item.body, savedBy: req.user._id, savedAt: new Date() });
      if (item.revisions.length > 20) item.revisions.shift();
    }
    if (req.body.title !== undefined) item.title = String(req.body.title).trim();
    if (req.body.body !== undefined) item.body = String(req.body.body).trim();
    if (req.body.excerpt !== undefined) item.excerpt = String(req.body.excerpt).trim();
    if (req.body.category !== undefined) item.category = req.body.category || null;
    if (req.body.tags !== undefined) item.tags = cleanTags(req.body.tags);
    if (req.body.status !== undefined) {
      item.status = req.body.status === "published" ? "published" : "draft";
      item.publishedAt = item.status === "published" ? (item.publishedAt || new Date()) : null;
    }
    if (req.body.slug) {
      const slug = makeSlug(req.body.slug);
      const duplicate = await Content.findOne({ slug, _id: { $ne: item._id } });
      if (duplicate) return res.status(409).json({ message: "That slug is already in use." });
      item.slug = slug;
    }
    await item.save();
    res.json({ item });
  } catch (err) { next(err); }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const item = await Content.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Content not found." });
    if (item.author.toString() !== req.user._id.toString() && req.user.role !== "admin") return res.status(403).json({ message: "You cannot delete this content." });
    await item.deleteOne();
    res.json({ message: "Content deleted." });
  } catch (err) { next(err); }
});

router.get("/:id/revisions", requireAuth, async (req, res, next) => {
  try {
    const item = await Content.findById(req.params.id).select("author revisions");
    if (!item) return res.status(404).json({ message: "Content not found." });
    if (item.author.toString() !== req.user._id.toString() && !["admin", "editor"].includes(req.user.role)) return res.status(403).json({ message: "Not permitted." });
    res.json({ revisions: item.revisions });
  } catch (err) { next(err); }
});

module.exports = router;
