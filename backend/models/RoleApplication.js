const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

module.exports = sequelize.define("RoleApplication", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  requestedRole: { type: DataTypes.STRING(20), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pending" },
  note: { type: DataTypes.TEXT, allowNull: true },
  reviewedAt: { type: DataTypes.DATE, allowNull: true },
  reviewedBy: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: "role_applications", timestamps: true });
