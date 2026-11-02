const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

module.exports = sequelize.define("RegistrationVerification", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING(150), allowNull: false },
  countryCode: { type: DataTypes.STRING(6), allowNull: false },
  phone: { type: DataTypes.STRING(15), allowNull: false },
  emailOtpHash: { type: DataTypes.STRING(64), allowNull: false },
  phoneOtpHash: { type: DataTypes.STRING(64), allowNull: false },
  emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  phoneVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  emailAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  phoneAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  sendCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  lastSentAt: { type: DataTypes.DATE, allowNull: false },
  usedAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: "registration_verifications", timestamps: true });
