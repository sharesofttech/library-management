const { User, Role } = require("../models");

// Librarians may manage ordinary library users, never staff accounts.
module.exports = async (req, res, next) => {
  if (req.user.role.name === "admin") return next();
  if (req.params.roleName && req.params.roleName !== "user") {
    return res.status(403).json({ message: "Only admins can manage librarians" });
  }
  if (req.body?.roleName && req.body.roleName !== "user") {
    return res.status(403).json({ message: "Librarians can only manage users" });
  }
  if (req.params.id) {
    try {
      const user = await User.findByPk(req.params.id, { include: [{ model: Role, as: "role" }] });
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role?.name !== "user") return res.status(403).json({ message: "Only admins can manage staff accounts" });
    } catch (err) {
      console.error("User management access error:", err);
      return res.status(500).json({ message: "Unable to verify user access" });
    }
  }
  return next();
};
