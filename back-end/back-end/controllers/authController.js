const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { User, Role, RegistrationVerification, sequelize } = require("../models");
const sendEmail = require("../utils/sendMail");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

exports.register = async (req, res) => {
  try {
    const { name, email, countryCode, phone, password, confirmPassword, verificationId } = req.body;

    if (!name || !email || !countryCode || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userRole = await Role.findOne({ where: { name: "user" } });
    if (!userRole) {
      return res.status(500).json({ message: "Default user role is not configured" });
    }

    const requestedRole = "user";
    const approvalStatus = "approved";

    await sequelize.transaction(async (transaction) => {
      const verification = await RegistrationVerification.findByPk(verificationId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!verification || verification.usedAt || verification.email !== normalizedEmail || verification.countryCode !== countryCode || verification.phone !== phone || !verification.emailVerified || new Date(verification.expiresAt) <= new Date()) {
        const error = new Error("Verify your email and enter a valid, unused mobile number before creating an account");
        error.status = 400;
        throw error;
      }
      if (await User.findOne({ where: { countryCode, phone }, transaction })) {
        const error = new Error("This mobile number is already registered");
        error.status = 409;
        throw error;
      }
      await User.create({
        name: name.trim(), email: normalizedEmail, countryCode, phone, password: hashedPassword,
        roleId: userRole.id, requestedRole, approvalStatus, isRenter: false,
        emailVerified: true, phoneVerified: false,
      }, { transaction });
      verification.usedAt = new Date();
      await verification.save({ transaction });
    });

    const message = "Reader account created. You can sign in now.";

    return res.status(201).json({ message, requestedRole, approvalStatus });
  } catch (err) {
    console.error("Register Error:", err);
    if (err.status) return res.status(err.status).json({ message: err.message });
    if (err.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "This email or mobile number is already registered" });
    return res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: "role" }],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.approvalStatus === "pending") {
      return res.status(403).json({
        code: "APPLICATION_PENDING",
        message: "Your account application is waiting for Admin approval.",
      });
    }
    if (user.approvalStatus === "rejected") {
      return res.status(403).json({
        code: "APPLICATION_REJECTED",
        message: user.approvalNote
          ? `Your account application was not approved. Note: ${user.approvalNote}`
          : "Your account application was not approved. Please contact the library Admin.",
      });
    }

    const roleName = user.role ? user.role.name : "user";

    const token = jwt.sign(
      { id: user.id, email: user.email, role: roleName },
      process.env.JWT_SECRET || "default_jwt_secret",
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        countryCode: user.countryCode,
        phone: user.phone,
        role: roleName,
        roleId: user.roleId,
        isRenter: Boolean(user.isRenter),
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        countryCode: user.countryCode,
        phone: user.phone,
        role: user.role ? user.role.name : "user",
        roleId: user.roleId,
        isRenter: Boolean(user.isRenter),
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (err) {
    console.error("GetMe Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const genericMsg = "If this email is registered, a reset link has been sent";

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.json({ message: genericMsg });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = hashToken(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetLink = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        text: `Reset your password using this link (valid for 15 minutes): ${resetLink}`,
        html: `
          <p>Hi ${user.name},</p>
          <p>Click the link below to reset your password. It is valid for 15 minutes.</p>
          <p><a href="${resetLink}">Reset Password</a></p>
          <p>If you did not request this, ignore this email.</p>
        `,
      });
    } catch (mailErr) {
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      console.error("Email Error:", mailErr);
      return res.status(500).json({ message: "Email could not be sent" });
    }

    return res.json({ message: genericMsg });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({
      where: {
        resetPasswordToken: hashToken(token),
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or expired" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ message: "Password reset successful. Please login." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
