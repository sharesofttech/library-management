const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

module.exports = sequelize.define("BookCopy", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  bookId: { type: DataTypes.INTEGER, allowNull: false },
  copyCode: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  status: { type: DataTypes.ENUM("available", "issued", "damaged", "lost"), allowNull: false, defaultValue: "available" },
}, { tableName: "book_copies", timestamps: true });
