const { sequelize, RoleApplication } = require("./models");

async function migrate() {
  await RoleApplication.sync();
  console.log("Role applications table is ready.");
}

if (require.main === module) {
  migrate()
    .catch((error) => { console.error("Role applications migration failed:", error.message); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = migrate;
