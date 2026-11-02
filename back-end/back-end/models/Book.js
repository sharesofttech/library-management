const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

module.exports = sequelize.define("Book", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  isbn: { type: DataTypes.STRING(32), allowNull: false, unique: true },
  categoryId: { type: DataTypes.INTEGER, allowNull: false },
  authorId: { type: DataTypes.INTEGER, allowNull: false },
  noofcopies: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 0 } },
  publisher: { type: DataTypes.STRING(200), allowNull: true },
  publishedYear: { type: DataTypes.INTEGER, allowNull: true },
  bookImg: { type: DataTypes.STRING(255), allowNull: true },
  originalPrice: {
    type: DataTypes.DECIMAL(10, 2), allowNull: true,
    validate: { is: /^\d{1,8}(\.\d{1,2})?$/ },
  },
}, { tableName: "books", timestamps: true });
