const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

module.exports = sequelize.define("RenterListingCopy", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  listingId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "renter_listings", key: "id" }, onDelete: "RESTRICT" },
  copyNumber: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "available" },
  reservedRequestId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "rental_requests", key: "id" }, onDelete: "SET NULL" },
}, { tableName: "renter_listing_copies", timestamps: true, indexes: [
  { unique: true, fields: ["listingId", "copyNumber"] },
  { fields: ["listingId", "status"] },
  { fields: ["reservedRequestId"] },
] });
