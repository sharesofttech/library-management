const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

module.exports = sequelize.define("FinePayment", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  fineId: { type: DataTypes.INTEGER, allowNull: false },
  amount: {
    type: DataTypes.DECIMAL(10, 2), allowNull: false,
    validate: {
      is: /^\d{1,8}(\.\d{1,2})?$/,
      positive(value) { if (!/[1-9]/.test(String(value))) throw new Error("Payment must be greater than zero"); },
    },
  },
  paymentDate: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  paymentMethod: { type: DataTypes.ENUM("cash", "upi", "card"), allowNull: false },
  receivedBy: { type: DataTypes.INTEGER, allowNull: false },
  importReference: { type: DataTypes.STRING(120), allowNull: true, unique: true },
}, { tableName: "fine_payments", timestamps: true });

