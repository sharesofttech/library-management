// Create the renter marketplace listing table without altering Library books/copies.
const { sequelize, RenterListing } = require("./models");

async function migrate() {
  await sequelize.authenticate();
  await RenterListing.sync();
  const columns = await sequelize.getQueryInterface().describeTable("renter_listings");
  if (!columns.categoryName) {
    const { DataTypes } = require("sequelize");
    await sequelize.getQueryInterface().addColumn("renter_listings", "categoryName", { type: DataTypes.STRING(150), allowNull: true });
  } else if (/varchar\(100\)/i.test(columns.categoryName.type)) {
    const { DataTypes } = require("sequelize");
    await sequelize.getQueryInterface().changeColumn("renter_listings", "categoryName", { type: DataTypes.STRING(150), allowNull: true });
  }
  if (!columns.highlights) {
    const { DataTypes } = require("sequelize");
    await sequelize.getQueryInterface().addColumn("renter_listings", "highlights", { type: DataTypes.TEXT("long"), allowNull: true });
  }
  if (!columns.weightKg) {
    const { DataTypes } = require("sequelize");
    await sequelize.getQueryInterface().addColumn("renter_listings", "weightKg", { type: DataTypes.DECIMAL(6, 3), allowNull: true });
  }
  console.log("Renter listings table is ready. Library books and copies were not changed.");
}

if (require.main === module) {
  migrate()
    .catch((error) => {
      console.error("Renter listings migration failed:", error.message);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}

module.exports = migrate;
