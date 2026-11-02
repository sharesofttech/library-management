const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BookIssue = sequelize.define(
  "BookIssue",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    requestId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    memberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    bookId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    bookCopyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    issueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    returnDate: {
  type: DataTypes.DATEONLY,
  allowNull: true,
  defaultValue: null,
},

    lostDate: { type: DataTypes.DATEONLY, allowNull: true, defaultValue: null },
    // Null means an existing borrowing has no historically verified rate.
    overdueFineRate: {
      type: DataTypes.DECIMAL(10, 2), allowNull: true,
      validate: { is: /^\d{1,8}(\.\d{1,2})?$/ },
    },
    overdueReminderSentAt: { type: DataTypes.DATE, allowNull: true },
    overdueReminderClaimedAt: { type: DataTypes.DATE, allowNull: true },
status: {
  type: DataTypes.ENUM("issued", "returned", "overdue", "lost"),
  allowNull: false,
  defaultValue: "issued",
},
    issuedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "book_issues",
    timestamps: true,
  }
);

module.exports = BookIssue;
