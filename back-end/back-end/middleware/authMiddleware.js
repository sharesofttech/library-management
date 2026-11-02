const jwt = require("jsonwebtoken");
const { User, Role } = require("../models");

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret");

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: "role" }],
      attributes: { exclude: ["password", "resetPasswordToken", "resetPasswordExpires"] },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid session. User not found." });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Access forbidden: No role assigned." });
    }

    const userRole = req.user.role.name;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: `Forbidden: Requires one of [${allowedRoles.join(", ")}] roles.`,
      });
    }

    next();
  };
};

const requireApprovedRenter = (req, res, next) => {
  if (req.user?.approvalStatus !== "approved" || !req.user?.isRenter) {
    return res.status(403).json({ message: "Approved Renter access is required." });
  }
  return next();
};

module.exports = {
  verifyToken,
  requireRole,
  requireApprovedRenter,
  requireAdmin: requireRole("admin"),
};
