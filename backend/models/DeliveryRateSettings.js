const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

module.exports = sequelize.define("DeliveryRateSettings", {
  id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1, validate: { isIn: [[1]] } },
  rates: { type: DataTypes.JSON, allowNull: false },
  updatedBy: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: "delivery_rate_settings", timestamps: true });
