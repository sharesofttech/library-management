const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define(
  "User",
  {
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    countryCode: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    phoneVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "roles",
        key: "id",
      },
    },
    requestedRole: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "user",
    },
    approvalStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "approved",
    },
    isRenter: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    approvalReviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approvalReviewedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    approvalNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resetPasswordToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
  }
);

module.exports = User;
