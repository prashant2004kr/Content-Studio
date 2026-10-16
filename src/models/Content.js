const mongoose = require("mongoose");

const revisionSchema = new mongoose.Schema({
  title: String,
  body: String,
  savedAt: { type: Date, default: Date.now },
  savedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { _id: true });

const contentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  excerpt: { type: String, trim: true, maxlength: 400, default: "" },
  body: { type: String, required: true, maxlength: 100000 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
  status: { type: String, enum: ["draft", "published"], default: "draft" },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  publishedAt: { type: Date, default: null },
  revisions: { type: [revisionSchema], default: [] }
}, { timestamps: true });

contentSchema.index({ title: "text", body: "text", excerpt: "text", tags: "text" });
contentSchema.index({ status: 1, updatedAt: -1 });
contentSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model("Content", contentSchema);
