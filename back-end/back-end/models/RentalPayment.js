const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

module.exports = sequelize.define("RentalPayment", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  rentalRequestId: { type: DataTypes.INTEGER, allowNull: false },
  purpose: { type: DataTypes.STRING(20), allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "INR" },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "created" },
  razorpayOrderId: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  razorpayPaymentId: { type: DataTypes.STRING(64), allowNull: true, unique: true },
  paidAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: "rental_payments", timestamps: true, indexes: [{ fields: ["rentalRequestId", "purpose", "status"] }] });
