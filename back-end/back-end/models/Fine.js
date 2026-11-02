const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

module.exports = sequelize.define("Fine", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  borrowingId: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM("overdue", "lost"), allowNull: false },
  amount: {
    type: DataTypes.DECIMAL(10, 2), allowNull: false,
    validate: { is: /^\d{1,8}(\.\d{1,2})?$/ },
  },
  status: {
    type: DataTypes.ENUM("Pending", "Partially paid", "Paid"),
    allowNull: false, defaultValue: "Pending",
    validate: { isIn: [["Pending", "Partially paid", "Paid"]] },
  },
}, {
  tableName: "fines", timestamps: true,
  indexes: [{ name: "fines_borrowing_type_unique", unique: true, fields: ["borrowingId", "type"] }],
});
