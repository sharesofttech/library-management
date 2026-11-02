const bcrypt = require("bcrypt");
const { User, Role, RenterListing, RentalRequest } = require("../models");
const { getListQuery, withPagination } = require("../utils/listQuery");

exports.getApprovedRenters = async (req, res) => {
  try {
    const { page, limit, search, offset, Op } = getListQuery(req.query);
    const where = { isRenter: true, approvalStatus: "approved" };
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    const result = await User.findAndCountAll({
      where,
      attributes: ["id", "name", "email", "countryCode", "phone", "createdAt", "approvalReviewedAt"],
      order: [["approvalReviewedAt", "DESC"], ["id", "DESC"]],
      limit,
      offset,
    });

    return res.json(withPagination({ renters: result.rows, count: result.count }, page, limit));
  } catch (err) {
    console.error("Get Approved Renters Error:", err);
    return res.status(500).json({ message: "Failed to fetch approved Renters" });
  }
};

exports.getApprovedRenterDetails = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: "Invalid Renter ID" });
    const renter = await User.findOne({
      where: { id, isRenter: true, approvalStatus: "approved" },
      attributes: ["id", "name", "email", "countryCode", "phone", "createdAt", "approvalReviewedAt", "approvalNote"],
      include: [{
        model: RenterListing,
        as: "renterListings",
        attributes: ["id", "title", "authorName", "categoryName", "isbn", "condition", "copyCount", "rentalPrice", "rentalPeriodDays", "weightKg", "status", "adminNote", "coverImage", "createdAt", "reviewedAt"],
        include: [{
          model: RentalRequest,
          as: "rentalRequests",
          attributes: ["id", "status", "handoverMethod", "createdAt", "reviewedAt"],
          include: [{ model: User, as: "reader", attributes: ["id", "name", "email"] }],
        }],
      }],
      order: [[{ model: RenterListing, as: "renterListings" }, "createdAt", "DESC"]],
    });
    if (!renter) return res.status(404).json({ message: "Approved Renter not found" });
    return res.json({ renter });
  } catch (err) {
    console.error("Get Approved Renter Details Error:", err);
    return res.status(500).json({ message: "Failed to load Renter details" });
  }
};

// ── Get all users by role ──
exports.getUsersByRole = async (req, res) => {
  try {
    const { roleName } = req.params; // "user" or "librarian"

    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      return res.status(404).json({ message: `Role "${roleName}" not found` });
    }

    const { page, limit, search, offset, Op } = getListQuery(req.query);
    const where = { roleId: role.id };
    if (search) where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
    if (req.query.page || req.query.limit || search) {
      const result = await User.findAndCountAll({
        where,
        attributes: ["id", "name", "email", "countryCode", "phone", "createdAt"],
        order: [["id", "DESC"]],
        limit,
        offset,
      });
      return res.json(withPagination({ users: result.rows, count: result.count, role: roleName }, page, limit));
    }
    const users = await User.findAll({
      where: { roleId: role.id },
      attributes: ["id", "name", "email", "countryCode", "phone", "createdAt"],
      order: [["id", "DESC"]],
    });

    return res.json({ users, role: roleName });
  } catch (err) {
    console.error("Get Users Error:", err);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

// ── Get single user by ID ──
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: ["id", "name", "email", "countryCode", "phone", "roleId", "createdAt"],
      include: [{ model: Role, as: "role", attributes: ["id", "name"] }],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (err) {
    console.error("Get User By ID Error:", err);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
};

// ── Create user / librarian ──
exports.createUser = async (req, res) => {
  try {
    const { name, email, countryCode, phone, password, confirmPassword, roleName } = req.body;

    if (!name || !email || !countryCode || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const role = await Role.findOne({ where: { name: roleName || "user" } });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      countryCode,
      phone,
      password: hashedPassword,
      roleId: role ? role.id : null,
    });

    return res.status(201).json({
      message: `${roleName || "User"} created successfully`,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        countryCode: newUser.countryCode,
        phone: newUser.phone,
      },
    });
  } catch (err) {
    console.error("Create User Error:", err);
    return res.status(500).json({ message: "Failed to create user" });
  }
};

// ── Update user ──
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, countryCode, phone, password, confirmPassword } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check email conflict (excluding self)
    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({ message: "Email already in use" });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (countryCode) user.countryCode = countryCode;
    if (phone) user.phone = phone;

    // Only update password if provided
    if (password) {
      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    return res.json({
      message: "User updated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        countryCode: user.countryCode,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error("Update User Error:", err);
    return res.status(500).json({ message: "Failed to update user" });
  }
};

// ── Delete user ──
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.destroy();

    return res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete User Error:", err);
    return res.status(500).json({ message: "Failed to delete user" });
  }
};
