const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

module.exports = sequelize.define("LibrarySettings", {
  id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1, validate: { isIn: [[1]] } },
  overdueFinePerDay: {
    type: DataTypes.DECIMAL(10, 2), allowNull: false,
    validate: { is: /^\d{1,8}(\.\d{1,2})?$/ },
  },
  updatedBy: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: "library_settings", timestamps: true });
