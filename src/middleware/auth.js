const jwt = require("jsonwebtoken");
const User = require("../models/User");

function tokenFor(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET || "dev-only-change-this-secret", {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
  });
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : null;
    const token = req.cookies?.cmsToken || bearer;
    if (!token) return res.status(401).json({ message: "Please log in first." });
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-only-change-this-secret");
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Account not found." });
    req.user = user;
    next();
  } catch (_err) {
    return res.status(401).json({ message: "Session expired or invalid. Please log in again." });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const bearer = header.startsWith("Bearer ")
      ? header.slice(7)
      : null;

    const token = req.cookies?.cmsToken || bearer;

    if (token) {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET || "dev-only-change-this-secret"
      );

      req.user = await User.findById(payload.sub);
    }
  } catch (error) {
    req.user = null;
  }

  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action."
      });
    }

    next();
  };
}

module.exports = {
  tokenFor,
  requireAuth,
  optionalAuth,
  requireRole
};