const { DataTypes } = require("sequelize");
const { sequelize } = require("./models");

async function migrate() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  const columns = await qi.describeTable("fine_payments");
  if (!columns.importReference) {
    await qi.addColumn("fine_payments", "importReference", { type: DataTypes.STRING(120), allowNull: true });
  }
  const indexes = await qi.showIndex("fine_payments");
  if (!indexes.some(index => index.name === "fine_payments_import_reference_unique")) {
    await qi.addIndex("fine_payments", ["importReference"], { name: "fine_payments_import_reference_unique", unique: true });
  }
  console.log("Fine payment import reference is ready.");
}

if (require.main === module) {
  migrate().catch(error => { console.error("Fine payment import migration failed:", error.message); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = migrate;
