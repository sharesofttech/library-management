const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

module.exports = sequelize.define("Author", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: { notEmpty: true, len: [1, 150] },
  },
  description: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: "authors", timestamps: true });
