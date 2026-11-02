// Additive, repeatable migration for public registration and Admin review.
// Existing accounts receive approved status so current users keep access.
const { DataTypes } = require("sequelize");
const { sequelize } = require("./models");

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable("users");
  const additions = [
    ["requestedRole", { type: DataTypes.STRING(20), allowNull: false, defaultValue: "user" }],
    ["approvalStatus", { type: DataTypes.STRING(20), allowNull: false, defaultValue: "approved" }],
    ["isRenter", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }],
    ["approvalReviewedAt", { type: DataTypes.DATE, allowNull: true, defaultValue: null }],
    ["approvalReviewedBy", { type: DataTypes.INTEGER, allowNull: true, defaultValue: null }],
    ["approvalNote", { type: DataTypes.TEXT, allowNull: true, defaultValue: null }],
  ];

  for (const [name, definition] of additions) {
    if (!columns[name]) {
      await queryInterface.addColumn("users", name, definition);
      console.log(`Added users.${name}`);
    }
  }

  console.log("Registration approval schema migration complete. Existing users remain approved.");
}

if (require.main === module) {
  migrate()
    .catch((error) => {
      console.error("Registration approval migration failed:", error.message);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}

module.exports = migrate;
