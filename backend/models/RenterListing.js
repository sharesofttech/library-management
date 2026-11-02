const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

module.exports = sequelize.define("RenterListing", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  ownerId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  authorName: { type: DataTypes.STRING(150), allowNull: false },
  categoryName: { type: DataTypes.STRING(150), allowNull: true },
  isbn: { type: DataTypes.STRING(32), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: false },
  highlights: { type: DataTypes.TEXT("long"), allowNull: true },
  weightKg: { type: DataTypes.DECIMAL(6, 3), allowNull: true },
  condition: { type: DataTypes.STRING(30), allowNull: false },
  copyCount: { type: DataTypes.INTEGER, allowNull: false },
  rentalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  rentalPeriodDays: { type: DataTypes.INTEGER, allowNull: false },
  pickupAvailable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  deliveryAvailable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  coverImage: { type: DataTypes.STRING(255), allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "pending" },
  adminNote: { type: DataTypes.TEXT, allowNull: true },
  reviewedAt: { type: DataTypes.DATE, allowNull: true },
  reviewedBy: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: "renter_listings", timestamps: true });
