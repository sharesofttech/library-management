const { sequelize, User, RegistrationVerification } = require("./models");

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable("users");
  for (const name of ["emailVerified", "phoneVerified"]) {
    if (!columns[name]) {
      await queryInterface.addColumn("users", name, { type: require("sequelize").DataTypes.BOOLEAN, allowNull: false, defaultValue: true });
      console.log(`Added users.${name}`);
    }
  }
  await RegistrationVerification.sync();
  await User.update({ emailVerified: true, phoneVerified: true }, { where: { emailVerified: null } });
  console.log("Registration verification schema is ready.");
}

if (require.main === module) {
  migrate().catch((error) => { console.error("Registration verification migration failed:", error.message); process.exitCode = 1; }).finally(() => sequelize.close());
}

module.exports = migrate;
