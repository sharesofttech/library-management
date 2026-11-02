const { DataTypes } = require("sequelize");
const { sequelize, BookIssue, RentalRequest } = require("./models");

async function addMissingColumns(tableName, fields) {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable(tableName);
  for (const [name, definition] of Object.entries(fields)) {
    if (!columns[name]) await queryInterface.addColumn(tableName, name, definition);
  }
}

async function migrate() {
  await sequelize.authenticate();
  await addMissingColumns("book_issues", {
    overdueReminderSentAt: { type: DataTypes.DATE, allowNull: true },
    overdueReminderClaimedAt: { type: DataTypes.DATE, allowNull: true },
  });
  await addMissingColumns("rental_requests", {
    overdueReminderSentAt: { type: DataTypes.DATE, allowNull: true },
    overdueReminderClaimedAt: { type: DataTypes.DATE, allowNull: true },
  });
  console.log("Overdue reminder fields are ready for borrowings and renter rentals.");
}

if (require.main === module) {
  migrate().catch(error => { console.error("Overdue reminder migration failed:", error.message); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = migrate;
