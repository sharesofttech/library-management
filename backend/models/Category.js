const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Category = sequelize.define(
  "Category",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "categories",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    appImage: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    banner: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    paidBannerPricePerDay: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    showProductConditions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    metaTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    metaKey: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metaDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true, // Enable / Disable
    },
    buyNow: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    exchange: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    showInHome: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "categories",
    timestamps: true,
  }
);

module.exports = Category;
