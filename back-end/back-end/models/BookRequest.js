
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BookRequest = sequelize.define(
  "BookRequest",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    memberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    bookId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    requestDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM(
        "Pending",
        "Approved",
        "Rejected",
        "Cancelled",
        "Fulfilled"
      ),
      allowNull: false,
      defaultValue: "Pending",
    },
    approvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "book_requests",
    timestamps: true,
    indexes: [
      { fields: ["memberId", "status"] },
      { fields: ["bookId"] },
      { fields: ["status", "createdAt"] },
    ],
  }
);

module.exports = BookRequest;
