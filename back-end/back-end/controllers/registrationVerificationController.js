const crypto = require("crypto");
const { Op } = require("sequelize");
const { User, RegistrationVerification } = require("../models");
const sendEmail = require("../utils/sendMail");

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;
const secret = () => process.env.OTP_SECRET || process.env.JWT_SECRET || "local-development-otp-secret";
const hashCode = (code) => crypto.createHmac("sha256", secret()).update(code).digest("hex");
const safeEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const newCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");
const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

const sendEmailCode = async (email, name, code) => {
  if (process.env.NODE_ENV === "production" && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) throw new Error("Email verification is not configured");
  await sendEmail({ to: email, subject: "Your Library Portal verification code", text: `Hello ${name || "there"}, your email verification code is ${code}. It expires in 10 minutes.`, html: `<p>Hello ${escapeHtml(name || "there")},</p><p>Your email verification code is <strong>${code}</strong>.</p><p>This code expires in 10 minutes. If you did not request it, ignore this email.</p>` });
};

exports.start = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const countryCode = String(req.body.countryCode || "").trim();
  const phone = String(req.body.phone || "").replace(/\D/g, "");
  const name = String(req.body.name || "").trim().slice(0, 100);
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^\+\d{1,5}$/.test(countryCode) || !/^\d{10}$/.test(phone)) return res.status(400).json({ message: "Enter a valid email and 10-digit mobile number" });

  try {
    if (await User.findOne({ where: { [Op.or]: [{ email }, { countryCode, phone }] } })) return res.status(409).json({ message: "This email or mobile number is already registered" });
    const existing = await RegistrationVerification.findOne({ where: { email, countryCode, phone, usedAt: null }, order: [["createdAt", "DESC"]] });
    const now = new Date();
    if (existing && now - new Date(existing.lastSentAt) < RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - (now - new Date(existing.lastSentAt))) / 1000);
      return res.status(429).json({ message: "Wait before requesting a new code", retryAfterSeconds });
    }
    const sendCount = existing && now - new Date(existing.lastSentAt) < 60 * 60 * 1000 ? existing.sendCount : 0;
    if (sendCount >= MAX_SENDS_PER_HOUR) return res.status(429).json({ message: "Too many code requests. Try again in an hour" });

    const emailCode = newCode();
    await sendEmailCode(email, name, emailCode);
    const values = { email, countryCode, phone, emailOtpHash: hashCode(emailCode), phoneOtpHash: hashCode("unused"), emailVerified: false, phoneVerified: false, expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS), emailAttempts: 0, phoneAttempts: 0, sendCount: sendCount + 1, lastSentAt: now, usedAt: null };
    const verification = existing ? await existing.update(values) : await RegistrationVerification.create(values);
    return res.json({ verificationId: verification.id, expiresInSeconds: OTP_LIFETIME_MS / 1000, resendAfterSeconds: RESEND_COOLDOWN_MS / 1000, message: "Verification code sent to your email. Your mobile number format is valid" });
  } catch (error) {
    console.error("Start Registration Verification Error:", error.message);
    return res.status(503).json({ message: error.message || "Unable to send verification codes. Please try again" });
  }
};

exports.verify = async (req, res) => {
  const { verificationId, channel, code } = req.body;
  if (!verificationId || channel !== "email" || !/^\d{6}$/.test(String(code || ""))) return res.status(400).json({ message: "Enter the six-digit code sent to your email" });
  try {
    const result = await RegistrationVerification.sequelize.transaction(async (transaction) => {
      const verification = await RegistrationVerification.findByPk(verificationId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!verification || verification.usedAt) return { status: 404, body: { message: "Verification request not found. Request new codes" } };
      if (new Date(verification.expiresAt) <= new Date()) return { status: 410, body: { message: "Verification code expired. Request new codes" } };
      const verifiedField = "emailVerified";
      const hashField = "emailOtpHash";
      const attemptsField = "emailAttempts";
      if (verification[verifiedField]) return { status: 200, body: { message: "Email already verified", emailVerified: true } };
      if (verification[attemptsField] >= MAX_ATTEMPTS) return { status: 429, body: { message: "Too many incorrect attempts. Request new codes" } };
      if (!safeEqual(hashCode(code), verification[hashField])) {
        verification[attemptsField] += 1;
        await verification.save({ transaction });
        return { status: 400, body: { message: `Incorrect ${channel} code`, attemptsRemaining: MAX_ATTEMPTS - verification[attemptsField] } };
      }
      verification[verifiedField] = true;
      await verification.save({ transaction });
      return { status: 200, body: { message: "Email verified", emailVerified: true } };
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Verify Registration Code Error:", error);
    return res.status(500).json({ message: "Unable to verify code" });
  }
};
